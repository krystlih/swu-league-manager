"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.historyCommand = void 0;
const discord_js_1 = require("discord.js");
const leagueService_1 = require("../services/leagueService");
const leagueService = leagueService_1.LeagueService.getInstance();
exports.historyCommand = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('history')
        .setDescription('View completed tournament history')
        .addSubcommand(subcommand => subcommand
        .setName('list')
        .setDescription('List all completed tournaments'))
        .addSubcommand(subcommand => subcommand
        .setName('results')
        .setDescription('View final results of a completed tournament')
        .addStringOption(option => option
        .setName('league')
        .setDescription('Select the completed tournament')
        .setRequired(true)
        .setAutocomplete(true)))
        .addSubcommand(subcommand => subcommand
        .setName('pairings')
        .setDescription('View pairings from a specific round of a completed tournament')
        .addStringOption(option => option
        .setName('league')
        .setDescription('Select the completed tournament')
        .setRequired(true)
        .setAutocomplete(true))
        .addIntegerOption(option => option
        .setName('round')
        .setDescription('Round number to view')
        .setRequired(true)))
        .addSubcommand(subcommand => subcommand
        .setName('matches')
        .setDescription('View all matches from a completed tournament')
        .addStringOption(option => option
        .setName('league')
        .setDescription('Select the completed tournament')
        .setRequired(true)
        .setAutocomplete(true))
        .addStringOption(option => option
        .setName('player')
        .setDescription('Filter by player name (optional)')
        .setRequired(false))),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guildId;
        if (!guildId) {
            await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
            return;
        }
        try {
            if (subcommand === 'list') {
                const completedLeagues = await leagueService.getCompletedLeagues(guildId);
                if (completedLeagues.length === 0) {
                    await interaction.reply('No completed tournaments found.');
                    return;
                }
                const embed = new discord_js_1.EmbedBuilder()
                    .setColor(0x808080)
                    .setTitle('📜 Completed Tournaments')
                    .setDescription(`Found ${completedLeagues.length} completed tournament(s)`)
                    .setTimestamp();
                completedLeagues.forEach(league => {
                    const completedDate = new Date(league.updatedAt).toLocaleDateString();
                    embed.addFields({
                        name: `${league.name}`,
                        value: `**Format:** ${league.format}\n**Type:** ${league.competitionType}\n**Rounds:** ${league.currentRound}\n**Completed:** ${completedDate}`,
                        inline: true
                    });
                });
                await interaction.reply({ embeds: [embed] });
            }
            else if (subcommand === 'results') {
                const leagueName = interaction.options.getString('league', true);
                const league = await leagueService.getLeagueByName(guildId, leagueName);
                if (!league) {
                    await interaction.reply({ content: `Tournament "${leagueName}" not found.`, ephemeral: true });
                    return;
                }
                if (league.status !== 'COMPLETED') {
                    await interaction.reply({ content: 'This tournament has not been completed yet.', ephemeral: true });
                    return;
                }
                const standings = await leagueService.getStandings(league.id);
                if (standings.length === 0) {
                    await interaction.reply({ content: 'No standings available for this tournament.', ephemeral: true });
                    return;
                }
                const winner = standings[0];
                const winnerRecord = `${winner.wins}-${winner.losses}${winner.draws > 0 ? `-${winner.draws}` : ''}`;
                const embed = new discord_js_1.EmbedBuilder()
                    .setColor(0xffd700)
                    .setTitle(`🏆 ${league.name} - Final Results`)
                    .setDescription(`**Champion: ${winner.playerName}**\n**Record: ${winnerRecord}**\n**Match Points: ${winner.matchPoints}**`)
                    .addFields({
                    name: '📊 Final Standings',
                    value: standings.slice(0, 15).map((s, i) => {
                        const record = `${s.wins}-${s.losses}${s.draws > 0 ? `-${s.draws}` : ''}`;
                        const position = i + 1;
                        return `${position}. **${s.playerName}** - ${record} (${s.matchPoints} pts)`;
                    }).join('\n'),
                    inline: false
                });
                // Add top 3 detailed stats
                const top3 = standings.slice(0, 3);
                top3.forEach((player, idx) => {
                    const medals = ['🥇 Champion', '🥈 Runner-Up', '🥉 Third Place'];
                    embed.addFields({
                        name: medals[idx],
                        value: `**${player.playerName}**\n` +
                            `Record: ${player.wins}-${player.losses}-${player.draws}\n` +
                            `Match Points: ${player.matchPoints}\n` +
                            `OMW%: ${player.omwPercent.toFixed(2)}%\n` +
                            `GW%: ${player.gwPercent.toFixed(2)}%\n` +
                            `OGW%: ${player.ogwPercent.toFixed(2)}%`,
                        inline: true
                    });
                });
                embed.addFields({
                    name: '📋 Tournament Info',
                    value: `**Format:** ${league.format}\n**Type:** ${league.competitionType}\n**Total Rounds:** ${league.currentRound}\n**Total Players:** ${standings.length}\n**Completed:** ${new Date(league.updatedAt).toLocaleDateString()}`,
                    inline: false
                });
                embed.setTimestamp(new Date(league.updatedAt));
                await interaction.reply({ embeds: [embed] });
            }
            else if (subcommand === 'pairings') {
                const leagueName = interaction.options.getString('league', true);
                const roundNumber = interaction.options.getInteger('round', true);
                const league = await leagueService.getLeagueByName(guildId, leagueName);
                if (!league) {
                    await interaction.reply({ content: `Tournament "${leagueName}" not found.`, ephemeral: true });
                    return;
                }
                if (league.status !== 'COMPLETED') {
                    await interaction.reply({ content: 'This tournament has not been completed yet.', ephemeral: true });
                    return;
                }
                if (roundNumber < 1 || roundNumber > league.currentRound) {
                    await interaction.reply({
                        content: `Invalid round number. This tournament had ${league.currentRound} rounds.`,
                        ephemeral: true
                    });
                    return;
                }
                const matches = await leagueService.getRoundMatches(league.id, roundNumber);
                if (matches.length === 0) {
                    await interaction.reply({ content: `No matches found for round ${roundNumber}.`, ephemeral: true });
                    return;
                }
                const embed = new discord_js_1.EmbedBuilder()
                    .setColor(0x0099ff)
                    .setTitle(`${league.name} - Round ${roundNumber} Pairings`)
                    .setDescription(`**Format:** ${league.format} | **Completed Tournament**`)
                    .setTimestamp();
                matches.forEach(match => {
                    const player2Name = match.player2 ? match.player2.username : 'BYE';
                    const result = match.isCompleted
                        ? `${match.player1Wins}-${match.player2Wins}${match.draws > 0 ? `-${match.draws}` : ''}`
                        : 'Not completed';
                    const status = match.isCompleted ? '✅' : '❌';
                    embed.addFields({
                        name: `Table ${match.tableNumber} ${status}`,
                        value: `${match.player1.username} vs ${player2Name}\n**Result:** ${result}`,
                    });
                });
                await interaction.reply({ embeds: [embed] });
            }
            else if (subcommand === 'matches') {
                const leagueName = interaction.options.getString('league', true);
                const playerFilter = interaction.options.getString('player');
                const league = await leagueService.getLeagueByName(guildId, leagueName);
                if (!league) {
                    await interaction.reply({ content: `Tournament "${leagueName}" not found.`, ephemeral: true });
                    return;
                }
                if (league.status !== 'COMPLETED') {
                    await interaction.reply({ content: 'This tournament has not been completed yet.', ephemeral: true });
                    return;
                }
                let matches = await leagueService.getAllLeagueMatches(league.id);
                // Filter by player if specified
                if (playerFilter) {
                    const searchName = playerFilter.toLowerCase();
                    matches = matches.filter(match => {
                        const p1Name = match.player1.username.toLowerCase();
                        const p2Name = match.player2 ? match.player2.username.toLowerCase() : '';
                        return p1Name.includes(searchName) || p2Name.includes(searchName);
                    });
                    if (matches.length === 0) {
                        await interaction.reply({
                            content: `No matches found for player "${playerFilter}" in this tournament.`,
                            ephemeral: true
                        });
                        return;
                    }
                }
                const embed = new discord_js_1.EmbedBuilder()
                    .setColor(0x9b59b6)
                    .setTitle(`${league.name} - Match History${playerFilter ? ` (${playerFilter})` : ''}`)
                    .setDescription(`Showing ${matches.length} match(es) from completed tournament`)
                    .setTimestamp();
                // Group matches by round
                const matchesByRound = {};
                matches.forEach(match => {
                    const roundNum = match.round?.roundNumber || 0;
                    if (!matchesByRound[roundNum]) {
                        matchesByRound[roundNum] = [];
                    }
                    matchesByRound[roundNum].push(match);
                });
                // Display matches by round (limit to avoid embed size issues)
                const rounds = Object.keys(matchesByRound).sort((a, b) => Number(a) - Number(b));
                let fieldCount = 0;
                for (const roundNum of rounds) {
                    if (fieldCount >= 20)
                        break; // Discord embed field limit
                    const roundMatches = matchesByRound[Number(roundNum)];
                    const matchList = roundMatches.slice(0, 5).map(match => {
                        const player2Name = match.player2 ? match.player2.username : 'BYE';
                        const result = match.isCompleted
                            ? `${match.player1Wins}-${match.player2Wins}${match.draws > 0 ? `-${match.draws}` : ''}`
                            : 'N/A';
                        return `${match.player1.username} vs ${player2Name}: **${result}**`;
                    }).join('\n');
                    embed.addFields({
                        name: `Round ${roundNum}`,
                        value: matchList + (roundMatches.length > 5 ? `\n...and ${roundMatches.length - 5} more` : ''),
                        inline: false
                    });
                    fieldCount++;
                }
                embed.setFooter({ text: `Format: ${league.format} | Type: ${league.competitionType}` });
                await interaction.reply({ embeds: [embed] });
            }
        }
        catch (error) {
            console.error('Error executing history command:', error);
            await interaction.reply({
                content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                ephemeral: true,
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
            // Get only completed leagues
            const leagues = await leagueService.getCompletedLeagues(guildId);
            const filtered = leagues
                .filter(league => league.name.toLowerCase().includes(focusedValue))
                .slice(0, 25)
                .map(league => ({
                name: `${league.name} (${league.format})`,
                value: league.name,
            }));
            await interaction.respond(filtered);
        }
        catch (error) {
            console.error('Error in history autocomplete:', error);
            await interaction.respond([]);
        }
    },
};
