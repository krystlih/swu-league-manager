"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tournamentCommand = void 0;
const discord_js_1 = require("discord.js");
const leagueService_1 = require("../services/leagueService");
const matchRepository_1 = require("../data/repositories/matchRepository");
const registrationRepository_1 = require("../data/repositories/registrationRepository");
const roundTimerService_1 = require("../services/roundTimerService");
const bracketVisualizer_1 = require("../utils/bracketVisualizer");
const leagueService = leagueService_1.LeagueService.getInstance();
const matchRepository = new matchRepository_1.MatchRepository();
const registrationRepository = new registrationRepository_1.RegistrationRepository();
const timerService = roundTimerService_1.RoundTimerService.getInstance();
exports.tournamentCommand = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('tournament')
        .setDescription('Tournament management')
        .addSubcommand(subcommand => subcommand
        .setName('start')
        .setDescription('Start a league')
        .addStringOption(option => option
        .setName('league')
        .setDescription('Select the league to start')
        .setRequired(true)
        .setAutocomplete(true)))
        .addSubcommand(subcommand => subcommand
        .setName('nextround')
        .setDescription('Generate pairings for next round')
        .addStringOption(option => option
        .setName('league')
        .setDescription('Select the league')
        .setRequired(true)
        .setAutocomplete(true)))
        .addSubcommand(subcommand => subcommand
        .setName('report')
        .setDescription('Report match result for your current pairing')
        .addStringOption(option => option
        .setName('league')
        .setDescription('Select the league')
        .setRequired(true)
        .setAutocomplete(true))
        .addIntegerOption(option => option
        .setName('your_wins')
        .setDescription('Number of games you won')
        .setRequired(true))
        .addIntegerOption(option => option
        .setName('opponent_wins')
        .setDescription('Number of games your opponent won')
        .setRequired(true))
        .addIntegerOption(option => option
        .setName('draws')
        .setDescription('Number of drawn games')
        .setRequired(false)))
        .addSubcommand(subcommand => subcommand
        .setName('pairings')
        .setDescription('View current round pairings')
        .addStringOption(option => option
        .setName('league')
        .setDescription('Select the league')
        .setRequired(true)
        .setAutocomplete(true)))
        .addSubcommand(subcommand => subcommand
        .setName('drop')
        .setDescription('Drop from a league')
        .addStringOption(option => option
        .setName('league')
        .setDescription('Select the league')
        .setRequired(true)
        .setAutocomplete(true)))
        .addSubcommand(subcommand => subcommand
        .setName('modifymatch')
        .setDescription('[Creator Only] Modify a match result')
        .addStringOption(option => option
        .setName('league')
        .setDescription('Select the league')
        .setRequired(true)
        .setAutocomplete(true))
        .addStringOption(option => option
        .setName('match')
        .setDescription('Select the match to modify')
        .setRequired(true)
        .setAutocomplete(true))
        .addIntegerOption(option => option
        .setName('player1_wins')
        .setDescription('Player 1 wins')
        .setRequired(true))
        .addIntegerOption(option => option
        .setName('player2_wins')
        .setDescription('Player 2 wins')
        .setRequired(true))
        .addIntegerOption(option => option
        .setName('draws')
        .setDescription('Number of draws')
        .setRequired(false)))
        .addSubcommand(subcommand => subcommand
        .setName('repairround')
        .setDescription('[Creator Only] Regenerate pairings for the current round')
        .addStringOption(option => option
        .setName('league')
        .setDescription('Select the league')
        .setRequired(true)
        .setAutocomplete(true)))
        .addSubcommand(subcommand => subcommand
        .setName('findmatch')
        .setDescription('Find match IDs by player name')
        .addStringOption(option => option
        .setName('league')
        .setDescription('Select the league')
        .setRequired(true)
        .setAutocomplete(true))
        .addStringOption(option => option
        .setName('player_name')
        .setDescription('Player name to search for')
        .setRequired(true)))
        .addSubcommand(subcommand => subcommand
        .setName('end')
        .setDescription('[Creator Only] End the tournament and announce final standings')
        .addStringOption(option => option
        .setName('league')
        .setDescription('Select the league')
        .setRequired(true)
        .setAutocomplete(true)))
        .addSubcommand(subcommand => subcommand
        .setName('bracket')
        .setDescription('View Top Cut elimination bracket')
        .addStringOption(option => option
        .setName('league')
        .setDescription('Select the league')
        .setRequired(true)
        .setAutocomplete(true))),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        try {
            // Get league by name instead of ID
            const leagueName = interaction.options.getString('league', true);
            const guildId = interaction.guildId;
            if (!guildId) {
                await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
                return;
            }
            const league = await leagueService.getLeagueByName(guildId, leagueName);
            if (!league) {
                await interaction.reply({ content: `League "${leagueName}" not found.`, ephemeral: true });
                return;
            }
            const leagueId = league.id;
            if (subcommand === 'start') {
                // Check if the user is the league creator
                if (league.createdBy !== interaction.user.id) {
                    await interaction.reply({
                        content: 'Only the league creator can start the tournament.',
                        ephemeral: true
                    });
                    return;
                }
                // Store announcement channel for timer announcements
                if (league.roundTimerMinutes && !league.announcementChannelId) {
                    await leagueService.updateLeague(leagueId, {
                        announcementChannelId: interaction.channelId
                    });
                }
                await leagueService.startLeague(leagueId, interaction.user.id, interaction.user.username);
                // Start timer for Round 1 if configured
                const updatedLeague = await leagueService.getLeague(leagueId);
                if (updatedLeague && updatedLeague.currentRound === 1 && updatedLeague.roundTimerMinutes) {
                    await timerService.startRoundTimer(leagueId, 1, interaction.guildId, interaction.channelId);
                }
                await interaction.reply(`League "${league.name}" has been started! Use /tournament nextround to generate round 1 pairings.`);
            }
            else if (subcommand === 'nextround') {
                // Cancel timer for current round before generating next round
                if (league.currentRound > 0) {
                    timerService.cancelRoundTimer(leagueId, league.currentRound);
                }
                const pairings = await leagueService.generateNextRound(leagueId);
                // Start round timer for new round if configured
                const updatedLeague = await leagueService.getLeague(leagueId);
                if (updatedLeague) {
                    await timerService.startRoundTimer(leagueId, updatedLeague.currentRound, interaction.guildId, interaction.channelId);
                }
                const embed = new discord_js_1.EmbedBuilder()
                    .setColor(0x0099ff)
                    .setTitle(`${league.name} - Round ${league.currentRound + 1} Pairings`)
                    .setTimestamp();
                pairings.forEach((pairing, index) => {
                    const player2Name = pairing.player2Name || 'BYE';
                    const isBye = !pairing.player2Name;
                    const matchInfo = isBye
                        ? `${pairing.player1Name} vs ${player2Name} ✅ (Auto-completed: 2-0-0)`
                        : `${pairing.player1Name} vs ${player2Name}`;
                    embed.addFields({
                        name: `Table ${index + 1}`,
                        value: matchInfo,
                    });
                });
                // Add timer info to embed if configured
                if (updatedLeague?.roundTimerMinutes) {
                    embed.setFooter({
                        text: `Round timer: ${updatedLeague.roundTimerMinutes} minutes (starts in 5 minutes)`
                    });
                }
                await interaction.reply({ embeds: [embed] });
            }
            else if (subcommand === 'report') {
                const yourWins = interaction.options.getInteger('your_wins', true);
                const opponentWins = interaction.options.getInteger('opponent_wins', true);
                const draws = interaction.options.getInteger('draws') || 0;
                // Find the player's active match
                const playerDiscordId = interaction.user.id;
                const match = await leagueService.findPlayerActiveMatch(leagueId, playerDiscordId);
                if (!match) {
                    await interaction.reply({
                        content: 'You do not have an active match in this league.',
                        ephemeral: true
                    });
                    return;
                }
                if (match.isCompleted) {
                    await interaction.reply({
                        content: 'This match has already been reported.',
                        ephemeral: true
                    });
                    return;
                }
                // Determine if user is player1 or player2
                const isPlayer1 = match.player1.discordId === playerDiscordId;
                const player1Wins = isPlayer1 ? yourWins : opponentWins;
                const player2Wins = isPlayer1 ? opponentWins : yourWins;
                await leagueService.reportMatchResult(match.id, {
                    player1Wins,
                    player2Wins,
                    draws,
                });
                const opponentName = isPlayer1
                    ? (match.player2?.username || 'BYE')
                    : match.player1.username;
                await interaction.reply(`Match result reported: You ${yourWins} - ${opponentWins} ${opponentName}${draws > 0 ? ` (${draws} draws)` : ''}`);
            }
            else if (subcommand === 'pairings') {
                const matches = await leagueService.getCurrentRoundMatches(leagueId);
                if (matches.length === 0) {
                    await interaction.reply('No active round found.');
                    return;
                }
                const embed = new discord_js_1.EmbedBuilder()
                    .setColor(0x0099ff)
                    .setTitle(`${league.name} - Current Round Pairings`)
                    .setTimestamp();
                matches.forEach(match => {
                    const player2Name = match.player2 ? match.player2.username : 'BYE';
                    const isBye = !match.player2;
                    const status = match.isCompleted ? '✅' : '⏳';
                    const byeNote = isBye && match.isCompleted ? ' (Auto-completed: 2-0-0)' : '';
                    embed.addFields({
                        name: `Table ${match.tableNumber} ${status}`,
                        value: `${match.player1.username} vs ${player2Name}${byeNote}`,
                    });
                });
                await interaction.reply({ embeds: [embed] });
            }
            else if (subcommand === 'drop') {
                await leagueService.dropPlayer(leagueId, interaction.user.id);
                await interaction.reply(`You have been dropped from "${league.name}".`);
            }
            else if (subcommand === 'modifymatch') {
                // Check if the user is the league creator
                if (league.createdBy !== interaction.user.id) {
                    await interaction.reply({
                        content: 'Only the league creator can modify match results.',
                        ephemeral: true
                    });
                    return;
                }
                const matchIdStr = interaction.options.getString('match', true);
                const matchId = parseInt(matchIdStr);
                const player1Wins = interaction.options.getInteger('player1_wins', true);
                const player2Wins = interaction.options.getInteger('player2_wins', true);
                const draws = interaction.options.getInteger('draws') || 0;
                // Get the match to verify it exists and belongs to this league
                const match = await leagueService.getMatchById(matchId);
                if (!match || match.leagueId !== leagueId) {
                    await interaction.reply({
                        content: 'Match not found in this league.',
                        ephemeral: true
                    });
                    return;
                }
                console.log(`[DEBUG] Modifying match ${matchId}: ${player1Wins}-${player2Wins}-${draws}`);
                console.log(`[DEBUG] Match before modification:`, {
                    player1Wins: match.player1Wins,
                    player2Wins: match.player2Wins,
                    draws: match.draws,
                    isCompleted: match.isCompleted
                });
                try {
                    await leagueService.modifyMatchResult(matchId, {
                        player1Wins,
                        player2Wins,
                        draws,
                    }, interaction.user.id, interaction.user.username);
                    // Verify the change was saved
                    const updatedMatch = await leagueService.getMatchById(matchId);
                    console.log(`[DEBUG] Match after modification:`, {
                        player1Wins: updatedMatch?.player1Wins,
                        player2Wins: updatedMatch?.player2Wins,
                        draws: updatedMatch?.draws,
                        isCompleted: updatedMatch?.isCompleted
                    });
                    const player2Name = match.player2 ? match.player2.username : 'BYE';
                    await interaction.reply(`Match result modified: ${match.player1.username} ${player1Wins} - ${player2Wins} ${player2Name}${draws > 0 ? ` (${draws} draws)` : ''}`);
                }
                catch (error) {
                    console.error('[ERROR] Failed to modify match result:', error);
                    await interaction.reply({
                        content: `Error modifying match result: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        ephemeral: true
                    });
                }
            }
            else if (subcommand === 'repairround') {
                // Check if the user is the league creator
                if (league.createdBy !== interaction.user.id) {
                    await interaction.reply({
                        content: 'Only the league creator can repair rounds.',
                        ephemeral: true
                    });
                    return;
                }
                await leagueService.repairCurrentRound(leagueId, interaction.user.id, interaction.user.username);
                await interaction.reply(`Round ${league.currentRound} has been repaired. All matches in this round have been deleted and new pairings have been generated. Use /tournament pairings to view the new pairings.`);
            }
            else if (subcommand === 'findmatch') {
                const playerName = interaction.options.getString('player_name', true);
                // Get all matches for this league
                const matches = await leagueService.getAllLeagueMatches(leagueId);
                // Filter matches by player name (case-insensitive partial match)
                const playerMatches = matches.filter(match => {
                    const p1Name = match.player1.username.toLowerCase();
                    const p2Name = match.player2 ? match.player2.username.toLowerCase() : '';
                    const searchName = playerName.toLowerCase();
                    return p1Name.includes(searchName) || p2Name.includes(searchName);
                });
                if (playerMatches.length === 0) {
                    await interaction.reply({
                        content: `No matches found for player "${playerName}" in league "${league.name}".`,
                        ephemeral: true
                    });
                    return;
                }
                const embed = new discord_js_1.EmbedBuilder()
                    .setColor(0x0099ff)
                    .setTitle(`${league.name} - Matches for "${playerName}"`)
                    .setDescription(`Found ${playerMatches.length} match(es)`)
                    .setTimestamp();
                playerMatches.forEach(match => {
                    const player2Name = match.player2 ? match.player2.username : 'BYE';
                    const status = match.isCompleted ? '✅ Complete' : '⏳ In Progress';
                    const result = match.isCompleted
                        ? `${match.player1Wins}-${match.player2Wins}${match.draws > 0 ? `-${match.draws}` : ''}`
                        : 'Not reported';
                    embed.addFields({
                        name: `Match ID: ${match.id} | Round ${match.round?.roundNumber || 'N/A'}`,
                        value: `${match.player1.username} vs ${player2Name}\n${status} | Result: ${result}`,
                    });
                });
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
            else if (subcommand === 'end') {
                // Check if the user is the league creator
                if (league.createdBy !== interaction.user.id) {
                    await interaction.reply({
                        content: 'Only the league creator can end the tournament.',
                        ephemeral: true
                    });
                    return;
                }
                // Get final standings
                const standings = await leagueService.getStandings(leagueId);
                if (standings.length === 0) {
                    await interaction.reply({
                        content: 'No standings available for this league.',
                        ephemeral: true
                    });
                    return;
                }
                // End the tournament
                await leagueService.endTournament(leagueId, interaction.user.id, interaction.user.username);
                // Create the announcement embed
                const winner = standings[0];
                const winnerRecord = `${winner.wins}-${winner.losses}${winner.draws > 0 ? `-${winner.draws}` : ''}`;
                const embed = new discord_js_1.EmbedBuilder()
                    .setColor(0xffd700) // Gold color
                    .setTitle(`🏆 ${league.name} - Tournament Complete! 🏆`)
                    .setDescription(`**Champion: ${winner.playerName}**\n**Record: ${winnerRecord}**\n**Match Points: ${winner.matchPoints}**`)
                    .addFields({
                    name: '📊 Final Standings',
                    value: standings.slice(0, 10).map((s, i) => {
                        const record = `${s.wins}-${s.losses}${s.draws > 0 ? `-${s.draws}` : ''}`;
                        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
                        return `${medal} **${s.playerName}** - ${record} (${s.matchPoints} pts)`;
                    }).join('\n'),
                    inline: false
                });
                // Add top 3 detailed stats
                if (standings.length >= 1) {
                    const top3 = standings.slice(0, 3);
                    top3.forEach((player, idx) => {
                        const position = idx === 0 ? '🥇 Champion' : idx === 1 ? '🥈 Runner-Up' : '🥉 Third Place';
                        embed.addFields({
                            name: position,
                            value: `**${player.playerName}**\n` +
                                `Record: ${player.wins}-${player.losses}-${player.draws}\n` +
                                `Match Points: ${player.matchPoints}\n` +
                                `OMW%: ${player.omwPercent.toFixed(2)}% | GW%: ${player.gwPercent.toFixed(2)}% | OGW%: ${player.ogwPercent.toFixed(2)}%`,
                            inline: true
                        });
                    });
                }
                embed.addFields({
                    name: '📋 Tournament Info',
                    value: `**Format:** ${league.format}\n**Type:** ${league.competitionType}\n**Total Rounds:** ${league.currentRound}\n**Total Players:** ${standings.length}`,
                    inline: false
                });
                embed.setFooter({ text: `Tournament ended by ${interaction.user.username}` });
                embed.setTimestamp();
                await interaction.reply({ embeds: [embed] });
            }
            else if (subcommand === 'bracket') {
                // Check if league has Top Cut
                if (!league.hasTopCut) {
                    await interaction.reply({
                        content: 'This tournament does not have a Top Cut bracket.',
                        ephemeral: true
                    });
                    return;
                }
                // Check if Top Cut has started
                if (league.status !== 'TOP_CUT' && league.status !== 'COMPLETED') {
                    await interaction.reply({
                        content: 'The Top Cut bracket has not started yet. It will begin automatically after the Swiss rounds are complete.',
                        ephemeral: true
                    });
                    return;
                }
                // Validate Top Cut size
                if (!league.topCutSize || ![2, 4, 8].includes(league.topCutSize)) {
                    await interaction.reply({
                        content: 'Invalid Top Cut size. Must be 2, 4, or 8.',
                        ephemeral: true
                    });
                    return;
                }
                const totalRounds = league.totalRounds || 0;
                // Get all matches for the league
                const allMatches = await matchRepository.findByLeague(leagueId);
                // Filter to Top Cut matches only (rounds after Swiss)
                const topCutMatches = allMatches.filter((m) => m.roundNumber > totalRounds);
                if (topCutMatches.length === 0) {
                    await interaction.reply({
                        content: 'No Top Cut matches have been created yet.',
                        ephemeral: true
                    });
                    return;
                }
                // Get all registrations to map player IDs to names
                const registrations = await registrationRepository.findByLeague(leagueId);
                const playerMap = new Map(registrations.map((r) => [r.playerId, r.playerName]));
                const bracketMatches = topCutMatches.map((match, index) => {
                    const player1Name = playerMap.get(match.player1Id) || 'Unknown Player';
                    const player2Name = playerMap.get(match.player2Id) || 'Unknown Player';
                    let winner;
                    if (match.winnerId) {
                        winner = match.winnerId === match.player1Id ? player1Name : player2Name;
                    }
                    // Calculate relative round number (1, 2, 3) for Top Cut
                    const relativeRound = match.roundNumber - totalRounds;
                    return {
                        player1: player1Name,
                        player2: player2Name,
                        winner,
                        isComplete: match.player1Wins !== null && match.player2Wins !== null,
                        roundNumber: relativeRound,
                        matchNumber: match.tableNumber,
                    };
                });
                // Generate bracket based on Top Cut size
                let bracketString;
                if (league.topCutSize === 8) {
                    bracketString = (0, bracketVisualizer_1.generateTop8Bracket)(bracketMatches);
                }
                else if (league.topCutSize === 4) {
                    bracketString = (0, bracketVisualizer_1.generateTop4Bracket)(bracketMatches);
                }
                else {
                    bracketString = (0, bracketVisualizer_1.generateTop2Bracket)(bracketMatches);
                }
                // Send the bracket
                await interaction.reply({
                    content: `**${league.name} - Top ${league.topCutSize} Bracket**\n${bracketString}`,
                });
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
    async autocomplete(interaction) {
        try {
            const focusedOption = interaction.options.getFocused(true);
            const subcommand = interaction.options.getSubcommand();
            if (focusedOption.name === 'league') {
                const guildId = interaction.guildId;
                if (!guildId) {
                    await interaction.respond([]);
                    return;
                }
                // Get all leagues for this guild
                const leagues = await leagueService.getLeaguesByGuild(guildId);
                // For bracket command, allow completed leagues with Top Cut
                // For other commands, exclude completed leagues
                const filtered = leagues
                    .filter(league => {
                    const matchesSearch = league.name.toLowerCase().includes(focusedOption.value.toLowerCase());
                    if (subcommand === 'bracket') {
                        // Allow TOP_CUT and COMPLETED leagues that have Top Cut
                        return matchesSearch &&
                            league.hasTopCut &&
                            (league.status === 'TOP_CUT' || league.status === 'COMPLETED');
                    }
                    else {
                        // For other commands, exclude COMPLETED leagues
                        return matchesSearch && league.status !== 'COMPLETED';
                    }
                })
                    .slice(0, 25); // Discord limits to 25 choices
                await interaction.respond(filtered.map(league => ({
                    name: `${league.name} (${league.status})`,
                    value: league.name
                })));
            }
            else if (focusedOption.name === 'match' && subcommand === 'modifymatch') {
                // Get the selected league
                const leagueName = interaction.options.getString('league');
                if (!leagueName) {
                    await interaction.respond([]);
                    return;
                }
                // Find the league
                const guildId = interaction.guildId;
                const leagues = await leagueService.getLeaguesByGuild(guildId);
                const league = leagues.find(l => l.name === leagueName);
                if (!league) {
                    await interaction.respond([]);
                    return;
                }
                // Get all matches for the league
                const matches = await leagueService.getAllLeagueMatches(league.id);
                // Format matches for autocomplete
                const matchChoices = matches
                    .filter((match) => {
                    const player1Name = match.player1?.username || 'Unknown';
                    const player2Name = match.player2?.username || 'BYE';
                    const searchStr = `${player1Name} ${player2Name} Round ${match.roundNumber}`.toLowerCase();
                    return searchStr.includes(focusedOption.value.toLowerCase());
                })
                    .slice(0, 25)
                    .map((match) => {
                    const player1Name = match.player1?.username || 'Unknown';
                    const player2Name = match.player2?.username || 'BYE';
                    const status = match.isCompleted ? '✅' : '⏳';
                    const result = match.isCompleted
                        ? ` (${match.player1Wins || 0}-${match.player2Wins || 0})`
                        : '';
                    return {
                        name: `R${match.roundNumber} ${status} ${player1Name} vs ${player2Name}${result}`.slice(0, 100),
                        value: match.id.toString()
                    };
                });
                await interaction.respond(matchChoices);
            }
        }
        catch (error) {
            console.error('Error in autocomplete:', error);
            await interaction.respond([]);
        }
    },
};
