# Discord League Manager - Setup Guide

## Prerequisites

- Node.js 18+ and npm
- A Discord account and server
- Basic knowledge of Discord bot setup

## Initial Setup

### 1. Discord Bot Configuration

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" section
4. Click "Add Bot"
5. Under "Privileged Gateway Intents", enable:
   - Server Members Intent (optional, for better user tracking)
   - Message Content Intent (optional)
6. Click "Reset Token" and copy your bot token (you'll need this for `.env`)
7. Copy your Application ID from the "General Information" section (this is your CLIENT_ID)

### 2. Bot Permissions

The bot needs the following permissions:
- Send Messages
- Embed Links
- Read Message History
- Use Slash Commands

Permission integer: `277025770496`

### 3. Invite Bot to Server

Use this URL (replace `CLIENT_ID` with your Application ID):
```
https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID&permissions=277025770496&scope=bot%20applications.commands
```

### 4. Project Installation

```bash
# Clone or navigate to the project directory
cd discord-league-manager

# Install dependencies
npm install

# Install TypeScript globally (if not already installed)
npm install -g typescript
```

### 5. Environment Configuration

Create a `.env` file in the root directory:

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_id_here

# Database Configuration (SQLite - default)
DATABASE_URL="file:./dev.db"

# Optional: Use PostgreSQL for better performance and enum support
# DATABASE_URL="postgresql://user:password@localhost:5432/league_db"

# Optional: Use MySQL
# DATABASE_URL="mysql://user:password@localhost:3306/league_db"
```

**Note:** SQLite is used by default for simplicity. If using PostgreSQL or MySQL, you'll need to update the Prisma schema to use native enums for better type safety.

### 6. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Create database and tables
npx prisma db push

# Optional: Open Prisma Studio to view database
npx prisma studio
```

### 7. Build and Run

```bash
# Build TypeScript
npm run build

# Start the bot
npm start

# Or for development with auto-reload
npm run dev
```

## Verification

Once the bot is running, you should see:
```
Started refreshing 4 application (/) commands.
Successfully reloaded 4 application (/) commands.
Ready! Logged in as YourBotName#1234
```

In your Discord server, type `/` and you should see these commands:
- `/league` - Create and manage leagues
- `/register` - Register for a league
- `/tournament` - Tournament management
- `/standings` - View league standings

## Troubleshooting

### Bot doesn't appear online
- Check that your `DISCORD_TOKEN` is correct
- Verify the bot has been invited to your server
- Check terminal for error messages

### Commands don't appear
- Wait a few minutes (Discord caches commands)
- Ensure the bot has "applications.commands" scope
- Try kicking and re-inviting the bot

### Database errors
- Ensure `npx prisma generate` completed successfully
- Check `DATABASE_URL` format
- Verify write permissions in the project directory

### TypeScript compilation errors
- Run `npm install` to ensure all dependencies are installed
- Check that TypeScript version is 5.0+
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`

## Next Steps

See [USAGE.md](./USAGE.md) for how to use the bot commands.
