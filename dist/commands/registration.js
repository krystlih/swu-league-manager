"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registrationCommand = void 0;
const discord_js_1 = require("discord.js");
const leagueService_1 = require("../services/leagueService");
const leagueService = leagueService_1.LeagueService.getInstance();
exports.registrationCommand = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('register')
        .setDescription('Register for a league')
        .addStringOption(option => option
        .setName('league')
        .setDescription('Select the league to register for')
        .setRequired(true)
        .setAutocomplete(true)),
    async execute(interaction) {
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
            await leagueService.registerPlayer(league.id, interaction.user.id, interaction.user.username);
            await interaction.reply(`Successfully registered for "${league.name}"!`);
        }
        catch (error) {
            console.error('Error registering player:', error);
            await interaction.reply({
                content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                ephemeral: true,
            });
        }
    },
    async autocomplete(interaction) {
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
                // Filter to show only leagues in REGISTRATION status
                const filtered = leagues
                    .filter((league) => league.status === 'REGISTRATION' &&
                    league.name.toLowerCase().includes(focusedOption.value.toLowerCase()))
                    .slice(0, 25);
                await interaction.respond(filtered.map((league) => ({
                    name: `${league.name} - ${league.format}`,
                    value: league.name
                })));
            }
        }
        catch (error) {
            console.error('Error in autocomplete:', error);
            await interaction.respond([]);
        }
    },
};
