"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.standingsCommand = void 0;
const discord_js_1 = require("discord.js");
const leagueService_1 = require("../services/leagueService");
const leagueService = new leagueService_1.LeagueService();
exports.standingsCommand = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('standings')
        .setDescription('View league standings')
        .addIntegerOption(option => option
        .setName('league_id')
        .setDescription('ID of the league')
        .setRequired(true)),
    async execute(interaction) {
        const leagueId = interaction.options.getInteger('league_id', true);
        try {
            const standings = await leagueService.getStandings(leagueId);
            if (standings.length === 0) {
                await interaction.reply('No standings available yet.');
                return;
            }
            const embed = new discord_js_1.EmbedBuilder()
                .setColor(0xffd700)
                .setTitle(`League ${leagueId} Standings`)
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
        }
        catch (error) {
            console.error('Error fetching standings:', error);
            await interaction.reply({
                content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                ephemeral: true,
            });
        }
    },
};
