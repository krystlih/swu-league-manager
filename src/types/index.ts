export enum CompetitionType {
  SWISS = 'SWISS',
  SWISS_WITH_TOP_CUT = 'SWISS_WITH_TOP_CUT',
  DOUBLE_ELIMINATION = 'DOUBLE_ELIMINATION',
  SINGLE_ELIMINATION = 'SINGLE_ELIMINATION',
}

export enum LeagueStatus {
  REGISTRATION = 'REGISTRATION',
  IN_PROGRESS = 'IN_PROGRESS',
  TOP_CUT = 'TOP_CUT',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface League {
  id: number;
  guildId: string;
  createdBy: string;
  name: string;
  description?: string | null;
  format: string;
  competitionType: string; // CompetitionType enum values as strings
  hasTopCut: boolean;
  topCutSize?: number | null;
  status: string; // LeagueStatus enum values as strings
  currentRound: number;
  totalRounds?: number | null;
  roundTimerMinutes?: number | null;
  announcementChannelId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Player {
  id: number;
  discordId: string;
  username: string;
  createdAt: Date;
}

export interface Registration {
  id: number;
  leagueId: number;
  playerId: number;
  tournamentId?: string | null;
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

export interface Round {
  id: number;
  leagueId: number;
  roundNumber: number;
  isTopCut: boolean;
  startedAt: Date;
  completedAt?: Date | null;
}

export interface Match {
  id: number;
  leagueId: number;
  roundId?: number | null;
  player1Id: number;
  player2Id: number | null;
  player1Wins: number;
  player2Wins: number;
  draws: number;
  winnerId?: number | null;
  isDraw: boolean;
  isBye: boolean;
  isCompleted: boolean;
  tableNumber?: number | null;
  bracketPosition?: string | null;
  isLosersBracket?: boolean;
  isGrandFinals?: boolean;
  isBracketReset?: boolean;
  reportedAt?: Date | null;
  createdAt: Date;
  player1?: Player;
  player2?: Player | null;
  round?: Round | null;
}

export interface Pairing {
  tableNumber: number;
  player1Id: string;
  player1Name: string;
  player2Id: string | null;
  player2Name: string | null;
  isBye: boolean;
}

export interface StandingsEntry {
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

export interface TournamentData {
  tournament: any;
  playerIdMap: Map<string, number>;
}

export interface CreateLeagueOptions {
  guildId: string;
  createdBy: string;
  name: string;
  description?: string;
  format: string;
  competitionType: CompetitionType;
  hasTopCut?: boolean;
  topCutSize?: number;
  totalRounds?: number;
  roundTimerMinutes?: number;
}

export interface MatchResult {
  player1Wins: number;
  player2Wins: number;
  draws?: number;
}

export interface AuditLog {
  id: number;
  leagueId: number;
  userId: string;
  username: string;
  action: string;
  entityType: string;
  entityId?: number | null;
  oldValue?: string | null;
  newValue?: string | null;
  description: string;
  createdAt: Date;
}
