"use strict";
/**
 * Generate ASCII bracket visualizations for single elimination tournaments
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTop8Bracket = generateTop8Bracket;
exports.generateTop4Bracket = generateTop4Bracket;
exports.generateTop2Bracket = generateTop2Bracket;
/**
 * Generate Top 8 bracket visualization
 */
function generateTop8Bracket(matches) {
    const rounds = organizeMatchesByRound(matches);
    if (rounds.length === 0) {
        return 'No bracket data available';
    }
    // Top 8 = Quarterfinals (4 matches), Semifinals (2 matches), Finals (1 match)
    const quarterfinals = rounds[0] || [];
    const semifinals = rounds[1] || [];
    const finals = rounds[2] || [];
    let bracket = '```\n';
    bracket += '═══════════════════════════════════════════════════════════════════\n';
    bracket += '                    TOP 8 ELIMINATION BRACKET\n';
    bracket += '═══════════════════════════════════════════════════════════════════\n\n';
    // Quarterfinals (Round 1)
    bracket += 'QUARTERFINALS          SEMIFINALS              FINALS\n';
    bracket += '─────────────          ──────────              ──────\n\n';
    const qf = ensureMatches(quarterfinals, 4);
    const sf = ensureMatches(semifinals, 2);
    const f = ensureMatches(finals, 1);
    // Line 1: QF Match 1 Player 1
    bracket += `${formatPlayer(qf[0].player1, qf[0].winner === qf[0].player1)}\n`;
    bracket += '                  ╲\n';
    // Line 3: QF Match 1 Player 2
    bracket += `${formatPlayer(qf[0].player2, qf[0].winner === qf[0].player2)}    ┌─────────┐\n`;
    bracket += `                  └──┤ ${formatShortName(sf[0].player1, 7)} ├──┐\n`;
    bracket += `${formatPlayer(qf[1].player1, qf[1].winner === qf[1].player1)}    └─────────┘  │\n`;
    bracket += '                  ╱              │\n';
    // Line 7: QF Match 2 Player 2
    bracket += `${formatPlayer(qf[1].player2, qf[1].winner === qf[1].player2)}                       │   ┌──────────┐\n`;
    bracket += `                               ├───┤ ${formatShortName(f[0].player1, 8)} ├──┐\n`;
    bracket += `${formatPlayer(qf[2].player1, qf[2].winner === qf[2].player1)}                       │   └──────────┘  │\n`;
    bracket += '                  ╲              │                  │\n';
    // Line 11: QF Match 3 Player 2
    bracket += `${formatPlayer(qf[2].player2, qf[2].winner === qf[2].player2)}    ┌─────────┐  │                  │\n`;
    bracket += `                  └──┤ ${formatShortName(sf[1].player1, 7)} ├──┘                  │\n`;
    bracket += `${formatPlayer(qf[3].player1, qf[3].winner === qf[3].player1)}    └─────────┘       ┌──────────┐  │\n`;
    bracket += '                  ╱               │ CHAMPION │  │\n';
    // Line 15: QF Match 4 Player 2 and Champion
    const champion = f[0].winner || 'TBD';
    bracket += `${formatPlayer(qf[3].player2, qf[3].winner === qf[3].player2)}                        │ ${formatShortName(champion, 8)} ├──┘\n`;
    bracket += '                                └──────────┘\n';
    bracket += '\n';
    // Add match status legend
    bracket += addMatchStatus(matches);
    bracket += '```';
    return bracket;
}
/**
 * Generate Top 4 bracket visualization
 */
function generateTop4Bracket(matches) {
    const rounds = organizeMatchesByRound(matches);
    if (rounds.length === 0) {
        return 'No bracket data available';
    }
    const semifinals = rounds[0] || [];
    const finals = rounds[1] || [];
    let bracket = '```\n';
    bracket += '═══════════════════════════════════════════════════\n';
    bracket += '            TOP 4 ELIMINATION BRACKET\n';
    bracket += '═══════════════════════════════════════════════════\n\n';
    bracket += 'SEMIFINALS              FINALS\n';
    bracket += '──────────              ──────\n\n';
    const sf = ensureMatches(semifinals, 2);
    const f = ensureMatches(finals, 1);
    bracket += `${formatPlayer(sf[0].player1, sf[0].winner === sf[0].player1)}\n`;
    bracket += '            ╲\n';
    bracket += `${formatPlayer(sf[0].player2, sf[0].winner === sf[0].player2)}  ┌──────────┐\n`;
    bracket += `            └──┤ ${formatShortName(f[0].player1, 8)} ├──┐\n`;
    bracket += `${formatPlayer(sf[1].player1, sf[1].winner === sf[1].player1)}  └──────────┘  │\n`;
    bracket += '            ╱              │   ┌──────────┐\n';
    bracket += `${formatPlayer(sf[1].player2, sf[1].winner === sf[1].player2)}                   ├───┤ CHAMPION │\n`;
    const champion = f[0].winner || 'TBD';
    bracket += `                           │   │ ${formatShortName(champion, 8)} │\n`;
    bracket += '                           └───└──────────┘\n\n';
    bracket += addMatchStatus(matches);
    bracket += '```';
    return bracket;
}
/**
 * Generate Top 2 bracket visualization (Finals only)
 */
function generateTop2Bracket(matches) {
    const finals = matches[0];
    if (!finals) {
        return 'No bracket data available';
    }
    let bracket = '```\n';
    bracket += '═══════════════════════════════════════════\n';
    bracket += '          FINALS - TOP 2\n';
    bracket += '═══════════════════════════════════════════\n\n';
    bracket += `${formatPlayer(finals.player1, finals.winner === finals.player1)}\n`;
    bracket += '                ╲\n';
    bracket += '                 ├──┐   ┌──────────┐\n';
    bracket += '                ╱   └───┤ CHAMPION │\n';
    const champion = finals.winner || 'TBD';
    bracket += `${formatPlayer(finals.player2, finals.winner === finals.player2)}        │ ${formatShortName(champion, 8)} │\n`;
    bracket += '                    └──────────┘\n\n';
    bracket += addMatchStatus([finals]);
    bracket += '```';
    return bracket;
}
/**
 * Organize matches by round number
 */
function organizeMatchesByRound(matches) {
    const rounds = [];
    for (const match of matches) {
        const roundIndex = match.roundNumber - 1;
        if (!rounds[roundIndex]) {
            rounds[roundIndex] = [];
        }
        rounds[roundIndex].push(match);
    }
    // Sort matches within each round by match number
    for (const round of rounds) {
        round.sort((a, b) => a.matchNumber - b.matchNumber);
    }
    return rounds;
}
/**
 * Format player name with winner indicator
 */
function formatPlayer(name, isWinner) {
    const displayName = name.length > 14 ? name.substring(0, 14) : name.padEnd(14);
    const indicator = isWinner ? '►' : ' ';
    return `${indicator} ${displayName}`;
}
/**
 * Format short player name for bracket connections
 */
function formatShortName(name, maxLength) {
    if (name.length <= maxLength) {
        return name.padEnd(maxLength);
    }
    return name.substring(0, maxLength);
}
/**
 * Ensure we have the expected number of matches (fill with TBD if needed)
 */
function ensureMatches(matches, expectedCount) {
    const result = [];
    for (let i = 0; i < expectedCount; i++) {
        if (matches[i]) {
            result.push(matches[i]);
        }
        else {
            // Create placeholder match
            result.push({
                player1: 'TBD',
                player2: 'TBD',
                winner: undefined,
                isComplete: false,
                roundNumber: 1,
                matchNumber: i + 1,
            });
        }
    }
    return result;
}
/**
 * Add match status summary
 */
function addMatchStatus(matches) {
    const completed = matches.filter(m => m.isComplete).length;
    const total = matches.length;
    let status = 'Match Status:\n';
    status += `► Winner  │  Matches Complete: ${completed}/${total}\n`;
    if (completed === total) {
        status += '\n🏆 Tournament Complete!\n';
    }
    return status;
}
