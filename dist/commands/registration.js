"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registrationCommand = void 0;
const discord_js_1 = require("discord.js");
const leagueService_1 = require("../services/leagueService");
const leagueService = leagueService_1.LeagueService.getInstance();
exports.registrationCommand = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('register')
        .setDescription('Register for a tournament')
        .addStringOption(option => option
        .setName('tournament')
        .setDescription('Select the tournament to register for')
        .setRequired(true)
        .setAutocomplete(true)),
    async execute(interaction) {
        const tournamentName = interaction.options.getString('tournament', true);
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
            await leagueService.registerPlayer(league.id, interaction.user.id, interaction.user.username);
            await interaction.reply(`Successfully registered for "${league.name}"!`);
        }
        catch (error) {
            console.error('Error registering player:', error);
            await interaction.reply({
                content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                flags: 64,
            });
        }
    },
    async autocomplete(interaction) {
        try {
            const focusedOption = interaction.options.getFocused(true);
            if (focusedOption.name === 'tournament') {
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
