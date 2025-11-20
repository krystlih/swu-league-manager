import Manager from 'tournament-organizer';
import { TournamentData, Pairing, StandingsEntry, MatchResult } from '../types';

export class TournamentService {
  private tournaments: Map<number, TournamentData> = new Map();

  createTournament(
    leagueId: number,
    players: Array<{ id: number; name: string }>
  ): TournamentData {
    const tournament = new Manager() as any;
    const playerIdMap = new Map<string, number>();

    // Add players
    players.forEach((player) => {
      const tournamentPlayerId = tournament.addPlayer(player.name);
      playerIdMap.set(tournamentPlayerId, player.id);
    });

    // Set to Swiss format
    tournament.setFormat('Swiss');

    const tournamentData: TournamentData = { tournament, playerIdMap };
    this.tournaments.set(leagueId, tournamentData);
    return tournamentData;
  }

  getTournament(leagueId: number): TournamentData | undefined {
    return this.tournaments.get(leagueId);
  }

  generatePairings(leagueId: number): Pairing[] {
    const tournamentData = this.tournaments.get(leagueId);
    if (!tournamentData) {
      throw new Error(`Tournament not found for league ${leagueId}`);
    }

    const { tournament, playerIdMap } = tournamentData;
    const pairings = (tournament as any).pair();

    return pairings.map((pairing: any, index: number) => {
      const player1Id = pairing[0];
      const player2Id = pairing[1] || null;
      const isBye = !player2Id;

      // Get player names from tournament
      const participants = (tournament as any).getPlayers();
      const player1 = participants.find((p: any) => p.id === player1Id);
      const player2 = player2Id ? participants.find((p: any) => p.id === player2Id) : null;

      return {
        tableNumber: index + 1,
        player1Id,
        player1Name: player1?.name || '',
        player2Id,
        player2Name: player2?.name || null,
        isBye,
      };
    });
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

    const { tournament } = tournamentData;
    const draws = result.draws || 0;
    (tournament as any).reportResult(player1Id, player2Id, [result.player1Wins, result.player2Wins, draws]);
  }

  getStandings(leagueId: number): StandingsEntry[] {
    const tournamentData = this.tournaments.get(leagueId);
    if (!tournamentData) {
      throw new Error(`Tournament not found for league ${leagueId}`);
    }

    const { tournament } = tournamentData;
    const standings = (tournament as any).getRankings();

    return standings.map((standing: any, index: number) => {
      const playerId = typeof standing === 'string' ? standing : standing.id;
      const stats = (tournament as any).getStats(playerId);
      const tiebreakers = stats.tiebreakers || [0, 0, 0];
      
      // Get player name
      const participants = (tournament as any).getPlayers();
      const player = participants.find((p: any) => p.id === playerId);
      
      return {
        playerId,
        rank: index + 1,
        playerName: player?.name || '',
        wins: stats.wins || 0,
        losses: stats.losses || 0,
        draws: stats.draws || 0,
        matchPoints: stats.points || 0,
        omwPercent: (tiebreakers[0] || 0) * 100,
        gwPercent: (tiebreakers[1] || 0) * 100,
        ogwPercent: (tiebreakers[2] || 0) * 100,
      };
    });
  }

  dropPlayer(leagueId: number, playerId: string): void {
    const tournamentData = this.tournaments.get(leagueId);
    if (!tournamentData) {
      throw new Error(`Tournament not found for league ${leagueId}`);
    }

    const { tournament } = tournamentData;
    (tournament as any).dropPlayer(playerId);
  }

  getDatabasePlayerId(leagueId: number, tournamentPlayerId: string): number | undefined {
    const tournamentData = this.tournaments.get(leagueId);
    if (!tournamentData) {
      throw new Error(`Tournament not found for league ${leagueId}`);
    }

    return tournamentData.playerIdMap.get(tournamentPlayerId);
  }

  getTournamentPlayerId(leagueId: number, databasePlayerId: number): string | undefined {
    const tournamentData = this.tournaments.get(leagueId);
    if (!tournamentData) {
      throw new Error(`Tournament not found for league ${leagueId}`);
    }

    for (const [tournamentId, dbId] of tournamentData.playerIdMap.entries()) {
      if (dbId === databasePlayerId) {
        return tournamentId;
      }
    }

    return undefined;
  }

  deleteTournament(leagueId: number): void {
    this.tournaments.delete(leagueId);
  }

  getRecommendedSwissRounds(playerCount: number): number {
    return Math.ceil(Math.log2(playerCount));
  }
}
