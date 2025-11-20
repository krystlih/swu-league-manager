"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeagueService = void 0;
const leagueRepository_1 = require("../data/repositories/leagueRepository");
const playerRepository_1 = require("../data/repositories/playerRepository");
const registrationRepository_1 = require("../data/repositories/registrationRepository");
const roundRepository_1 = require("../data/repositories/roundRepository");
const matchRepository_1 = require("../data/repositories/matchRepository");
const tournamentService_1 = require("./tournamentService");
const types_1 = require("../types");
class LeagueService {
    constructor() {
        this.leagueRepo = new leagueRepository_1.LeagueRepository();
        this.playerRepo = new playerRepository_1.PlayerRepository();
        this.registrationRepo = new registrationRepository_1.RegistrationRepository();
        this.roundRepo = new roundRepository_1.RoundRepository();
        this.matchRepo = new matchRepository_1.MatchRepository();
        this.tournamentService = new tournamentService_1.TournamentService();
    }
    async createLeague(options) {
        return this.leagueRepo.create(options);
    }
    async getLeague(leagueId) {
        return this.leagueRepo.findById(leagueId);
    }
    async getActiveLeagues(guildId) {
        return this.leagueRepo.findActiveByGuildId(guildId);
    }
    async registerPlayer(leagueId, discordId, username) {
        const league = await this.leagueRepo.findById(leagueId);
        if (!league) {
            throw new Error('League not found');
        }
        if (league.status !== types_1.LeagueStatus.REGISTRATION) {
            throw new Error('League registration is closed');
        }
        const player = await this.playerRepo.findOrCreate(discordId, username);
        const existing = await this.registrationRepo.findByLeagueAndPlayer(leagueId, player.id);
        if (existing) {
            throw new Error('Player is already registered');
        }
        await this.registrationRepo.create(leagueId, player.id);
    }
    async startLeague(leagueId) {
        const league = await this.leagueRepo.findById(leagueId);
        if (!league) {
            throw new Error('League not found');
        }
        if (league.status !== types_1.LeagueStatus.REGISTRATION) {
            throw new Error('League has already started');
        }
        const registrations = await this.registrationRepo.findByLeague(leagueId);
        if (registrations.length < 2) {
            throw new Error('Need at least 2 players to start league');
        }
        // Create tournament
        const players = registrations.map(reg => ({
            id: reg.playerId,
            name: reg.player?.username || 'Unknown',
        }));
        await this.tournamentService.createTournament(leagueId, players);
        // Update league status
        await this.leagueRepo.update(leagueId, {
            status: types_1.LeagueStatus.IN_PROGRESS,
        });
    }
    async generateNextRound(leagueId) {
        const league = await this.leagueRepo.findById(leagueId);
        if (!league) {
            throw new Error('League not found');
        }
        if (league.status !== types_1.LeagueStatus.IN_PROGRESS) {
            throw new Error('League is not in progress');
        }
        // Check if current round is complete
        if (league.currentRound > 0) {
            const currentRound = await this.roundRepo.findByLeagueAndRound(leagueId, league.currentRound);
            if (currentRound) {
                const matches = await this.matchRepo.findByRound(currentRound.id);
                const allComplete = matches.every(m => m.isCompleted);
                if (!allComplete) {
                    throw new Error('Current round is not complete');
                }
            }
        }
        // Generate new round
        const nextRoundNumber = league.currentRound + 1;
        const pairings = await this.tournamentService.generatePairings(leagueId);
        // Create round and matches
        const round = await this.roundRepo.create(leagueId, nextRoundNumber);
        for (let i = 0; i < pairings.length; i++) {
            const pairing = pairings[i];
            const player1DbId = await this.tournamentService.getDatabasePlayerId(leagueId, pairing.player1Id);
            const player2DbId = pairing.player2Id
                ? await this.tournamentService.getDatabasePlayerId(leagueId, pairing.player2Id)
                : null;
            if (player1DbId) {
                await this.matchRepo.create(round.id, player1DbId, player2DbId ?? null, i + 1);
            }
        }
        // Update league
        await this.leagueRepo.update(leagueId, {
            currentRound: nextRoundNumber,
        });
        return pairings;
    }
    async reportMatchResult(matchId, result) {
        const match = await this.matchRepo.findById(matchId);
        if (!match) {
            throw new Error('Match not found');
        }
        if (match.isCompleted) {
            throw new Error('Match already reported');
        }
        // Get the league ID from the round
        const round = await this.roundRepo.findByLeagueAndRound(match.leagueId, 1 // We'll need to find the correct round
        );
        // Update match
        const draws = result.draws || 0;
        await this.matchRepo.reportResult(matchId, result.player1Wins, result.player2Wins, draws);
        // Update tournament
        const tournamentPlayer1 = await this.tournamentService.getTournamentPlayerId(match.leagueId, match.player1Id);
        const tournamentPlayer2 = match.player2Id
            ? await this.tournamentService.getTournamentPlayerId(match.leagueId, match.player2Id)
            : null;
        if (tournamentPlayer1 && tournamentPlayer2) {
            await this.tournamentService.reportMatch(match.leagueId, tournamentPlayer1, tournamentPlayer2, result);
        }
        // Update standings
        await this.updateStandings(match.leagueId);
    }
    async updateStandings(leagueId) {
        const standings = await this.tournamentService.getStandings(leagueId);
        for (const standing of standings) {
            const dbPlayerId = await this.tournamentService.getDatabasePlayerId(leagueId, standing.playerId);
            if (!dbPlayerId)
                continue;
            const registration = await this.registrationRepo.findByLeagueAndPlayer(leagueId, dbPlayerId);
            if (registration) {
                await this.registrationRepo.update(registration.id, {
                    wins: standing.wins,
                    losses: standing.losses,
                    draws: standing.draws,
                    matchPoints: standing.matchPoints,
                    omwPercent: standing.omwPercent,
                    gwPercent: standing.gwPercent,
                    ogwPercent: standing.ogwPercent,
                });
            }
        }
    }
    async getStandings(leagueId) {
        return this.registrationRepo.getStandings(leagueId);
    }
    async dropPlayer(leagueId, discordId) {
        const player = await this.playerRepo.findByDiscordId(discordId);
        if (!player) {
            throw new Error('Player not found');
        }
        await this.registrationRepo.drop(leagueId, player.id);
        const tournamentPlayerId = await this.tournamentService.getTournamentPlayerId(leagueId, player.id);
        if (tournamentPlayerId) {
            await this.tournamentService.dropPlayer(leagueId, tournamentPlayerId);
        }
    }
    async getCurrentRoundMatches(leagueId) {
        const league = await this.leagueRepo.findById(leagueId);
        if (!league || league.currentRound === 0) {
            return [];
        }
        const round = await this.roundRepo.findByLeagueAndRound(leagueId, league.currentRound);
        if (!round) {
            return [];
        }
        return this.matchRepo.findByRound(round.id);
    }
    async cancelLeague(leagueId) {
        await this.leagueRepo.update(leagueId, {
            status: types_1.LeagueStatus.CANCELLED,
        });
        await this.tournamentService.deleteTournament(leagueId);
    }
}
exports.LeagueService = LeagueService;
