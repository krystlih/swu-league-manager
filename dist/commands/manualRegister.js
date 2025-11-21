"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.manualRegisterCommand = void 0;
const discord_js_1 = require("discord.js");
const leagueService_1 = require("../services/leagueService");
const leagueService = leagueService_1.LeagueService.getInstance();
exports.manualRegisterCommand = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('manualregister')
        .setDescription('[Creator Only] Manually register a user for a league')
        .addStringOption(option => option
        .setName('league')
        .setDescription('Select the league')
        .setRequired(true)
        .setAutocomplete(true))
        .addUserOption(option => option
        .setName('user')
        .setDescription('Select the user to register')
        .setRequired(true)),
    async execute(interaction) {
        const leagueName = interaction.options.getString('league', true);
        const user = interaction.options.getUser('user', true);
        const guildId = interaction.guildId;
        if (!guildId) {
            await interaction.reply({ content: 'This command can only be used in a server.', flags: 64 });
            return;
        }
        try {
            const league = await leagueService.getLeagueByName(guildId, leagueName);
            if (!league) {
                await interaction.reply({ content: `League "${leagueName}" not found.`, flags: 64 });
                return;
            }
            // Check if the user is the league creator
            if (league.createdBy !== interaction.user.id) {
                await interaction.reply({
                    content: 'Only the league creator can manually register users.',
                    flags: 64
                });
                return;
            }
            await leagueService.registerPlayer(league.id, user.id, user.username);
            await interaction.reply(`Successfully registered ${user.username} for "${league.name}"!`);
        }
        catch (error) {
            console.error('Error manually registering player:', error);
            await interaction.reply({
                content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                flags: 64,
            });
        }
    },
    async autocomplete(interaction) {
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
                .filter(league => league.status === 'REGISTRATION' &&
                league.name.toLowerCase().includes(focusedValue))
                .slice(0, 25)
                .map(league => ({
                name: `${league.name} - ${league.format}`,
                value: league.name,
            }));
            await interaction.respond(filtered);
        }
        catch (error) {
            console.error('Error in autocomplete:', error);
            await interaction.respond([]);
        }
    },
};
