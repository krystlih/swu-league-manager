import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { LeagueService } from '../services/leagueService';
import { MatchRepository } from '../data/repositories/matchRepository';
import { RegistrationRepository } from '../data/repositories/registrationRepository';
import { RoundTimerService } from '../services/roundTimerService';
import { generateTop8Bracket, generateTop4Bracket, generateTop2Bracket } from '../utils/bracketVisualizer';
import { CompetitionType } from '../types';

const leagueService = LeagueService.getInstance();
const matchRepository = new MatchRepository();
const registrationRepository = new RegistrationRepository();
const timerService = RoundTimerService.getInstance();

export const tournamentCommand = {
  data: new SlashCommandBuilder()
    .setName('tournament')
    .setDescription('Tournament management')
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Create a new tournament')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('Name of the tournament')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('format')
            .setDescription('Format of the tournament (e.g., Standard, Hyperspace)')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('type')
            .setDescription('Competition type')
            .setRequired(true)
            .addChoices(
              { name: 'Swiss', value: 'SWISS' },
              { name: 'Swiss with Top Cut', value: 'SWISS_WITH_TOP_CUT' },
              { name: 'Double Elimination', value: 'DOUBLE_ELIMINATION' },
              { name: 'Single Elimination', value: 'SINGLE_ELIMINATION' }
            )
        )
        .addIntegerOption(option =>
          option
            .setName('rounds')
            .setDescription('Total number of rounds (optional, auto-calculated if not provided)')
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option
            .setName('timer')
            .setDescription('Round timer in minutes (optional, e.g., 50 for 50 minutes)')
            .setRequired(false)
            .setMinValue(10)
            .setMaxValue(180)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List active tournaments')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('help')
        .setDescription('Learn how to use the tournament system')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('start')
        .setDescription('Start a tournament')
        .addStringOption(option =>
          option
            .setName('tournament')
            .setDescription('Select the tournament to start')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('nextround')
        .setDescription('Generate pairings for next round')
        .addStringOption(option =>
          option
            .setName('tournament')
            .setDescription('Select the tournament')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('report')
        .setDescription('Report match result for your current pairing')
        .addStringOption(option =>
          option
            .setName('tournament')
            .setDescription('Select the tournament')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addIntegerOption(option =>
          option
            .setName('your_wins')
            .setDescription('Number of games you won')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('opponent_wins')
            .setDescription('Number of games your opponent won')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('draws')
            .setDescription('Number of drawn games')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('pairings')
        .setDescription('View current round pairings')
        .addStringOption(option =>
          option
            .setName('tournament')
            .setDescription('Select the tournament')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('drop')
        .setDescription('Drop from a tournament')
        .addStringOption(option =>
          option
            .setName('tournament')
            .setDescription('Select the tournament')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('cancel')
        .setDescription('[Creator Only] Cancel a tournament')
        .addStringOption(option =>
          option
            .setName('tournament')
            .setDescription('The tournament to cancel')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('delete')
        .setDescription('[Creator Only] Permanently delete a tournament and all its data')
        .addStringOption(option =>
          option
            .setName('tournament')
            .setDescription('The tournament to delete')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('auditlog')
        .setDescription('[Creator Only] View audit log of tournament changes')
        .addStringOption(option =>
          option
            .setName('tournament')
            .setDescription('Select the tournament')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addIntegerOption(option =>
          option
            .setName('limit')
            .setDescription('Number of recent entries to show (default: 10)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('modifymatch')
        .setDescription('[Creator Only] Modify a match result')
        .addStringOption(option =>
          option
            .setName('tournament')
            .setDescription('Select the tournament')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('match')
            .setDescription('Select the match to modify')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addIntegerOption(option =>
          option
            .setName('player1_wins')
            .setDescription('Player 1 wins')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('player2_wins')
            .setDescription('Player 2 wins')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('draws')
            .setDescription('Number of draws')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('repairround')
        .setDescription('[Creator Only] Regenerate pairings for the current round')
        .addStringOption(option =>
          option
            .setName('tournament')
            .setDescription('Select the tournament')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('findmatch')
        .setDescription('Find match IDs by player name')
        .addStringOption(option =>
          option
            .setName('tournament')
            .setDescription('Select the tournament')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('player_name')
            .setDescription('Player name to search for')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('end')
        .setDescription('[Creator Only] End the tournament and announce final standings')
        .addStringOption(option =>
          option
            .setName('tournament')
            .setDescription('Select the tournament')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('bracket')
        .setDescription('View elimination bracket or Top Cut bracket')
        .addStringOption(option =>
          option
            .setName('tournament')
            .setDescription('Select the tournament')
            .setRequired(true)
            .setAutocomplete(true)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    try {
      // Handle commands that don't need a specific tournament
      if (subcommand === 'create') {
        const name = interaction.options.getString('name', true);
        const format = interaction.options.getString('format', true);
        const type = interaction.options.getString('type', true) as CompetitionType;
        const rounds = interaction.options.getInteger('rounds') || undefined;
        const timer = interaction.options.getInteger('timer') || undefined;

        try {
          const league = await leagueService.createLeague({
            guildId: interaction.guildId!,
            createdBy: interaction.user.id,
            name,
            format,
            competitionType: type,
            totalRounds: rounds,
            roundTimerMinutes: timer,
          });

          const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('🎯 Tournament Created!')
            .addFields(
              { name: 'Name', value: league.name, inline: true },
              { name: 'Format', value: league.format, inline: true },
              { name: 'Type', value: league.competitionType, inline: true },
              { name: 'Status', value: league.status, inline: true }
            )
            .setDescription('Players can now register with `/register`')
            .setTimestamp();

          await interaction.reply({ embeds: [embed] });
        } catch (error: any) {
          if (error.code === 'P2002' || error.message?.includes('Unique constraint')) {
            await interaction.reply({
              content: `A tournament named "${name}" already exists in this server. Please choose a different name.`,
              flags: 64
            });
          } else {
            throw error;
          }
        }
        return;
      }

      if (subcommand === 'list') {
        const leagues = await leagueService.getActiveLeagues(interaction.guildId!);

        if (leagues.length === 0) {
          await interaction.reply('No active tournaments found.');
          return;
        }

        const embed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle('🏆 Active Tournaments')
          .setTimestamp();

        leagues.forEach(league => {
          embed.addFields({
            name: `${league.name}`,
            value: `Format: ${league.format} | Type: ${league.competitionType} | Status: ${league.status}`,
          });
        });

        await interaction.reply({ embeds: [embed] });
        return;
      }

      if (subcommand === 'help') {
        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('📚 Tournament System Guide')
          .setDescription('Quick reference for running Star Wars Unlimited tournaments')
          .addFields(
            {
              name: '🎮 Quick Start',
              value: '`/tournament create` → `/register` → `/tournament start` → Report results → Auto-advance!',
              inline: false
            },
            {
              name: '📋 Tournament Setup',
              value: '`/tournament create` - New tournament\n' +
                '`/tournament list` - View tournaments\n' +
                '`/tournament cancel` - Cancel [Creator]\n' +
                '`/tournament delete` - Permanently delete [Creator]\n' +
                '`/tournament auditlog` - View changes [Creator]',
              inline: false
            },
            {
              name: '👥 Registration',
              value: '`/register` - Join tournament\n' +
                '`/manualregister` - Register a user [Creator]',
              inline: false
            },
            {
              name: '🎯 During Tournament',
              value: '`/tournament start` - Begin [Creator]\n' +
                '`/tournament pairings` - View matches\n' +
                '`/tournament report` - Report results\n' +
                '`/tournament nextround` - Advance Swiss [Creator]\n' +
                '`/tournament bracket` - View bracket\n' +
                '`/tournament drop` - Drop out',
              inline: false
            },
            {
              name: '📊 Info & Stats',
              value: '`/standings` - Current rankings\n' +
                '`/stats player` - Player history\n' +
                '`/stats leaderboard` - Server rankings\n' +
                '`/history list` - Past tournaments',
              inline: false
            },
            {
              name: '🔧 Admin Tools [Creator]',
              value: '`/tournament findmatch` - Search matches\n' +
                '`/tournament modifymatch` - Fix results\n' +
                '`/tournament repairround` - Reset round\n' +
                '`/tournament end` - Manual end',
              inline: false
            },
            {
              name: '⚡ Auto Features',
              value: '• Swiss auto-ends after final round\n' +
                '• Elimination/Top Cut auto-advance\n' +
                '• Round timers with announcements\n' +
                '• Final standings on completion\n' +
                '• Automatic bye assignment',
              inline: false
            },
            {
              name: '🏁 Tournament Types',
              value: '**Swiss**: Round-robin style, play all rounds\n' +
                '**Swiss + Top Cut**: Swiss → Top 8/4/2\n' +
                '**Single Elimination**: Win or go home\n' +
                '**Double Elimination**: Two losses to eliminate',
              inline: false
            }
          )
          .setFooter({ text: 'For detailed help, visit the bot documentation' })
          .setTimestamp();

        // Defer reply immediately to prevent timeout
        await interaction.deferReply({ flags: 64 });

        try {
          await interaction.user.send({ embeds: [embed] });
          await interaction.editReply({ content: 'I\'ve sent you a DM with the tournament guide!' });
        } catch (dmError) {
          // If DM fails (user has DMs disabled), fall back to showing embed in channel
          await interaction.editReply({ embeds: [embed] });
        }
        return;
      }

      // All other commands need a tournament name
      // Get tournament by name instead of ID
      const tournamentName = interaction.options.getString('tournament', true);
      const guildId = interaction.guildId;
      
      if (!guildId) {
        await interaction.reply({ content: 'This command can only be used in a server.', flags: 64 });
        return;
      }

      const league = await leagueService.getLeagueByName(guildId, tournamentName);
      
      if (!league) {
        await interaction.reply({ content: `Tournament "${tournamentName}" not found.`, flags: 64 });
        return;
      }

      const leagueId = league.id;

      // Handle tournament-specific commands
      if (subcommand === 'cancel') {
        // Check if the user is the tournament creator
        if (league.createdBy !== interaction.user.id) {
          await interaction.reply({ 
            content: 'Only the tournament creator can cancel the tournament.', 
            flags: 64 
          });
          return;
        }

        await leagueService.cancelLeague(league.id);
        await interaction.reply(`Tournament "${league.name}" has been cancelled.`);
      } else if (subcommand === 'delete') {
        // Check if the user is the tournament creator
        if (league.createdBy !== interaction.user.id) {
          await interaction.reply({ 
            content: 'Only the tournament creator can delete the tournament.', 
            flags: 64 
          });
          return;
        }

        await leagueService.deleteLeague(league.id);
        await interaction.reply(`Tournament "${league.name}" and all its data have been permanently deleted. Audit logs have been preserved.`);
      } else if (subcommand === 'auditlog') {
        const limit = interaction.options.getInteger('limit') || 10;

        // Check if the user is the tournament creator
        if (league.createdBy !== interaction.user.id) {
          await interaction.reply({ 
            content: 'Only the tournament creator can view the audit log.', 
            flags: 64 
          });
          return;
        }

        const logs = await leagueService.getAuditLogs(league.id, limit);

        if (logs.length === 0) {
          await interaction.reply({ 
            content: 'No audit log entries found for this tournament.', 
            flags: 64 
          });
          return;
        }

        const embed = new EmbedBuilder()
          .setColor(0xff9900)
          .setTitle(`${league.name} - Audit Log`)
          .setDescription(`Showing ${logs.length} most recent changes`)
          .setTimestamp();

        logs.forEach(log => {
          const timestamp = new Date(log.createdAt).toLocaleString();
          embed.addFields({
            name: `${log.action} - ${timestamp}`,
            value: `**User:** ${log.username}\n**Description:** ${log.description}`,
            inline: false,
          });
        });

        await interaction.reply({ embeds: [embed], flags: 64 });
      } else if (subcommand === 'start') {
        // Check if the user is the league creator
        if (league.createdBy !== interaction.user.id) {
          await interaction.reply({ 
            content: 'Only the league creator can start the tournament.', 
            flags: 64 
          });
          return;
        }

        // Store announcement channel for timer announcements
        // Set announcement channel to current channel if not already set
        if (!league.announcementChannelId) {
          console.log(`[START] Setting announcement channel - Guild: ${interaction.guildId}, Channel: ${interaction.channelId}`);
          await leagueService.updateLeague(leagueId, {
            announcementChannelId: interaction.channelId
          });
        } else {
          console.log(`[START] Announcement channel already set: ${league.announcementChannelId}`);
        }

        await leagueService.startLeague(
          leagueId,
          interaction.user.id,
          interaction.user.username
        );
        
        // Automatically generate Round 1 pairings
        const pairings = await leagueService.generateNextRound(leagueId);
        
        // Get updated league and start timer if configured
        const updatedLeague = await leagueService.getLeague(leagueId);
        if (updatedLeague && updatedLeague.roundTimerMinutes) {
          await timerService.startRoundTimer(
            leagueId,
            updatedLeague.currentRound,
            interaction.guildId!,
            interaction.channelId
          );
        }
        
        // Create pairings embed
        const embed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle(`${league.name} - Round 1 Pairings`)
          .setTimestamp();

        pairings.forEach((pairing, index) => {
          const player2Name = pairing.player2Name || 'BYE';
          const isBye = !pairing.player2Name;
          const matchInfo = isBye 
            ? `${pairing.player1Name} vs ${player2Name} ✅ (Auto-completed: 2-0-0)`
            : `${pairing.player1Name} vs ${player2Name}`;
          
          embed.addFields({
            name: `Table ${index + 1}`,
            value: matchInfo,
          });
        });

        // Add timer info to embed if configured
        if (updatedLeague?.roundTimerMinutes) {
          embed.setFooter({ 
            text: `Round timer: ${updatedLeague.roundTimerMinutes} minutes (starts in 5 minutes)` 
          });
        }

        await interaction.reply({ embeds: [embed] });
      } else if (subcommand === 'nextround') {
        // Cancel timer for current round before generating next round
        if (league.currentRound > 0) {
          timerService.cancelRoundTimer(leagueId, league.currentRound);
        }

        const pairings = await leagueService.generateNextRound(leagueId);

        // Start round timer for new round if configured
        const updatedLeague = await leagueService.getLeague(leagueId);
        if (updatedLeague) {
          await timerService.startRoundTimer(
            leagueId,
            updatedLeague.currentRound,
            interaction.guildId!,
            interaction.channelId
          );
        }

        const embed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle(`${league.name} - Round ${league.currentRound + 1} Pairings`)
          .setTimestamp();

        pairings.forEach((pairing, index) => {
          const player2Name = pairing.player2Name || 'BYE';
          const isBye = !pairing.player2Name;
          const matchInfo = isBye 
            ? `${pairing.player1Name} vs ${player2Name} ✅ (Auto-completed: 2-0-0)`
            : `${pairing.player1Name} vs ${player2Name}`;
          
          embed.addFields({
            name: `Table ${index + 1}`,
            value: matchInfo,
          });
        });

        // Add timer info to embed if configured
        if (updatedLeague?.roundTimerMinutes) {
          embed.setFooter({ 
            text: `Round timer: ${updatedLeague.roundTimerMinutes} minutes (starts in 5 minutes)` 
          });
        }

        await interaction.reply({ embeds: [embed] });
      } else if (subcommand === 'report') {
        const yourWins = interaction.options.getInteger('your_wins', true);
        const opponentWins = interaction.options.getInteger('opponent_wins', true);
        const draws = interaction.options.getInteger('draws') || 0;

        // Find the player's active match
        const playerDiscordId = interaction.user.id;
        const match = await leagueService.findPlayerActiveMatch(leagueId, playerDiscordId);

        if (!match) {
          await interaction.reply({
            content: 'You do not have an active match in this league.',
            flags: 64
          });
          return;
        }

        if (match.isCompleted) {
          await interaction.reply({
            content: 'This match has already been reported.',
            flags: 64
          });
          return;
        }

        // Determine if user is player1 or player2
        const isPlayer1 = match.player1.discordId === playerDiscordId;
        const player1Wins = isPlayer1 ? yourWins : opponentWins;
        const player2Wins = isPlayer1 ? opponentWins : yourWins;

        await leagueService.reportMatchResult(match.id, {
          player1Wins,
          player2Wins,
          draws,
        });

        const opponentName = isPlayer1 
          ? (match.player2?.username || 'BYE')
          : match.player1.username;

        await interaction.reply(
          `Match result reported: You ${yourWins} - ${opponentWins} ${opponentName}${draws > 0 ? ` (${draws} draws)` : ''}`
        );
      } else if (subcommand === 'pairings') {
        const matches = await leagueService.getCurrentRoundMatches(leagueId);

        if (matches.length === 0) {
          await interaction.reply('No active round found.');
          return;
        }

        const embed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle(`${league.name} - Current Round Pairings`)
          .setTimestamp();

        matches.forEach(match => {
          const player2Name = match.player2 ? match.player2.username : 'BYE';
          const isBye = !match.player2;
          const status = match.isCompleted ? '✅' : '⏳';
          const byeNote = isBye && match.isCompleted ? ' (Auto-completed: 2-0-0)' : '';
          
          embed.addFields({
            name: `Table ${match.tableNumber} ${status}`,
            value: `${match.player1.username} vs ${player2Name}${byeNote}`,
          });
        });

        await interaction.reply({ embeds: [embed] });
      } else if (subcommand === 'drop') {
        await leagueService.dropPlayer(leagueId, interaction.user.id);
        await interaction.reply(`You have been dropped from "${league.name}".`);
      } else if (subcommand === 'modifymatch') {
        // Check if the user is the league creator
        if (league.createdBy !== interaction.user.id) {
          await interaction.reply({ 
            content: 'Only the league creator can modify match results.', 
            flags: 64 
          });
          return;
        }

        const matchIdStr = interaction.options.getString('match', true);
        const matchId = parseInt(matchIdStr);
        const player1Wins = interaction.options.getInteger('player1_wins', true);
        const player2Wins = interaction.options.getInteger('player2_wins', true);
        const draws = interaction.options.getInteger('draws') || 0;

        // Get the match to verify it exists and belongs to this league
        const match = await leagueService.getMatchById(matchId);
        
        if (!match || match.leagueId !== leagueId) {
          await interaction.reply({ 
            content: 'Match not found in this league.', 
            flags: 64 
          });
          return;
        }

        console.log(`[DEBUG] Modifying match ${matchId}: ${player1Wins}-${player2Wins}-${draws}`);
        console.log(`[DEBUG] Match before modification:`, {
          player1Wins: match.player1Wins,
          player2Wins: match.player2Wins,
          draws: match.draws,
          isCompleted: match.isCompleted
        });

        try {
          await leagueService.modifyMatchResult(
            matchId, 
            {
              player1Wins,
              player2Wins,
              draws,
            },
            interaction.user.id,
            interaction.user.username
          );

          // Verify the change was saved
          const updatedMatch = await leagueService.getMatchById(matchId);
          console.log(`[DEBUG] Match after modification:`, {
            player1Wins: updatedMatch?.player1Wins,
            player2Wins: updatedMatch?.player2Wins,
            draws: updatedMatch?.draws,
            isCompleted: updatedMatch?.isCompleted
          });

          const player2Name = match.player2 ? match.player2.username : 'BYE';
          await interaction.reply(
            `Match result modified: ${match.player1.username} ${player1Wins} - ${player2Wins} ${player2Name}${draws > 0 ? ` (${draws} draws)` : ''}`
          );
        } catch (error) {
          console.error('[ERROR] Failed to modify match result:', error);
          await interaction.reply({
            content: `Error modifying match result: ${error instanceof Error ? error.message : 'Unknown error'}`,
            flags: 64
          });
        }
      } else if (subcommand === 'repairround') {
        // Check if the user is the league creator
        if (league.createdBy !== interaction.user.id) {
          await interaction.reply({ 
            content: 'Only the league creator can repair rounds.', 
            flags: 64 
          });
          return;
        }

        await leagueService.repairCurrentRound(
          leagueId,
          interaction.user.id,
          interaction.user.username
        );
        
        await interaction.reply(
          `Round ${league.currentRound} has been repaired. All matches in this round have been deleted and new pairings have been generated. Use /tournament pairings to view the new pairings.`
        );
      } else if (subcommand === 'findmatch') {
        const playerName = interaction.options.getString('player_name', true);
        
        // Get all matches for this league
        const matches = await leagueService.getAllLeagueMatches(leagueId);
        
        // Filter matches by player name (case-insensitive partial match)
        const playerMatches = matches.filter(match => {
          const p1Name = match.player1.username.toLowerCase();
          const p2Name = match.player2 ? match.player2.username.toLowerCase() : '';
          const searchName = playerName.toLowerCase();
          
          return p1Name.includes(searchName) || p2Name.includes(searchName);
        });

        if (playerMatches.length === 0) {
          await interaction.reply({
            content: `No matches found for player "${playerName}" in league "${league.name}".`,
            flags: 64
          });
          return;
        }

        const embed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle(`${league.name} - Matches for "${playerName}"`)
          .setDescription(`Found ${playerMatches.length} match(es)`)
          .setTimestamp();

        playerMatches.forEach(match => {
          const player2Name = match.player2 ? match.player2.username : 'BYE';
          const status = match.isCompleted ? '✅ Complete' : '⏳ In Progress';
          const result = match.isCompleted 
            ? `${match.player1Wins}-${match.player2Wins}${match.draws > 0 ? `-${match.draws}` : ''}`
            : 'Not reported';
          
          embed.addFields({
            name: `Match ID: ${match.id} | Round ${match.round?.roundNumber || 'N/A'}`,
            value: `${match.player1.username} vs ${player2Name}\n${status} | Result: ${result}`,
          });
        });

        await interaction.reply({ embeds: [embed], flags: 64 });
      } else if (subcommand === 'end') {
        // Check if the user is the league creator
        if (league.createdBy !== interaction.user.id) {
          await interaction.reply({ 
            content: 'Only the league creator can end the tournament.', 
            flags: 64 
          });
          return;
        }

        // Get final standings
        const standings = await leagueService.getStandings(leagueId);

        if (standings.length === 0) {
          await interaction.reply({
            content: 'No standings available for this league.',
            flags: 64
          });
          return;
        }

        // End the tournament
        await leagueService.endTournament(
          leagueId,
          interaction.user.id,
          interaction.user.username
        );

        // Create the announcement embed
        const winner = standings[0];
        const winnerRecord = `${winner.wins}-${winner.losses}${winner.draws > 0 ? `-${winner.draws}` : ''}`;
        
        const embed = new EmbedBuilder()
          .setColor(0xffd700) // Gold color
          .setTitle(`🏆 ${league.name} - Tournament Complete! 🏆`)
          .setDescription(`**Champion: ${winner.playerName}**\n**Record: ${winnerRecord}**\n**Match Points: ${winner.matchPoints}**`)
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

        embed.setFooter({ text: `Tournament ended by ${interaction.user.username}` });
        embed.setTimestamp();

        await interaction.reply({ embeds: [embed] });
      } else if (subcommand === 'bracket') {
        // Check if this is an elimination tournament or has Top Cut
        const isElimination = league.competitionType === 'SINGLE_ELIMINATION' || 
                              league.competitionType === 'DOUBLE_ELIMINATION';
        
        if (!isElimination && !league.hasTopCut) {
          await interaction.reply({
            content: 'This tournament does not have a bracket. Only elimination tournaments and Swiss with Top Cut have brackets.',
            flags: 64
          });
          return;
        }

        // For Swiss with Top Cut, check if Top Cut has started
        if (!isElimination && league.status !== 'TOP_CUT' && league.status !== 'COMPLETED') {
          await interaction.reply({
            content: 'The Top Cut bracket has not started yet. It will begin automatically after the Swiss rounds are complete.',
            flags: 64
          });
          return;
        }

        // Get all matches for the league
        const allMatches = await matchRepository.findByLeague(leagueId);
        
        let matchesToShow: any[];
        
        if (isElimination) {
          // For elimination tournaments, show all matches
          matchesToShow = allMatches;
        } else {
          // For Swiss with Top Cut, filter to Top Cut matches only
          const totalRounds = league.totalRounds || 0;
          matchesToShow = allMatches.filter((m: any) => m.roundNumber > totalRounds);
        }
        
        if (matchesToShow.length === 0) {
          await interaction.reply({
            content: 'No bracket matches have been created yet.',
            flags: 64
          });
          return;
        }

        // Get all registrations to map player IDs to names
        const registrations = await registrationRepository.findByLeague(leagueId);
        const playerMap = new Map(
          registrations.map((r: any) => [r.playerId, r.playerName])
        );

        // Map matches to BracketMatch interface
        interface BracketMatch {
          player1: string;
          player2: string;
          winner?: string;
          isComplete: boolean;
          roundNumber: number;
          matchNumber: number;
        }

        const bracketMatches: BracketMatch[] = matchesToShow.map((match: any, index: number) => {
          const player1Name = playerMap.get(match.player1Id) || 'Unknown Player';
          const player2Name = playerMap.get(match.player2Id) || 'Unknown Player';
          
          let winner: string | undefined;
          if (match.winnerId) {
            winner = match.winnerId === match.player1Id ? player1Name : player2Name;
          }

          // Calculate round number
          let relativeRound: number;
          if (isElimination) {
            relativeRound = match.roundNumber;
          } else {
            // For Top Cut, calculate relative to Swiss rounds
            const totalRounds = league.totalRounds || 0;
            relativeRound = match.roundNumber - totalRounds;
          }

          return {
            player1: player1Name,
            player2: player2Name,
            winner,
            isComplete: match.isCompleted,
            roundNumber: relativeRound,
            matchNumber: match.tableNumber || index + 1,
          };
        });

        // Generate bracket based on tournament type
        let bracketString: string;
        
        if (league.competitionType === 'DOUBLE_ELIMINATION') {
          // Separate winners and losers brackets
          const winnersMatches = bracketMatches.filter((_, idx) => 
            !matchesToShow[idx].isLosersBracket && !matchesToShow[idx].isGrandFinals
          );
          const losersMatches = bracketMatches.filter((_, idx) => 
            matchesToShow[idx].isLosersBracket
          );
          const grandFinalsMatches = bracketMatches.filter((_, idx) => 
            matchesToShow[idx].isGrandFinals
          );
          
          const { generateDoubleEliminationBracket } = await import('../utils/bracketVisualizer');
          bracketString = generateDoubleEliminationBracket(winnersMatches, losersMatches, grandFinalsMatches);
        } else if (league.competitionType === 'SINGLE_ELIMINATION') {
          // Use existing bracket visualizer based on number of initial players
          const numPlayers = registrations.length;
          if (numPlayers === 8) {
            bracketString = generateTop8Bracket(bracketMatches);
          } else if (numPlayers === 4) {
            bracketString = generateTop4Bracket(bracketMatches);
          } else if (numPlayers === 2) {
            bracketString = generateTop2Bracket(bracketMatches);
          } else {
            // For other sizes, use summary view
            const { generateBracketSummary } = await import('../utils/bracketVisualizer');
            bracketString = generateBracketSummary(bracketMatches, false);
          }
        } else {
          // Swiss with Top Cut
          if (!league.topCutSize || ![2, 4, 8].includes(league.topCutSize)) {
            await interaction.reply({
              content: 'Invalid Top Cut size. Must be 2, 4, or 8.',
              flags: 64
            });
            return;
          }
          
          if (league.topCutSize === 8) {
            bracketString = generateTop8Bracket(bracketMatches);
          } else if (league.topCutSize === 4) {
            bracketString = generateTop4Bracket(bracketMatches);
          } else {
            bracketString = generateTop2Bracket(bracketMatches);
          }
        }

        // Send the bracket
        const title = isElimination 
          ? `${league.name} - ${league.competitionType === 'DOUBLE_ELIMINATION' ? 'Double' : 'Single'} Elimination Bracket`
          : `${league.name} - Top ${league.topCutSize} Bracket`;
          
        await interaction.reply({
          content: `**${title}**\n${bracketString}`,
        });
      }
    } catch (error) {
      console.error('Error executing tournament command:', error);
      await interaction.reply({
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        flags: 64,
      });
    }
  },

  async autocomplete(interaction: any) {
    try {
      const focusedOption = interaction.options.getFocused(true);
      const subcommand = interaction.options.getSubcommand();
      
      if (focusedOption.name === 'tournament') {
        const guildId = interaction.guildId;
        if (!guildId) {
          await interaction.respond([]);
          return;
        }

        // Get all leagues for this guild
        const leagues = await leagueService.getLeaguesByGuild(guildId);
        
        // Filter based on subcommand
        const filtered = leagues
          .filter(league => {
            const matchesSearch = league.name.toLowerCase().includes(focusedOption.value.toLowerCase());
            
            if (subcommand === 'delete') {
              // For delete, show all tournaments (including COMPLETED and CANCELLED)
              return matchesSearch;
            } else if (subcommand === 'bracket') {
              // Allow elimination tournaments or leagues with Top Cut
              const isElimination = league.competitionType === 'SINGLE_ELIMINATION' || 
                                    league.competitionType === 'DOUBLE_ELIMINATION';
              const hasTopCut = league.hasTopCut && 
                               (league.status === 'TOP_CUT' || league.status === 'COMPLETED');
              
              return matchesSearch && (isElimination || hasTopCut);
            } else {
              // For other commands, exclude COMPLETED and CANCELLED
              return matchesSearch && 
                     league.status !== 'COMPLETED' && 
                     league.status !== 'CANCELLED';
            }
          })
          .slice(0, 25); // Discord limits to 25 choices

        await interaction.respond(
          filtered.map(league => ({
            name: `${league.name} (${league.status})`,
            value: league.name
          }))
        );
      } else if (focusedOption.name === 'match' && subcommand === 'modifymatch') {
        // Get the selected tournament
        const tournamentName = interaction.options.getString('tournament');
        if (!tournamentName) {
          await interaction.respond([]);
          return;
        }

        // Find the league
        const guildId = interaction.guildId;
        const leagues = await leagueService.getLeaguesByGuild(guildId);
        const league = leagues.find(l => l.name === tournamentName);
        
        if (!league) {
          await interaction.respond([]);
          return;
        }

        // Get all matches for the league
        const matches = await leagueService.getAllLeagueMatches(league.id);
        
        // Format matches for autocomplete
        const matchChoices = matches
          .filter((match: any) => {
            const player1Name = match.player1?.username || 'Unknown';
            const player2Name = match.player2?.username || 'BYE';
            const roundNum = match.round?.roundNumber || '?';
            const searchStr = `${player1Name} ${player2Name} Round ${roundNum}`.toLowerCase();
            return searchStr.includes(focusedOption.value.toLowerCase());
          })
          .slice(0, 25)
          .map((match: any) => {
            const player1Name = match.player1?.username || 'Unknown';
            const player2Name = match.player2?.username || 'BYE';
            const roundNum = match.round?.roundNumber || '?';
            const status = match.isCompleted ? '✅' : '⏳';
            const result = match.isCompleted 
              ? ` (${match.player1Wins || 0}-${match.player2Wins || 0})`
              : '';
            
            return {
              name: `R${roundNum} ${status} ${player1Name} vs ${player2Name}${result}`.slice(0, 100),
              value: match.id.toString()
            };
          });

        await interaction.respond(matchChoices);
      }
    } catch (error) {
      console.error('Error in autocomplete:', error);
      await interaction.respond([]);
    }
  },
};
