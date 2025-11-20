# Discord League Manager

A Discord bot for managing TCG (Trading Card Game) leagues with automated Swiss pairing, comprehensive standings tracking, and multiple tournament formats.

## Features

- 🎮 **Multiple Tournament Formats**: Swiss, Swiss with Top Cut, Double/Single Elimination
- 🔄 **Automated Swiss Pairing**: Professional pairing algorithm with proper tiebreakers
- 📊 **Real-time Standings**: Track match records with OMW%, GW%, and OGW% tiebreakers
- 🏆 **Multi-League Support**: Run multiple concurrent leagues per Discord server
- 💾 **Persistent Data**: All data stored in database (SQLite/PostgreSQL/MySQL)
- ⚡ **Slash Commands**: Modern Discord slash command interface
- 🌐 **Multi-Server**: One bot instance can serve multiple Discord servers

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Discord Bot Token and Application ID
- A Discord server where you can invite bots

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/discord-league-manager.git
cd discord-league-manager

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your Discord bot credentials

# Setup database
npx prisma generate
npx prisma db push

# Build and run
npm run build
npm start
```

### Configuration

Create a `.env` file with your Discord credentials:

```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_id_here
DATABASE_URL="file:./dev.db"
```

## Commands

### League Management

- `/league create` - Create a new league
- `/league list` - View active leagues
- `/league cancel` - Cancel a league

### Player Registration

- `/register` - Register for a league

### Tournament Operations

- `/tournament start` - Begin a league
- `/tournament nextround` - Generate next round pairings
- `/tournament report` - Report match results
- `/tournament pairings` - View current round
- `/tournament drop` - Drop from league

### Standings

- `/standings` - View league standings with tiebreakers

## Example Usage

```
1. Create a league
   /league create name:"FNM Modern" format:"Modern" type:"Swiss" rounds:4

2. Players register
   /register league_id:1

3. Start the tournament
   /tournament start league_id:1

4. Generate pairings
   /tournament nextround league_id:1

5. Report results
   /tournament report match_id:1 player1_wins:2 player2_wins:0

6. View standings
   /standings league_id:1
```

## Documentation

- **[Setup Guide](./SETUP.md)** - Detailed installation and configuration
- **[Usage Guide](./USAGE.md)** - Complete command reference and workflows
- **[Architecture](./ARCHITECTURE.md)** - Technical documentation and design decisions

## Technology Stack

- **Discord.js v14** - Discord bot framework
- **TypeScript v5** - Type-safe development
- **Prisma ORM v5** - Database abstraction
- **tournament-organizer** - Swiss pairing algorithm
- **SQLite/PostgreSQL/MySQL** - Database options

## Project Structure

```
src/
├── bot.ts              # Entry point
├── types/              # TypeScript interfaces
├── commands/           # Discord slash commands
├── services/           # Business logic
├── data/
│   ├── repositories/   # Database access layer
│   └── prismaClient.ts
└── events/             # Discord event handlers
```

## Swiss Pairing System

The bot implements professional Swiss pairing with:

- **First Round**: Random pairings
- **Later Rounds**: Match similar records, avoid repeats
- **Tiebreakers**:
  - Match Points (Win=3, Draw=1, Loss=0)
  - OMW% - Opponent Match Win Percentage
  - GW% - Game Win Percentage
  - OGW% - Opponent Game Win Percentage

## Database Schema

Core entities:
- **League** - Tournament configuration and status
- **Player** - User profiles linked to Discord IDs
- **Registration** - Player enrollment with stats
- **Round** - Round tracking
- **Match** - Individual match results

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Follow existing code patterns
4. Add tests for new features
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/discord-league-manager/issues)
- **Documentation**: See `/docs` folder
- **Discord**: [Join our support server](https://discord.gg/yourinvite)

## Acknowledgments

- [tournament-organizer](https://github.com/slashinfty/tournament-organizer) - Swiss pairing library
- [Discord.js](https://discord.js.org/) - Discord API library
- [Prisma](https://www.prisma.io/) - Database ORM

## Roadmap

- [ ] Web dashboard for standings
- [ ] Export tournament data
- [ ] Match timer notifications
- [ ] Player statistics over time
- [ ] Deck list collection
- [ ] Tournament bracket visualization

---

Made with ❤️ for the TCG community
