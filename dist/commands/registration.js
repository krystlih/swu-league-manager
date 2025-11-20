"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registrationCommand = void 0;
const discord_js_1 = require("discord.js");
const leagueService_1 = require("../services/leagueService");
const leagueService = new leagueService_1.LeagueService();
exports.registrationCommand = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('register')
        .setDescription('Register for a league')
        .addIntegerOption(option => option
        .setName('league_id')
        .setDescription('ID of the league to register for')
        .setRequired(true)),
    async execute(interaction) {
        const leagueId = interaction.options.getInteger('league_id', true);
        try {
            await leagueService.registerPlayer(leagueId, interaction.user.id, interaction.user.username);
            await interaction.reply(`Successfully registered for league ${leagueId}!`);
        }
        catch (error) {
            console.error('Error registering player:', error);
            await interaction.reply({
                content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                ephemeral: true,
            });
        }
    },
};
