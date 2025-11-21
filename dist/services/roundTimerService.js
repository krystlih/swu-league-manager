"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoundTimerService = void 0;
const leagueRepository_1 = require("../data/repositories/leagueRepository");
const roundRepository_1 = require("../data/repositories/roundRepository");
const leagueRepository = new leagueRepository_1.LeagueRepository();
const roundRepository = new roundRepository_1.RoundRepository();
class RoundTimerService {
    constructor() {
        this.activeTimers = new Map();
        this.client = null;
    }
    static getInstance() {
        if (!RoundTimerService.instance) {
            RoundTimerService.instance = new RoundTimerService();
        }
        return RoundTimerService.instance;
    }
    setClient(client) {
        this.client = client;
    }
    /**
     * Start a round timer after round is generated
     * @param leagueId League ID
     * @param roundNumber Round number
     * @param guildId Discord guild ID
     * @param channelId Discord channel ID where announcements should be sent
     */
    async startRoundTimer(leagueId, roundNumber, guildId, channelId) {
        const league = await leagueRepository.findById(leagueId);
        if (!league || !league.roundTimerMinutes) {
            return; // No timer configured
        }
        const timerKey = `${leagueId}-${roundNumber}`;
        // Clear any existing timer for this round
        this.cancelRoundTimer(leagueId, roundNumber);
        const roundTimerMinutes = league.roundTimerMinutes;
        const now = new Date();
        // Timer starts after 5 minute grace period
        const timerStartsAt = new Date(now.getTime() + 5 * 60 * 1000);
        const timerEndsAt = new Date(timerStartsAt.getTime() + roundTimerMinutes * 60 * 1000);
        // Update round with timer timestamps
        await roundRepository.update(leagueId, roundNumber, {
            timerStartsAt,
            timerEndsAt,
        });
        const timeoutIds = [];
        // Announce timer start in 5 minutes
        const announceStartTimeout = setTimeout(() => {
            this.announceTimerStart(guildId, channelId, league.name, roundNumber, roundTimerMinutes);
        }, 5 * 60 * 1000);
        timeoutIds.push(announceStartTimeout);
        // Calculate when to send interval announcements (every 15 minutes)
        const totalMinutes = roundTimerMinutes;
        const intervalMinutes = 15;
        // Schedule announcements every 15 minutes starting 5 minutes from now
        for (let elapsed = intervalMinutes; elapsed < totalMinutes; elapsed += intervalMinutes) {
            const remaining = totalMinutes - elapsed;
            // Skip if this would conflict with special announcements (15, 10, 5 min remaining)
            if (remaining === 15 || remaining === 10 || remaining === 5) {
                continue;
            }
            const delayMs = (5 + elapsed) * 60 * 1000;
            const timeout = setTimeout(() => {
                this.announceTimeRemaining(guildId, channelId, league.name, roundNumber, remaining);
            }, delayMs);
            timeoutIds.push(timeout);
        }
        // Special announcements at 15, 10, and 5 minutes remaining
        const specialAnnouncements = [15, 10, 5];
        for (const minutesRemaining of specialAnnouncements) {
            if (minutesRemaining < totalMinutes) {
                const delayMs = (5 + (totalMinutes - minutesRemaining)) * 60 * 1000;
                const timeout = setTimeout(() => {
                    this.announceTimeRemaining(guildId, channelId, league.name, roundNumber, minutesRemaining);
                }, delayMs);
                timeoutIds.push(timeout);
            }
        }
        // Timer end announcement
        const endDelayMs = (5 + totalMinutes) * 60 * 1000;
        const endTimeout = setTimeout(() => {
            this.announceTimerEnd(guildId, channelId, league.name, roundNumber);
            this.activeTimers.delete(timerKey);
        }, endDelayMs);
        timeoutIds.push(endTimeout);
        // Store active timer
        this.activeTimers.set(timerKey, {
            leagueId,
            roundNumber,
            guildId,
            channelId,
            timeoutIds,
        });
    }
    /**
     * Cancel a round timer
     */
    cancelRoundTimer(leagueId, roundNumber) {
        const timerKey = `${leagueId}-${roundNumber}`;
        const timer = this.activeTimers.get(timerKey);
        if (timer) {
            // Clear all scheduled timeouts
            timer.timeoutIds.forEach(timeoutId => clearTimeout(timeoutId));
            this.activeTimers.delete(timerKey);
        }
    }
    /**
     * Cancel all timers for a league
     */
    cancelLeagueTimers(leagueId) {
        const keysToDelete = [];
        this.activeTimers.forEach((timer, key) => {
            if (timer.leagueId === leagueId) {
                timer.timeoutIds.forEach(timeoutId => clearTimeout(timeoutId));
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach(key => this.activeTimers.delete(key));
    }
    async announceTimerStart(guildId, channelId, leagueName, roundNumber, durationMinutes) {
        await this.sendMessage(guildId, channelId, `⏰ **${leagueName} - Round ${roundNumber}**\n` +
            `The round timer has started! You have **${durationMinutes} minutes** to complete your matches.\n` +
            `Time remaining announcements will be posted every 15 minutes.`);
    }
    async announceTimeRemaining(guildId, channelId, leagueName, roundNumber, minutesRemaining) {
        const emoji = minutesRemaining <= 5 ? '🚨' : minutesRemaining <= 10 ? '⚠️' : '⏰';
        await this.sendMessage(guildId, channelId, `${emoji} **${leagueName} - Round ${roundNumber}**\n` +
            `**${minutesRemaining} minutes** remaining in this round!`);
    }
    async announceTimerEnd(guildId, channelId, leagueName, roundNumber) {
        await this.sendMessage(guildId, channelId, `⏱️ **${leagueName} - Round ${roundNumber}**\n` +
            `Time is up! Please finish your current game and report your results.\n` +
            `Tournament organizers will complete the round when all matches are reported.`);
    }
    async sendMessage(guildId, channelId, message) {
        if (!this.client) {
            console.error('Discord client not set in RoundTimerService');
            return;
        }
        try {
            const guild = await this.client.guilds.fetch(guildId);
            const channel = await guild.channels.fetch(channelId);
            if (channel && channel.isTextBased()) {
                await channel.send(message);
            }
        }
        catch (error) {
            console.error('Error sending timer announcement:', error);
        }
    }
}
exports.RoundTimerService = RoundTimerService;
