import { Telegraf, Context } from 'telegraf';
import { registerStartCommand } from './start';
import { registerHelpCommand } from './help';
import { registerWalletCommand } from './wallet';
import { registerResearchCommand } from './research';
import { registerAlertsCommand } from './alerts';
import logger from '../utils/logger';

/**
 * Registers all commands with the bot
 * @param bot Telegraf bot instance
 */
export const registerCommands = (bot: Telegraf<Context>): void => {
  logger.info('Registering commands...');
  
  // Register commands
  registerStartCommand(bot);
  registerHelpCommand(bot);
  registerWalletCommand(bot);
  registerResearchCommand(bot);
  registerAlertsCommand(bot);
  
  logger.info('Commands registered successfully');
};
