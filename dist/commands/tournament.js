"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tournamentCommand = void 0;
const discord_js_1 = require("discord.js");
const leagueService_1 = require("../services/leagueService");
const leagueService = new leagueService_1.LeagueService();
exports.tournamentCommand = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('tournament')
        .setDescription('Tournament management')
        .addSubcommand(subcommand => subcommand
        .setName('start')
        .setDescription('Start a league')
        .addIntegerOption(option => option
        .setName('league_id')
        .setDescription('ID of the league to start')
        .setRequired(true)))
        .addSubcommand(subcommand => subcommand
        .setName('nextround')
        .setDescription('Generate pairings for next round')
        .addIntegerOption(option => option
        .setName('league_id')
        .setDescription('ID of the league')
        .setRequired(true)))
        .addSubcommand(subcommand => subcommand
        .setName('report')
        .setDescription('Report match result')
        .addIntegerOption(option => option
        .setName('match_id')
        .setDescription('ID of the match')
        .setRequired(true))
        .addIntegerOption(option => option
        .setName('player1_wins')
        .setDescription('Number of games won by player 1')
        .setRequired(true))
        .addIntegerOption(option => option
        .setName('player2_wins')
        .setDescription('Number of games won by player 2')
        .setRequired(true))
        .addIntegerOption(option => option
        .setName('draws')
        .setDescription('Number of drawn games')
        .setRequired(false)))
        .addSubcommand(subcommand => subcommand
        .setName('pairings')
        .setDescription('View current round pairings')
        .addIntegerOption(option => option
        .setName('league_id')
        .setDescription('ID of the league')
        .setRequired(true)))
        .addSubcommand(subcommand => subcommand
        .setName('drop')
        .setDescription('Drop from a league')
        .addIntegerOption(option => option
        .setName('league_id')
        .setDescription('ID of the league')
        .setRequired(true))),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        try {
            if (subcommand === 'start') {
                const leagueId = interaction.options.getInteger('league_id', true);
                await leagueService.startLeague(leagueId);
                await interaction.reply(`League ${leagueId} has been started! Use /tournament nextround to generate round 1 pairings.`);
            }
            else if (subcommand === 'nextround') {
                const leagueId = interaction.options.getInteger('league_id', true);
                const pairings = await leagueService.generateNextRound(leagueId);
                const embed = new discord_js_1.EmbedBuilder()
                    .setColor(0x0099ff)
                    .setTitle(`Round ${(await leagueService.getLeague(leagueId))?.currentRound} Pairings`)
                    .setTimestamp();
                pairings.forEach((pairing, index) => {
                    const player2Name = pairing.player2Name || 'BYE';
                    embed.addFields({
                        name: `Table ${index + 1}`,
                        value: `${pairing.player1Name} vs ${player2Name}`,
                    });
                });
                await interaction.reply({ embeds: [embed] });
            }
            else if (subcommand === 'report') {
                const matchId = interaction.options.getInteger('match_id', true);
                const player1Wins = interaction.options.getInteger('player1_wins', true);
                const player2Wins = interaction.options.getInteger('player2_wins', true);
                const draws = interaction.options.getInteger('draws') || 0;
                await leagueService.reportMatchResult(matchId, {
                    player1Wins,
                    player2Wins,
                    draws,
                });
                await interaction.reply(`Match ${matchId} result reported: ${player1Wins}-${player2Wins}-${draws}`);
            }
            else if (subcommand === 'pairings') {
                const leagueId = interaction.options.getInteger('league_id', true);
                const matches = await leagueService.getCurrentRoundMatches(leagueId);
                if (matches.length === 0) {
                    await interaction.reply('No active round found.');
                    return;
                }
                const embed = new discord_js_1.EmbedBuilder()
                    .setColor(0x0099ff)
                    .setTitle('Current Round Pairings')
                    .setTimestamp();
                matches.forEach(match => {
                    const player2Name = match.player2 ? match.player2.username : 'BYE';
                    const status = match.isComplete ? '✅' : '⏳';
                    embed.addFields({
                        name: `Table ${match.tableNumber} ${status}`,
                        value: `${match.player1.username} vs ${player2Name} (Match ID: ${match.id})`,
                    });
                });
                await interaction.reply({ embeds: [embed] });
            }
            else if (subcommand === 'drop') {
                const leagueId = interaction.options.getInteger('league_id', true);
                await leagueService.dropPlayer(leagueId, interaction.user.id);
                await interaction.reply(`You have been dropped from league ${leagueId}.`);
            }
        }
        catch (error) {
            console.error('Error executing tournament command:', error);
            await interaction.reply({
                content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                ephemeral: true,
            });
        }
    },
};
