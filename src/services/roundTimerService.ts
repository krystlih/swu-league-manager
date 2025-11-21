import { Client, TextChannel } from 'discord.js';
import { LeagueRepository } from '../data/repositories/leagueRepository';
import { RoundRepository } from '../data/repositories/roundRepository';

const leagueRepository = new LeagueRepository();
const roundRepository = new RoundRepository();

interface ActiveTimer {
  leagueId: number;
  roundNumber: number;
  guildId: string;
  channelId: string;
  timeoutIds: NodeJS.Timeout[];
}

export class RoundTimerService {
  private static instance: RoundTimerService;
  private activeTimers: Map<string, ActiveTimer> = new Map();
  private client: Client | null = null;

  private constructor() {}

  static getInstance(): RoundTimerService {
    if (!RoundTimerService.instance) {
      RoundTimerService.instance = new RoundTimerService();
    }
    return RoundTimerService.instance;
  }

  setClient(client: Client) {
    this.client = client;
  }

  /**
   * Start a round timer after round is generated
   * @param leagueId League ID
   * @param roundNumber Round number
   * @param guildId Discord guild ID
   * @param channelId Discord channel ID where announcements should be sent
   */
  async startRoundTimer(
    leagueId: number,
    roundNumber: number,
    guildId: string,
    channelId: string
  ): Promise<void> {
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

    const timeoutIds: NodeJS.Timeout[] = [];

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
  cancelRoundTimer(leagueId: number, roundNumber: number): void {
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
  cancelLeagueTimers(leagueId: number): void {
    const keysToDelete: string[] = [];
    
    this.activeTimers.forEach((timer, key) => {
      if (timer.leagueId === leagueId) {
        timer.timeoutIds.forEach(timeoutId => clearTimeout(timeoutId));
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.activeTimers.delete(key));
  }

  private async announceTimerStart(
    guildId: string,
    channelId: string,
    leagueName: string,
    roundNumber: number,
    durationMinutes: number
  ): Promise<void> {
    await this.sendMessage(
      guildId,
      channelId,
      `⏰ **${leagueName} - Round ${roundNumber}**\n` +
      `The round timer has started! You have **${durationMinutes} minutes** to complete your matches.\n` +
      `Time remaining announcements will be posted every 15 minutes.`
    );
  }

  private async announceTimeRemaining(
    guildId: string,
    channelId: string,
    leagueName: string,
    roundNumber: number,
    minutesRemaining: number
  ): Promise<void> {
    const emoji = minutesRemaining <= 5 ? '🚨' : minutesRemaining <= 10 ? '⚠️' : '⏰';
    await this.sendMessage(
      guildId,
      channelId,
      `${emoji} **${leagueName} - Round ${roundNumber}**\n` +
      `**${minutesRemaining} minutes** remaining in this round!`
    );
  }

  private async announceTimerEnd(
    guildId: string,
    channelId: string,
    leagueName: string,
    roundNumber: number
  ): Promise<void> {
    await this.sendMessage(
      guildId,
      channelId,
      `⏱️ **${leagueName} - Round ${roundNumber}**\n` +
      `Time is up! Please finish your current game and report your results.\n` +
      `Tournament organizers will complete the round when all matches are reported.`
    );
  }

  private async sendMessage(
    guildId: string,
    channelId: string,
    message: string
  ): Promise<void> {
    if (!this.client) {
      console.error('Discord client not set in RoundTimerService');
      return;
    }

    try {
      const guild = await this.client.guilds.fetch(guildId);
      const channel = await guild.channels.fetch(channelId);
      
      if (channel && channel.isTextBased()) {
        await (channel as TextChannel).send(message);
      }
    } catch (error) {
      console.error('Error sending timer announcement:', error);
      // If it's a Missing Access error, the channel may be invalid - log it
      if (error instanceof Error && (error.message.includes('Missing Access') || error.message.includes('Unknown Channel'))) {
        console.warn(`Channel ${channelId} in guild ${guildId} is no longer accessible. Consider updating the announcement channel.`);
      }
    }
  }
}
