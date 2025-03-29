Below is a basic README geared towards developers:

---

# Solana Analysis Telegram Bot

A Telegram bot for real-time and historical Solana research, analytics, and notifications using the Vybe API. Designed for one-on-one (DM) interactions with users and built with Node.js, TypeScript, and MongoDB.


## Directory Structure

```
jskoiz-on-chain-analytics/
├── README.md               
├── LICENSE                
├── package.json           
├── tsconfig.json         
├── .env.example           
└── src/
    ├── app.ts              # Main File - Sets up the tg bot, connects to DB, initializes the Vybe API, registers commands, and starts alert scheduler.
    ├── index.ts            # Entry point that starts the App and handles graceful shutdown signals.
    ├── commands/           
    │   ├── alerts.ts       # Implements the /alerts command and its sub-actions (create, list, delete alerts).
    │   ├── help.ts         # Implements the /help command (displays usage instructions).
    │   ├── index.ts        # Aggregates registration of all commands with the bot instance.
    │   ├── research.ts     # Implements the /research command and related research tool actions.
    │   ├── start.ts        # Implements the /start command (displays centralized interface with wallet info and action buttons).
    │   └── wallet.ts       # Implements the /wallet command for managing wallet addresses (add, remove, list).
    ├── config/             
    │   └── index.ts        # Loads, validates, and exports environment variables.
    ├── db/                 
    │   ├── index.ts        # Handles connection to MongoDB using Mongoose.
    │   └── models/         # Contains mongodb schemas and models.
    │       ├── Alert.ts    # Defines the Alert schema/model (for user alert configurations).
    │       └── User.ts     # Defines the User schema/model (for Telegram user data and wallet addresses).
    ├── modules/            
    │   └── vybeApi.ts      # Wrapper for the Vybe API: initializes the SDK, applies rate limiting, and provides typed API functions.
    ├── services/           
    │   └── alertScheduler.ts  # Schedules and executes periodic alert checks and sends notifications.
    └── utils/              
        ├── formatters.ts   # Functions to format data (wallet, token, program info) into HTML for Telegram.
        └── logger.ts       # Configured Winston logger for structured logging.

```

## Prerequisites

- **Node.js** (LTS v18+ recommended)
- **MongoDB** (connection URI required)
- A valid **Telegram Bot Token** (from BotFather)
- A valid **Vybe API Key**

## Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/yourusername/jskoiz-on-chain-analytics.git
   cd jskoiz-on-chain-analytics
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Create your environment file:**

   Copy `.env.example` to `.env` and update with your values:
   
   ```bash
   cp .env.example .env
   ```

## Build & Run

### Development

Use the development script for auto-recompilation and live-reloading:

```bash
npm run dev
```

This command uses `ts-node-dev` to automatically rebuild on file changes and clears any Telegram lock files if needed.

### Production

Build the project:

```bash
npm run build
```

Then start the bot:

```bash
npm start
```

## Available Bot Commands

- **/start:** Display the centralized interface with wallet information and action buttons.
- **/help:** Show help information.
- **/wallet:** Manage your Solana wallet addresses.
- **/research:** Access research tools for wallet analysis, token deep dives, market data, and protocol health.
- **/alerts:** Create, list, or delete alerts for various metrics.

## Centralized Interface

The bot features a centralized interface through the `/start` command that:

- Displays wallet address and balance information when available
- Provides direct access to all key features through action buttons
- Shows social media links and contextual information
- Allows refreshing wallet data with a single click
- Provides seamless navigation between different features

## Development Notes

- **HTML Formatting:**  
  All responses sent via Telegram are formatted in HTML (set `parse_mode: 'HTML'`).

- **Error Handling & Rate Limiting:**  
  The Vybe API wrapper uses Bottleneck for rate limiting and robust error handling with retries.

- **Modular Architecture:**  
  Commands, API interactions, DB models, and services are separated into dedicated folders for easier maintenance and scalability.

- **Environment Variables:**  
  Use the provided `.env.example` to configure your BOT_TOKEN, MONGO_URI, VYBE_API_KEY, and optional LOG_LEVEL.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.