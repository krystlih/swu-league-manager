"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeagueService = void 0;
const leagueRepository_1 = require("../data/repositories/leagueRepository");
const playerRepository_1 = require("../data/repositories/playerRepository");
const registrationRepository_1 = require("../data/repositories/registrationRepository");
const roundRepository_1 = require("../data/repositories/roundRepository");
const matchRepository_1 = require("../data/repositories/matchRepository");
const auditLogRepository_1 = require("../data/repositories/auditLogRepository");
const tournamentService_1 = require("./tournamentService");
const types_1 = require("../types");
class LeagueService {
    constructor() {
        this.leagueRepo = new leagueRepository_1.LeagueRepository();
        this.playerRepo = new playerRepository_1.PlayerRepository();
        this.registrationRepo = new registrationRepository_1.RegistrationRepository();
        this.roundRepo = new roundRepository_1.RoundRepository();
        this.matchRepo = new matchRepository_1.MatchRepository();
        this.auditLogRepo = new auditLogRepository_1.AuditLogRepository();
        this.tournamentService = new tournamentService_1.TournamentService();
    }
    async createLeague(options) {
        return this.leagueRepo.create(options);
    }
    async getLeague(leagueId) {
        return this.leagueRepo.findById(leagueId);
    }
    async getLeaguesByGuild(guildId) {
        return this.leagueRepo.findByGuildId(guildId);
    }
    async getLeagueByName(guildId, name) {
        const leagues = await this.leagueRepo.findByGuildId(guildId);
        return leagues.find(l => l.name === name) || null;
    }
    async getActiveLeagues(guildId) {
        return this.leagueRepo.findActiveByGuildId(guildId);
    }
    async getCompletedLeagues(guildId) {
        const allLeagues = await this.leagueRepo.findByGuildId(guildId);
        return allLeagues.filter(l => l.status === types_1.LeagueStatus.COMPLETED);
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
    async startLeague(leagueId, userId, username) {
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
        // Log the tournament start
        await this.auditLogRepo.create({
            leagueId,
            userId,
            username,
            action: 'START_TOURNAMENT',
            entityType: 'LEAGUE',
            entityId: leagueId,
            oldValue: JSON.stringify({ status: types_1.LeagueStatus.REGISTRATION }),
            newValue: JSON.stringify({
                status: types_1.LeagueStatus.IN_PROGRESS,
                playerCount: registrations.length,
            }),
            description: `Started tournament with ${registrations.length} players`,
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
        // Check if tournament exists in memory, if not rebuild from database
        const existingTournament = this.tournamentService.getTournament(leagueId);
        if (!existingTournament) {
            // Rebuild tournament state from database
            const registrations = await this.registrationRepo.findByLeague(leagueId);
            const matches = await this.matchRepo.findByLeague(leagueId);
            await this.tournamentService.rebuildFromDatabase(leagueId, registrations, matches);
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
        // Check if round already exists (in case of retry)
        let round = await this.roundRepo.findByLeagueAndRound(leagueId, nextRoundNumber);
        if (!round) {
            // Create new round
            round = await this.roundRepo.create(leagueId, nextRoundNumber);
        }
        else {
            // Round already exists, check if it has matches
            const existingMatches = await this.matchRepo.findByRound(round.id);
            if (existingMatches.length > 0) {
                throw new Error(`Round ${nextRoundNumber} already exists with matches. Cannot regenerate.`);
            }
        }
        for (let i = 0; i < pairings.length; i++) {
            const pairing = pairings[i];
            const player1DbId = await this.tournamentService.getDatabasePlayerId(leagueId, pairing.player1Id);
            const player2DbId = pairing.player2Id
                ? await this.tournamentService.getDatabasePlayerId(leagueId, pairing.player2Id)
                : null;
            if (player1DbId) {
                await this.matchRepo.create(leagueId, round.id, player1DbId, player2DbId ?? null, i + 1, pairing.isBye);
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
        // Ensure tournament exists in memory, rebuild if needed
        const existingTournament = this.tournamentService.getTournament(match.leagueId);
        if (!existingTournament) {
            const registrations = await this.registrationRepo.findByLeague(match.leagueId);
            const matches = await this.matchRepo.findByLeague(match.leagueId);
            await this.tournamentService.rebuildFromDatabase(match.leagueId, registrations, matches);
        }
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
    async findPlayerActiveMatch(leagueId, discordId) {
        // Find the player by Discord ID
        const player = await this.playerRepo.findByDiscordId(discordId);
        if (!player) {
            return null;
        }
        // Get the current league
        const league = await this.leagueRepo.findById(leagueId);
        if (!league || league.currentRound === 0) {
            return null;
        }
        // Find the current round
        const currentRound = await this.roundRepo.findByLeagueAndRound(leagueId, league.currentRound);
        if (!currentRound) {
            return null;
        }
        // Find the player's match in the current round
        const matches = await this.matchRepo.findByRound(currentRound.id);
        const playerMatch = matches.find(m => m.player1Id === player.id || m.player2Id === player.id);
        return playerMatch || null;
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
    async getAllLeagueMatches(leagueId) {
        return this.matchRepo.findByLeague(leagueId);
    }
    async getRoundMatches(leagueId, roundNumber) {
        const round = await this.roundRepo.findByLeagueAndRound(leagueId, roundNumber);
        if (!round) {
            return [];
        }
        return this.matchRepo.findByRound(round.id);
    }
    async cancelLeague(leagueId) {
        await this.leagueRepo.update(leagueId, {
            status: types_1.LeagueStatus.CANCELLED,
        });
        // Tournament will be cleaned up from memory
    }
    async endTournament(leagueId, userId, username) {
        const league = await this.leagueRepo.findById(leagueId);
        if (!league) {
            throw new Error('League not found');
        }
        if (league.status !== types_1.LeagueStatus.IN_PROGRESS) {
            throw new Error('League is not in progress');
        }
        // Get final standings for the audit log
        const standings = await this.getStandings(leagueId);
        const winner = standings[0];
        // Update league status to completed
        await this.leagueRepo.update(leagueId, {
            status: types_1.LeagueStatus.COMPLETED,
        });
        // Log the tournament end
        await this.auditLogRepo.create({
            leagueId,
            userId,
            username,
            action: 'END_TOURNAMENT',
            entityType: 'LEAGUE',
            entityId: leagueId,
            oldValue: JSON.stringify({ status: types_1.LeagueStatus.IN_PROGRESS }),
            newValue: JSON.stringify({
                status: types_1.LeagueStatus.COMPLETED,
                winner: winner?.playerName || 'N/A',
                winnerRecord: winner ? `${winner.wins}-${winner.losses}-${winner.draws}` : 'N/A',
                totalRounds: league.currentRound,
                playerCount: standings.length,
            }),
            description: `Ended tournament. Winner: ${winner?.playerName || 'N/A'} with ${winner?.wins || 0}-${winner?.losses || 0}-${winner?.draws || 0} record`,
        });
        // Remove tournament from memory
        this.tournamentService.deleteTournament(leagueId);
    }
    async getAuditLogs(leagueId, limit = 50) {
        return this.auditLogRepo.findRecent(leagueId, limit);
    }
    async getMatchById(matchId) {
        return this.matchRepo.findById(matchId);
    }
    async modifyMatchResult(matchId, result, userId, username) {
        console.log(`[DEBUG LeagueService] modifyMatchResult called with:`, { matchId, result, userId, username });
        // Get the match before modification for audit log
        const oldMatch = await this.matchRepo.findById(matchId);
        if (!oldMatch) {
            throw new Error('Match not found');
        }
        console.log(`[DEBUG LeagueService] Old match state:`, {
            player1Wins: oldMatch.player1Wins,
            player2Wins: oldMatch.player2Wins,
            draws: oldMatch.draws,
            isCompleted: oldMatch.isCompleted,
        });
        const oldValue = {
            player1Wins: oldMatch.player1Wins ?? 0,
            player2Wins: oldMatch.player2Wins ?? 0,
            draws: oldMatch.draws ?? 0,
            isCompleted: oldMatch.isCompleted ?? false,
        };
        // Update the match with the new result
        console.log(`[DEBUG LeagueService] Calling matchRepo.reportResult...`);
        const updatedMatch = await this.matchRepo.reportResult(matchId, result.player1Wins, result.player2Wins, result.draws || 0);
        console.log(`[DEBUG LeagueService] matchRepo.reportResult completed, returned:`, {
            id: updatedMatch.id,
            player1Wins: updatedMatch.player1Wins,
            player2Wins: updatedMatch.player2Wins,
            draws: updatedMatch.draws,
            isCompleted: updatedMatch.isCompleted,
        });
        // Get the match again to verify the update
        const match = await this.matchRepo.findById(matchId);
        if (!match) {
            throw new Error('Match not found after update');
        }
        console.log(`[DEBUG LeagueService] Match after update (re-fetched):`, {
            player1Wins: match.player1Wins,
            player2Wins: match.player2Wins,
            draws: match.draws,
            isCompleted: match.isCompleted,
        });
        const newValue = {
            player1Wins: result.player1Wins,
            player2Wins: result.player2Wins,
            draws: result.draws || 0,
            isCompleted: true,
        };
        // Log the change
        const player1Name = match.player1?.username || 'Unknown';
        const player2Name = match.player2?.username || 'BYE';
        const oldScoreStr = oldValue.isCompleted
            ? `${oldValue.player1Wins}-${oldValue.player2Wins}${oldValue.draws > 0 ? `-${oldValue.draws}` : ''}`
            : 'No result';
        const newScoreStr = `${newValue.player1Wins}-${newValue.player2Wins}${newValue.draws > 0 ? `-${newValue.draws}` : ''}`;
        await this.auditLogRepo.create({
            leagueId: match.leagueId,
            userId,
            username,
            action: 'MODIFY_MATCH',
            entityType: 'MATCH',
            entityId: matchId,
            oldValue: JSON.stringify(oldValue),
            newValue: JSON.stringify(newValue),
            description: `Modified match result for ${player1Name} vs ${player2Name} from ${oldScoreStr} to ${newScoreStr}`,
        });
        // Rebuild tournament state and recalculate standings
        const registrations = await this.registrationRepo.findByLeague(match.leagueId);
        const matches = await this.matchRepo.findByLeague(match.leagueId);
        await this.tournamentService.rebuildFromDatabase(match.leagueId, registrations, matches);
        // Update standings in the database
        await this.updateStandings(match.leagueId);
        console.log(`[DEBUG LeagueService] modifyMatchResult completed successfully`);
    }
    async repairCurrentRound(leagueId, userId, username) {
        const league = await this.leagueRepo.findById(leagueId);
        if (!league) {
            throw new Error('League not found');
        }
        if (league.currentRound === 0) {
            throw new Error('No active round to repair');
        }
        // Get the current round
        const round = await this.roundRepo.findByLeagueAndRound(leagueId, league.currentRound);
        if (!round) {
            throw new Error('Current round not found');
        }
        // Get matches before deletion for audit log
        const deletedMatches = await this.matchRepo.findByRound(round.id);
        // Delete all matches in the current round
        await this.matchRepo.deleteByRound(round.id);
        // Delete the round itself
        await this.roundRepo.delete(round.id);
        // Decrement the current round counter
        await this.leagueRepo.update(leagueId, {
            currentRound: league.currentRound - 1,
        });
        // Log the repair action
        await this.auditLogRepo.create({
            leagueId,
            userId,
            username,
            action: 'REPAIR_ROUND',
            entityType: 'ROUND',
            entityId: round.id,
            oldValue: JSON.stringify({
                roundNumber: league.currentRound,
                matchCount: deletedMatches.length,
                matches: deletedMatches.map(m => ({
                    id: m.id,
                    player1Id: m.player1Id,
                    player2Id: m.player2Id,
                    tableNumber: m.tableNumber,
                })),
            }),
            newValue: JSON.stringify({
                roundNumber: league.currentRound,
                status: 'regenerated',
            }),
            description: `Repaired round ${league.currentRound} - deleted ${deletedMatches.length} matches and regenerated pairings`,
        });
        // Remove round from tournament service memory
        const tournament = this.tournamentService.getTournament(leagueId);
        if (tournament) {
            // The tournament service will regenerate pairings when nextround is called
            this.tournamentService.deleteTournament(leagueId);
        }
        // Rebuild tournament state from database
        const registrations = await this.registrationRepo.findByLeague(leagueId);
        const matches = await this.matchRepo.findByLeague(leagueId);
        await this.tournamentService.rebuildFromDatabase(leagueId, registrations, matches);
        // Generate new pairings for this round
        await this.generateNextRound(leagueId);
    }
}
exports.LeagueService = LeagueService;
