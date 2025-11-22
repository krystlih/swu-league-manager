/**
 * Elimination Tournament Service
 * Handles single and double elimination bracket generation and progression
 */

import { Pairing } from '../types';

export interface EliminationPlayer {
  id: number;
  name: string;
  seed: number;
}

export interface BracketMatch {
  roundNumber: number;
  matchNumber: number;
  player1?: EliminationPlayer;
  player2?: EliminationPlayer;
  isLoserBracket?: boolean; // For double elimination
  feedsIntoMatchNumber?: number; // Which match the winner advances to
  feedsIntoPosition?: 'player1' | 'player2'; // Which position in the next match
}

export class EliminationService {
  /**
   * Generate single elimination bracket
   * @param players Array of players with seeds
   * @returns Pairings for Round 1
   */
  static generateSingleEliminationBracket(players: EliminationPlayer[]): Pairing[] {
    const numPlayers = players.length;
    
    // Validate power of 2
    if (!this.isPowerOfTwo(numPlayers)) {
      throw new Error(`Single elimination requires a power of 2 players (2, 4, 8, 16, 32, etc.). You have ${numPlayers} players.`);
    }

    // Sort by seed
    const sortedPlayers = [...players].sort((a, b) => a.seed - b.seed);
    
    // Generate first round pairings with traditional seeding
    // 1 vs last, 2 vs second-to-last, etc.
    const pairings: Pairing[] = [];
    const numMatches = numPlayers / 2;
    
    for (let i = 0; i < numMatches; i++) {
      const highSeed = sortedPlayers[i];
      const lowSeed = sortedPlayers[numPlayers - 1 - i];
      
      pairings.push({
        tableNumber: i + 1,
        player1Id: highSeed.id.toString(),
        player1Name: highSeed.name,
        player2Id: lowSeed.id.toString(),
        player2Name: lowSeed.name,
        isBye: false,
      });
    }
    
    return pairings;
  }

  /**
   * Generate next round pairings from completed matches
   * @param completedMatches Matches from previous round with winners
   * @param currentRoundNumber Current round number
   * @returns Pairings for next round, or empty array if tournament is complete
   */
  static generateNextSingleEliminationRound(
    completedMatches: Array<{ winnerId: number; winnerName: string; matchNumber: number }>,
    currentRoundNumber: number
  ): Pairing[] {
    // Check if we're at the finals (only 1 match in previous round)
    if (completedMatches.length === 1) {
      return []; // Tournament complete
    }

    // Sort matches by match number to maintain bracket structure
    const sortedMatches = [...completedMatches].sort((a, b) => a.matchNumber - b.matchNumber);
    
    // Pair winners: match 1 winner vs match 2 winner, match 3 vs match 4, etc.
    const pairings: Pairing[] = [];
    
    for (let i = 0; i < sortedMatches.length; i += 2) {
      if (i + 1 < sortedMatches.length) {
        const match1Winner = sortedMatches[i];
        const match2Winner = sortedMatches[i + 1];
        
        pairings.push({
          tableNumber: Math.floor(i / 2) + 1,
          player1Id: match1Winner.winnerId.toString(),
          player1Name: match1Winner.winnerName,
          player2Id: match2Winner.winnerId.toString(),
          player2Name: match2Winner.winnerName,
          isBye: false,
        });
      }
    }
    
    return pairings;
  }

  /**
   * Generate double elimination bracket
   * @param players Array of players with seeds
   * @returns Pairings for Round 1 (Winners Bracket only)
   */
  static generateDoubleEliminationBracket(players: EliminationPlayer[]): Pairing[] {
    // Same as single elimination for first round
    // The difference is in how we handle losers
    return this.generateSingleEliminationBracket(players);
  }

  /**
   * Generate next round for double elimination (handles both brackets)
   * @param winnersMatches Completed matches from winners bracket
   * @param losersMatches Completed matches from losers bracket
   * @param currentRoundNumber Current round number
   * @param isLosersBracketRound Whether the next round is in losers bracket
   * @returns Pairings for next round with bracket information
   */
  static generateNextDoubleEliminationRound(
    winnersMatches: Array<{ winnerId: number; winnerName: string; loserId: number; loserName: string; matchNumber: number }>,
    losersMatches: Array<{ winnerId: number; winnerName: string; matchNumber: number }>,
    currentRoundNumber: number
  ): { winnersBracketPairings: Pairing[]; losersBracketPairings: Pairing[]; grandFinals: boolean } {
    const result = {
      winnersBracketPairings: [] as Pairing[],
      losersBracketPairings: [] as Pairing[],
      grandFinals: false,
    };

    // Check if we're ready for grand finals:
    // - Winners bracket must be down to 1 player (winnersMatches.length === 1)
    // - Losers bracket must be down to 1 player (losersMatches.length === 1)
    if (winnersMatches.length === 1 && losersMatches.length === 1) {
      result.grandFinals = true;
      return result;
    }

    // Generate winners bracket next round (same as single elimination)
    if (winnersMatches.length > 1) {
      result.winnersBracketPairings = this.generateNextSingleEliminationRound(
        winnersMatches.map(m => ({ winnerId: m.winnerId, winnerName: m.winnerName, matchNumber: m.matchNumber })),
        currentRoundNumber
      );
    }
    // If winnersMatches.length === 1, winners bracket is complete - wait for losers bracket

    // Generate losers bracket pairings
    // Losers bracket alternates between:
    // 1. Matches between losers from winners bracket
    // 2. Matches between losers bracket survivors
    
    if (winnersMatches.length > 0) {
      // Feed losers from winners bracket into losers bracket
      const sortedWinnersMatches = [...winnersMatches].sort((a, b) => a.matchNumber - b.matchNumber);
      const sortedLosersMatches = [...losersMatches].sort((a, b) => a.matchNumber - b.matchNumber);
      
      // Determine losers bracket round type based on round number
      const isLosersFeedRound = currentRoundNumber % 2 === 0;
      
      if (isLosersFeedRound && sortedWinnersMatches.length > 0) {
        // Pair losers from winners bracket with survivors from losers bracket
        // Highest seed loser vs lowest seed survivor, etc.
        const losersFromWinners = sortedWinnersMatches.map(m => ({ 
          id: m.loserId, 
          name: m.loserName 
        }));
        
        const losersBracketSurvivors = sortedLosersMatches.map(m => ({ 
          id: m.winnerId, 
          name: m.winnerName 
        }));
        
        // Reverse losers from winners to maintain seeding
        const reversedLosers = losersFromWinners.reverse();
        
        for (let i = 0; i < Math.min(reversedLosers.length, losersBracketSurvivors.length); i++) {
          result.losersBracketPairings.push({
            tableNumber: i + 1,
            player1Id: losersBracketSurvivors[i].id.toString(),
            player1Name: losersBracketSurvivors[i].name,
            player2Id: reversedLosers[i].id.toString(),
            player2Name: reversedLosers[i].name,
            isBye: false,
          });
        }
      } else if (sortedLosersMatches.length > 1) {
        // Pair losers bracket survivors against each other
        for (let i = 0; i < sortedLosersMatches.length; i += 2) {
          if (i + 1 < sortedLosersMatches.length) {
            const match1Winner = sortedLosersMatches[i];
            const match2Winner = sortedLosersMatches[i + 1];
            
            result.losersBracketPairings.push({
              tableNumber: Math.floor(i / 2) + 1,
              player1Id: match1Winner.winnerId.toString(),
              player1Name: match1Winner.winnerName,
              player2Id: match2Winner.winnerId.toString(),
              player2Name: match2Winner.winnerName,
              isBye: false,
            });
          }
        }
      }
    }

    return result;
  }

  /**
   * Generate grand finals for double elimination
   * @param winnersChampion Winner of winners bracket
   * @param losersChampion Winner of losers bracket
   * @returns Pairing for grand finals
   */
  static generateGrandFinals(
    winnersChampion: { id: number; name: string },
    losersChampion: { id: number; name: string }
  ): Pairing[] {
    return [{
      tableNumber: 1,
      player1Id: winnersChampion.id.toString(),
      player1Name: winnersChampion.name,
      player2Id: losersChampion.id.toString(),
      player2Name: losersChampion.name,
      isBye: false,
    }];
  }

  /**
   * Check if grand finals needs a bracket reset
   * In true double elimination, if the losers bracket champion wins grand finals,
   * a second set is played since everyone should have 2 losses
   * @param winnersChampionId ID of the player who came from winners bracket
   * @param grandFinalsWinnerId ID of the player who won grand finals
   * @returns True if bracket reset is needed
   */
  static needsBracketReset(winnersChampionId: number, grandFinalsWinnerId: number): boolean {
    // If the losers bracket champion won, they need to beat the winners champion twice
    return winnersChampionId !== grandFinalsWinnerId;
  }

  /**
   * Calculate the number of rounds needed for single elimination
   * @param numPlayers Number of players
   * @returns Number of rounds
   */
  static calculateSingleEliminationRounds(numPlayers: number): number {
    if (!this.isPowerOfTwo(numPlayers)) {
      throw new Error('Number of players must be a power of 2');
    }
    return Math.log2(numPlayers);
  }

  /**
   * Calculate the number of rounds needed for double elimination
   * @param numPlayers Number of players
   * @returns Object with winners bracket rounds and losers bracket rounds
   */
  static calculateDoubleEliminationRounds(numPlayers: number): { winners: number; losers: number; total: number } {
    if (!this.isPowerOfTwo(numPlayers)) {
      throw new Error('Number of players must be a power of 2');
    }
    const winnersRounds = Math.log2(numPlayers);
    const losersRounds = (winnersRounds * 2) - 1; // Losers bracket has almost twice as many rounds
    return {
      winners: winnersRounds,
      losers: losersRounds,
      total: winnersRounds + losersRounds + 1, // +1 for grand finals
    };
  }

  /**
   * Get round name for single elimination
   * @param roundNumber Round number (1-based)
   * @param totalRounds Total number of rounds
   * @returns Human-readable round name
   */
  static getSingleEliminationRoundName(roundNumber: number, totalRounds: number): string {
    if (roundNumber === totalRounds) return 'Finals';
    if (roundNumber === totalRounds - 1) return 'Semifinals';
    if (roundNumber === totalRounds - 2) return 'Quarterfinals';
    if (roundNumber === 1 && totalRounds > 4) return 'Round of ' + Math.pow(2, totalRounds - roundNumber + 1);
    return 'Round ' + roundNumber;
  }

  /**
   * Get round name for double elimination
   * @param roundNumber Round number (1-based)
   * @param isLosersBracket Whether this is a losers bracket round
   * @param isGrandFinals Whether this is the grand finals
   * @returns Human-readable round name
   */
  static getDoubleEliminationRoundName(
    roundNumber: number, 
    isLosersBracket: boolean, 
    isGrandFinals: boolean
  ): string {
    if (isGrandFinals) return 'Grand Finals';
    if (isLosersBracket) return 'Losers Bracket Round ' + roundNumber;
    return 'Winners Bracket Round ' + roundNumber;
  }

  /**
   * Check if number is a power of 2
   */
  private static isPowerOfTwo(n: number): boolean {
    return n > 0 && (n & (n - 1)) === 0;
  }

  /**
   * Get the next power of 2 (for suggesting correct player count)
   */
  static getNextPowerOfTwo(n: number): number {
    return Math.pow(2, Math.ceil(Math.log2(n)));
  }

  /**
   * Get the previous power of 2
   */
  static getPreviousPowerOfTwo(n: number): number {
    return Math.pow(2, Math.floor(Math.log2(n)));
  }
}
