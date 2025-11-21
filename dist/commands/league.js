"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leagueCommand = void 0;
const discord_js_1 = require("discord.js");
const leagueService_1 = require("../services/leagueService");
const leagueService = leagueService_1.LeagueService.getInstance();
exports.leagueCommand = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('league')
        .setDescription('Manage leagues')
        .addSubcommand(subcommand => subcommand
        .setName('create')
        .setDescription('Create a new league')
        .addStringOption(option => option
        .setName('name')
        .setDescription('Name of the league')
        .setRequired(true))
        .addStringOption(option => option
        .setName('format')
        .setDescription('Format of the league')
        .setRequired(true))
        .addStringOption(option => option
        .setName('type')
        .setDescription('Competition type')
        .setRequired(true)
        .addChoices({ name: 'Swiss', value: 'SWISS' }, { name: 'Swiss with Top Cut', value: 'SWISS_WITH_TOP_CUT' }, { name: 'Double Elimination', value: 'DOUBLE_ELIMINATION' }, { name: 'Single Elimination', value: 'SINGLE_ELIMINATION' }))
        .addIntegerOption(option => option
        .setName('rounds')
        .setDescription('Total number of rounds (optional)')
        .setRequired(false))
        .addIntegerOption(option => option
        .setName('timer')
        .setDescription('Round timer in minutes (optional, e.g., 50 for 50 minutes)')
        .setRequired(false)
        .setMinValue(10)
        .setMaxValue(180)))
        .addSubcommand(subcommand => subcommand
        .setName('list')
        .setDescription('List active leagues'))
        .addSubcommand(subcommand => subcommand
        .setName('cancel')
        .setDescription('Cancel a league')
        .addStringOption(option => option
        .setName('league')
        .setDescription('The league to cancel')
        .setRequired(true)
        .setAutocomplete(true)))
        .addSubcommand(subcommand => subcommand
        .setName('delete')
        .setDescription('[Creator Only] Permanently delete a league and all its data')
        .addStringOption(option => option
        .setName('league')
        .setDescription('The league to delete')
        .setRequired(true)
        .setAutocomplete(true)))
        .addSubcommand(subcommand => subcommand
        .setName('auditlog')
        .setDescription('[Creator Only] View audit log of league changes')
        .addStringOption(option => option
        .setName('league')
        .setDescription('Select the league')
        .setRequired(true)
        .setAutocomplete(true))
        .addIntegerOption(option => option
        .setName('limit')
        .setDescription('Number of recent entries to show (default: 10)')
        .setRequired(false)))
        .addSubcommand(subcommand => subcommand
        .setName('help')
        .setDescription('Learn how to use the league system')),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        try {
            if (subcommand === 'create') {
                const name = interaction.options.getString('name', true);
                const format = interaction.options.getString('format', true);
                const type = interaction.options.getString('type', true);
                const rounds = interaction.options.getInteger('rounds') || undefined;
                const timer = interaction.options.getInteger('timer') || undefined;
                try {
                    const league = await leagueService.createLeague({
                        guildId: interaction.guildId,
                        createdBy: interaction.user.id,
                        name,
                        format,
                        competitionType: type,
                        totalRounds: rounds,
                        roundTimerMinutes: timer,
                    });
                    const embed = new discord_js_1.EmbedBuilder()
                        .setColor(0x00ff00)
                        .setTitle('League Created!')
                        .addFields({ name: 'League ID', value: league.id.toString(), inline: true }, { name: 'Name', value: league.name, inline: true }, { name: 'Format', value: league.format, inline: true }, { name: 'Type', value: league.competitionType, inline: true }, { name: 'Status', value: league.status, inline: true })
                        .setTimestamp();
                    await interaction.reply({ embeds: [embed] });
                }
                catch (error) {
                    if (error.code === 'P2002' || error.message?.includes('Unique constraint')) {
                        await interaction.reply({
                            content: `A league named "${name}" already exists in this server. Please choose a different name.`,
                            ephemeral: true
                        });
                    }
                    else {
                        throw error; // Re-throw other errors to be caught by outer catch
                    }
                }
            }
            else if (subcommand === 'list') {
                const leagues = await leagueService.getActiveLeagues(interaction.guildId);
                if (leagues.length === 0) {
                    await interaction.reply('No active leagues found.');
                    return;
                }
                const embed = new discord_js_1.EmbedBuilder()
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
            }
            else if (subcommand === 'cancel') {
                const leagueName = interaction.options.getString('league', true);
                const league = await leagueService.getLeagueByName(interaction.guildId, leagueName);
                if (!league) {
                    await interaction.reply({ content: 'League not found.', ephemeral: true });
                    return;
                }
                await leagueService.cancelLeague(league.id);
                await interaction.reply(`League "${league.name}" has been cancelled.`);
            }
            else if (subcommand === 'delete') {
                const leagueName = interaction.options.getString('league', true);
                const league = await leagueService.getLeagueByName(interaction.guildId, leagueName);
                if (!league) {
                    await interaction.reply({ content: 'League not found.', ephemeral: true });
                    return;
                }
                // Check if the user is the league creator
                if (league.createdBy !== interaction.user.id) {
                    await interaction.reply({
                        content: 'Only the league creator can delete a league.',
                        ephemeral: true
                    });
                    return;
                }
                await leagueService.deleteLeague(league.id);
                await interaction.reply(`League "${league.name}" and all its data have been permanently deleted. Audit logs have been preserved.`);
            }
            else if (subcommand === 'auditlog') {
                const leagueName = interaction.options.getString('league', true);
                const limit = interaction.options.getInteger('limit') || 10;
                const league = await leagueService.getLeagueByName(interaction.guildId, leagueName);
                if (!league) {
                    await interaction.reply({ content: 'League not found.', ephemeral: true });
                    return;
                }
                // Check if the user is the league creator
                if (league.createdBy !== interaction.user.id) {
                    await interaction.reply({
                        content: 'Only the league creator can view the audit log.',
                        ephemeral: true
                    });
                    return;
                }
                const logs = await leagueService.getAuditLogs(league.id, limit);
                if (logs.length === 0) {
                    await interaction.reply({
                        content: 'No audit log entries found for this league.',
                        ephemeral: true
                    });
                    return;
                }
                const embed = new discord_js_1.EmbedBuilder()
                    .setColor(0xff9900)
                    .setTitle(`${league.name} - Audit Log`)
                    .setDescription(`Showing ${logs.length} most recent changes`)
                    .setTimestamp();
                logs.forEach(log => {
                    const timestamp = new Date(log.createdAt).toLocaleString();
                    embed.addFields({
                        name: `${log.action} - ${timestamp}`,
                        value: `**User:** ${log.username}\n**Description:** ${log.description}`,
                        inline: false,
                    });
                });
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
            else if (subcommand === 'help') {
                const embed = new discord_js_1.EmbedBuilder()
                    .setColor(0x5865f2)
                    .setTitle('📚 League & Tournament Guide')
                    .setDescription('Quick reference for running Star Wars Unlimited tournaments')
                    .addFields({
                    name: '🎮 Quick Start',
                    value: '`/league create` → `/registration join` → `/tournament start` → Report results → Auto-advance!',
                    inline: false
                }, {
                    name: '📋 League Commands',
                    value: '`/league create` - New tournament\n' +
                        '`/league list` - View leagues\n' +
                        '`/league cancel` - Cancel [Creator]\n' +
                        '`/league delete` - Permanently delete [Creator]\n' +
                        '`/league auditlog` - View changes [Creator]',
                    inline: false
                }, {
                    name: '👥 Registration',
                    value: '`/registration join` - Join tournament\n' +
                        '`/registration list` - See players\n' +
                        '`/registration leave` - Leave before start',
                    inline: false
                }, {
                    name: '🎯 Tournament',
                    value: '`/tournament start` - Begin [Creator]\n' +
                        '`/tournament pairings` - View matches\n' +
                        '`/tournament report` - Report results\n' +
                        '`/tournament nextround` - Advance Swiss [Creator]\n' +
                        '`/tournament bracket` - Top Cut view\n' +
                        '`/tournament drop` - Drop out',
                    inline: false
                }, {
                    name: '📊 Info',
                    value: '`/standings` - Current rankings\n' +
                        '`/stats player` - Player history\n' +
                        '`/stats leaderboard` - Server rankings\n' +
                        '`/history list` - Past tournaments',
                    inline: false
                }, {
                    name: '🔧 Tools [Creator]',
                    value: '`/tournament findmatch` - Search matches\n' +
                        '`/tournament modifymatch` - Fix results\n' +
                        '`/tournament repairround` - Reset round\n' +
                        '`/tournament end` - Manual end',
                    inline: false
                }, {
                    name: '⚡ Auto Features',
                    value: '• Swiss auto-ends after final round\n' +
                        '• Top Cut auto-starts & advances\n' +
                        '• Round timers with announcements\n' +
                        '• Final standings posted on completion\n' +
                        '• Bye assignment (lowest ranked)',
                    inline: false
                }, {
                    name: '� Top Cut',
                    value: '32+ → Top 8 | 16-31 → Top 4 | 8-15 → Top 2\nSingle elimination, auto-advance',
                    inline: false
                })
                    .setFooter({ text: 'For detailed help, visit the bot documentation' })
                    .setTimestamp();
                // Defer reply immediately to prevent timeout
                await interaction.deferReply({ flags: 64 });
                try {
                    await interaction.user.send({ embeds: [embed] });
                    await interaction.editReply({ content: 'I\'ve sent you a DM with the tournament guide!' });
                }
                catch (dmError) {
                    // If DM fails (user has DMs disabled), fall back to showing embed in channel
                    await interaction.editReply({ embeds: [embed] });
                }
            }
        }
        catch (error) {
            console.error('Error executing league command:', error);
            await interaction.reply({
                content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                ephemeral: true,
            });
        }
    },
    async autocomplete(interaction) {
        try {
            const focusedValue = interaction.options.getFocused().toLowerCase();
            const subcommand = interaction.options.getSubcommand();
            const leagues = await leagueService.getLeaguesByGuild(interaction.guildId);
            // For delete command, show all leagues (including CANCELLED and COMPLETED)
            // For other commands, exclude COMPLETED leagues
            const filtered = leagues
                .filter(league => {
                if (subcommand === 'delete') {
                    return league.name.toLowerCase().includes(focusedValue);
                }
                return league.status !== 'COMPLETED' &&
                    league.name.toLowerCase().includes(focusedValue);
            })
                .slice(0, 25)
                .map(league => ({
                name: `${league.name} - ${league.status}`,
                value: league.name,
            }));
            await interaction.respond(filtered);
        }
        catch (error) {
            console.error('Error in league autocomplete:', error);
            await interaction.respond([]);
        }
    },
};
