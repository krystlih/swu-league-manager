# API Reference

## Services

### LeagueService

Main business logic service for managing leagues and tournaments.

#### Methods

##### `createLeague(options: CreateLeagueOptions): Promise<League>`

Creates a new league.

**Parameters:**
```typescript
interface CreateLeagueOptions {
  guildId: string;
  name: string;
  description?: string;
  format: string;
  competitionType: CompetitionType;
  hasTopCut?: boolean;
  topCutSize?: number;
  totalRounds?: number;
}
```

**Returns:** `Promise<League>` - The created league

**Throws:** Database errors

---

##### `getLeague(leagueId: number): Promise<League | null>`

Retrieves a league by ID.

**Parameters:**
- `leagueId` - League database ID

**Returns:** `Promise<League | null>` - League or null if not found

---

##### `getActiveLeagues(guildId: string): Promise<League[]>`

Gets all active leagues for a Discord server.

**Parameters:**
- `guildId` - Discord server ID

**Returns:** `Promise<League[]>` - Array of active leagues

---

##### `registerPlayer(leagueId: number, discordId: string, username: string): Promise<void>`

Registers a player for a league.

**Parameters:**
- `leagueId` - League database ID
- `discordId` - Discord user ID
- `username` - Discord username

**Throws:**
- "League not found"
- "League registration is closed"
- "Player is already registered"

---

##### `startLeague(leagueId: number): Promise<void>`

Starts a league, transitioning from REGISTRATION to IN_PROGRESS.

**Parameters:**
- `leagueId` - League database ID

**Throws:**
- "League not found"
- "League has already started"
- "Need at least 2 players to start league"

---

##### `generateNextRound(leagueId: number): Promise<Pairing[]>`

Generates pairings for the next round.

**Parameters:**
- `leagueId` - League database ID

**Returns:** `Promise<Pairing[]>` - Array of pairings

**Throws:**
- "League not found"
- "League is not in progress"
- "Current round is not complete"

---

##### `reportMatchResult(matchId: number, result: MatchResult): Promise<void>`

Reports the result of a match.

**Parameters:**
- `matchId` - Match database ID
- `result` - Match result object
  ```typescript
  interface MatchResult {
    player1Wins: number;
    player2Wins: number;
    draws?: number;
  }
  ```

**Throws:**
- "Match not found"
- "Match already reported"

---

##### `getStandings(leagueId: number): Promise<StandingsEntry[]>`

Gets current standings for a league.

**Parameters:**
- `leagueId` - League database ID

**Returns:** `Promise<StandingsEntry[]>` - Sorted standings

**StandingsEntry Structure:**
```typescript
interface StandingsEntry {
  rank: number;
  playerId: string;
  playerName: string;
  wins: number;
  losses: number;
  draws: number;
  matchPoints: number;
  omwPercent: number;
  gwPercent: number;
  ogwPercent: number;
}
```

---

##### `dropPlayer(leagueId: number, discordId: string): Promise<void>`

Drops a player from a league.

**Parameters:**
- `leagueId` - League database ID
- `discordId` - Discord user ID

**Throws:**
- "Player not found"

---

##### `getCurrentRoundMatches(leagueId: number): Promise<Match[]>`

Gets all matches for the current round.

**Parameters:**
- `leagueId` - League database ID

**Returns:** `Promise<Match[]>` - Array of matches with player details

---

##### `cancelLeague(leagueId: number): Promise<void>`

Cancels a league and cleans up tournament data.

**Parameters:**
- `leagueId` - League database ID

---

### TournamentService

Manages Swiss pairing logic using the tournament-organizer library.

#### Methods

##### `createTournament(leagueId: number, players: Array<{id: number, name: string}>): TournamentData`

Creates a new tournament instance.

**Parameters:**
- `leagueId` - League database ID
- `players` - Array of player objects with database ID and name

**Returns:** `TournamentData` - Tournament data with player mapping

---

##### `generatePairings(leagueId: number): Pairing[]`

Generates Swiss pairings for the next round.

**Parameters:**
- `leagueId` - League database ID

**Returns:** `Pairing[]` - Array of pairings with player names

**Throws:**
- "Tournament not found for league X"

---

##### `reportMatch(leagueId: number, player1Id: string, player2Id: string, result: MatchResult): void`

Reports a match result to the tournament system.

**Parameters:**
- `leagueId` - League database ID
- `player1Id` - Tournament player ID (string)
- `player2Id` - Tournament player ID (string)
- `result` - Match result

---

##### `getStandings(leagueId: number): StandingsEntry[]`

Gets current tournament standings with tiebreakers.

**Parameters:**
- `leagueId` - League database ID

**Returns:** `StandingsEntry[]` - Sorted standings with tiebreakers

---

##### `dropPlayer(leagueId: number, playerId: string): void`

Drops a player from the tournament.

**Parameters:**
- `leagueId` - League database ID
- `playerId` - Tournament player ID (string)

---

##### `getDatabasePlayerId(leagueId: number, tournamentPlayerId: string): number | undefined`

Maps a tournament player ID to database player ID.

**Parameters:**
- `leagueId` - League database ID
- `tournamentPlayerId` - Tournament player ID (string)

**Returns:** `number | undefined` - Database player ID or undefined

---

##### `getTournamentPlayerId(leagueId: number, databasePlayerId: number): string | undefined`

Maps a database player ID to tournament player ID.

**Parameters:**
- `leagueId` - League database ID
- `databasePlayerId` - Database player ID (number)

**Returns:** `string | undefined` - Tournament player ID or undefined

---

##### `deleteTournament(leagueId: number): void`

Removes tournament data from memory.

**Parameters:**
- `leagueId` - League database ID

---

##### `getRecommendedSwissRounds(playerCount: number): number`

Calculates recommended Swiss rounds for player count.

**Parameters:**
- `playerCount` - Number of players

**Returns:** `number` - Recommended rounds (ceil(log2(playerCount)))

---

## Repositories

### LeagueRepository

Database access for League entities.

#### Methods

- `create(options: CreateLeagueOptions): Promise<League>`
- `findById(id: number): Promise<League | null>`
- `findByGuildId(guildId: string): Promise<League[]>`
- `findActiveByGuildId(guildId: string): Promise<League[]>`
- `update(id: number, data: Partial<League>): Promise<League>`
- `delete(id: number): Promise<void>`

---

### PlayerRepository

Database access for Player entities.

#### Methods

- `create(discordId: string, username: string): Promise<Player>`
- `findByDiscordId(discordId: string): Promise<Player | null>`
- `findOrCreate(discordId: string, username: string): Promise<Player>`
- `update(discordId: string, username: string): Promise<Player>`

---

### RegistrationRepository

Database access for Registration entities.

#### Methods

- `create(leagueId: number, playerId: number): Promise<Registration>`
- `findByLeagueAndPlayer(leagueId: number, playerId: number): Promise<Registration | null>`
- `findByLeague(leagueId: number): Promise<Registration[]>`
- `update(id: number, data: Partial<Registration>): Promise<Registration>`
- `getStandings(leagueId: number): Promise<StandingsEntry[]>`
- `drop(leagueId: number, playerId: number): Promise<Registration>`

---

### RoundRepository

Database access for Round entities.

#### Methods

- `create(leagueId: number, roundNumber: number): Promise<Round>`
- `findByLeagueAndRound(leagueId: number, roundNumber: number): Promise<Round | null>`
- `findByLeague(leagueId: number): Promise<Round[]>`

---

### MatchRepository

Database access for Match entities.

#### Methods

- `create(roundId: number, player1Id: number, player2Id: number | null, tableNumber: number): Promise<Match>`
- `findById(id: number): Promise<Match | null>`
- `findByRound(roundId: number): Promise<Match[]>`
- `update(id: number, data: Partial<Match>): Promise<Match>`
- `reportResult(id: number, player1Wins: number, player2Wins: number, draws: number): Promise<Match>`

---

## Type Definitions

### Enums

```typescript
enum CompetitionType {
  SWISS = 'SWISS',
  SWISS_WITH_TOP_CUT = 'SWISS_WITH_TOP_CUT',
  DOUBLE_ELIMINATION = 'DOUBLE_ELIMINATION',
  SINGLE_ELIMINATION = 'SINGLE_ELIMINATION',
}

enum LeagueStatus {
  REGISTRATION = 'REGISTRATION',
  IN_PROGRESS = 'IN_PROGRESS',
  TOP_CUT = 'TOP_CUT',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}
```

### Interfaces

```typescript
interface League {
  id: number;
  guildId: string;
  name: string;
  description?: string;
  format: string;
  competitionType: CompetitionType;
  hasTopCut: boolean;
  topCutSize?: number;
  status: LeagueStatus;
  currentRound: number;
  totalRounds?: number;
  createdAt: Date;
  updatedAt: Date;
}

interface Player {
  id: number;
  discordId: string;
  username: string;
  createdAt: Date;
}

interface Registration {
  id: number;
  leagueId: number;
  playerId: number;
  tournamentId?: string;
  wins: number;
  losses: number;
  draws: number;
  matchPoints: number;
  gamePoints: number;
  omwPercent: number;
  gwPercent: number;
  ogwPercent: number;
  isActive: boolean;
  isDropped: boolean;
  registeredAt: Date;
  player?: Player;
}

interface Round {
  id: number;
  leagueId: number;
  roundNumber: number;
  isTopCut: boolean;
  startedAt: Date;
  completedAt?: Date;
}

interface Match {
  id: number;
  leagueId: number;
  roundId?: number;
  player1Id: number;
  player2Id: number;
  player1Wins: number;
  player2Wins: number;
  draws: number;
  winnerId?: number;
  isDraw: boolean;
  isBye: boolean;
  isCompleted: boolean;
  tableNumber?: number;
  reportedAt?: Date;
  createdAt: Date;
  player1?: Player;
  player2?: Player;
}

interface Pairing {
  tableNumber: number;
  player1Id: string;
  player1Name: string;
  player2Id: string | null;
  player2Name: string | null;
  isBye: boolean;
}

interface StandingsEntry {
  rank: number;
  playerId: string;
  playerName: string;
  wins: number;
  losses: number;
  draws: number;
  matchPoints: number;
  omwPercent: number;
  gwPercent: number;
  ogwPercent: number;
}

interface TournamentData {
  tournament: any;
  playerIdMap: Map<string, number>;
}

interface CreateLeagueOptions {
  guildId: string;
  name: string;
  description?: string;
  format: string;
  competitionType: CompetitionType;
  hasTopCut?: boolean;
  topCutSize?: number;
  totalRounds?: number;
}

interface MatchResult {
  player1Wins: number;
  player2Wins: number;
  draws?: number;
}
```

---

## Error Handling

All service methods throw standard JavaScript `Error` objects with descriptive messages:

```typescript
try {
  await leagueService.startLeague(leagueId);
} catch (error) {
  if (error instanceof Error) {
    console.error(error.message);
    // Handle specific error messages
  }
}
```

Common error messages:
- "League not found"
- "Player not found"
- "Match not found"
- "League registration is closed"
- "League has already started"
- "Need at least 2 players to start league"
- "Current round is not complete"
- "Player is already registered"
- "Match already reported"
- "Tournament not found for league X"

---

## Database Queries

### Prisma Client Usage

```typescript
import { prisma } from './data/prismaClient';

// Find with relations
const league = await prisma.league.findUnique({
  where: { id: leagueId },
  include: {
    registrations: {
      include: { player: true }
    }
  }
});

// Complex filtering
const activeLeagues = await prisma.league.findMany({
  where: {
    guildId,
    status: {
      in: ['REGISTRATION', 'IN_PROGRESS']
    }
  },
  orderBy: { createdAt: 'desc' }
});

// Update with partial data
await prisma.registration.update({
  where: { id: registrationId },
  data: {
    wins: standings.wins,
    matchPoints: standings.matchPoints
  }
});
```

---

## Extension Points

### Custom Tournament Formats

To add new tournament formats:

1. Add to `CompetitionType` enum in `types/index.ts`
2. Update `TournamentService.createTournament()` to handle new format
3. Add choice to `/league create` command in `commands/league.ts`

### Custom Tiebreakers

To modify tiebreaker calculations:

1. Update `tournament-organizer` library configuration
2. Modify `TournamentService.getStandings()` to parse new tiebreakers
3. Update database schema if storing additional stats
4. Update `StandingsEntry` interface

### Additional Commands

To add new commands:

1. Create command file in `src/commands/`
2. Export command object with `data` and `execute`
3. Register in `src/commands/index.ts`
4. Bot automatically registers on startup

---

## Performance Considerations

### Database Queries
- Use `include` to fetch relations in single query
- Add indexes for frequently queried fields (guildId, discordId)
- Use transactions for multi-step operations

### Memory Management
- Tournament instances stored in Map (one per league)
- Clear tournament data when league cancelled
- Consider Redis for multi-instance deployments

### Discord Rate Limits
- Bot automatically handles rate limits
- Defer long operations with `interaction.deferReply()`
- Use embeds to reduce message count
