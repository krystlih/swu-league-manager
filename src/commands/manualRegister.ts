import { SlashCommandBuilder, ChatInputCommandInteraction, AutocompleteInteraction } from 'discord.js';
import { LeagueService } from '../services/leagueService';

const leagueService = LeagueService.getInstance();

export const manualRegisterCommand = {
  data: new SlashCommandBuilder()
    .setName('manualregister')
    .setDescription('[Creator Only] Manually register a user for a tournament')
    .addStringOption(option =>
      option
        .setName('tournament')
        .setDescription('Select the tournament')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('Select the user to register')
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const tournamentName = interaction.options.getString('tournament', true);
    const user = interaction.options.getUser('user', true);
    const guildId = interaction.guildId;

    if (!guildId) {
      await interaction.reply({ content: 'This command can only be used in a server.', flags: 64 });
      return;
    }

    try {
      const league = await leagueService.getLeagueByName(guildId, tournamentName);
      
      if (!league) {
        await interaction.reply({ content: `Tournament "${tournamentName}" not found.`, flags: 64 });
        return;
      }

      // Check if the user is the tournament creator
      if (league.createdBy !== interaction.user.id) {
        await interaction.reply({ 
          content: 'Only the tournament creator can manually register users.', 
          flags: 64 
        });
        return;
      }

      await leagueService.registerPlayer(
        league.id,
        user.id,
        user.username
      );

      await interaction.reply(`Successfully registered ${user.username} for "${league.name}"!`);
    } catch (error) {
      console.error('Error manually registering player:', error);
      await interaction.reply({
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        flags: 64,
      });
    }
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    try {
      const focusedValue = interaction.options.getFocused().toLowerCase();
      const guildId = interaction.guildId;
      
      if (!guildId) {
        await interaction.respond([]);
        return;
      }

      const leagues = await leagueService.getLeaguesByGuild(guildId);

      // Filter to only show leagues in REGISTRATION status
      const filtered = leagues
        .filter(league => 
          league.status === 'REGISTRATION' && 
          league.name.toLowerCase().includes(focusedValue)
        )
        .slice(0, 25)
        .map(league => ({
          name: `${league.name} - ${league.format}`,
          value: league.name,
        }));

      await interaction.respond(filtered);
    } catch (error) {
      console.error('Error in autocomplete:', error);
      await interaction.respond([]);
    }
  },
};
