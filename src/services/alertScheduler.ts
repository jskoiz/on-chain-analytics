import cron from 'node-cron';
import { Telegraf } from 'telegraf';
import { Alert, IAlert, IPriceCondition, IBalanceCondition, ITVLCondition, IActiveUsersCondition } from '../db/models/Alert';
import * as vybeApi from '../modules/vybeApi';
import logger from '../utils/logger';
import { formatAlertTriggerHTML } from '../utils/formatters';

/**
 * Alert scheduler service
 * - Periodically checks alert conditions
 * - Sends notifications to users when conditions are met
 */
export class AlertScheduler {
  private bot: Telegraf;
  private isRunning: boolean = false;
  private cronJob: cron.ScheduledTask | null = null;
  
  /**
   * Creates a new AlertScheduler instance
   * @param bot Telegraf bot instance
   */
  constructor(bot: Telegraf) {
    this.bot = bot;
  }
  
  /**
   * Starts the alert scheduler
   * @param cronExpression Cron expression for scheduling (default: every 5 minutes)
   */
  public start(cronExpression: string = '*/5 * * * *'): void {
    if (this.isRunning) {
      logger.warn('Alert scheduler is already running');
      return;
    }
    
    logger.info(`Starting alert scheduler with schedule: ${cronExpression}`);
    
    this.cronJob = cron.schedule(cronExpression, async () => {
      try {
        await this.checkAlerts();
      } catch (error) {
        logger.error('Error in alert scheduler', { error });
      }
    });
    
    this.isRunning = true;
    logger.info('Alert scheduler started successfully');
  }
  
  /**
   * Stops the alert scheduler
   */
  public stop(): void {
    if (!this.isRunning || !this.cronJob) {
      logger.warn('Alert scheduler is not running');
      return;
    }
    
    logger.info('Stopping alert scheduler');
    this.cronJob.stop();
    this.isRunning = false;
    this.cronJob = null;
    logger.info('Alert scheduler stopped successfully');
  }
  
  /**
   * Checks all enabled alerts and sends notifications if conditions are met
   */
  private async checkAlerts(): Promise<void> {
    logger.debug('Checking alerts...');
    
    try {
      // Get all enabled alerts
      const alerts = await Alert.find({ isEnabled: true });
      
      if (alerts.length === 0) {
        logger.debug('No enabled alerts found');
        return;
      }
      
      logger.info(`Checking ${alerts.length} enabled alerts`);
      
      // Group alerts by type for more efficient API calls
      const alertsByType = this.groupAlertsByType(alerts);
      
      // Process each type of alert
      await Promise.all([
        this.processPriceAlerts(alertsByType.price),
        this.processBalanceAlerts(alertsByType.balance),
        this.processTVLAlerts(alertsByType.tvl),
        this.processActiveUsersAlerts(alertsByType.activeUsers)
      ]);
      
      logger.debug('Alert check completed');
    } catch (error) {
      logger.error('Error checking alerts', { error });
    }
  }
  
  /**
   * Groups alerts by type
   * @param alerts Array of alerts
   * @returns Object with alerts grouped by type
   */
  private groupAlertsByType(alerts: IAlert[]): {
    price: IAlert[];
    balance: IAlert[];
    tvl: IAlert[];
    activeUsers: IAlert[];
  } {
    return alerts.reduce(
      (groups, alert) => {
        groups[alert.alertType].push(alert);
        return groups;
      },
      {
        price: [] as IAlert[],
        balance: [] as IAlert[],
        tvl: [] as IAlert[],
        activeUsers: [] as IAlert[]
      }
    );
  }
  
  /**
   * Processes price alerts
   * @param alerts Array of price alerts
   */
  private async processPriceAlerts(alerts: IAlert[]): Promise<void> {
    if (alerts.length === 0) return;
    
    logger.debug(`Processing ${alerts.length} price alerts`);
    
    // Group alerts by asset mint for more efficient API calls
    const alertsByMint: { [key: string]: IAlert[] } = {};
    
    alerts.forEach(alert => {
      // Type assertion since we know these are price alerts
      const condition = alert.condition as IPriceCondition;
      const mint = condition.assetMint;
      if (!alertsByMint[mint]) {
        alertsByMint[mint] = [];
      }
      alertsByMint[mint].push(alert);
    });
    
    // Process each group of alerts
    for (const [mint, mintAlerts] of Object.entries(alertsByMint)) {
      try {
        // Get current price
        const priceData = await vybeApi.getTokenPrice(mint);
        const currentPrice = priceData.price;
        
        if (currentPrice === undefined) {
          logger.warn(`No price data available for mint: ${mint}`);
          continue;
        }
        
        // Check each alert
        for (const alert of mintAlerts) {
          await this.checkAndNotify(alert, currentPrice);
        }
      } catch (error) {
        logger.error(`Error processing price alerts for mint: ${mint}`, { error });
      }
    }
  }
  
  /**
   * Processes balance alerts
   * @param alerts Array of balance alerts
   */
  private async processBalanceAlerts(alerts: IAlert[]): Promise<void> {
    if (alerts.length === 0) return;
    
    logger.debug(`Processing ${alerts.length} balance alerts`);
    
    // Group alerts by wallet address for more efficient API calls
    const alertsByWallet: { [key: string]: IAlert[] } = {};
    
    alerts.forEach(alert => {
      // Type assertion since we know these are balance alerts
      const condition = alert.condition as IBalanceCondition;
      const wallet = condition.walletAddress;
      if (!alertsByWallet[wallet]) {
        alertsByWallet[wallet] = [];
      }
      alertsByWallet[wallet].push(alert);
    });
    
    // Process each group of alerts
    for (const [wallet, walletAlerts] of Object.entries(alertsByWallet)) {
      try {
        // Get current balances
        const balanceData = await vybeApi.getTokenBalance(wallet);
        
        // Check each alert
        for (const alert of walletAlerts) {
          // Type assertion since we know these are balance alerts
          const condition = alert.condition as IBalanceCondition;
          const mint = condition.assetMint;
          
          // Find the token in the balance data
          const token = balanceData.tokens?.find((t: any) => t.mint === mint);
          
          if (!token) {
            logger.warn(`No balance data available for wallet: ${wallet}, mint: ${mint}`);
            continue;
          }
          
          const currentBalance = token.balance;
          await this.checkAndNotify(alert, currentBalance);
        }
      } catch (error) {
        logger.error(`Error processing balance alerts for wallet: ${wallet}`, { error });
      }
    }
  }
  
  /**
   * Processes TVL alerts
   * @param alerts Array of TVL alerts
   */
  private async processTVLAlerts(alerts: IAlert[]): Promise<void> {
    if (alerts.length === 0) return;
    
    logger.debug(`Processing ${alerts.length} TVL alerts`);
    
    // Group alerts by program ID for more efficient API calls
    const alertsByProgram: { [key: string]: IAlert[] } = {};
    
    alerts.forEach(alert => {
      // Type assertion since we know these are TVL alerts
      const condition = alert.condition as ITVLCondition;
      const programId = condition.programId;
      if (!alertsByProgram[programId]) {
        alertsByProgram[programId] = [];
      }
      alertsByProgram[programId].push(alert);
    });
    
    // Process each group of alerts
    for (const [programId, programAlerts] of Object.entries(alertsByProgram)) {
      try {
        // Get current TVL
        const tvlData = await vybeApi.getProgramTVL(programId);
        const currentTVL = tvlData.tvl;
        
        if (currentTVL === undefined) {
          logger.warn(`No TVL data available for program: ${programId}`);
          continue;
        }
        
        // Check each alert
        for (const alert of programAlerts) {
          await this.checkAndNotify(alert, currentTVL);
        }
      } catch (error) {
        logger.error(`Error processing TVL alerts for program: ${programId}`, { error });
      }
    }
  }
  
  /**
   * Processes active users alerts
   * @param alerts Array of active users alerts
   */
  private async processActiveUsersAlerts(alerts: IAlert[]): Promise<void> {
    if (alerts.length === 0) return;
    
    logger.debug(`Processing ${alerts.length} active users alerts`);
    
    // Group alerts by program ID for more efficient API calls
    const alertsByProgram: { [key: string]: IAlert[] } = {};
    
    alerts.forEach(alert => {
      // Type assertion since we know these are active users alerts
      const condition = alert.condition as IActiveUsersCondition;
      const programId = condition.programId;
      if (!alertsByProgram[programId]) {
        alertsByProgram[programId] = [];
      }
      alertsByProgram[programId].push(alert);
    });
    
    // Process each group of alerts
    for (const [programId, programAlerts] of Object.entries(alertsByProgram)) {
      try {
        // Get current active users
        // Type assertion since we know these are active users alerts
        const condition = programAlerts[0].condition as IActiveUsersCondition;
        const timeframe = condition.timeframe || '24h';
        const activeUsersData = await vybeApi.getProgramActiveUsers(programId, timeframe);
        const currentActiveUsers = activeUsersData.count;
        
        if (currentActiveUsers === undefined) {
          logger.warn(`No active users data available for program: ${programId}`);
          continue;
        }
        
        // Check each alert
        for (const alert of programAlerts) {
          await this.checkAndNotify(alert, currentActiveUsers);
        }
      } catch (error) {
        logger.error(`Error processing active users alerts for program: ${programId}`, { error });
      }
    }
  }
  
  /**
   * Checks if an alert condition is met and sends a notification if it is
   * @param alert Alert to check
   * @param currentValue Current value to check against the alert threshold
   */
  private async checkAndNotify(alert: IAlert, currentValue: number): Promise<void> {
    try {
      // All condition types have threshold and operator properties
      const { threshold, operator } = alert.condition as { threshold: number; operator: 'gt' | 'lt' };
      
      // Check if the condition is met
      const isConditionMet = operator === 'gt' 
        ? currentValue > threshold
        : currentValue < threshold;
      
      if (!isConditionMet) {
        return;
      }
      
      // Check if the alert has been triggered recently (within the last hour)
      const lastTriggered = alert.lastTriggeredAt;
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      if (lastTriggered && lastTriggered > oneHourAgo) {
        logger.debug(`Alert ${alert.id} was triggered recently, skipping notification`);
        return;
      }
      
      // Send notification
      await this.sendNotification(alert, currentValue);
      
      // Update last triggered timestamp
      alert.lastTriggeredAt = new Date();
      await (alert as any).save();
      
      logger.info(`Alert ${alert.id} triggered and notification sent`);
    } catch (error) {
      logger.error(`Error checking and notifying alert ${alert._id}`, { error });
    }
  }
  
  /**
   * Sends a notification to the user
   * @param alert Alert that was triggered
   * @param currentValue Current value that triggered the alert
   */
  private async sendNotification(alert: IAlert, currentValue: number): Promise<void> {
    try {
      // Format the notification message
      const message = formatAlertTriggerHTML(alert, currentValue);
      
      // Send the message to the user
      await this.bot.telegram.sendMessage(alert.telegramId, message, {
        parse_mode: 'HTML'
      });
      
      logger.debug(`Notification sent to user ${alert.telegramId} for alert ${alert.id}`);
    } catch (error) {
      logger.error(`Error sending notification for alert ${alert.id}`, { error });
      throw error;
    }
  }
}
