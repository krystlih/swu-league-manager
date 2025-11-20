import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { LeagueService } from '../services/leagueService';

const leagueService = new LeagueService();

export const registrationCommand = {
  data: new SlashCommandBuilder()
    .setName('register')
    .setDescription('Register for a league')
    .addIntegerOption(option =>
      option
        .setName('league_id')
        .setDescription('ID of the league to register for')
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const leagueId = interaction.options.getInteger('league_id', true);

    try {
      await leagueService.registerPlayer(
        leagueId,
        interaction.user.id,
        interaction.user.username
      );

      await interaction.reply(`Successfully registered for league ${leagueId}!`);
    } catch (error) {
      console.error('Error registering player:', error);
      await interaction.reply({
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ephemeral: true,
      });
    }
  },
};
