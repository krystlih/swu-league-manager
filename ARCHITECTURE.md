# Discord League Manager - Architecture Documentation

## Project Overview

A Discord bot for managing TCG (Trading Card Game) leagues with automated Swiss pairing, comprehensive standings tracking, and support for multiple tournament formats.

## Technology Stack

- **Discord.js v14**: Discord bot framework with slash commands
- **TypeScript v5**: Type-safe development
- **Prisma ORM v5**: Database abstraction and type-safe queries
- **SQLite**: Default database (configurable to PostgreSQL/MySQL)
- **tournament-organizer v4**: Swiss pairing algorithm library
- **Node.js 18+**: Runtime environment

## Architecture Pattern

The project follows a **layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────┐
│         Discord Commands Layer          │
│    (User Interface - Slash Commands)    │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│          Service Layer                  │
│  (Business Logic - LeagueService, etc)  │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│       Repository Layer                  │
│   (Data Access - CRUD Operations)       │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│          Database Layer                 │
│      (Prisma + SQLite/PostgreSQL)       │
└─────────────────────────────────────────┘
```

## Directory Structure

```
discord-league-manager/
├── src/
│   ├── bot.ts                      # Entry point, bot initialization
│   ├── types/
│   │   └── index.ts                # TypeScript interfaces & enums
│   ├── data/
│   │   ├── prismaClient.ts         # Prisma client singleton
│   │   └── repositories/           # Data access layer
│   │       ├── leagueRepository.ts
│   │       ├── playerRepository.ts
│   │       ├── registrationRepository.ts
│   │       ├── roundRepository.ts
│   │       └── matchRepository.ts
│   ├── services/                   # Business logic layer
│   │   ├── leagueService.ts        # Main tournament orchestration
│   │   └── tournamentService.ts    # Swiss pairing wrapper
│   ├── commands/                   # Discord slash commands
│   │   ├── index.ts                # Command collection
│   │   ├── tournament.ts           # Tournament management & operations
│   │   ├── registration.ts         # Player registration
│   │   └── standings.ts            # View standings
│   └── events/                     # Discord event handlers
│       ├── ready.ts                # Bot ready event
│       └── interactionCreate.ts    # Command routing
├── prisma/
│   └── schema.prisma               # Database schema
├── package.json
├── tsconfig.json
└── .env                            # Environment variables
```

## Layer Responsibilities

### 1. Commands Layer (`src/commands/`)

**Purpose**: Handle Discord interactions and format responses

**Responsibilities**:
- Parse slash command options
- Validate user input
- Call service layer methods
- Format responses as embeds
- Handle errors gracefully

**Example**:
```typescript
// commands/tournament.ts
export const tournamentCommand = {
  data: new SlashCommandBuilder()
    .setName('tournament')
    .addSubcommand(...),
  
  async execute(interaction: ChatInputCommandInteraction) {
    const name = interaction.options.getString('name', true);
    const tournament = await leagueService.createLeague({...});
    await interaction.reply({ embeds: [embed] });
  }
};
```

### 2. Service Layer (`src/services/`)

**Purpose**: Implement business logic and orchestrate operations

**Responsibilities**:
- Coordinate between repositories
- Enforce business rules
- Manage transactions
- Handle complex workflows
- Bridge database and tournament systems

**Key Services**:

#### LeagueService
- Creates and manages leagues
- Registers players
- Starts tournaments
- Generates rounds
- Reports match results
- Updates standings
- Handles player drops

#### TournamentService
- Wraps `tournament-organizer` library
- Manages tournament state in memory
- Generates Swiss pairings
- Calculates tiebreakers
- Maps between database IDs and tournament IDs

### 3. Repository Layer (`src/data/repositories/`)

**Purpose**: Abstract database operations

**Responsibilities**:
- CRUD operations
- Query construction
- Data mapping
- Single responsibility per entity

**Pattern**:
```typescript
export class LeagueRepository {
  async create(options: CreateLeagueOptions): Promise<League> {
    return prisma.league.create({ data: {...} });
  }
  
  async findById(id: number): Promise<League | null> {
    return prisma.league.findUnique({ where: { id } });
  }
  
  async update(id: number, data: Partial<League>): Promise<League> {
    return prisma.league.update({ where: { id }, data });
  }
}
```

### 4. Database Layer

**Purpose**: Persist all application data

**Managed by**: Prisma ORM

**Schema Overview**:
- `League`: Tournament configurations
- `Player`: User profiles (Discord ID mapping)
- `Registration`: Player enrollment in leagues
- `Round`: Round tracking
- `Match`: Individual match results

## Data Flow Examples

### Creating and Starting a Tournament

```
User: /tournament create name:"FNM" format:"Modern" type:"Swiss"
  ↓
TournamentCommand
  ↓ (parse options)
LeagueService.createLeague()
  ↓ (validate, prepare data)
LeagueRepository.create()
  ↓ (execute query)
Database: INSERT INTO League
  ↑ (return League)
LeagueRepository
  ↑ (return League)
LeagueService
  ↑ (format response)
TournamentCommand
  ↓ (send embed)
Discord: Shows success message
```

### Generating Round Pairings

```
User: /tournament nextround league_id:1
  ↓
TournamentCommand
  ↓
LeagueService.generateNextRound()
  ├→ Verify round complete (MatchRepository)
  ├→ Get registrations (RegistrationRepository)
  ├→ TournamentService.generatePairings()
  │   └→ tournament-organizer.pair()
  ├→ Create Round (RoundRepository)
  ├→ Create Matches (MatchRepository)
  └→ Update League (LeagueRepository)
  ↑ (return Pairings)
TournamentCommand
  ↓ (format as embed)
Discord: Shows pairings table
```

### Reporting Match Results

```
User: /tournament report match_id:5 player1_wins:2 player2_wins:1
  ↓
TournamentCommand
  ↓
LeagueService.reportMatchResult()
  ├→ Get Match (MatchRepository)
  ├→ Update Match (MatchRepository)
  ├→ TournamentService.reportMatch()
  │   └→ tournament-organizer.reportResult()
  ├→ TournamentService.getStandings()
  └→ Update Registrations (RegistrationRepository)
  ↑ (success)
TournamentCommand
  ↓
Discord: Confirms result reported
```

## Key Design Decisions

### 1. Multi-Tenant by Guild ID

Every league is scoped to a Discord server (`guildId`). This allows:
- Multiple servers using the same bot
- Isolated data per community
- No cross-server interference

```typescript
interface League {
  guildId: string;  // Discord server ID
  // ... other fields
}
```

### 2. In-Memory Tournament State

The `TournamentService` keeps tournament instances in memory:
- **Pros**: Fast pairing generation, no database overhead for temp data
- **Cons**: Lost on restart (regenerate from database)
- **Tradeoff**: Acceptable since pairings are stored in `Match` table

```typescript
private tournaments: Map<number, TournamentData> = new Map();
```

### 3. Dual ID System

Players have two IDs:
- **Database ID**: Integer, used in all database relations
- **Tournament ID**: String, used by tournament-organizer library

```typescript
interface TournamentData {
  tournament: any;
  playerIdMap: Map<string, number>;  // Maps tournament ID → database ID
}
```

### 4. Repository Pattern

Separates data access from business logic:
- Easy to test (mock repositories)
- Swap database implementations
- Centralized query logic

### 5. Type Safety

TypeScript interfaces ensure:
- Compile-time error checking
- IDE autocomplete
- Self-documenting code
- Reduced runtime errors

## Database Schema

### Enums

```prisma
enum CompetitionType {
  SWISS
  SWISS_WITH_TOP_CUT
  DOUBLE_ELIMINATION
  SINGLE_ELIMINATION
}

enum LeagueStatus {
  REGISTRATION
  IN_PROGRESS
  TOP_CUT
  COMPLETED
  CANCELLED
}
```

### Entity Relationships

```
League (1) ←→ (N) Registration
Player (1) ←→ (N) Registration
League (1) ←→ (N) Round
Round (1) ←→ (N) Match
Player (1) ←→ (N) Match (as player1 or player2)
```

### Key Fields

**League**:
- `guildId`: Server isolation
- `competitionType`: Tournament format
- `status`: Workflow state
- `currentRound`: Progress tracking

**Registration**:
- `wins`, `losses`, `draws`: Match record
- `matchPoints`: Primary ranking
- `omwPercent`, `gwPercent`, `ogwPercent`: Tiebreakers
- `isActive`: Handle drops

**Match**:
- `player1Id`, `player2Id`: Pairing (nullable for BYE)
- `player1Wins`, `player2Wins`, `draws`: Game results
- `isCompleted`: Status tracking
- `tableNumber`: Organization

## Swiss Pairing Algorithm

Powered by `tournament-organizer` library:

1. **Initialization**: Add all players to tournament
2. **Round 1**: Random pairings
3. **Subsequent Rounds**:
   - Sort players by match points
   - Pair top half together, bottom half together
   - Avoid repeat pairings
   - Handle BYEs for odd counts
4. **Tiebreakers**: Calculated automatically
   - OMW%: Opponent strength
   - GW%: Individual game performance
   - OGW%: Opponent game strength

## Error Handling Strategy

### Command Level
```typescript
try {
  await leagueService.createLeague(...);
} catch (error) {
  await interaction.reply({
    content: `Error: ${error.message}`,
    ephemeral: true  // Only visible to user
  });
}
```

### Service Level
```typescript
if (league.status !== LeagueStatus.REGISTRATION) {
  throw new Error('League registration is closed');
}
```

### Repository Level
```typescript
// Prisma throws PrismaClientKnownRequestError
// Caught and re-thrown with friendly messages
```

## Testing Considerations

### Testable Components
- Repositories (mock Prisma)
- Services (mock repositories)
- Commands (mock Discord interactions)

### Example Test Structure
```typescript
describe('LeagueService', () => {
  let leagueService: LeagueService;
  let mockLeagueRepo: jest.Mocked<LeagueRepository>;
  
  beforeEach(() => {
    mockLeagueRepo = createMockLeagueRepo();
    leagueService = new LeagueService(mockLeagueRepo, ...);
  });
  
  it('should create a league', async () => {
    const result = await leagueService.createLeague({...});
    expect(mockLeagueRepo.create).toHaveBeenCalled();
  });
});
```

## Scaling Considerations

### Current Limitations
- In-memory tournament state (single instance)
- SQLite default (single file, limited concurrency)

### Scaling Path
1. **Database**: Switch to PostgreSQL for multi-user concurrency
2. **Tournament State**: Store in Redis for multi-instance support
3. **Caching**: Add Redis for standings/leaderboards
4. **Sharding**: Discord.js sharding for large bot deployments

## Configuration

### Environment Variables
```env
DISCORD_TOKEN=        # Bot authentication
CLIENT_ID=            # Application ID
DATABASE_URL=         # Database connection string
```

### Prisma Configuration
```prisma
datasource db {
  provider = "sqlite"  // or "postgresql", "mysql"
  url      = env("DATABASE_URL")
}
```

## Security Considerations

1. **Token Security**: Never commit `.env` to version control
2. **Permission Checks**: Discord handles command permissions
3. **Input Validation**: All user inputs validated before processing
4. **SQL Injection**: Prevented by Prisma (parameterized queries)
5. **Guild Isolation**: `guildId` filtering prevents cross-server access

## Future Enhancements

### Potential Features
- Web dashboard for standings
- Export tournament data (CSV/JSON)
- Match timer with notifications
- Player statistics over time
- Deck list collection
- Tournament brackets visualization
- Role-based permissions (TO vs players)
- Multi-language support

### Technical Improvements
- Add unit tests
- Implement logging (Winston/Pino)
- Add health check endpoints
- Metrics collection (Prometheus)
- Docker containerization
- CI/CD pipeline

## Dependencies

### Production
```json
{
  "discord.js": "^14.0.0",      // Discord API
  "@prisma/client": "^5.0.0",   // Database ORM
  "tournament-organizer": "^4.0.0", // Pairing logic
  "dotenv": "^16.0.0"           // Environment variables
}
```

### Development
```json
{
  "typescript": "^5.0.0",
  "@types/node": "^20.0.0",
  "ts-node": "^10.0.0",
  "prisma": "^5.0.0"
}
```

## Maintenance

### Database Migrations
```bash
# Create migration
npx prisma migrate dev --name description

# Apply to production
npx prisma migrate deploy
```

### Backup Strategy
```bash
# SQLite
cp dev.db backup.db

# PostgreSQL
pg_dump league_db > backup.sql
```

### Monitoring
- Check bot uptime
- Monitor error logs
- Track command usage
- Database size
- Response times

## Contributing Guidelines

1. Follow existing architecture patterns
2. Maintain layer separation
3. Add TypeScript types for new features
4. Update Prisma schema with migrations
5. Document new commands in USAGE.md
6. Test with multiple concurrent leagues
