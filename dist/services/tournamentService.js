"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TournamentService = void 0;
const swissPairings_1 = require("../utils/swissPairings");
class TournamentService {
    constructor() {
        this.tournaments = new Map();
    }
    createTournament(leagueId, players) {
        const playerRecords = new Map();
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
            tournament: {},
            playerIdMap: new Map()
        };
    }
    getTournament(leagueId) {
        const data = this.tournaments.get(leagueId);
        if (!data)
            return undefined;
        return {
            tournament: {},
            playerIdMap: new Map()
        };
    }
    generatePairings(leagueId) {
        let tournamentData = this.tournaments.get(leagueId);
        if (!tournamentData) {
            throw new Error(`Tournament not found for league ${leagueId}. Tournament must be created first.`);
        }
        const { players } = tournamentData;
        const playerArray = Array.from(players.values());
        const swissPairings = swissPairings_1.SwissPairingGenerator.generatePairings(playerArray);
        return swissPairings.map((pairing, index) => ({
            tableNumber: index + 1,
            player1Id: pairing.player1Id.toString(),
            player1Name: pairing.player1Name,
            player2Id: pairing.player2Id ? pairing.player2Id.toString() : null,
            player2Name: pairing.player2Name,
            isBye: pairing.isBye,
        }));
    }
    reportMatch(leagueId, player1Id, player2Id, result) {
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
        }
        else if (result.player2Wins > result.player1Wins) {
            player2.wins++;
            player1.losses++;
        }
        else {
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
    getStandings(leagueId) {
        const tournamentData = this.tournaments.get(leagueId);
        if (!tournamentData) {
            throw new Error(`Tournament not found for league ${leagueId}`);
        }
        const { players } = tournamentData;
        const playerArray = Array.from(players.values());
        const sortedPlayers = playerArray.sort((a, b) => {
            if (b.matchPoints !== a.matchPoints)
                return b.matchPoints - a.matchPoints;
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
    dropPlayer(leagueId, playerId) {
        const tournamentData = this.tournaments.get(leagueId);
        if (!tournamentData) {
            throw new Error(`Tournament not found for league ${leagueId}`);
        }
        const { players } = tournamentData;
        const pId = parseInt(playerId);
        players.delete(pId);
    }
    recalculateTiebreakers(leagueId) {
        const tournamentData = this.tournaments.get(leagueId);
        if (!tournamentData)
            return;
        const { players } = tournamentData;
        const playerArray = Array.from(players.values());
        playerArray.forEach(player => {
            player.matchPoints = swissPairings_1.SwissPairingGenerator.calculateMatchPoints(player.wins, player.losses, player.draws);
            player.gameWinPercentage = swissPairings_1.SwissPairingGenerator.calculateGWP(player.wins, player.losses);
        });
        playerArray.forEach(player => {
            player.opponentMatchWinPercentage = swissPairings_1.SwissPairingGenerator.calculateOMW(player.opponents, playerArray);
            player.opponentGameWinPercentage = swissPairings_1.SwissPairingGenerator.calculateOGW(player.opponents, playerArray);
        });
    }
    getDatabasePlayerId(leagueId, tournamentPlayerId) {
        return parseInt(tournamentPlayerId);
    }
    getTournamentPlayerId(leagueId, dbPlayerId) {
        const tournamentData = this.tournaments.get(leagueId);
        if (!tournamentData)
            return undefined;
        if (tournamentData.players.has(dbPlayerId)) {
            return dbPlayerId.toString();
        }
        return undefined;
    }
    /**
     * Rebuild tournament state from database registrations and matches
     * This is useful when the bot restarts and loses in-memory state
     */
    async rebuildFromDatabase(leagueId, registrations, matches) {
        // Create player records from registrations
        const playerRecords = new Map();
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
    deleteTournament(leagueId) {
        this.tournaments.delete(leagueId);
    }
}
exports.TournamentService = TournamentService;
