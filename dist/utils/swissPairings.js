"use strict";
/**
 * Swiss Pairing System Implementation
 * Pairs players with similar records against each other
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SwissPairingGenerator = void 0;
class SwissPairingGenerator {
    /**
     * Generate pairings for the next round
     * @param players Array of player records
     * @returns Array of pairings
     */
    static generatePairings(players) {
        // Sort players by match points (descending), then by tiebreakers
        const sortedPlayers = [...players].sort((a, b) => {
            if (b.matchPoints !== a.matchPoints) {
                return b.matchPoints - a.matchPoints;
            }
            if (b.opponentMatchWinPercentage !== a.opponentMatchWinPercentage) {
                return b.opponentMatchWinPercentage - a.opponentMatchWinPercentage;
            }
            if (b.gameWinPercentage !== a.gameWinPercentage) {
                return b.gameWinPercentage - a.gameWinPercentage;
            }
            return b.opponentGameWinPercentage - a.opponentGameWinPercentage;
        });
        const pairings = [];
        const paired = new Set();
        // First pass: find if we'll need a bye (odd number of players)
        const needsBye = sortedPlayers.length % 2 === 1;
        let byePlayerId = null;
        if (needsBye) {
            // Find the lowest-ranked player who hasn't received a bye yet
            for (let i = sortedPlayers.length - 1; i >= 0; i--) {
                if (!sortedPlayers[i].hasReceivedBye) {
                    byePlayerId = sortedPlayers[i].id;
                    break;
                }
            }
            // If everyone has had a bye, give it to the lowest-ranked player
            if (byePlayerId === null) {
                byePlayerId = sortedPlayers[sortedPlayers.length - 1].id;
            }
            // Mark this player as paired (with bye)
            paired.add(byePlayerId);
            const byePlayer = sortedPlayers.find(p => p.id === byePlayerId);
            pairings.push({
                player1Id: byePlayer.id,
                player1Name: byePlayer.name,
                player2Id: null,
                player2Name: null,
                isBye: true,
            });
        }
        // Second pass: pair remaining players
        for (let i = 0; i < sortedPlayers.length; i++) {
            if (paired.has(sortedPlayers[i].id))
                continue;
            const player1 = sortedPlayers[i];
            let player2 = null;
            // Find best opponent (hasn't played against, similar score)
            for (let j = i + 1; j < sortedPlayers.length; j++) {
                const candidate = sortedPlayers[j];
                if (paired.has(candidate.id))
                    continue;
                if (player1.opponents.includes(candidate.id))
                    continue;
                player2 = candidate;
                break;
            }
            if (player2) {
                paired.add(player1.id);
                paired.add(player2.id);
                pairings.push({
                    player1Id: player1.id,
                    player1Name: player1.name,
                    player2Id: player2.id,
                    player2Name: player2.name,
                    isBye: false,
                });
            }
            else {
                // This shouldn't happen if our bye logic is correct
                // But handle it as a fallback
                paired.add(player1.id);
                pairings.push({
                    player1Id: player1.id,
                    player1Name: player1.name,
                    player2Id: null,
                    player2Name: null,
                    isBye: true,
                });
            }
        }
        return pairings;
    }
    /**
     * Calculate match points (3 for win, 1 for draw, 0 for loss)
     */
    static calculateMatchPoints(wins, losses, draws) {
        return wins * 3 + draws;
    }
    /**
     * Calculate OMW% (Opponent Match Win Percentage)
     * Average of all opponents' match win percentages
     */
    static calculateOMW(playerOpponents, allPlayers) {
        if (playerOpponents.length === 0)
            return 0;
        const opponentRecords = playerOpponents
            .map(oppId => allPlayers.find(p => p.id === oppId))
            .filter(p => p !== undefined);
        const totalOMW = opponentRecords.reduce((sum, opp) => {
            const totalMatches = opp.wins + opp.losses + opp.draws;
            if (totalMatches === 0)
                return sum + 0.33; // Minimum 33%
            const mw = opp.wins / totalMatches;
            return sum + Math.max(mw, 0.33);
        }, 0);
        return totalOMW / opponentRecords.length;
    }
    /**
     * Calculate GW% (Game Win Percentage)
     */
    static calculateGWP(wins, losses) {
        const totalGames = wins + losses;
        if (totalGames === 0)
            return 0;
        return Math.max(wins / totalGames, 0.33);
    }
    /**
     * Calculate OGW% (Opponent Game Win Percentage)
     */
    static calculateOGW(playerOpponents, allPlayers) {
        if (playerOpponents.length === 0)
            return 0;
        const opponentRecords = playerOpponents
            .map(oppId => allPlayers.find(p => p.id === oppId))
            .filter(p => p !== undefined);
        const totalOGW = opponentRecords.reduce((sum, opp) => {
            const totalGames = opp.wins + opp.losses;
            if (totalGames === 0)
                return sum + 0.33;
            const gw = opp.wins / totalGames;
            return sum + Math.max(gw, 0.33);
        }, 0);
        return totalOGW / opponentRecords.length;
    }
}
exports.SwissPairingGenerator = SwissPairingGenerator;
