import { TournamentData, Pairing, StandingsEntry, MatchResult } from '../types';
import { SwissPairingGenerator, PlayerRecord } from '../utils/swissPairings';

export class TournamentService {
  private tournaments: Map<number, { 
    players: Map<number, PlayerRecord>;
    currentRound: number;
  }> = new Map();

  createTournament(
    leagueId: number,
    players: Array<{ id: number; name: string }>
  ): TournamentData {
    const playerRecords = new Map<number, PlayerRecord>();
    
    players.forEach((player) => {
      playerRecords.set(player.id, {
        id: player.id,
        name: player.name,
        wins: 0,
        losses: 0,
        draws: 0,
        matchPoints: 0,
        opponentMatchWinPercentage: 0,
        gameWinPercentage: 0,
        opponentGameWinPercentage: 0,
        opponents: [],
      });
    });

    this.tournaments.set(leagueId, {
      players: playerRecords,
      currentRound: 0,
    });
    
    return { 
      tournament: {} as any, 
      playerIdMap: new Map()
    };
  }

  getTournament(leagueId: number): TournamentData | undefined {
    const data = this.tournaments.get(leagueId);
    if (!data) return undefined;
    
    return { 
      tournament: {} as any, 
      playerIdMap: new Map()
    };
  }

  generatePairings(leagueId: number): Pairing[] {
    let tournamentData = this.tournaments.get(leagueId);
    if (!tournamentData) {
      throw new Error(`Tournament not found for league ${leagueId}. Tournament must be created first.`);
    }

    const { players } = tournamentData;
    const playerArray = Array.from(players.values());
    const swissPairings = SwissPairingGenerator.generatePairings(playerArray);
    
    return swissPairings.map((pairing, index) => ({
      tableNumber: index + 1,
      player1Id: pairing.player1Id.toString(),
      player1Name: pairing.player1Name,
      player2Id: pairing.player2Id ? pairing.player2Id.toString() : null,
      player2Name: pairing.player2Name,
      isBye: pairing.isBye,
    }));
  }

  reportMatch(
    leagueId: number,
    player1Id: string,
    player2Id: string,
    result: MatchResult
  ): void {
    const tournamentData = this.tournaments.get(leagueId);
    if (!tournamentData) {
      throw new Error(`Tournament not found for league ${leagueId}`);
    }

    const { players } = tournamentData;
    const p1Id = parseInt(player1Id);
    const p2Id = parseInt(player2Id);
    
    const player1 = players.get(p1Id);
    const player2 = players.get(p2Id);
    
    if (!player1 || !player2) {
      throw new Error('Player not found');
    }

    if (result.player1Wins > result.player2Wins) {
      player1.wins++;
      player2.losses++;
    } else if (result.player2Wins > result.player1Wins) {
      player2.wins++;
      player1.losses++;
    } else {
      player1.draws++;
      player2.draws++;
    }

    if (!player1.opponents.includes(p2Id)) {
      player1.opponents.push(p2Id);
    }
    if (!player2.opponents.includes(p1Id)) {
      player2.opponents.push(p1Id);
    }

    this.recalculateTiebreakers(leagueId);
  }

  getStandings(leagueId: number): StandingsEntry[] {
    const tournamentData = this.tournaments.get(leagueId);
    if (!tournamentData) {
      throw new Error(`Tournament not found for league ${leagueId}`);
    }

    const { players } = tournamentData;
    const playerArray = Array.from(players.values());
    
    const sortedPlayers = playerArray.sort((a, b) => {
      if (b.matchPoints !== a.matchPoints) return b.matchPoints - a.matchPoints;
      if (b.opponentMatchWinPercentage !== a.opponentMatchWinPercentage) 
        return b.opponentMatchWinPercentage - a.opponentMatchWinPercentage;
      if (b.gameWinPercentage !== a.gameWinPercentage) 
        return b.gameWinPercentage - a.gameWinPercentage;
      return b.opponentGameWinPercentage - a.opponentGameWinPercentage;
    });

    return sortedPlayers.map((player, index) => ({
      playerId: player.id.toString(),
      rank: index + 1,
      playerName: player.name,
      wins: player.wins,
      losses: player.losses,
      draws: player.draws,
      matchPoints: player.matchPoints,
      omwPercent: player.opponentMatchWinPercentage * 100,
      gwPercent: player.gameWinPercentage * 100,
      ogwPercent: player.opponentGameWinPercentage * 100,
    }));
  }

  dropPlayer(leagueId: number, playerId: string): void {
    const tournamentData = this.tournaments.get(leagueId);
    if (!tournamentData) {
      throw new Error(`Tournament not found for league ${leagueId}`);
    }

    const { players } = tournamentData;
    const pId = parseInt(playerId);
    players.delete(pId);
  }

  private recalculateTiebreakers(leagueId: number): void {
    const tournamentData = this.tournaments.get(leagueId);
    if (!tournamentData) return;

    const { players } = tournamentData;
    const playerArray = Array.from(players.values());

    playerArray.forEach(player => {
      player.matchPoints = SwissPairingGenerator.calculateMatchPoints(
        player.wins, player.losses, player.draws
      );
      player.gameWinPercentage = SwissPairingGenerator.calculateGWP(
        player.wins, player.losses
      );
    });

    playerArray.forEach(player => {
      player.opponentMatchWinPercentage = SwissPairingGenerator.calculateOMW(
        player.opponents, playerArray
      );
      player.opponentGameWinPercentage = SwissPairingGenerator.calculateOGW(
        player.opponents, playerArray
      );
    });
  }

  getDatabasePlayerId(leagueId: number, tournamentPlayerId: string): number | undefined {
    return parseInt(tournamentPlayerId);
  }

  getTournamentPlayerId(leagueId: number, dbPlayerId: number): string | undefined {
    const tournamentData = this.tournaments.get(leagueId);
    if (!tournamentData) return undefined;
    
    if (tournamentData.players.has(dbPlayerId)) {
      return dbPlayerId.toString();
    }
    return undefined;
  }

  /**
   * Rebuild tournament state from database registrations and matches
   * This is useful when the bot restarts and loses in-memory state
   */
  async rebuildFromDatabase(
    leagueId: number,
    registrations: Array<{ 
      playerId: number; 
      player?: { username: string } | null;
      wins: number;
      losses: number;
      draws: number;
    }>,
    matches: Array<{
      player1Id: number;
      player2Id?: number | null;
      winnerId?: number | null;
      isDraw?: boolean;
      isCompleted?: boolean;
    }>
  ): Promise<void> {
    // Create player records from registrations
    const playerRecords = new Map<number, PlayerRecord>();
    
    registrations.forEach((reg) => {
      playerRecords.set(reg.playerId, {
        id: reg.playerId,
        name: reg.player?.username || 'Unknown',
        wins: reg.wins,
        losses: reg.losses,
        draws: reg.draws,
        matchPoints: 0,
        opponentMatchWinPercentage: 0,
        gameWinPercentage: 0,
        opponentGameWinPercentage: 0,
        opponents: [],
      });
    });

    // Rebuild opponent history from completed matches
    matches.forEach((match) => {
      if (match.isCompleted && match.player2Id) {
        const player1 = playerRecords.get(match.player1Id);
        const player2 = playerRecords.get(match.player2Id);
        
        if (player1 && !player1.opponents.includes(match.player2Id)) {
          player1.opponents.push(match.player2Id);
        }
        if (player2 && !player2.opponents.includes(match.player1Id)) {
          player2.opponents.push(match.player1Id);
        }
      }
    });

    // Store the rebuilt tournament
    this.tournaments.set(leagueId, {
      players: playerRecords,
      currentRound: 0, // Will be updated from league.currentRound
    });

    // Recalculate tiebreakers
    this.recalculateTiebreakers(leagueId);
  }

  deleteTournament(leagueId: number): void {
    this.tournaments.delete(leagueId);
  }
}
