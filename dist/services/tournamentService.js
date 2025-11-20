"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TournamentService = void 0;
const tournament_organizer_1 = __importDefault(require("tournament-organizer"));
class TournamentService {
    constructor() {
        this.tournaments = new Map();
    }
    createTournament(leagueId, players) {
        const tournament = new tournament_organizer_1.default();
        const playerIdMap = new Map();
        // Add players
        players.forEach((player) => {
            const tournamentPlayerId = tournament.addPlayer(player.name);
            playerIdMap.set(tournamentPlayerId, player.id);
        });
        // Set to Swiss format
        tournament.setFormat('Swiss');
        const tournamentData = { tournament, playerIdMap };
        this.tournaments.set(leagueId, tournamentData);
        return tournamentData;
    }
    getTournament(leagueId) {
        return this.tournaments.get(leagueId);
    }
    generatePairings(leagueId) {
        const tournamentData = this.tournaments.get(leagueId);
        if (!tournamentData) {
            throw new Error(`Tournament not found for league ${leagueId}`);
        }
        const { tournament, playerIdMap } = tournamentData;
        const pairings = tournament.pair();
        return pairings.map((pairing, index) => {
            const player1Id = pairing[0];
            const player2Id = pairing[1] || null;
            const isBye = !player2Id;
            // Get player names from tournament
            const participants = tournament.getPlayers();
            const player1 = participants.find((p) => p.id === player1Id);
            const player2 = player2Id ? participants.find((p) => p.id === player2Id) : null;
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
    reportMatch(leagueId, player1Id, player2Id, result) {
        const tournamentData = this.tournaments.get(leagueId);
        if (!tournamentData) {
            throw new Error(`Tournament not found for league ${leagueId}`);
        }
        const { tournament } = tournamentData;
        const draws = result.draws || 0;
        tournament.reportResult(player1Id, player2Id, [result.player1Wins, result.player2Wins, draws]);
    }
    getStandings(leagueId) {
        const tournamentData = this.tournaments.get(leagueId);
        if (!tournamentData) {
            throw new Error(`Tournament not found for league ${leagueId}`);
        }
        const { tournament } = tournamentData;
        const standings = tournament.getRankings();
        return standings.map((standing, index) => {
            const playerId = typeof standing === 'string' ? standing : standing.id;
            const stats = tournament.getStats(playerId);
            const tiebreakers = stats.tiebreakers || [0, 0, 0];
            // Get player name
            const participants = tournament.getPlayers();
            const player = participants.find((p) => p.id === playerId);
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
    dropPlayer(leagueId, playerId) {
        const tournamentData = this.tournaments.get(leagueId);
        if (!tournamentData) {
            throw new Error(`Tournament not found for league ${leagueId}`);
        }
        const { tournament } = tournamentData;
        tournament.dropPlayer(playerId);
    }
    getDatabasePlayerId(leagueId, tournamentPlayerId) {
        const tournamentData = this.tournaments.get(leagueId);
        if (!tournamentData) {
            throw new Error(`Tournament not found for league ${leagueId}`);
        }
        return tournamentData.playerIdMap.get(tournamentPlayerId);
    }
    getTournamentPlayerId(leagueId, databasePlayerId) {
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
    deleteTournament(leagueId) {
        this.tournaments.delete(leagueId);
    }
    getRecommendedSwissRounds(playerCount) {
        return Math.ceil(Math.log2(playerCount));
    }
}
exports.TournamentService = TournamentService;
