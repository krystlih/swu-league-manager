import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { LeagueService } from '../services/leagueService';

const leagueService = LeagueService.getInstance();

export const statsCommand = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View player statistics and leaderboards')
    .addSubcommand(subcommand =>
      subcommand
        .setName('player')
        .setDescription('View a player\'s tournament history and stats')
        .addUserOption(option =>
          option
            .setName('player')
            .setDescription('The player to view stats for (leave blank for yourself)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('leaderboard')
        .setDescription('View server-wide leaderboard')
        .addStringOption(option =>
          option
            .setName('format')
            .setDescription('Filter by format (e.g., Standard, Premier)')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('sort')
            .setDescription('Sort by stat')
            .setRequired(false)
            .addChoices(
              { name: 'Win Rate', value: 'winrate' },
              { name: 'Total Wins', value: 'wins' },
              { name: 'Tournaments Played', value: 'tournaments' },
              { name: 'Championships', value: 'championships' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('matchup')
        .setDescription('View head-to-head matchup between two players')
        .addUserOption(option =>
          option
            .setName('player1')
            .setDescription('First player')
            .setRequired(true)
        )
        .addUserOption(option =>
          option
            .setName('player2')
            .setDescription('Second player')
            .setRequired(true)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    if (!guildId) {
      await interaction.reply({ content: 'This command can only be used in a server.', flags: 64 });
      return;
    }

    if (subcommand === 'player') {
      const targetUser = interaction.options.getUser('player') || interaction.user;
      
      const stats = await leagueService.getPlayerStats(guildId, targetUser.id);
      
      if (!stats || stats.tournaments === 0) {
        await interaction.reply({
          content: `${targetUser.username} hasn't participated in any tournaments yet.`,
          flags: 64
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`📊 ${targetUser.username}'s Tournament Stats`)
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
          { 
            name: '🏆 Tournaments', 
            value: `Played: ${stats.tournaments}\nChampionships: ${stats.championships}\nRunner-up: ${stats.runnerUps}\nTop 3: ${stats.topThree}`,
            inline: true 
          },
          { 
            name: '📈 Match Record', 
            value: `${stats.wins}-${stats.losses}-${stats.draws}\nWin Rate: ${stats.winRate}%`,
            inline: true 
          },
          { 
            name: '🎮 Game Record', 
            value: `${stats.gameWins}-${stats.gameLosses}\nGame Win %: ${stats.gameWinRate}%`,
            inline: true 
          }
        )
        .setTimestamp();

      if (stats.recentTournaments.length > 0) {
        const recentList = stats.recentTournaments
          .map((t: any, i: number) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '▫️';
            return `${medal} **${t.leagueName}** (${t.format})\n   Place: ${t.placement} • Record: ${t.wins}-${t.losses}-${t.draws}`;
          })
          .join('\n');
        
        embed.addFields({ 
          name: '📜 Recent Tournaments', 
          value: recentList, 
          inline: false 
        });
      }

      await interaction.reply({ embeds: [embed] });

    } else if (subcommand === 'leaderboard') {
      const format = interaction.options.getString('format');
      const sortBy = interaction.options.getString('sort') || 'winrate';

      const leaderboard = await leagueService.getLeaderboard(guildId, format, sortBy);

      if (!leaderboard || leaderboard.length === 0) {
        await interaction.reply({
          content: format 
            ? `No leaderboard data found for format: ${format}` 
            : 'No leaderboard data available yet.',
          flags: 64
        });
        return;
      }

      const sortLabels: Record<string, string> = {
        winrate: 'Win Rate',
        wins: 'Total Wins',
        tournaments: 'Tournaments Played',
        championships: 'Championships'
      };

      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle(`🏆 Server Leaderboard${format ? ` - ${format}` : ''}`)
        .setDescription(`Sorted by: ${sortLabels[sortBy]}`)
        .setTimestamp();

      const top10 = leaderboard.slice(0, 10);
      const leaderboardText = top10.map((player: any, index: number) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        const record = `${player.wins}-${player.losses}-${player.draws}`;
        
        let statValue = '';
        switch (sortBy) {
          case 'winrate':
            statValue = `${player.winRate}% WR`;
            break;
          case 'wins':
            statValue = `${player.wins}W`;
            break;
          case 'tournaments':
            statValue = `${player.tournaments} T`;
            break;
          case 'championships':
            statValue = `${player.championships} 🏆`;
            break;
        }

        return `${medal} **${player.username}** • ${record} • ${statValue}`;
      }).join('\n');

      embed.addFields({ name: 'Rankings', value: leaderboardText, inline: false });

      await interaction.reply({ embeds: [embed] });

    } else if (subcommand === 'matchup') {
      const player1 = interaction.options.getUser('player1', true);
      const player2 = interaction.options.getUser('player2', true);

      if (player1.id === player2.id) {
        await interaction.reply({
          content: 'Please select two different players.',
          flags: 64
        });
        return;
      }

      const matchup = await leagueService.getHeadToHead(guildId, player1.id, player2.id);

      if (!matchup || matchup.totalMatches === 0) {
        await interaction.reply({
          content: `${player1.username} and ${player2.username} haven't played against each other yet.`,
          flags: 64
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('⚔️ Head-to-Head Matchup')
        .setDescription(`${player1.username} vs ${player2.username}`)
        .addFields(
          { 
            name: `${player1.username}`, 
            value: `Wins: ${matchup.player1Wins}\nGame Wins: ${matchup.player1GameWins}`,
            inline: true 
          },
          { 
            name: 'Record', 
            value: `Matches: ${matchup.totalMatches}\nDraws: ${matchup.draws}`,
            inline: true 
          },
          { 
            name: `${player2.username}`, 
            value: `Wins: ${matchup.player2Wins}\nGame Wins: ${matchup.player2GameWins}`,
            inline: true 
          }
        )
        .setTimestamp();

      if (matchup.recentMatches.length > 0) {
        const recentList = matchup.recentMatches
          .map((m: any) => {
            const winner = m.winnerId === matchup.player1DbId ? player1.username : 
                          m.winnerId === matchup.player2DbId ? player2.username : 'Draw';
            return `**${m.leagueName}** - Round ${m.roundNumber}\n   ${m.player1Wins}-${m.player2Wins} • Winner: ${winner}`;
          })
          .join('\n');
        
        embed.addFields({ 
          name: '📜 Recent Matches', 
          value: recentList, 
          inline: false 
        });
      }

      await interaction.reply({ embeds: [embed] });
    }
  },
};
