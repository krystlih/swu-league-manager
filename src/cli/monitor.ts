#!/usr/bin/env node
import { prisma } from '../data/prismaClient';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Clear console
function clearScreen() {
  console.clear();
}

// Format date
function formatDate(date: Date): string {
  return new Date(date).toLocaleString();
}

// Display menu
function displayMenu() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   SWU League Manager - Monitor Tool       ║');
  console.log('╚════════════════════════════════════════════╝\n');
  console.log('1. View Active Leagues');
  console.log('2. View Recent Matches');
  console.log('3. View Database Statistics');
  console.log('4. View Leagues by Status');
  console.log('5. View Active Players');
  console.log('6. View Recent Registrations');
  console.log('7. View Match Completion Rate');
  console.log('8. Monitor Specific League');
  console.log('9. View Audit Log');
  console.log('0. Exit\n');
}

// View active leagues
async function viewActiveLeagues() {
  clearScreen();
  console.log('\n═══ ACTIVE LEAGUES ═══\n');
  
  const leagues = await prisma.league.findMany({
    where: {
      status: {
        in: ['REGISTRATION', 'IN_PROGRESS', 'TOP_CUT']
      }
    },
    include: {
      _count: {
        select: {
          registrations: true,
          matches: true,
          rounds: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  if (leagues.length === 0) {
    console.log('No active leagues found.\n');
    return;
  }

  leagues.forEach((league, idx) => {
    console.log(`\n${idx + 1}. ${league.name}`);
    console.log(`   Status: ${league.status}`);
    console.log(`   Format: ${league.format}`);
    console.log(`   Type: ${league.competitionType}`);
    console.log(`   Current Round: ${league.currentRound}`);
    console.log(`   Players: ${league._count.registrations}`);
    console.log(`   Matches: ${league._count.matches}`);
    console.log(`   Rounds: ${league._count.rounds}`);
    console.log(`   Created: ${formatDate(league.createdAt)}`);
    if (league.roundTimerMinutes) {
      console.log(`   Timer: ${league.roundTimerMinutes} minutes`);
    }
  });
  
  console.log(`\nTotal Active Leagues: ${leagues.length}\n`);
}

// View recent matches
async function viewRecentMatches() {
  clearScreen();
  console.log('\n═══ RECENT MATCHES (Last 20) ═══\n');
  
  const matches = await prisma.match.findMany({
    include: {
      player1: true,
      player2: true,
      league: true,
      round: true
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  if (matches.length === 0) {
    console.log('No matches found.\n');
    return;
  }

  matches.forEach((match, idx) => {
    const status = match.isCompleted ? '✅' : '⏳';
    const result = match.isCompleted 
      ? `${match.player1Wins}-${match.player2Wins}-${match.draws}`
      : 'Pending';
    const p2Name = match.player2 ? match.player2.username : 'BYE';
    
    console.log(`\n${idx + 1}. ${status} ${match.league.name} - Round ${match.round?.roundNumber || '?'}`);
    console.log(`   ${match.player1.username} vs ${p2Name}`);
    console.log(`   Result: ${result}`);
    console.log(`   Table: ${match.tableNumber}`);
    console.log(`   Created: ${formatDate(match.createdAt)}`);
  });
  
  console.log(`\nTotal Matches Shown: ${matches.length}\n`);
}

// View database statistics
async function viewDatabaseStats() {
  clearScreen();
  console.log('\n═══ DATABASE STATISTICS ═══\n');
  
  const [
    totalLeagues,
    activeLeagues,
    completedLeagues,
    totalPlayers,
    totalMatches,
    completedMatches,
    totalRegistrations,
    totalRounds
  ] = await Promise.all([
    prisma.league.count(),
    prisma.league.count({ where: { status: { in: ['REGISTRATION', 'IN_PROGRESS', 'TOP_CUT'] } } }),
    prisma.league.count({ where: { status: 'COMPLETED' } }),
    prisma.player.count(),
    prisma.match.count(),
    prisma.match.count({ where: { isCompleted: true } }),
    prisma.registration.count(),
    prisma.round.count()
  ]);

  const completionRate = totalMatches > 0 
    ? ((completedMatches / totalMatches) * 100).toFixed(1)
    : '0.0';

  console.log('╔═══════════════════════════════════════╗');
  console.log('║            OVERVIEW                   ║');
  console.log('╠═══════════════════════════════════════╣');
  console.log(`║ Total Leagues:        ${String(totalLeagues).padStart(15)} ║`);
  console.log(`║ Active Leagues:       ${String(activeLeagues).padStart(15)} ║`);
  console.log(`║ Completed Leagues:    ${String(completedLeagues).padStart(15)} ║`);
  console.log(`║ Total Players:        ${String(totalPlayers).padStart(15)} ║`);
  console.log(`║ Total Registrations:  ${String(totalRegistrations).padStart(15)} ║`);
  console.log('╠═══════════════════════════════════════╣');
  console.log('║            MATCHES                    ║');
  console.log('╠═══════════════════════════════════════╣');
  console.log(`║ Total Matches:        ${String(totalMatches).padStart(15)} ║`);
  console.log(`║ Completed Matches:    ${String(completedMatches).padStart(15)} ║`);
  console.log(`║ Pending Matches:      ${String(totalMatches - completedMatches).padStart(15)} ║`);
  console.log(`║ Completion Rate:      ${String(completionRate + '%').padStart(15)} ║`);
  console.log(`║ Total Rounds:         ${String(totalRounds).padStart(15)} ║`);
  console.log('╚═══════════════════════════════════════╝\n');
}

// View leagues by status
async function viewLeaguesByStatus() {
  clearScreen();
  console.log('\n═══ LEAGUES BY STATUS ═══\n');
  
  const statusGroups = await prisma.league.groupBy({
    by: ['status'],
    _count: true
  });

  statusGroups.forEach(group => {
    console.log(`${group.status}: ${group._count} leagues`);
  });
  console.log('');
}

// View active players
async function viewActivePlayers() {
  clearScreen();
  console.log('\n═══ MOST ACTIVE PLAYERS (Top 20) ═══\n');
  
  const players = await prisma.player.findMany({
    include: {
      _count: {
        select: {
          registrations: true,
          matchesAsPlayer1: true,
          matchesAsPlayer2: true
        }
      }
    },
    orderBy: {
      registrations: {
        _count: 'desc'
      }
    },
    take: 20
  });

  players.forEach((player, idx) => {
    const totalMatches = player._count.matchesAsPlayer1 + player._count.matchesAsPlayer2;
    console.log(`${idx + 1}. ${player.username}`);
    console.log(`   Discord ID: ${player.discordId}`);
    console.log(`   Registrations: ${player._count.registrations}`);
    console.log(`   Matches Played: ${totalMatches}\n`);
  });
}

// View recent registrations
async function viewRecentRegistrations() {
  clearScreen();
  console.log('\n═══ RECENT REGISTRATIONS (Last 20) ═══\n');
  
  const registrations = await prisma.registration.findMany({
    include: {
      player: true,
      league: true
    },
    orderBy: { registeredAt: 'desc' },
    take: 20
  });

  registrations.forEach((reg, idx) => {
    const status = reg.isActive ? '✅ Active' : '❌ Dropped';
    console.log(`${idx + 1}. ${reg.player.username} → ${reg.league.name}`);
    console.log(`   Status: ${status}`);
    console.log(`   Record: ${reg.wins}-${reg.losses}-${reg.draws}`);
    console.log(`   Match Points: ${reg.matchPoints}`);
    console.log(`   Registered: ${formatDate(reg.registeredAt)}\n`);
  });
}

// View match completion rate by league
async function viewMatchCompletionRate() {
  clearScreen();
  console.log('\n═══ MATCH COMPLETION RATE BY LEAGUE ═══\n');
  
  const leagues = await prisma.league.findMany({
    where: {
      status: { in: ['IN_PROGRESS', 'TOP_CUT'] }
    },
    include: {
      matches: true
    }
  });

  if (leagues.length === 0) {
    console.log('No active tournaments found.\n');
    return;
  }

  leagues.forEach((league, idx) => {
    const total = league.matches.length;
    const completed = league.matches.filter(m => m.isCompleted).length;
    const rate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0.0';
    
    console.log(`${idx + 1}. ${league.name}`);
    console.log(`   Status: ${league.status}`);
    console.log(`   Matches: ${completed}/${total} (${rate}%)`);
    console.log(`   Current Round: ${league.currentRound}\n`);
  });
}

// Monitor specific league
async function monitorSpecificLeague() {
  clearScreen();
  console.log('\n═══ MONITOR SPECIFIC LEAGUE ═══\n');
  
  // Show available leagues
  const leagues = await prisma.league.findMany({
    where: {
      status: { in: ['REGISTRATION', 'IN_PROGRESS', 'TOP_CUT'] }
    },
    orderBy: { createdAt: 'desc' }
  });

  if (leagues.length === 0) {
    console.log('No active leagues found.\n');
    await pressAnyKey();
    return;
  }

  console.log('Available Leagues:\n');
  leagues.forEach((league, idx) => {
    console.log(`${idx + 1}. ${league.name} (${league.status})`);
  });

  const answer = await question('\nEnter league number (or 0 to cancel): ');
  const leagueIdx = parseInt(answer) - 1;

  if (leagueIdx < 0 || leagueIdx >= leagues.length) {
    return;
  }

  const league = await prisma.league.findUnique({
    where: { id: leagues[leagueIdx].id },
    include: {
      registrations: {
        include: { player: true },
        where: { isActive: true }
      },
      matches: {
        include: {
          player1: true,
          player2: true,
          round: true
        },
        orderBy: { tableNumber: 'asc' }
      },
      rounds: {
        orderBy: { roundNumber: 'asc' }
      }
    }
  });

  if (!league) {
    console.log('League not found.\n');
    return;
  }

  clearScreen();
  console.log(`\n═══ ${league.name} ═══\n`);
  console.log(`Status: ${league.status}`);
  console.log(`Format: ${league.format}`);
  console.log(`Type: ${league.competitionType}`);
  console.log(`Current Round: ${league.currentRound}`);
  console.log(`Players: ${league.registrations.length}`);
  console.log(`Created: ${formatDate(league.createdAt)}`);
  if (league.announcementChannelId) {
    console.log(`Announcement Channel: ${league.announcementChannelId}`);
  }
  if (league.roundTimerMinutes) {
    console.log(`Round Timer: ${league.roundTimerMinutes} minutes`);
  }

  // Current round matches
  if (league.currentRound > 0) {
    console.log(`\n--- Round ${league.currentRound} Matches ---\n`);
    const currentRoundMatches = league.matches.filter(
      m => m.round?.roundNumber === league.currentRound
    );

    if (currentRoundMatches.length > 0) {
      currentRoundMatches.forEach(match => {
        const status = match.isCompleted ? '✅' : '⏳';
        const result = match.isCompleted 
          ? `${match.player1Wins}-${match.player2Wins}-${match.draws}`
          : 'Pending';
        const p2Name = match.player2 ? match.player2.username : 'BYE';
        
        console.log(`Table ${match.tableNumber}: ${status} ${match.player1.username} vs ${p2Name} - ${result}`);
      });

      const completed = currentRoundMatches.filter(m => m.isCompleted).length;
      const total = currentRoundMatches.length;
      console.log(`\nRound Status: ${completed}/${total} matches completed`);
    } else {
      console.log('No matches in current round.');
    }
  }

  // Top standings
  console.log('\n--- Top 10 Standings ---\n');
  const standings = league.registrations
    .sort((a, b) => {
      if (b.matchPoints !== a.matchPoints) return b.matchPoints - a.matchPoints;
      if (b.omwPercent !== a.omwPercent) return b.omwPercent - a.omwPercent;
      if (b.gwPercent !== a.gwPercent) return b.gwPercent - a.gwPercent;
      return b.ogwPercent - a.ogwPercent;
    })
    .slice(0, 10);

  standings.forEach((reg, idx) => {
    console.log(`${idx + 1}. ${reg.player.username} - ${reg.wins}-${reg.losses}-${reg.draws} (${reg.matchPoints} pts)`);
  });

  console.log('');
  await pressAnyKey();
}

// View audit log
async function viewAuditLog() {
  clearScreen();
  console.log('\n═══ RECENT AUDIT LOG (Last 20) ═══\n');
  
  const logs = await prisma.auditLog.findMany({
    include: { league: true },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  if (logs.length === 0) {
    console.log('No audit logs found.\n');
    return;
  }

  logs.forEach((log, idx) => {
    console.log(`${idx + 1}. [${formatDate(log.createdAt)}] ${log.league.name}`);
    console.log(`   Action: ${log.action}`);
    console.log(`   User: ${log.username} (${log.userId})`);
    console.log(`   Description: ${log.description}\n`);
  });
}

// Helper to wait for key press
function pressAnyKey(): Promise<void> {
  return new Promise(resolve => {
    rl.question('Press Enter to continue...', () => {
      resolve();
    });
  });
}

// Helper for questions
function question(prompt: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

// Main loop
async function main() {
  let running = true;

  while (running) {
    clearScreen();
    displayMenu();
    
    const choice = await question('Select option: ');

    switch (choice.trim()) {
      case '1':
        await viewActiveLeagues();
        await pressAnyKey();
        break;
      case '2':
        await viewRecentMatches();
        await pressAnyKey();
        break;
      case '3':
        await viewDatabaseStats();
        await pressAnyKey();
        break;
      case '4':
        await viewLeaguesByStatus();
        await pressAnyKey();
        break;
      case '5':
        await viewActivePlayers();
        await pressAnyKey();
        break;
      case '6':
        await viewRecentRegistrations();
        await pressAnyKey();
        break;
      case '7':
        await viewMatchCompletionRate();
        await pressAnyKey();
        break;
      case '8':
        await monitorSpecificLeague();
        break;
      case '9':
        await viewAuditLog();
        await pressAnyKey();
        break;
      case '0':
        running = false;
        console.log('\nGoodbye!\n');
        break;
      default:
        console.log('\nInvalid option. Please try again.\n');
        await pressAnyKey();
    }
  }

  rl.close();
  await prisma.$disconnect();
  process.exit(0);
}

// Run the monitor
main().catch(async (error) => {
  console.error('Error:', error);
  await prisma.$disconnect();
  process.exit(1);
});
