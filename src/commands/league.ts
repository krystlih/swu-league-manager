import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
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
        .addIntegerOption(option =>
          option
            .setName('league_id')
            .setDescription('ID of the league to cancel')
            .setRequired(true)
        )
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
        const leagueId = interaction.options.getInteger('league_id', true);

        await leagueService.cancelLeague(leagueId);

        await interaction.reply(`League ${leagueId} has been cancelled.`);
      }
    } catch (error) {
      console.error('Error executing league command:', error);
      await interaction.reply({
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ephemeral: true,
      });
    }
  },
};
