#!/usr/bin/env node
import { prisma } from '../data/prismaClient';
import * as readline from 'readline';

// ANSI escape codes for cursor control
const CLEAR_SCREEN = '\x1Bc';
const CURSOR_HOME = '\x1B[H';
const HIDE_CURSOR = '\x1B[?25l';
const SHOW_CURSOR = '\x1B[?25h';

interface DisplayState {
  view: 'menu' | 'dashboard' | 'league' | 'matches' | 'activity';
  leagueId?: number;
  refreshInterval?: NodeJS.Timeout;
  lastUpdate?: Date;
}

const state: DisplayState = {
  view: 'menu'
};

// Format date
function formatDate(date: Date): string {
  return new Date(date).toLocaleString();
}

// Format time ago
function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// Color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// Clear screen and move cursor to top
function clearScreen() {
  process.stdout.write(CLEAR_SCREEN);
}

// Display menu
function displayMenu() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║   SWU League Manager - Real-Time Monitor              ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  console.log('  [1] Live Dashboard (Auto-refresh every 5s)');
  console.log('  [2] Active Tournaments (Real-time)');
  console.log('  [3] Recent Activity Stream');
  console.log('  [4] Match Status Monitor');
  console.log('  [5] Database Statistics');
  console.log('  [0] Exit\n');
  console.log('  Press number to select view...\n');
}

// Live dashboard with auto-refresh
async function displayLiveDashboard() {
  const [
    activeLeagues,
    recentMatches,
    pendingMatches,
    recentRegistrations,
    stats
  ] = await Promise.all([
    prisma.league.findMany({
      where: { status: { in: ['REGISTRATION', 'IN_PROGRESS', 'TOP_CUT'] } },
      include: {
        _count: { select: { registrations: true, matches: true } },
        matches: { where: { isCompleted: false }, take: 5 }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    }),
    prisma.match.findMany({
      where: { isCompleted: true },
      include: { player1: true, player2: true, league: true, round: true },
      orderBy: { reportedAt: 'desc' },
      take: 10
    }),
    prisma.match.count({ where: { isCompleted: false } }),
    prisma.registration.findMany({
      include: { player: true, league: true },
      orderBy: { registeredAt: 'desc' },
      take: 8
    }),
    prisma.league.count()
  ]);

  clearScreen();
  console.log(`\n${colors.bright}${colors.cyan}╔═══════════════════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║                        LIVE TOURNAMENT DASHBOARD                              ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚═══════════════════════════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log(`${colors.dim}Last Update: ${formatDate(new Date())}                    Press 'q' to return to menu${colors.reset}\n`);

  // Active Tournaments Section
  console.log(`${colors.bright}${colors.yellow}▼ ACTIVE TOURNAMENTS (${activeLeagues.length})${colors.reset}`);
  console.log('─'.repeat(80));
  
  if (activeLeagues.length === 0) {
    console.log(`  ${colors.dim}No active tournaments${colors.reset}`);
  } else {
    activeLeagues.forEach((league, idx) => {
      const statusColor = league.status === 'IN_PROGRESS' ? colors.green : colors.yellow;
      const pendingCount = league.matches.length;
      const completionBar = generateProgressBar(
        league._count.matches - pendingCount,
        league._count.matches,
        20
      );
      
      console.log(`\n  ${colors.bright}${idx + 1}. ${league.name}${colors.reset}`);
      console.log(`     ${statusColor}●${colors.reset} ${league.status} ${colors.dim}│${colors.reset} Round ${league.currentRound} ${colors.dim}│${colors.reset} ${league._count.registrations} players`);
      console.log(`     ${completionBar} ${colors.dim}${league._count.matches - pendingCount}/${league._count.matches} matches${colors.reset}`);
      if (pendingCount > 0) {
        console.log(`     ${colors.yellow}⚠ ${pendingCount} pending matches${colors.reset}`);
      }
    });
  }

  // Recent Activity Section
  console.log(`\n${colors.bright}${colors.blue}▼ RECENT MATCH RESULTS${colors.reset}`);
  console.log('─'.repeat(80));
  
  if (recentMatches.length === 0) {
    console.log(`  ${colors.dim}No recent matches${colors.reset}`);
  } else {
    recentMatches.slice(0, 5).forEach((match) => {
      const p2Name = match.player2 ? match.player2.username : 'BYE';
      const result = `${match.player1Wins}-${match.player2Wins}-${match.draws}`;
      const timeStr = match.reportedAt ? timeAgo(match.reportedAt) : 'unknown';
      
      console.log(`  ${colors.green}✓${colors.reset} ${match.player1.username} ${colors.dim}vs${colors.reset} ${p2Name} ${colors.bright}(${result})${colors.reset}`);
      console.log(`    ${colors.dim}${match.league.name} - Round ${match.round?.roundNumber} - ${timeStr}${colors.reset}`);
    });
  }

  // Recent Registrations Section
  console.log(`\n${colors.bright}${colors.magenta}▼ RECENT REGISTRATIONS${colors.reset}`);
  console.log('─'.repeat(80));
  
  if (recentRegistrations.length === 0) {
    console.log(`  ${colors.dim}No recent registrations${colors.reset}`);
  } else {
    recentRegistrations.slice(0, 5).forEach((reg) => {
      const timeStr = timeAgo(reg.registeredAt);
      console.log(`  ${colors.magenta}+${colors.reset} ${reg.player.username} ${colors.dim}→${colors.reset} ${reg.league.name} ${colors.dim}(${timeStr})${colors.reset}`);
    });
  }

  // Quick Stats Footer
  console.log(`\n${colors.dim}${'─'.repeat(80)}${colors.reset}`);
  console.log(`${colors.dim}Total Leagues: ${stats} | Pending Matches: ${pendingMatches} | Auto-refresh: 5s${colors.reset}\n`);
}

// Generate progress bar
function generateProgressBar(current: number, total: number, width: number): string {
  if (total === 0) return `${colors.dim}[${'─'.repeat(width)}]${colors.reset}`;
  
  const percent = current / total;
  const filled = Math.floor(percent * width);
  const empty = width - filled;
  
  const bar = colors.green + '█'.repeat(filled) + colors.dim + '░'.repeat(empty) + colors.reset;
  const percentStr = (percent * 100).toFixed(0);
  
  return `[${bar}] ${percentStr}%`;
}

// Active tournaments real-time view
async function displayActiveTournaments() {
  const leagues = await prisma.league.findMany({
    where: { status: { in: ['REGISTRATION', 'IN_PROGRESS', 'TOP_CUT'] } },
    include: {
      _count: { select: { registrations: true, matches: true } },
      matches: {
        where: { isCompleted: false },
        include: { player1: true, player2: true }
      },
      registrations: {
        where: { isActive: true },
        include: { player: true },
        orderBy: [
          { matchPoints: 'desc' },
          { omwPercent: 'desc' }
        ],
        take: 3
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  clearScreen();
  console.log(`\n${colors.bright}${colors.cyan}╔═══════════════════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║                        ACTIVE TOURNAMENTS - LIVE VIEW                         ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚═══════════════════════════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log(`${colors.dim}Last Update: ${formatDate(new Date())}                    Press 'q' to return to menu${colors.reset}\n`);

  if (leagues.length === 0) {
    console.log(`  ${colors.yellow}No active tournaments at this time${colors.reset}\n`);
    return;
  }

  leagues.forEach((league, idx) => {
    const statusEmoji = league.status === 'IN_PROGRESS' ? '🎮' : league.status === 'TOP_CUT' ? '🏆' : '📝';
    const completedMatches = league._count.matches - league.matches.length;
    const completionRate = league._count.matches > 0 
      ? ((completedMatches / league._count.matches) * 100).toFixed(0)
      : '0';

    console.log(`\n${colors.bright}${statusEmoji} ${league.name}${colors.reset}`);
    console.log(`${colors.dim}${'─'.repeat(80)}${colors.reset}`);
    console.log(`Status: ${getStatusColor(league.status)}${league.status}${colors.reset} | ` +
      `Round: ${colors.bright}${league.currentRound}${colors.reset} | ` +
      `Players: ${colors.bright}${league._count.registrations}${colors.reset} | ` +
      `Matches: ${colors.bright}${completedMatches}/${league._count.matches}${colors.reset} (${completionRate}%)`);

    // Show pending matches
    if (league.matches.length > 0) {
      console.log(`\n  ${colors.yellow}⏳ Pending Matches (${league.matches.length}):${colors.reset}`);
      league.matches.slice(0, 5).forEach((match) => {
        const p2Name = match.player2 ? match.player2.username : 'BYE';
        console.log(`     Table ${match.tableNumber}: ${match.player1.username} vs ${p2Name}`);
      });
      if (league.matches.length > 5) {
        console.log(`     ${colors.dim}... and ${league.matches.length - 5} more${colors.reset}`);
      }
    } else {
      console.log(`\n  ${colors.green}✓ All matches completed for current round${colors.reset}`);
    }

    // Show top 3 standings
    if (league.registrations.length > 0) {
      console.log(`\n  ${colors.cyan}🏅 Current Top 3:${colors.reset}`);
      league.registrations.forEach((reg, idx) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
        console.log(`     ${medal} ${reg.player.username} - ${reg.wins}-${reg.losses}-${reg.draws} (${reg.matchPoints} pts)`);
      });
    }
  });

  console.log(`\n${colors.dim}${'─'.repeat(80)}${colors.reset}`);
  console.log(`${colors.dim}Total Active Tournaments: ${leagues.length} | Refreshing every 5 seconds...${colors.reset}\n`);
}

// Recent activity stream
async function displayActivityStream() {
  const [recentMatches, recentRegistrations, recentLeagues] = await Promise.all([
    prisma.match.findMany({
      where: { isCompleted: true },
      include: { player1: true, player2: true, league: true, round: true },
      orderBy: { reportedAt: 'desc' },
      take: 15
    }),
    prisma.registration.findMany({
      include: { player: true, league: true },
      orderBy: { registeredAt: 'desc' },
      take: 10
    }),
    prisma.league.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5
    })
  ]);

  clearScreen();
  console.log(`\n${colors.bright}${colors.cyan}╔═══════════════════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║                        RECENT ACTIVITY STREAM                                 ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚═══════════════════════════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log(`${colors.dim}Last Update: ${formatDate(new Date())}                    Press 'q' to return to menu${colors.reset}\n`);

  // Combine and sort all activities
  const activities: Array<{ type: string; time: Date; message: string }> = [];

  recentMatches.forEach(match => {
    const p2Name = match.player2 ? match.player2.username : 'BYE';
    const result = `${match.player1Wins}-${match.player2Wins}-${match.draws}`;
    activities.push({
      type: 'match',
      time: match.reportedAt || match.createdAt,
      message: `${colors.green}MATCH REPORTED${colors.reset} | ${match.player1.username} vs ${p2Name} (${result}) | ${colors.dim}${match.league.name} R${match.round?.roundNumber}${colors.reset}`
    });
  });

  recentRegistrations.forEach(reg => {
    activities.push({
      type: 'registration',
      time: reg.registeredAt,
      message: `${colors.magenta}REGISTRATION${colors.reset} | ${reg.player.username} joined ${colors.dim}${reg.league.name}${colors.reset}`
    });
  });

  recentLeagues.forEach(league => {
    activities.push({
      type: 'league',
      time: league.createdAt,
      message: `${colors.yellow}LEAGUE CREATED${colors.reset} | ${league.name} (${league.format})`
    });
  });

  // Sort by time
  activities.sort((a, b) => b.time.getTime() - a.time.getTime());

  // Display activity stream
  activities.slice(0, 20).forEach(activity => {
    const timeStr = timeAgo(activity.time);
    console.log(`${colors.dim}[${timeStr.padEnd(8)}]${colors.reset} ${activity.message}`);
  });

  console.log(`\n${colors.dim}${'─'.repeat(80)}${colors.reset}`);
  console.log(`${colors.dim}Showing last 20 activities | Refreshing every 5 seconds...${colors.reset}\n`);
}

// Match status monitor
async function displayMatchStatus() {
  const leagues = await prisma.league.findMany({
    where: { status: { in: ['IN_PROGRESS', 'TOP_CUT'] } },
    include: {
      matches: {
        include: { player1: true, player2: true, round: true },
        orderBy: { tableNumber: 'asc' }
      }
    }
  });

  clearScreen();
  console.log(`\n${colors.bright}${colors.cyan}╔═══════════════════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║                        MATCH STATUS MONITOR                                   ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚═══════════════════════════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log(`${colors.dim}Last Update: ${formatDate(new Date())}                    Press 'q' to return to menu${colors.reset}\n`);

  if (leagues.length === 0) {
    console.log(`  ${colors.yellow}No tournaments in progress${colors.reset}\n`);
    return;
  }

  leagues.forEach(league => {
    const currentRoundMatches = league.matches.filter(m => m.round?.roundNumber === league.currentRound);
    const completed = currentRoundMatches.filter(m => m.isCompleted).length;
    const total = currentRoundMatches.length;
    const progress = generateProgressBar(completed, total, 30);

    console.log(`\n${colors.bright}${league.name} - Round ${league.currentRound}${colors.reset}`);
    console.log(`${colors.dim}${'─'.repeat(80)}${colors.reset}`);
    console.log(`Progress: ${progress} ${completed}/${total}\n`);

    if (currentRoundMatches.length > 0) {
      currentRoundMatches.forEach(match => {
        const status = match.isCompleted ? `${colors.green}✓${colors.reset}` : `${colors.yellow}⏳${colors.reset}`;
        const p2Name = match.player2 ? match.player2.username : 'BYE';
        const result = match.isCompleted
          ? `${colors.bright}${match.player1Wins}-${match.player2Wins}-${match.draws}${colors.reset}`
          : `${colors.dim}Pending${colors.reset}`;
        
        console.log(`  ${status} Table ${match.tableNumber}: ${match.player1.username} vs ${p2Name} - ${result}`);
      });
    }
  });

  console.log(`\n${colors.dim}${'─'.repeat(80)}${colors.reset}`);
  console.log(`${colors.dim}Refreshing every 5 seconds...${colors.reset}\n`);
}

// Database statistics
async function displayStatistics() {
  const [
    totalLeagues,
    activeLeagues,
    completedLeagues,
    totalPlayers,
    totalMatches,
    completedMatches,
    totalRegistrations
  ] = await Promise.all([
    prisma.league.count(),
    prisma.league.count({ where: { status: { in: ['REGISTRATION', 'IN_PROGRESS', 'TOP_CUT'] } } }),
    prisma.league.count({ where: { status: 'COMPLETED' } }),
    prisma.player.count(),
    prisma.match.count(),
    prisma.match.count({ where: { isCompleted: true } }),
    prisma.registration.count()
  ]);

  clearScreen();
  console.log(`\n${colors.bright}${colors.cyan}╔═══════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║            DATABASE STATISTICS                        ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚═══════════════════════════════════════════════════════╝${colors.reset}`);
  console.log(`${colors.dim}Last Update: ${formatDate(new Date())}        Press 'q' to return${colors.reset}\n`);

  console.log(`${colors.bright}Leagues${colors.reset}`);
  console.log(`  Total:     ${colors.bright}${totalLeagues}${colors.reset}`);
  console.log(`  Active:    ${colors.green}${activeLeagues}${colors.reset}`);
  console.log(`  Completed: ${colors.blue}${completedLeagues}${colors.reset}`);
  
  console.log(`\n${colors.bright}Matches${colors.reset}`);
  console.log(`  Total:     ${colors.bright}${totalMatches}${colors.reset}`);
  console.log(`  Completed: ${colors.green}${completedMatches}${colors.reset}`);
  console.log(`  Pending:   ${colors.yellow}${totalMatches - completedMatches}${colors.reset}`);
  console.log(`  Rate:      ${((completedMatches / totalMatches) * 100).toFixed(1)}%`);
  
  console.log(`\n${colors.bright}Players${colors.reset}`);
  console.log(`  Total:         ${colors.bright}${totalPlayers}${colors.reset}`);
  console.log(`  Registrations: ${colors.bright}${totalRegistrations}${colors.reset}`);
  
  console.log(`\n${colors.dim}${'─'.repeat(58)}${colors.reset}`);
  console.log(`${colors.dim}Refreshing every 5 seconds...${colors.reset}\n`);
}

// Get status color
function getStatusColor(status: string): string {
  switch (status) {
    case 'REGISTRATION': return colors.yellow;
    case 'IN_PROGRESS': return colors.green;
    case 'TOP_CUT': return colors.cyan;
    case 'COMPLETED': return colors.blue;
    case 'CANCELLED': return colors.red;
    default: return colors.reset;
  }
}

// Start auto-refresh for current view
function startAutoRefresh(viewFunction: () => Promise<void>) {
  if (state.refreshInterval) {
    clearInterval(state.refreshInterval);
  }
  
  state.refreshInterval = setInterval(async () => {
    await viewFunction();
  }, 5000);
}

// Stop auto-refresh
function stopAutoRefresh() {
  if (state.refreshInterval) {
    clearInterval(state.refreshInterval);
    state.refreshInterval = undefined;
  }
}

// Handle key press
async function handleKeyPress(key: string) {
  if (key === 'q' || key === '\u0003') { // 'q' or Ctrl+C
    stopAutoRefresh();
    state.view = 'menu';
    clearScreen();
    displayMenu();
    return;
  }

  if (state.view !== 'menu') return;

  switch (key) {
    case '1':
      state.view = 'dashboard';
      await displayLiveDashboard();
      startAutoRefresh(displayLiveDashboard);
      break;
    case '2':
      state.view = 'league';
      await displayActiveTournaments();
      startAutoRefresh(displayActiveTournaments);
      break;
    case '3':
      state.view = 'activity';
      await displayActivityStream();
      startAutoRefresh(displayActivityStream);
      break;
    case '4':
      state.view = 'matches';
      await displayMatchStatus();
      startAutoRefresh(displayMatchStatus);
      break;
    case '5':
      state.view = 'dashboard';
      await displayStatistics();
      startAutoRefresh(displayStatistics);
      break;
    case '0':
      stopAutoRefresh();
      process.stdout.write(SHOW_CURSOR);
      console.log('\nGoodbye!\n');
      await prisma.$disconnect();
      process.exit(0);
      break;
  }
}

// Setup keyboard input
function setupKeyboardInput() {
  if (process.stdin.isTTY) {
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
  }

  process.stdin.on('keypress', async (str, key) => {
    if (key && key.ctrl && key.name === 'c') {
      stopAutoRefresh();
      process.stdout.write(SHOW_CURSOR);
      console.log('\n\nExiting...\n');
      await prisma.$disconnect();
      process.exit(0);
    }

    if (str) {
      await handleKeyPress(str);
    }
  });
}

// Main
async function main() {
  process.stdout.write(HIDE_CURSOR);
  clearScreen();
  displayMenu();
  setupKeyboardInput();
}

// Cleanup on exit
process.on('SIGINT', async () => {
  stopAutoRefresh();
  process.stdout.write(SHOW_CURSOR);
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  stopAutoRefresh();
  process.stdout.write(SHOW_CURSOR);
  await prisma.$disconnect();
  process.exit(0);
});

// Run
main().catch(async (error) => {
  console.error('Error:', error);
  process.stdout.write(SHOW_CURSOR);
  await prisma.$disconnect();
  process.exit(1);
});
