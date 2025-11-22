import { LeagueRepository } from '../data/repositories/leagueRepository';
import { PlayerRepository } from '../data/repositories/playerRepository';
import { RegistrationRepository } from '../data/repositories/registrationRepository';
import { RoundRepository } from '../data/repositories/roundRepository';
import { MatchRepository } from '../data/repositories/matchRepository';
import { AuditLogRepository } from '../data/repositories/auditLogRepository';
import { TournamentService } from './tournamentService';
import { RoundTimerService } from './roundTimerService';
import { EliminationService, EliminationPlayer } from './eliminationService';
import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import {
  League,
  CreateLeagueOptions,
  LeagueStatus,
  StandingsEntry,
  MatchResult,
  Pairing,
  CompetitionType,
} from '../types';

export class LeagueService {
  private static instance: LeagueService;
  private leagueRepo: LeagueRepository;
  private playerRepo: PlayerRepository;
  private registrationRepo: RegistrationRepository;
  private roundRepo: RoundRepository;
  private matchRepo: MatchRepository;
  private auditLogRepo: AuditLogRepository;
  private tournamentService: TournamentService;
  private timerService: RoundTimerService;
  private client: Client | null = null;

  private constructor() {
    this.leagueRepo = new LeagueRepository();
    this.playerRepo = new PlayerRepository();
    this.registrationRepo = new RegistrationRepository();
    this.roundRepo = new RoundRepository();
    this.matchRepo = new MatchRepository();
    this.auditLogRepo = new AuditLogRepository();
    this.tournamentService = new TournamentService();
    this.timerService = RoundTimerService.getInstance();
  }

  static getInstance(): LeagueService {
    if (!LeagueService.instance) {
      LeagueService.instance = new LeagueService();
    }
    return LeagueService.instance;
  }

  setClient(client: Client) {
    this.client = client;
  }

  async createLeague(options: CreateLeagueOptions): Promise<League> {
    return this.leagueRepo.create(options);
  }

  async getLeague(leagueId: number): Promise<League | null> {
    return this.leagueRepo.findById(leagueId);
  }

  async getLeaguesByGuild(guildId: string): Promise<League[]> {
    return this.leagueRepo.findByGuildId(guildId);
  }

  async getLeagueByName(guildId: string, name: string): Promise<League | null> {
    const leagues = await this.leagueRepo.findByGuildId(guildId);
    return leagues.find(l => l.name === name) || null;
  }

  async getActiveLeagues(guildId: string): Promise<League[]> {
    return this.leagueRepo.findActiveByGuildId(guildId);
  }

  async updateLeague(leagueId: number, data: any): Promise<League> {
    return this.leagueRepo.update(leagueId, data);
  }

  async getCompletedLeagues(guildId: string): Promise<League[]> {
    const allLeagues = await this.leagueRepo.findByGuildId(guildId);
    return allLeagues.filter(l => l.status === LeagueStatus.COMPLETED);
  }

  /**
   * Calculate number of Swiss rounds based on player count
   * Standard tournament formula: log2(players) rounded up
   */
  private calculateSwissRounds(playerCount: number): number {
    if (playerCount <= 2) return 1;
    if (playerCount <= 4) return 2;
    if (playerCount <= 8) return 3;
    if (playerCount <= 16) return 4;
    if (playerCount <= 32) return 5;
    if (playerCount <= 64) return 6;
    if (playerCount <= 128) return 7;
    return 8; // Maximum 8 rounds for very large tournaments
  }

  /**
   * Calculate top cut size based on total players
   * Standard: Top 8 for 32+, Top 4 for 16-31, Top 2 for 8-15
   */
  private calculateTopCutSize(playerCount: number): number {
    if (playerCount >= 32) return 8;
    if (playerCount >= 16) return 4;
    if (playerCount >= 8) return 2;
    return 0; // No top cut for fewer than 8 players
  }

  async registerPlayer(leagueId: number, discordId: string, username: string): Promise<void> {
    const league = await this.leagueRepo.findById(leagueId);
    if (!league) {
      throw new Error('League not found');
    }

    if (league.status !== LeagueStatus.REGISTRATION) {
      throw new Error('League registration is closed');
    }

    const player = await this.playerRepo.findOrCreate(discordId, username);
    const existing = await this.registrationRepo.findByLeagueAndPlayer(leagueId, player.id);

    if (existing) {
      throw new Error('Player is already registered');
    }

    await this.registrationRepo.create(leagueId, player.id);
  }

  async startLeague(leagueId: number, userId: string, username: string): Promise<void> {
    const league = await this.leagueRepo.findById(leagueId);
    if (!league) {
      throw new Error('League not found');
    }

    if (league.status !== LeagueStatus.REGISTRATION) {
      throw new Error('League has already started');
    }

    const registrations = await this.registrationRepo.findByLeague(leagueId);
    if (registrations.length < 2) {
      throw new Error('Need at least 2 players to start league');
    }

    // Calculate total rounds based on competition type (if not already set)
    let totalRounds = league.totalRounds || 0;
    let topCutSize = 0;

    if (league.competitionType === CompetitionType.SWISS || league.competitionType === CompetitionType.SWISS_WITH_TOP_CUT) {
      // Use provided totalRounds if available, otherwise calculate based on player count
      if (!totalRounds) {
        totalRounds = this.calculateSwissRounds(registrations.length);
      }
      
      if (league.competitionType === CompetitionType.SWISS_WITH_TOP_CUT) {
        topCutSize = league.topCutSize || this.calculateTopCutSize(registrations.length);
      }
    } else if (league.competitionType === CompetitionType.SINGLE_ELIMINATION) {
      // Validate power of 2 for single elimination
      if (!this.isPowerOfTwo(registrations.length)) {
        const next = EliminationService.getNextPowerOfTwo(registrations.length);
        const prev = EliminationService.getPreviousPowerOfTwo(registrations.length);
        throw new Error(
          `Single elimination requires a power of 2 players. You have ${registrations.length} players. ` +
          `Please register ${prev} or ${next} players.`
        );
      }
      totalRounds = EliminationService.calculateSingleEliminationRounds(registrations.length);
    } else if (league.competitionType === CompetitionType.DOUBLE_ELIMINATION) {
      // Validate power of 2 for double elimination
      if (!this.isPowerOfTwo(registrations.length)) {
        const next = EliminationService.getNextPowerOfTwo(registrations.length);
        const prev = EliminationService.getPreviousPowerOfTwo(registrations.length);
        throw new Error(
          `Double elimination requires a power of 2 players. You have ${registrations.length} players. ` +
          `Please register ${prev} or ${next} players.`
        );
      }
      const rounds = EliminationService.calculateDoubleEliminationRounds(registrations.length);
      totalRounds = rounds.total;
    }

    // Create tournament (for Swiss tournaments only - elimination uses different logic)
    if (league.competitionType === CompetitionType.SWISS || league.competitionType === CompetitionType.SWISS_WITH_TOP_CUT) {
      const players = registrations.map(reg => ({
        id: reg.playerId,
        name: reg.player?.username || 'Unknown',
      }));
      await this.tournamentService.createTournament(leagueId, players);
    }

    // Update league with calculated values (only if they weren't already set)
    await this.leagueRepo.update(leagueId, {
      status: LeagueStatus.IN_PROGRESS,
      currentRound: 0, // Reset to 0 when starting
      totalRounds: totalRounds || league.totalRounds,
      topCutSize: topCutSize > 0 ? topCutSize : league.topCutSize,
    });

    // Log the tournament start
    await this.auditLogRepo.create({
      leagueId,
      userId,
      username,
      action: 'START_TOURNAMENT',
      entityType: 'LEAGUE',
      entityId: leagueId,
      oldValue: JSON.stringify({ status: LeagueStatus.REGISTRATION }),
      newValue: JSON.stringify({ 
        status: LeagueStatus.IN_PROGRESS,
        playerCount: registrations.length,
        totalRounds,
        topCutSize,
      }),
      description: `Started tournament with ${registrations.length} players, ${totalRounds} Swiss rounds${topCutSize > 0 ? `, Top ${topCutSize} cut` : ''}`,
    });
  }

  async generateNextRound(leagueId: number): Promise<Pairing[]> {
    const league = await this.leagueRepo.findById(leagueId);
    if (!league) {
      throw new Error('League not found');
    }

    if (league.status !== LeagueStatus.IN_PROGRESS && league.status !== LeagueStatus.TOP_CUT) {
      throw new Error('League is not in progress');
    }

    // For elimination tournaments, use different logic
    if (league.competitionType === CompetitionType.SINGLE_ELIMINATION) {
      return this.generateSingleEliminationRound(leagueId, league);
    } else if (league.competitionType === CompetitionType.DOUBLE_ELIMINATION) {
      return this.generateDoubleEliminationRound(leagueId, league);
    }

    // Swiss tournament logic (existing code)
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

    // Check if we've reached the total rounds limit
    const nextRoundNumber = league.currentRound + 1;
    if (league.totalRounds && nextRoundNumber > league.totalRounds) {
      // Swiss rounds are complete, check if we need Top Cut
      if (league.competitionType === CompetitionType.SWISS_WITH_TOP_CUT && !league.hasTopCut) {
        // Start top cut automatically
        await this.startTopCut(leagueId);
        // Give Discord a moment to send the message
        await new Promise(resolve => setTimeout(resolve, 1000));
        throw new Error('Swiss rounds complete. Top Cut has been started.');
      } else {
        // End tournament automatically
        await this.autoEndTournament(leagueId);
        // Give Discord a moment to send the message
        await new Promise(resolve => setTimeout(resolve, 1000));
        throw new Error('All rounds are complete. Tournament has been ended.');
      }
    }

    // Generate new round
    const pairings = await this.tournamentService.generatePairings(leagueId);

    // Check if round already exists (in case of retry)
    let round = await this.roundRepo.findByLeagueAndRound(leagueId, nextRoundNumber);
    
    if (!round) {
      // Create new round
      round = await this.roundRepo.create(leagueId, nextRoundNumber);
    } else {
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
        const match = await this.matchRepo.create(
          leagueId,
          round.id, 
          player1DbId, 
          player2DbId ?? null, 
          i + 1,
          pairing.isBye
        );

        // If it's a bye, automatically submit 2-0-0 result
        if (pairing.isBye && match) {
          await this.matchRepo.update(match.id, {
            player1Wins: 2,
            player2Wins: 0,
            draws: 0,
            winnerId: player1DbId,
            isDraw: false,
            isCompleted: true,
          });

          // Update registration standings in database
          const registration = await this.registrationRepo.findByLeagueAndPlayer(leagueId, player1DbId);
          if (registration) {
            await this.registrationRepo.update(registration.id, {
              wins: registration.wins + 1,
              matchPoints: registration.matchPoints + 3,
              gamePoints: registration.gamePoints + 6, // 2 game wins * 3 points each
            });
          }

          // Log the automatic bye result
          await this.auditLogRepo.create({
            leagueId,
            userId: 'SYSTEM',
            username: 'Auto-Bye',
            action: 'REPORT_MATCH',
            entityType: 'MATCH',
            entityId: match.id,
            oldValue: JSON.stringify({ isCompleted: false }),
            newValue: JSON.stringify({ 
              player1Wins: 2, 
              player2Wins: 0, 
              draws: 0,
              winnerId: player1DbId,
              isCompleted: true 
            }),
            description: `Bye automatically reported as 2-0-0 win for ${pairing.player1Name}`,
          });
        }
      }
    }

    // Update league
    await this.leagueRepo.update(leagueId, {
      currentRound: nextRoundNumber,
    });

    // Check if round is immediately complete (e.g., if all matches are byes)
    await this.checkRoundCompletion(leagueId);

    return pairings;
  }

  async reportMatchResult(matchId: number, result: MatchResult): Promise<void> {
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
    const tournamentPlayer1 = await this.tournamentService.getTournamentPlayerId(
      match.leagueId,
      match.player1Id
    );
    const tournamentPlayer2 = match.player2Id
      ? await this.tournamentService.getTournamentPlayerId(match.leagueId, match.player2Id)
      : null;

    if (tournamentPlayer1 && tournamentPlayer2) {
      await this.tournamentService.reportMatch(
        match.leagueId,
        tournamentPlayer1,
        tournamentPlayer2,
        result
      );
    }

    // Update standings
    await this.updateStandings(match.leagueId);

    // Check if round is complete and handle auto-progression
    await this.checkRoundCompletion(match.leagueId);
  }

  /**
   * Check if current round is complete and auto-advance or end tournament
   */
  private async checkRoundCompletion(leagueId: number): Promise<void> {
    const league = await this.leagueRepo.findById(leagueId);
    if (!league || (league.status !== LeagueStatus.IN_PROGRESS && league.status !== LeagueStatus.TOP_CUT)) {
      return;
    }

    // Get current round matches
    const currentRound = await this.roundRepo.findByLeagueAndRound(leagueId, league.currentRound);
    if (!currentRound) {
      return;
    }

    const matches = await this.matchRepo.findByRound(currentRound.id);
    const allComplete = matches.every(m => m.isCompleted);

    if (!allComplete) {
      return; // Round not complete yet
    }

    // Round is complete - cancel any active timer for this round
    this.timerService.cancelRoundTimer(leagueId, league.currentRound);

    // Handle elimination tournaments differently
    if (league.competitionType === CompetitionType.SINGLE_ELIMINATION || 
        league.competitionType === CompetitionType.DOUBLE_ELIMINATION) {
      // Auto-advance to next round for elimination tournaments
      try {
        await this.generateNextRound(leagueId);
        
        // Notify via announcement channel if configured
        if (league.announcementChannelId && this.client) {
          try {
            const channel = await this.client.channels.fetch(league.announcementChannelId) as TextChannel;
            if (channel) {
              const roundName = league.competitionType === CompetitionType.SINGLE_ELIMINATION
                ? EliminationService.getSingleEliminationRoundName(league.currentRound, league.totalRounds || 0)
                : 'Next Round';
              
              await channel.send(`⚡ **${league.name}** - ${roundName} pairings are ready! Use \`/tournament pairings\` to view them.`);
            }
          } catch (channelError: any) {
            // Handle missing access
            if (channelError?.code === 50001) {
              console.log(`[AUTO-ADVANCE] Missing access to announcement channel for league ${leagueId}, clearing channel ID`);
              await this.leagueRepo.update(leagueId, {
                announcementChannelId: null,
              });
            } else {
              console.error('[AUTO-ADVANCE] Error sending announcement:', channelError);
            }
          }
        }
      } catch (error: any) {
        // Tournament complete or error occurred
        if (error.message?.includes('Tournament complete')) {
          console.log(`[AUTO-ADVANCE] Tournament ${leagueId} completed automatically`);
        } else {
          console.error('[AUTO-ADVANCE] Error generating next round:', error);
        }
      }
      return;
    }

    // Round is complete - determine next action for Swiss tournaments
    if (league.status === LeagueStatus.TOP_CUT) {
      // We're in top cut - check if it's the finals
      const winners = matches.filter(m => m.winnerId).map(m => m.winnerId);
      
      if (winners.length === 1) {
        // Finals complete - end tournament
        await this.autoEndTournament(leagueId);
      } else if (winners.length > 1) {
        // Generate next round of top cut with winners
        await this.generateTopCutNextRound(leagueId, winners);
      }
    } else {
      // We're in Swiss rounds
      const isSwissComplete = league.totalRounds && league.currentRound >= league.totalRounds;
      const needsTopCut = league.competitionType === CompetitionType.SWISS_WITH_TOP_CUT && 
                          league.hasTopCut === false && 
                          isSwissComplete;

      if (needsTopCut) {
        // Start top cut
        await this.startTopCut(leagueId);
      } else if (isSwissComplete) {
        // Swiss rounds complete, no top cut - end tournament
        await this.autoEndTournament(leagueId);
      }
    }
  }

  /**
   * Automatically end tournament (called by system, not user)
   */
  private async autoEndTournament(leagueId: number): Promise<void> {
    const league = await this.leagueRepo.findById(leagueId);
    if (!league) return;

    // Cancel all timers for this league
    this.timerService.cancelLeagueTimers(leagueId);

    const standings = await this.getStandings(leagueId);
    const winner = standings[0];

    await this.leagueRepo.update(leagueId, {
      status: LeagueStatus.COMPLETED,
    });

    await this.auditLogRepo.create({
      leagueId,
      userId: 'SYSTEM',
      username: 'Auto-End',
      action: 'END_TOURNAMENT',
      entityType: 'LEAGUE',
      entityId: leagueId,
      oldValue: JSON.stringify({ status: league.status }),
      newValue: JSON.stringify({ 
        status: LeagueStatus.COMPLETED,
        winner: winner?.playerName || 'N/A',
        winnerRecord: winner ? `${winner.wins}-${winner.losses}-${winner.draws}` : 'N/A',
        totalRounds: league.currentRound,
        playerCount: standings.length,
      }),
      description: `Tournament automatically ended. Winner: ${winner?.playerName || 'N/A'}`,
    });

    this.tournamentService.deleteTournament(leagueId);

    // Post final standings to Discord if announcement channel is configured
    console.log('Attempting to post final standings to Discord...');
    console.log('Client exists:', !!this.client);
    console.log('Announcement channel ID:', league.announcementChannelId);
    
    if (this.client && league.announcementChannelId) {
      try {
        console.log('Fetching channel...');
        const channel = await this.client.channels.fetch(league.announcementChannelId) as TextChannel;
        console.log('Channel fetched:', !!channel);
        console.log('Is text based:', channel?.isTextBased());
        
        if (channel && channel.isTextBased()) {
          const winnerRecord = winner ? `${winner.wins}-${winner.losses}${winner.draws > 0 ? `-${winner.draws}` : ''}` : 'N/A';
          
          const embed = new EmbedBuilder()
            .setColor(0xffd700) // Gold color
            .setTitle(`🏆 ${league.name} - Tournament Complete! 🏆`)
            .setDescription(`**Champion: ${winner?.playerName || 'N/A'}**\n**Record: ${winnerRecord}**\n**Match Points: ${winner?.matchPoints || 0}**`)
            .addFields(
              {
                name: '📊 Final Standings',
                value: standings.slice(0, 10).map((s, i) => {
                  const record = `${s.wins}-${s.losses}${s.draws > 0 ? `-${s.draws}` : ''}`;
                  const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
                  return `${medal} **${s.playerName}** - ${record} (${s.matchPoints} pts)`;
                }).join('\n'),
                inline: false
              }
            );

          // Add top 3 detailed stats
          if (standings.length >= 1) {
            const top3 = standings.slice(0, 3);
            top3.forEach((player, idx) => {
              const position = idx === 0 ? '🥇 Champion' : idx === 1 ? '🥈 Runner-Up' : '🥉 Third Place';
              embed.addFields({
                name: position,
                value: `**${player.playerName}**\n` +
                  `Record: ${player.wins}-${player.losses}-${player.draws}\n` +
                  `Match Points: ${player.matchPoints}\n` +
                  `OMW%: ${player.omwPercent.toFixed(2)}% | GW%: ${player.gwPercent.toFixed(2)}% | OGW%: ${player.ogwPercent.toFixed(2)}%`,
                inline: true
              });
            });
          }

          embed.addFields({
            name: '📋 Tournament Info',
            value: `**Format:** ${league.format}\n**Type:** ${league.competitionType}\n**Total Rounds:** ${league.currentRound}\n**Total Players:** ${standings.length}`,
            inline: false
          });

          embed.setFooter({ text: 'Tournament ended automatically' });
          embed.setTimestamp();

          console.log('Sending embed to channel...');
          await channel.send({ embeds: [embed] });
          console.log('Final standings posted successfully!');
        } else {
          console.log('Channel not found or not text-based');
        }
      } catch (error) {
        console.error('Failed to post final standings:', error);
        // If channel access fails, clear the announcement channel for this league
        const errorCode = (error as any)?.code;
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (errorCode === 50001 || errorMessage.includes('Missing Access') || errorMessage.includes('Unknown Channel')) {
          console.log('Clearing invalid announcement channel from league...');
          try {
            await this.leagueRepo.update(leagueId, { announcementChannelId: null });
            console.log('Announcement channel cleared successfully');
          } catch (updateError) {
            console.error('Failed to clear announcement channel:', updateError);
          }
        }
      }
    } else {
      console.log('Cannot post standings - client or channel not configured');
    }
  }

  /**
   * Start top cut phase with single elimination bracket
   */
  private async startTopCut(leagueId: number): Promise<void> {
    const league = await this.leagueRepo.findById(leagueId);
    if (!league || !league.topCutSize) {
      return;
    }

    // Get final standings from Swiss rounds
    const standings = await this.getStandings(leagueId);
    const topPlayers = standings.slice(0, league.topCutSize);

    if (topPlayers.length < 2) {
      // Not enough players for top cut, just end tournament
      await this.autoEndTournament(leagueId);
      return;
    }

    // Update league status to TOP_CUT
    await this.leagueRepo.update(leagueId, {
      status: LeagueStatus.TOP_CUT,
      hasTopCut: true,
    });

    await this.auditLogRepo.create({
      leagueId,
      userId: 'SYSTEM',
      username: 'Auto-TopCut',
      action: 'START_TOURNAMENT',
      entityType: 'LEAGUE',
      entityId: leagueId,
      oldValue: JSON.stringify({ status: LeagueStatus.IN_PROGRESS }),
      newValue: JSON.stringify({ 
        status: LeagueStatus.TOP_CUT,
        topCutSize: topPlayers.length,
      }),
      description: `Started Top ${topPlayers.length} single elimination bracket`,
    });

    // Generate first round of top cut with seeded pairings
    await this.generateTopCutRound(leagueId, topPlayers);
  }

  /**
   * Generate top cut bracket round with seeded pairings (1 vs last, 2 vs second-to-last, etc.)
   */
  private async generateTopCutRound(leagueId: number, players: StandingsEntry[]): Promise<void> {
    const league = await this.leagueRepo.findById(leagueId);
    if (!league) {
      throw new Error('League not found');
    }

    const nextRoundNumber = league.currentRound + 1;
    
    // Create round
    const round = await this.roundRepo.create(leagueId, nextRoundNumber);

    // Generate seeded pairings: 1 vs last, 2 vs second-to-last, etc.
    const numMatches = Math.floor(players.length / 2);
    
    for (let i = 0; i < numMatches; i++) {
      const highSeed = players[i];
      const lowSeed = players[players.length - 1 - i];

      // playerId in StandingsEntry is the database ID (as string), not Discord ID
      const player1Id = parseInt(highSeed.playerId);
      const player2Id = parseInt(lowSeed.playerId);

      await this.matchRepo.create(
        leagueId,
        round.id,
        player1Id,
        player2Id,
        i + 1,
        false
      );
    }

    // Update league current round
    await this.leagueRepo.update(leagueId, {
      currentRound: nextRoundNumber,
    });

    // Start timer for this round if configured
    if (league.roundTimerMinutes && league.announcementChannelId) {
      await this.timerService.startRoundTimer(
        leagueId,
        nextRoundNumber,
        league.guildId,
        league.announcementChannelId
      );
    }
  }

  /**
   * Generate next round of top cut with winners from previous round
   */
  private async generateTopCutNextRound(leagueId: number, winnerIds: (number | null | undefined)[]): Promise<void> {
    const league = await this.leagueRepo.findById(leagueId);
    if (!league) {
      throw new Error('League not found');
    }

    // Filter out null/undefined winners
    const validWinners = winnerIds.filter((id): id is number => id !== null && id !== undefined);
    
    if (validWinners.length < 2) {
      // Not enough winners for next round, end tournament
      await this.autoEndTournament(leagueId);
      return;
    }

    const nextRoundNumber = league.currentRound + 1;
    const round = await this.roundRepo.create(leagueId, nextRoundNumber);

    // Pair winners sequentially (winner 1 vs winner 2, winner 3 vs winner 4, etc.)
    const numMatches = Math.floor(validWinners.length / 2);
    
    for (let i = 0; i < numMatches; i++) {
      const player1Id = validWinners[i * 2];
      const player2Id = validWinners[i * 2 + 1];

      await this.matchRepo.create(
        leagueId,
        round.id,
        player1Id,
        player2Id,
        i + 1,
        false
      );
    }

    // Update league current round
    await this.leagueRepo.update(leagueId, {
      currentRound: nextRoundNumber,
    });

    // Start timer for this round if configured
    if (league.roundTimerMinutes && league.announcementChannelId) {
      await this.timerService.startRoundTimer(
        leagueId,
        nextRoundNumber,
        league.guildId,
        league.announcementChannelId
      );
    }
  }

  async findPlayerActiveMatch(leagueId: number, discordId: string): Promise<any> {
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
    const playerMatch = matches.find(m => 
      m.player1Id === player.id || m.player2Id === player.id
    );

    return playerMatch || null;
  }

  private async updateStandings(leagueId: number): Promise<void> {
    const standings = await this.tournamentService.getStandings(leagueId);

    for (const standing of standings) {
      const dbPlayerId = await this.tournamentService.getDatabasePlayerId(leagueId, standing.playerId);
      if (!dbPlayerId) continue;
      
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

  async getStandings(leagueId: number): Promise<StandingsEntry[]> {
    const league = await this.leagueRepo.findById(leagueId);
    if (!league) {
      throw new Error('League not found');
    }

    // For pure elimination tournaments, generate standings based on bracket progression
    if (league.competitionType === CompetitionType.SINGLE_ELIMINATION ||
        league.competitionType === CompetitionType.DOUBLE_ELIMINATION) {
      return this.getEliminationStandings(leagueId, league);
    }

    // For Swiss with Top Cut, combine both methods
    if (league.competitionType === CompetitionType.SWISS_WITH_TOP_CUT && 
        (league.status === LeagueStatus.TOP_CUT || league.status === LeagueStatus.COMPLETED)) {
      return this.getSwissTopCutStandings(leagueId, league);
    }

    // For Swiss tournaments, use match points and tiebreakers
    return this.registrationRepo.getStandings(leagueId);
  }

  /**
   * Generate combined standings for Swiss with Top Cut
   * Top Cut participants ranked by bracket position, others by Swiss standings
   */
  private async getSwissTopCutStandings(leagueId: number, league: League): Promise<StandingsEntry[]> {
    const allMatches = await this.matchRepo.findByLeague(leagueId);
    const registrations = await this.registrationRepo.findByLeague(leagueId);
    
    // Get top cut matches (rounds after Swiss rounds)
    const swissRounds = league.totalRounds || 0;
    const topCutMatches = allMatches.filter(m => (m.round?.roundNumber || 0) > swissRounds);
    
    // Get all players who participated in top cut
    const topCutPlayerIds = new Set<number>();
    for (const match of topCutMatches) {
      if (match.player1Id) topCutPlayerIds.add(match.player1Id);
      if (match.player2Id) topCutPlayerIds.add(match.player2Id);
    }

    // Get elimination standings for top cut participants
    const topCutStandings = await this.getEliminationStandings(leagueId, league);
    const topCutPlayersOnly = topCutStandings.filter(s => 
      topCutPlayerIds.has(parseInt(s.playerId))
    );

    // Get Swiss standings for all players (for those who didn't make top cut)
    const swissStandings = await this.registrationRepo.getStandings(leagueId);
    const nonTopCutPlayers = swissStandings.filter(s => 
      !topCutPlayerIds.has(parseInt(s.playerId))
    );

    // Combine: Top Cut players first (by bracket position), then Swiss standings
    const combinedStandings = [
      ...topCutPlayersOnly,
      ...nonTopCutPlayers
    ];

    // Re-rank everything
    return combinedStandings.map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));
  }

  /**
   * Generate standings for elimination tournaments based on bracket progression
   */
  private async getEliminationStandings(leagueId: number, league: League): Promise<StandingsEntry[]> {
    const registrations = await this.registrationRepo.findByLeague(leagueId);
    const allMatches = await this.matchRepo.findByLeague(leagueId);
    
    // For Swiss with Top Cut, only consider top cut matches (after Swiss rounds)
    let eliminationMatches = allMatches;
    if (league.competitionType === CompetitionType.SWISS_WITH_TOP_CUT) {
      const swissRounds = league.totalRounds || 0;
      eliminationMatches = allMatches.filter(m => (m.round?.roundNumber || 0) > swissRounds);
    }
    
    // Create a map of player ID to their elimination details
    const playerDetails = new Map<number, {
      playerId: number;
      playerName: string;
      wins: number;
      losses: number;
      matchPoints: number;
      omwPercent: number;
      gwPercent: number;
      ogwPercent: number;
      lastRoundEliminated?: number; // The round they were eliminated
      isChampion?: boolean;
      isRunnerUp?: boolean;
    }>();

    // Initialize all players (or only top cut participants for Swiss+TopCut)
    const relevantRegistrations = league.competitionType === CompetitionType.SWISS_WITH_TOP_CUT
      ? registrations.filter(reg => {
          // Check if this player participated in any top cut match
          return eliminationMatches.some(m => 
            m.player1Id === reg.playerId || m.player2Id === reg.playerId
          );
        })
      : registrations;

    for (const reg of relevantRegistrations) {
      playerDetails.set(reg.playerId, {
        playerId: reg.playerId,
        playerName: reg.player?.username || 'Unknown',
        wins: reg.wins,
        losses: reg.losses,
        matchPoints: reg.matchPoints,
        omwPercent: reg.omwPercent,
        gwPercent: reg.gwPercent,
        ogwPercent: reg.ogwPercent,
      });
    }

    // Find the highest round number (finals)
    const maxRound = Math.max(...eliminationMatches.map(m => m.round?.roundNumber || 0));
    const finalsMatches = eliminationMatches.filter(m => 
      (m.round?.roundNumber || 0) === maxRound && m.isCompleted
    );

    // Determine champion and runner-up from finals
    if (finalsMatches.length > 0) {
      const finalMatch = finalsMatches[finalsMatches.length - 1]; // Last finals match (in case of bracket reset)
      if (finalMatch.winnerId) {
        const champion = playerDetails.get(finalMatch.winnerId);
        if (champion) {
          champion.isChampion = true;
        }
        
        // Runner-up is the loser of finals
        const runnerUpId = finalMatch.winnerId === finalMatch.player1Id ? finalMatch.player2Id : finalMatch.player1Id;
        if (runnerUpId) {
          const runnerUp = playerDetails.get(runnerUpId);
          if (runnerUp) {
            runnerUp.isRunnerUp = true;
          }
        }
      }
    }

    // For each player, find the last round they played in (their elimination round)
    for (const [playerId, details] of playerDetails) {
      if (details.isChampion) continue; // Champion wasn't eliminated
      
      let lastRound = 0;

      for (const match of eliminationMatches) {
        if (match.isCompleted && (match.player1Id === playerId || match.player2Id === playerId)) {
          const roundNum = match.round?.roundNumber || 0;
          if (roundNum > lastRound) {
            lastRound = roundNum;
          }
          
          // Check if they lost this match (were eliminated)
          if (match.winnerId && match.winnerId !== playerId) {
            details.lastRoundEliminated = roundNum;
          }
        }
      }

      // If runner-up, they made it to finals
      if (details.isRunnerUp) {
        details.lastRoundEliminated = maxRound;
      }
    }

    // Sort players by bracket position
    const sortedPlayers = Array.from(playerDetails.values()).sort((a, b) => {
      // 1. Champion first
      if (a.isChampion && !b.isChampion) return -1;
      if (!a.isChampion && b.isChampion) return 1;
      
      // 2. Runner-up second
      if (a.isRunnerUp && !b.isRunnerUp) return -1;
      if (!a.isRunnerUp && b.isRunnerUp) return 1;
      
      // 3. Players eliminated later rank higher
      const aRound = a.lastRoundEliminated || 0;
      const bRound = b.lastRoundEliminated || 0;
      if (aRound !== bRound) {
        return bRound - aRound; // Higher round = better placement
      }
      
      // 4. For Swiss+TopCut, tie-break by Swiss standings (match points, then tiebreakers)
      if (league.competitionType === CompetitionType.SWISS_WITH_TOP_CUT) {
        if (a.matchPoints !== b.matchPoints) return b.matchPoints - a.matchPoints;
        if (a.omwPercent !== b.omwPercent) return b.omwPercent - a.omwPercent;
        if (a.gwPercent !== b.gwPercent) return b.gwPercent - a.gwPercent;
        if (a.ogwPercent !== b.ogwPercent) return b.ogwPercent - a.ogwPercent;
      }
      
      // 5. Tie-break by wins
      if (a.wins !== b.wins) {
        return b.wins - a.wins;
      }
      
      // 6. Tie-break by losses (fewer losses is better)
      return a.losses - b.losses;
    });

    // Convert to StandingsEntry format
    return sortedPlayers.map((player, index) => ({
      rank: index + 1,
      playerId: player.playerId.toString(),
      playerName: player.playerName,
      wins: player.wins,
      losses: player.losses,
      draws: 0,
      matchPoints: player.matchPoints,
      omwPercent: player.omwPercent,
      gwPercent: player.gwPercent,
      ogwPercent: player.ogwPercent,
    }));
  }

  async dropPlayer(leagueId: number, discordId: string): Promise<void> {
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

  async getCurrentRoundMatches(leagueId: number): Promise<any[]> {
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

  async getAllLeagueMatches(leagueId: number): Promise<any[]> {
    return this.matchRepo.findByLeague(leagueId);
  }

  async getRoundMatches(leagueId: number, roundNumber: number): Promise<any[]> {
    const round = await this.roundRepo.findByLeagueAndRound(leagueId, roundNumber);
    if (!round) {
      return [];
    }

    return this.matchRepo.findByRound(round.id);
  }

  async cancelLeague(leagueId: number): Promise<void> {
    // Cancel all timers for this league
    this.timerService.cancelLeagueTimers(leagueId);
    
    await this.leagueRepo.update(leagueId, {
      status: LeagueStatus.CANCELLED,
    });
    // Tournament will be cleaned up from memory
  }

  async deleteLeague(leagueId: number): Promise<void> {
    // Cancel all timers for this league
    this.timerService.cancelLeagueTimers(leagueId);
    
    // Delete tournament from memory
    this.tournamentService.deleteTournament(leagueId);
    
    // Delete all matches for this league
    await this.matchRepo.deleteByLeague(leagueId);
    
    // Delete all rounds for this league
    await this.roundRepo.deleteByLeague(leagueId);
    
    // Delete all registrations for this league
    await this.registrationRepo.deleteByLeague(leagueId);
    
    // Finally delete the league itself
    await this.leagueRepo.delete(leagueId);
    
    // Note: Audit logs are preserved and not deleted
  }

  /**
   * Generate next round for single elimination tournament
   */
  private async generateSingleEliminationRound(leagueId: number, league: League): Promise<Pairing[]> {
    const nextRoundNumber = league.currentRound + 1;

    // Check if current round is complete (if not first round)
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

    let pairings: Pairing[];

    if (league.currentRound === 0) {
      // First round - generate initial bracket
      const registrations = await this.registrationRepo.findByLeague(leagueId);
      const players: EliminationPlayer[] = registrations.map((reg, index) => ({
        id: reg.playerId,
        name: reg.player?.username || 'Unknown',
        seed: index + 1,
      }));

      pairings = EliminationService.generateSingleEliminationBracket(players);
    } else {
      // Subsequent rounds - advance winners
      const currentRound = await this.roundRepo.findByLeagueAndRound(leagueId, league.currentRound);
      if (!currentRound) {
        throw new Error('Current round not found');
      }

      const matches = await this.matchRepo.findByRound(currentRound.id);
      const completedMatches = matches
        .filter(m => m.isCompleted && m.winnerId)
        .map(m => ({
          winnerId: m.winnerId!,
          winnerName: m.winnerId === m.player1Id 
            ? (m.player1?.username || 'Player 1')
            : (m.player2?.username || 'Player 2'),
          matchNumber: m.tableNumber || 0,
        }));

      if (completedMatches.length === 0) {
        throw new Error('No completed matches found in current round');
      }

      pairings = EliminationService.generateNextSingleEliminationRound(completedMatches, league.currentRound);

      // If no pairings returned, tournament is complete
      if (pairings.length === 0) {
        await this.autoEndTournament(leagueId);
        throw new Error('Tournament complete!');
      }
    }

    // Create round and matches
    await this.createRoundAndMatches(leagueId, nextRoundNumber, pairings, false);

    // Update league
    await this.leagueRepo.update(leagueId, {
      currentRound: nextRoundNumber,
    });

    return pairings;
  }

  /**
   * Generate next round for double elimination tournament
   */
  private async generateDoubleEliminationRound(leagueId: number, league: League): Promise<Pairing[]> {
    const nextRoundNumber = league.currentRound + 1;

    // Check if current round is complete (if not first round)
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

    let pairings: Pairing[];

    if (league.currentRound === 0) {
      // First round - generate initial winners bracket
      const registrations = await this.registrationRepo.findByLeague(leagueId);
      const players: EliminationPlayer[] = registrations.map((reg, index) => ({
        id: reg.playerId,
        name: reg.player?.username || 'Unknown',
        seed: index + 1,
      }));

      pairings = EliminationService.generateDoubleEliminationBracket(players);
      await this.createRoundAndMatches(leagueId, nextRoundNumber, pairings, false);
    } else {
      // Get all previous matches to track winners and losers brackets
      const allMatches = await this.matchRepo.findByLeague(leagueId);
      const currentRoundMatches = allMatches.filter(
        m => m.round?.roundNumber === league.currentRound && m.isCompleted
      );

      // Separate winners and losers bracket matches
      const winnersMatches = currentRoundMatches
        .filter(m => !m.isLosersBracket && m.winnerId && !m.isGrandFinals)
        .map(m => ({
          winnerId: m.winnerId!,
          winnerName: m.winnerId === m.player1Id 
            ? (m.player1?.username || 'Player 1')
            : (m.player2?.username || 'Player 2'),
          loserId: m.winnerId === m.player1Id ? m.player2Id! : m.player1Id,
          loserName: m.winnerId === m.player1Id 
            ? (m.player2?.username || 'Player 2')
            : (m.player1?.username || 'Player 1'),
          matchNumber: m.tableNumber || 0,
        }));

      const losersMatches = currentRoundMatches
        .filter(m => m.isLosersBracket && m.winnerId)
        .map(m => ({
          winnerId: m.winnerId!,
          winnerName: m.winnerId === m.player1Id 
            ? (m.player1?.username || 'Player 1')
            : (m.player2?.username || 'Player 2'),
          matchNumber: m.tableNumber || 0,
        }));

      // Check for grand finals
      const grandFinalsMatch = currentRoundMatches.find(m => m.isGrandFinals);
      
      if (grandFinalsMatch && grandFinalsMatch.isCompleted) {
        // Check if bracket reset is needed
        const winnersChampion = allMatches
          .filter(m => !m.isLosersBracket && !m.isGrandFinals)
          .sort((a, b) => (b.round?.roundNumber || 0) - (a.round?.roundNumber || 0))[0];

        const winnersChampionId = winnersChampion?.winnerId;

        if (winnersChampionId && EliminationService.needsBracketReset(winnersChampionId, grandFinalsMatch.winnerId!)) {
          // Losers bracket champion won - need bracket reset
          if (!grandFinalsMatch.isBracketReset) {
            // This was the first grand finals, create bracket reset match
            if (!grandFinalsMatch.player1 || !grandFinalsMatch.player2) {
              throw new Error('Cannot create bracket reset - missing player data');
            }
            
            pairings = [{
              tableNumber: 1,
              player1Id: grandFinalsMatch.player1Id.toString(),
              player1Name: grandFinalsMatch.player1.username,
              player2Id: grandFinalsMatch.player2Id!.toString(),
              player2Name: grandFinalsMatch.player2.username,
              isBye: false,
            }];

            const round = await this.roundRepo.create(leagueId, nextRoundNumber);
            for (const pairing of pairings) {
              await this.matchRepo.create(
                leagueId,
                round.id,
                parseInt(pairing.player1Id),
                parseInt(pairing.player2Id!),
                pairing.tableNumber,
                false,
                'GF-RESET',
                false,
                true,
                true
              );
            }

            await this.leagueRepo.update(leagueId, {
              currentRound: nextRoundNumber,
            });

            return pairings;
          } else {
            // Bracket reset complete - tournament over
            await this.autoEndTournament(leagueId);
            throw new Error('Tournament complete!');
          }
        } else {
          // Winners bracket champion won or won bracket reset - tournament over
          await this.autoEndTournament(leagueId);
          throw new Error('Tournament complete!');
        }
      }

      // Generate next round pairings
      const result = EliminationService.generateNextDoubleEliminationRound(
        winnersMatches,
        losersMatches,
        league.currentRound
      );

      // Check if it's time for grand finals
      if (result.grandFinals) {
        // Get winners and losers bracket champions
        // Winners champion: the only winner from winners bracket matches
        // Losers champion: the only winner from losers bracket matches
        const winnersChampion = winnersMatches.length === 1 ? winnersMatches[0] : null;
        const losersChampion = losersMatches.length === 1 ? losersMatches[0] : null;

        if (winnersChampion && losersChampion) {
          pairings = EliminationService.generateGrandFinals(
            { id: winnersChampion.winnerId, name: winnersChampion.winnerName },
            { id: losersChampion.winnerId, name: losersChampion.winnerName }
          );

          const round = await this.roundRepo.create(leagueId, nextRoundNumber);
          for (const pairing of pairings) {
            await this.matchRepo.create(
              leagueId,
              round.id,
              parseInt(pairing.player1Id),
              parseInt(pairing.player2Id!),
              pairing.tableNumber,
              false,
              'GF',
              false,
              true,
              false
            );
          }

          await this.leagueRepo.update(leagueId, {
            currentRound: nextRoundNumber,
          });

          return pairings;
        } else {
          throw new Error(`Cannot determine grand finals participants. Winners bracket has ${winnersMatches.length} winner(s), Losers bracket has ${losersMatches.length} winner(s). Both should have exactly 1.`);
        }
      }

      // Create winners bracket matches
      if (result.winnersBracketPairings.length > 0) {
        await this.createRoundAndMatches(leagueId, nextRoundNumber, result.winnersBracketPairings, false);
      }

      // Create losers bracket matches
      if (result.losersBracketPairings.length > 0) {
        await this.createRoundAndMatches(leagueId, nextRoundNumber, result.losersBracketPairings, true);
      }

      pairings = [...result.winnersBracketPairings, ...result.losersBracketPairings];
    }

    // Update league
    await this.leagueRepo.update(leagueId, {
      currentRound: nextRoundNumber,
    });

    return pairings;
  }

  /**
   * Helper method to create round and matches
   */
  private async createRoundAndMatches(
    leagueId: number,
    roundNumber: number,
    pairings: Pairing[],
    isLosersBracket: boolean
  ): Promise<void> {
    // Check if round already exists
    let round = await this.roundRepo.findByLeagueAndRound(leagueId, roundNumber);
    
    if (!round) {
      round = await this.roundRepo.create(leagueId, roundNumber);
    }

    for (let i = 0; i < pairings.length; i++) {
      const pairing = pairings[i];
      const player1DbId = parseInt(pairing.player1Id);
      const player2DbId = pairing.player2Id ? parseInt(pairing.player2Id) : null;

      const bracketPosition = isLosersBracket 
        ? `LB-R${roundNumber}-M${i + 1}`
        : `WB-R${roundNumber}-M${i + 1}`;

      await this.matchRepo.create(
        leagueId,
        round.id,
        player1DbId,
        player2DbId,
        i + 1,
        pairing.isBye,
        bracketPosition,
        isLosersBracket,
        false,
        false
      );
    }
  }

  /**
   * Check if number is a power of 2
   */
  private isPowerOfTwo(n: number): boolean {
    return n > 0 && (n & (n - 1)) === 0;
  }

  async endTournament(leagueId: number, userId: string, username: string): Promise<void> {
    const league = await this.leagueRepo.findById(leagueId);
    if (!league) {
      throw new Error('League not found');
    }

    if (league.status !== LeagueStatus.IN_PROGRESS) {
      throw new Error('League is not in progress');
    }

    // Cancel all timers for this league
    this.timerService.cancelLeagueTimers(leagueId);

    // Get final standings for the audit log
    const standings = await this.getStandings(leagueId);
    const winner = standings[0];

    // Update league status to completed
    await this.leagueRepo.update(leagueId, {
      status: LeagueStatus.COMPLETED,
    });

    // Log the tournament end
    await this.auditLogRepo.create({
      leagueId,
      userId,
      username,
      action: 'END_TOURNAMENT',
      entityType: 'LEAGUE',
      entityId: leagueId,
      oldValue: JSON.stringify({ status: LeagueStatus.IN_PROGRESS }),
      newValue: JSON.stringify({ 
        status: LeagueStatus.COMPLETED,
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

  async getAuditLogs(leagueId: number, limit: number = 50): Promise<any[]> {
    return this.auditLogRepo.findRecent(leagueId, limit);
  }

  async getMatchById(matchId: number): Promise<any> {
    return this.matchRepo.findById(matchId);
  }

  async modifyMatchResult(
    matchId: number, 
    result: MatchResult,
    userId: string,
    username: string
  ): Promise<void> {
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
    const updatedMatch = await this.matchRepo.reportResult(
      matchId,
      result.player1Wins,
      result.player2Wins,
      result.draws || 0
    );
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

  async repairCurrentRound(
    leagueId: number,
    userId: string,
    username: string
  ): Promise<void> {
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

  async getPlayerStats(guildId: string, discordId: string): Promise<any> {
    const player = await this.playerRepo.findByDiscordId(discordId);
    if (!player) {
      return null;
    }

    // Get all registrations for this player in this guild
    const registrations = await this.registrationRepo.findAll();
    const playerRegs = [];

    for (const reg of registrations) {
      if (reg.playerId === player.id) {
        const league = await this.leagueRepo.findById(reg.leagueId);
        if (league && league.guildId === guildId && league.status === 'COMPLETED') {
          playerRegs.push({ ...reg, league });
        }
      }
    }

    if (playerRegs.length === 0) {
      return null;
    }

    // Calculate aggregate stats
    let totalWins = 0;
    let totalLosses = 0;
    let totalDraws = 0;
    let championships = 0;
    let runnerUps = 0;
    let topThree = 0;

    // Get game-level stats from matches
    const allMatches = await this.matchRepo.findAll();
    let gameWins = 0;
    let gameLosses = 0;

    for (const match of allMatches) {
      const league = await this.leagueRepo.findById(match.leagueId);
      if (!league || league.guildId !== guildId || !match.isCompleted) continue;

      if (match.player1Id === player.id) {
        gameWins += match.player1Wins || 0;
        gameLosses += match.player2Wins || 0;
      } else if (match.player2Id === player.id) {
        gameWins += match.player2Wins || 0;
        gameLosses += match.player1Wins || 0;
      }
    }

    const recentTournaments = [];

    for (const reg of playerRegs) {
      totalWins += reg.wins;
      totalLosses += reg.losses;
      totalDraws += reg.draws;

      // Get placement in this tournament
      const allRegsInLeague = await this.registrationRepo.findByLeague(reg.leagueId);
      const sorted = allRegsInLeague.sort((a, b) => {
        if (b.matchPoints !== a.matchPoints) return b.matchPoints - a.matchPoints;
        if (b.omwPercent !== a.omwPercent) return b.omwPercent - a.omwPercent;
        if (b.gwPercent !== a.gwPercent) return b.gwPercent - a.gwPercent;
        return b.ogwPercent - a.ogwPercent;
      });

      const placement = sorted.findIndex(r => r.id === reg.id) + 1;

      if (placement === 1) championships++;
      if (placement === 2) runnerUps++;
      if (placement <= 3) topThree++;

      recentTournaments.push({
        leagueName: reg.league.name,
        format: reg.league.format,
        placement,
        wins: reg.wins,
        losses: reg.losses,
        draws: reg.draws,
        date: reg.league.updatedAt,
      });
    }

    // Sort by date, most recent first
    recentTournaments.sort((a, b) => b.date.getTime() - a.date.getTime());

    const totalMatches = totalWins + totalLosses + totalDraws;
    const winRate = totalMatches > 0 ? ((totalWins / totalMatches) * 100).toFixed(1) : '0.0';
    const totalGames = gameWins + gameLosses;
    const gameWinRate = totalGames > 0 ? ((gameWins / totalGames) * 100).toFixed(1) : '0.0';

    return {
      tournaments: playerRegs.length,
      wins: totalWins,
      losses: totalLosses,
      draws: totalDraws,
      winRate,
      championships,
      runnerUps,
      topThree,
      gameWins,
      gameLosses,
      gameWinRate,
      recentTournaments: recentTournaments.slice(0, 5),
    };
  }

  async getLeaderboard(guildId: string, format: string | null, sortBy: string): Promise<any[]> {
    // Get all completed leagues in this guild
    const allLeagues = await this.leagueRepo.findAll();
    const completedLeagues = allLeagues.filter(
      (l: any) => l.guildId === guildId && l.status === 'COMPLETED' && (!format || l.format === format)
    );

    if (completedLeagues.length === 0) {
      return [];
    }

    const leagueIds = completedLeagues.map((l: any) => l.id);
    const allRegistrations = await this.registrationRepo.findAll();
    
    // Group registrations by player
    const playerStats = new Map<number, any>();

    for (const reg of allRegistrations) {
      if (!leagueIds.includes(reg.leagueId)) continue;

      if (!playerStats.has(reg.playerId)) {
        const player = await this.playerRepo.findById(reg.playerId);
        playerStats.set(reg.playerId, {
          playerId: reg.playerId,
          username: player?.username || 'Unknown',
          tournaments: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          championships: 0,
        });
      }

      const stats = playerStats.get(reg.playerId)!;
      stats.tournaments++;
      stats.wins += reg.wins;
      stats.losses += reg.losses;
      stats.draws += reg.draws;

      // Check if this player won this tournament
      const allRegsInLeague = await this.registrationRepo.findByLeague(reg.leagueId);
      const sorted = allRegsInLeague.sort((a, b) => {
        if (b.matchPoints !== a.matchPoints) return b.matchPoints - a.matchPoints;
        if (b.omwPercent !== a.omwPercent) return b.omwPercent - a.omwPercent;
        if (b.gwPercent !== a.gwPercent) return b.gwPercent - a.gwPercent;
        return b.ogwPercent - a.ogwPercent;
      });

      if (sorted[0]?.id === reg.id) {
        stats.championships++;
      }
    }

    // Calculate win rates and convert to array
    const leaderboard = Array.from(playerStats.values()).map(stats => {
      const totalMatches = stats.wins + stats.losses + stats.draws;
      const winRate = totalMatches > 0 ? ((stats.wins / totalMatches) * 100).toFixed(1) : '0.0';
      return { ...stats, winRate: parseFloat(winRate) };
    });

    // Filter out players with no matches
    const filteredLeaderboard = leaderboard.filter(p => p.wins + p.losses + p.draws > 0);

    // Sort by the requested stat
    filteredLeaderboard.sort((a, b) => {
      switch (sortBy) {
        case 'wins':
          return b.wins - a.wins;
        case 'tournaments':
          return b.tournaments - a.tournaments;
        case 'championships':
          return b.championships - a.championships;
        case 'winrate':
        default:
          if (b.winRate !== a.winRate) return b.winRate - a.winRate;
          return b.wins - a.wins; // Tiebreaker: more wins
      }
    });

    return filteredLeaderboard;
  }

  async getHeadToHead(guildId: string, discordId1: string, discordId2: string): Promise<any> {
    const player1 = await this.playerRepo.findByDiscordId(discordId1);
    const player2 = await this.playerRepo.findByDiscordId(discordId2);

    if (!player1 || !player2) {
      return null;
    }

    // Get all matches between these two players in this guild
    const allMatches = await this.matchRepo.findAll();
    const h2hMatches = [];

    for (const match of allMatches) {
      const league = await this.leagueRepo.findById(match.leagueId);
      if (!league || league.guildId !== guildId || !match.isCompleted) continue;

      const isH2H = 
        (match.player1Id === player1.id && match.player2Id === player2.id) ||
        (match.player1Id === player2.id && match.player2Id === player1.id);

      if (isH2H) {
        const round = match.roundId ? await this.roundRepo.findById(match.roundId) : null;
        h2hMatches.push({
          ...match,
          league,
          roundNumber: round?.roundNumber || 0,
        });
      }
    }

    if (h2hMatches.length === 0) {
      return null;
    }

    // Calculate stats
    let player1Wins = 0;
    let player2Wins = 0;
    let draws = 0;
    let player1GameWins = 0;
    let player2GameWins = 0;

    for (const match of h2hMatches) {
      if (match.player1Id === player1.id) {
        player1GameWins += match.player1Wins || 0;
        player2GameWins += match.player2Wins || 0;
        
        if (match.winnerId === player1.id) player1Wins++;
        else if (match.winnerId === player2.id) player2Wins++;
        else if (match.isDraw) draws++;
      } else {
        player1GameWins += match.player2Wins || 0;
        player2GameWins += match.player1Wins || 0;
        
        if (match.winnerId === player1.id) player1Wins++;
        else if (match.winnerId === player2.id) player2Wins++;
        else if (match.isDraw) draws++;
      }
    }

    // Get recent matches
    const recentMatches = h2hMatches
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5)
      .map(m => ({
        leagueName: m.league.name,
        roundNumber: m.roundNumber,
        player1Wins: m.player1Id === player1.id ? m.player1Wins : m.player2Wins,
        player2Wins: m.player1Id === player1.id ? m.player2Wins : m.player1Wins,
        winnerId: m.winnerId,
        isDraw: m.isDraw,
      }));

    return {
      player1DbId: player1.id,
      player2DbId: player2.id,
      totalMatches: h2hMatches.length,
      player1Wins,
      player2Wins,
      draws,
      player1GameWins,
      player2GameWins,
      recentMatches,
    };
  }
}
