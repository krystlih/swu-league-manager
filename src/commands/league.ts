import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, AutocompleteInteraction } from 'discord.js';
import { LeagueService } from '../services/leagueService';
import { CompetitionType } from '../types';

const leagueService = new LeagueService();

export const leagueCommand = {
  data: new SlashCommandBuilder()
    .setName('league')
    .setDescription('Manage leagues')
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Create a new league')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('Name of the league')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('format')
            .setDescription('Format of the league')
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
            .setDescription('Total number of rounds (optional)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List active leagues')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('cancel')
        .setDescription('Cancel a league')
        .addStringOption(option =>
          option
            .setName('league')
            .setDescription('The league to cancel')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('auditlog')
        .setDescription('[Creator Only] View audit log of league changes')
        .addStringOption(option =>
          option
            .setName('league')
            .setDescription('Select the league')
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
        .setName('help')
        .setDescription('Learn how to use the league system')
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    try {
      if (subcommand === 'create') {
        const name = interaction.options.getString('name', true);
        const format = interaction.options.getString('format', true);
        const type = interaction.options.getString('type', true) as CompetitionType;
        const rounds = interaction.options.getInteger('rounds') || undefined;

        const league = await leagueService.createLeague({
          guildId: interaction.guildId!,
          createdBy: interaction.user.id,
          name,
          format,
          competitionType: type,
          totalRounds: rounds,
        });

        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('League Created!')
          .addFields(
            { name: 'League ID', value: league.id.toString(), inline: true },
            { name: 'Name', value: league.name, inline: true },
            { name: 'Format', value: league.format, inline: true },
            { name: 'Type', value: league.competitionType, inline: true },
            { name: 'Status', value: league.status, inline: true }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      } else if (subcommand === 'list') {
        const leagues = await leagueService.getActiveLeagues(interaction.guildId!);

        if (leagues.length === 0) {
          await interaction.reply('No active leagues found.');
          return;
        }

        const embed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle('Active Leagues')
          .setTimestamp();

        leagues.forEach(league => {
          embed.addFields({
            name: `${league.name} (ID: ${league.id})`,
            value: `Format: ${league.format} | Type: ${league.competitionType} | Status: ${league.status}`,
          });
        });

        await interaction.reply({ embeds: [embed] });
      } else if (subcommand === 'cancel') {
        const leagueName = interaction.options.getString('league', true);
        const league = await leagueService.getLeagueByName(interaction.guildId!, leagueName);

        if (!league) {
          await interaction.reply({ content: 'League not found.', ephemeral: true });
          return;
        }

        await leagueService.cancelLeague(league.id);

        await interaction.reply(`League "${league.name}" has been cancelled.`);
      } else if (subcommand === 'auditlog') {
        const leagueName = interaction.options.getString('league', true);
        const limit = interaction.options.getInteger('limit') || 10;
        const league = await leagueService.getLeagueByName(interaction.guildId!, leagueName);

        if (!league) {
          await interaction.reply({ content: 'League not found.', ephemeral: true });
          return;
        }

        // Check if the user is the league creator
        if (league.createdBy !== interaction.user.id) {
          await interaction.reply({ 
            content: 'Only the league creator can view the audit log.', 
            ephemeral: true 
          });
          return;
        }

        const logs = await leagueService.getAuditLogs(league.id, limit);

        if (logs.length === 0) {
          await interaction.reply({ 
            content: 'No audit log entries found for this league.', 
            ephemeral: true 
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

        await interaction.reply({ embeds: [embed], ephemeral: true });
      } else if (subcommand === 'help') {
        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('📚 League System Guide')
          .setDescription('Complete guide to managing and participating in leagues')
          .addFields(
            {
              name: '1️⃣ Creating a League',
              value: '**Command:** `/league create`\n' +
                '• Choose a **name** for your league\n' +
                '• Specify the **format** (e.g., Premier, Twin Suns, Limited)\n' +
                '• Select **competition type** (Swiss, Swiss with Top Cut, etc.)\n' +
                '• Optionally set the number of **rounds**\n' +
                '• League starts in REGISTRATION status',
              inline: false
            },
            {
              name: '2️⃣ Player Registration',
              value: '**Command:** `/register`\n' +
                '• Players use this command to join a league\n' +
                '• Only leagues in REGISTRATION status appear\n' +
                '• Each player can register once per league\n\n' +
                '**Manual Registration:** `/manualregister` [Creator Only]\n' +
                '• League creator can register users manually\n' +
                '• Select user from Discord server member list\n' +
                '• Useful for registering players who aren\'t present',
              inline: false
            },
            {
              name: '3️⃣ Starting the Tournament',
              value: '**Command:** `/tournament start`\n' +
                '• Generates Round 1 pairings automatically\n' +
                '• Changes league status to IN_PROGRESS\n' +
                '• Players receive their table assignments',
              inline: false
            },
            {
              name: '4️⃣ Viewing Pairings',
              value: '**Command:** `/tournament pairings`\n' +
                '• Shows current round matchups\n' +
                '• Displays table numbers for each match\n' +
                '• Indicates which players have byes',
              inline: false
            },
            {
              name: '5️⃣ Reporting Match Results',
              value: '**Command:** `/tournament report`\n' +
                '• System automatically finds your active match\n' +
                '• Choose result: **Win**, **Loss**, or **Draw**\n' +
                '• Both players should report (system validates agreement)',
              inline: false
            },
            {
              name: '6️⃣ Advancing Rounds',
              value: '**Command:** `/tournament nextround`\n' +
                '• Use after all matches in current round are complete\n' +
                '• Generates new pairings using Swiss pairing algorithm\n' +
                '• Avoids rematches when possible\n' +
                '• Assigns byes to odd-player-count rounds',
              inline: false
            },
            {
              name: '7️⃣ Checking Standings',
              value: '**Command:** `/standings`\n' +
                '• View current league rankings\n' +
                '• Shows wins, losses, draws, and match points\n' +
                '• Includes tiebreakers: OMW%, GW%, OGW%\n' +
                '• Updates in real-time as matches are reported',
              inline: false
            },
            {
              name: '8️⃣ Dropping from Tournament',
              value: '**Command:** `/tournament drop`\n' +
                '• Players can drop from active tournaments\n' +
                '• Won\'t be paired in future rounds\n' +
                '• Previous results remain in standings',
              inline: false
            },
            {
              name: '9️⃣ Ending the Tournament',
              value: '**Command:** `/tournament end` [Creator Only]\n' +
                '• Officially ends the tournament\n' +
                '• Announces final standings and champion\n' +
                '• Displays top 3 with detailed stats\n' +
                '• Changes league status to COMPLETED\n' +
                '• Logged in audit trail',
              inline: false
            },
            {
              name: '🔧 League Creator Tools',
              value: '**Find Match:** `/tournament findmatch`\n' +
                '• Search for matches by player name\n' +
                '• Displays match IDs, rounds, and results\n' +
                '• Useful for finding matches to modify\n\n' +
                '**Modify Match:** `/tournament modifymatch` [Creator Only]\n' +
                '• Correct match results after they\'re reported\n' +
                '• Requires match ID (use `/tournament findmatch`)\n' +
                '• Automatically recalculates standings\n' +
                '• All changes are logged in audit log\n\n' +
                '**Repair Round:** `/tournament repairround` [Creator Only]\n' +
                '• Delete all matches in current round\n' +
                '• Regenerate fresh pairings\n' +
                '• Use if pairings need to be completely redone\n' +
                '• All changes are logged in audit log\n\n' +
                '**Audit Log:** `/league auditlog` [Creator Only]\n' +
                '• View history of all league modifications\n' +
                '• See who made changes and when\n' +
                '• Tracks starts, match edits, and round repairs',
              inline: false
            },
            {
              name: ' Managing Leagues',
              value: '**View:** `/league list` - See all active leagues\n' +
                '**Cancel:** `/league cancel` - Cancel a league\n' +
                '**Help:** `/league help` - Show this guide',
              inline: false
            },
            {
              name: '📜 Tournament History',
              value: '**List:** `/history list` - View all completed tournaments\n' +
                '**Results:** `/history results` - See final standings of a completed tournament\n' +
                '**Pairings:** `/history pairings` - View round pairings from past tournaments\n' +
                '**Matches:** `/history matches` - Search match results, filter by player',
              inline: false
            },
            {
              name: '🎯 Tips',
              value: '• All league selections use **autocomplete** - start typing to filter\n' +
                '• Swiss pairing uses official tiebreaker calculations\n' +
                '• Only the league creator can start tournaments and use creator tools\n' +
                '• Completed tournaments are archived and searchable in history\n' +
                '• Leagues persist across bot restarts',
              inline: false
            }
          )
          .setFooter({ text: 'Use autocomplete (start typing) when selecting leagues in any command' })
          .setTimestamp();

        try {
          await interaction.user.send({ embeds: [embed] });
          await interaction.reply({ content: 'I\'ve sent you a DM with the league system guide!', ephemeral: true });
        } catch (dmError) {
          // If DM fails (user has DMs disabled), fall back to ephemeral message
          await interaction.reply({ embeds: [embed], ephemeral: true });
        }
      }
    } catch (error) {
      console.error('Error executing league command:', error);
      await interaction.reply({
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ephemeral: true,
      });
    }
  },
  async autocomplete(interaction: AutocompleteInteraction) {
    try {
      const focusedValue = interaction.options.getFocused().toLowerCase();
      const leagues = await leagueService.getLeaguesByGuild(interaction.guildId!);

      const filtered = leagues
        .filter(league => 
          league.status !== 'COMPLETED' &&
          league.name.toLowerCase().includes(focusedValue)
        )
        .slice(0, 25)
        .map(league => ({
          name: `${league.name} - ${league.status}`,
          value: league.name,
        }));

      await interaction.respond(filtered);
    } catch (error) {
      console.error('Error in league autocomplete:', error);
      await interaction.respond([]);
    }
  },
};
