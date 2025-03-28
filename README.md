Below is a basic README geared towards developers:

---

# Solana Analysis Telegram Bot

A Telegram bot for real-time and historical Solana research, analytics, and notifications using the Vybe API. Designed for one-on-one (DM) interactions with users and built with Node.js, TypeScript, and MongoDB.


## Directory Structure

```
jskoiz-on-chain-analytics/
├── LICENSE
├── package.json
├── tsconfig.json
├── .env.example
└── src/
    ├── app.d.ts
    ├── app.ts
    ├── index.ts
    ├── commands/          # Commands for /start, /help, /wallet, /research, /alerts
    ├── config/            # Environment and configuration setup
    ├── db/                # MongoDB connection and models (User, Alert)
    ├── modules/           # Vybe API/logic
    ├── services/          # Background services (alert scheduler)
    └── utils/             # Logging and formatting utilities
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

- **/start:** Display the main menu.
- **/help:** Show help information.
- **/wallet:** Manage your Solana wallet addresses.
- **/research:** Access research tools for wallet analysis, token deep dives, market data, and protocol health.
- **/alerts:** Create, list, or delete alerts for various metrics.

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