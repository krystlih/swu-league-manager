# Discord League Manager

A comprehensive Discord bot for managing TCG (Trading Card Game) tournaments with **automatic progression**, Swiss pairing, top cut brackets, player statistics, and complete tournament history tracking.

## ✨ Key Features

- 🤖 **Automatic Tournament Progression**: Tournaments auto-advance through rounds and end when complete
- 🎯 **Smart Round Calculation**: Automatic Swiss round count based on player count
- 🏆 **Automated Top Cut**: Single elimination brackets with seeded pairings
- 🔄 **Swiss Pairing Algorithm**: Professional Swiss pairing with official tiebreakers
- 📊 **Real-time Standings**: Live rankings with OMW%, GW%, and OGW% calculations
- 📈 **Player Statistics**: Career stats, win rates, tournament history, head-to-head records
- � **Multiple Formats**: Swiss, Swiss with Top Cut, Double/Single Elimination
- 📜 **Complete History**: Search past tournaments, view results, and match archives
- 🔧 **Creator Tools**: Match modification, round repair, and audit logging
- 💾 **Persistent Data**: Database-backed with automatic state recovery
- ⚡ **Modern Interface**: Slash commands with autocomplete everywhere
- 🌐 **Multi-Server**: One bot instance serves multiple Discord servers

## 🚀 Quick Start

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

## 📋 Commands

### League Management
- `/league create` - Create a new league
  - **Optional:** `rounds` parameter (if not set, auto-calculated based on player count)
  - **Optional:** `timer` parameter sets round timer in minutes (10-180)
- `/league list` - View active leagues
- `/league cancel` - Cancel a league (creator only)
- `/league auditlog` - View modification history (creator only)
- `/league help` - Complete in-bot guide

### Player Registration
- `/register` - Register for a league
- `/manualregister` - Manually register users (creator only)

### Tournament Operations
- `/tournament start` - Begin tournament (auto-generates Round 1)
- `/tournament nextround` - Generate next Swiss round (creator only)
- `/tournament report` - Report your match results
- `/tournament pairings` - View current round matchups
- `/tournament drop` - Drop from active tournament
- `/tournament end` - Manually end tournament (creator only)
- `/tournament bracket` - View Top Cut elimination bracket

### Creator Tools
- `/tournament findmatch` - Search for matches by player
- `/tournament modifymatch` - Correct match results (creator only)
- `/tournament repairround` - Regenerate current round (creator only)

### Standings & Statistics
- `/standings` - View league standings with tiebreakers
- `/stats player [user]` - View player career statistics
- `/stats leaderboard [format] [sort]` - Server-wide rankings
- `/stats matchup <player1> <player2>` - Head-to-head comparison

### Tournament History
- `/history list` - View all completed tournaments
- `/history results` - Final standings of past tournaments
- `/history pairings` - View round pairings from history
- `/history matches` - Search historical match results

## 🎯 How It Works

### Automatic Tournament Flow

1. **Create & Register**
   ```
   /league create name:"FNM Premier" format:"Premier" type:"Swiss with Top Cut"
   Players use /register to join
   ```

2. **Auto-Start**
   ```
   /tournament start
   - Calculates Swiss rounds (8 players → 3 rounds)
   - Determines Top Cut size (8 players → Top 2)
   - Generates Round 1 automatically
   ```

3. **Swiss Rounds**
   ```
   Players report with /tournament report
   When round completes:
   - Creator runs /tournament nextround for next Swiss round
   - After final Swiss round, Top Cut starts automatically
   ```

4. **Top Cut (Automatic)**
   ```
   - Seeded bracket: 1st vs 2nd
   - Single elimination
   - Rounds auto-generate as matches complete
   - Finals complete → Tournament ends automatically
   ```

### Swiss Round Calculation
*Applied automatically if rounds not specified during league creation*

- **2 players** → 1 round
- **3-4 players** → 2 rounds
- **5-8 players** → 3 rounds
- **9-16 players** → 4 rounds
- **17-32 players** → 5 rounds
- **33-64 players** → 6 rounds
- **65-128 players** → 7 rounds
- **129+ players** → 8 rounds

**Note:** You can manually override round count when creating a league. The system prevents generating rounds beyond the defined limit.

### Bye Handling
- **Automatic**: Byes are automatically reported as 2-0-0 wins
- Player with bye receives 3 match points and 6 game points
- Marked as completed immediately when round is generated
- No manual reporting needed

### Top Cut Sizes
- **32+ players** → Top 8
- **16-31 players** → Top 4
- **8-15 players** → Top 2
- **< 8 players** → No top cut

## 📚 Documentation

- **Built-in Help**: Use `/league help` for complete in-bot guide
- Automatic tournament progression with Swiss and Top Cut
- All commands use autocomplete for easy league selection
- Creator-only controls for tournament management
- Complete audit trail of all modifications
## 🛠️ Technology Stack

- **Discord.js v14** - Discord bot framework
- **TypeScript v5** - Type-safe development
- **Prisma ORM v5** - Database abstraction
- **Custom Swiss Pairing** - Professional pairing algorithm with tiebreakers
- **SQLite/PostgreSQL/MySQL** - Database options

## 📁 Project Structure

```
src/
├── bot.ts                    # Entry point
├── types/                    # TypeScript interfaces
├── commands/                 # Discord slash commands
│   ├── league.ts            # League management
│   ├── registration.ts      # Player registration
│   ├── tournament.ts        # Tournament operations
│   ├── standings.ts         # Standings display
│   ├── stats.ts             # Player statistics
│   ├── history.ts           # Tournament history
│   └── manualRegister.ts    # Manual registration
├── services/                 # Business logic
│   ├── leagueService.ts     # Main tournament logic
│   ├── tournamentService.ts # In-memory state management
│   └── pairingService.ts    # Swiss pairing algorithm
├── data/
│   ├── repositories/        # Database access layer
│   └── prismaClient.ts
├── utils/
│   ├── swissPairings.ts     # Swiss algorithm
│   └── leaderboard.ts       # Standings calculations
└── events/                   # Discord event handlers
```

## 🎲 Swiss Pairing System

Custom implementation with professional features:

- **First Round**: Random pairings with seeding option
- **Later Rounds**: Match similar records, avoid rematches
- **Bye Handling**: Lowest-ranked player receives bye when odd count
- **Tiebreakers** (in order):
  1. Match Points (Win=3, Draw=1, Loss=0)
  2. OMW% - Opponent Match Win Percentage
  3. GW% - Game Win Percentage
  4. OGW% - Opponent Game Win Percentage

## 🗄️ Database Schema

Core entities with relationships:

- **League** - Tournament configuration, status, round tracking
- **Player** - Discord user profiles with unique IDs
- **Registration** - Player enrollment with match records and tiebreakers
- **Round** - Round metadata and timing
- **Match** - Match results with game-level detail
- **AuditLog** - Complete modification history

## ✨ Advanced Features

### Automatic Tournament Progression
- Swiss rounds calculated based on player count
- Top Cut sizes determined automatically
- Tournaments auto-advance through Top Cut brackets
- Tournaments auto-end when complete

### Round Timer System
- **Optional** timer per tournament (10-180 minutes)
- 5-minute grace period before timer starts
- Automatic announcements:
  - Timer start (after 5 minute grace period)
  - Every 15 minutes during the round
  - Special warnings at 15, 10, and 5 minutes remaining
  - Timer end notification
- Non-blocking: Tournament managers complete rounds manually
- Announcements sent to the channel where tournament was started

### Top Cut Bracket Visualization
- ASCII art elimination brackets for Discord
- Visual display of Quarterfinals, Semifinals, and Finals
- Winner indicators (►) for completed matches
- Support for Top 2, Top 4, and Top 8 brackets
- View live brackets during Top Cut or past brackets from completed tournaments
- Automatic bracket generation based on seeding (1st vs last, 2nd vs 2nd-last, etc.)

### Match Result System
- Results recalculated from raw match data
- Modification of unreported or reported matches
- Automatic standings updates
- Complete audit trail

### Player Statistics
- Career tournament stats across all formats
- Win rates (match and game level)
- Championship tracking
- Head-to-head records
- Server-wide leaderboards

### Tournament History
- Complete archive of past tournaments
- Searchable match database
- Round-by-round pairings
- Final standings preservation

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Follow existing code patterns and TypeScript types
4. Test with multiple tournament scenarios
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 💬 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/discord-league-manager/issues)
- **In-Bot Help**: Use `/league help` command
- **Documentation**: Complete guide available in-bot

## 🙏 Acknowledgments

- Built for the Star Wars: Unlimited TCG community
- Inspired by professional tournament management software
- [Discord.js](https://discord.js.org/) - Discord API library
- [Prisma](https://www.prisma.io/) - Database ORM

## 🗺️ Roadmap

- [x] Automatic tournament progression
- [x] Top Cut with single elimination
- [x] Player statistics and leaderboards
- [x] Tournament history and archives
- [x] Match modification and round repair
- [x] Complete audit logging
- [ ] Web dashboard for standings
- [ ] Tournament bracket visualization
- [ ] Match timer notifications
- [ ] Deck list collection
- [ ] Export tournament data (JSON/CSV)
- [ ] Double elimination support

---

**Made with ❤️ for the TCG community**

*Run professional-grade tournaments directly in Discord with minimal setup!*
