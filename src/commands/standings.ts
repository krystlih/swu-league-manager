import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { LeagueService } from '../services/leagueService';

const leagueService = LeagueService.getInstance();

export const standingsCommand = {
  data: new SlashCommandBuilder()
    .setName('standings')
    .setDescription('View league standings')
    .addStringOption(option =>
      option
        .setName('league')
        .setDescription('Select the league')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const leagueName = interaction.options.getString('league', true);
    const guildId = interaction.guildId;

    if (!guildId) {
      await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
      return;
    }

    try {
      const league = await leagueService.getLeagueByName(guildId, leagueName);
      
      if (!league) {
        await interaction.reply({ content: `League "${leagueName}" not found.`, ephemeral: true });
        return;
      }

      const standings = await leagueService.getStandings(league.id);

      if (standings.length === 0) {
        await interaction.reply('No standings available yet.');
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0xffd700)
        .setTitle(`${league.name} - Standings`)
        .setDescription(`Format: ${league.format} | Round: ${league.currentRound}`)
        .setTimestamp();

      standings.forEach(standing => {
        const record = `${standing.wins}-${standing.losses}-${standing.draws}`;
        const tiebreakers = `OMW: ${standing.omwPercent.toFixed(2)}% | GW: ${standing.gwPercent.toFixed(2)}% | OGW: ${standing.ogwPercent.toFixed(2)}%`;
        
        embed.addFields({
          name: `${standing.rank}. ${standing.playerName}`,
          value: `Record: ${record} | Points: ${standing.matchPoints}\n${tiebreakers}`,
        });
      });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error fetching standings:', error);
      await interaction.reply({
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ephemeral: true,
      });
    }
  },

  async autocomplete(interaction: any) {
    try {
      const focusedOption = interaction.options.getFocused(true);
      
      if (focusedOption.name === 'league') {
        const guildId = interaction.guildId;
        if (!guildId) {
          await interaction.respond([]);
          return;
        }

        // Get all leagues for this guild
        const leagues = await leagueService.getLeaguesByGuild(guildId);
        
        // Filter based on what the user is typing and exclude COMPLETED leagues
        const filtered = leagues
          .filter((league: any) => 
            league.status !== 'COMPLETED' &&
            league.name.toLowerCase().includes(focusedOption.value.toLowerCase())
          )
          .slice(0, 25); // Discord limits to 25 choices

        await interaction.respond(
          filtered.map((league: any) => ({
            name: `${league.name} (${league.status})`,
            value: league.name
          }))
        );
      }
    } catch (error) {
      console.error('Error in autocomplete:', error);
      await interaction.respond([]);
    }
  },
};
