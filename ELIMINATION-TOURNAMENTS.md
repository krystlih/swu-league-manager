# Elimination Tournament Implementation

## Overview
The Discord League Manager now fully supports **Single Elimination** and **Double Elimination** tournament formats, in addition to the existing Swiss and Swiss with Top Cut formats.

## Features

### Single Elimination
- **Power of 2 Requirement**: Must have exactly 2, 4, 8, 16, 32, etc. players
- **Automatic Bracket Generation**: Creates seeded brackets (1 vs last, 2 vs second-to-last)
- **Auto-Advancement**: Winners automatically advance to the next round when all matches are complete
- **Round Names**: Automatically labels rounds (Quarterfinals, Semifinals, Finals)
- **Bracket Visualization**: ASCII bracket display via `/tournament bracket`

### Double Elimination
- **Power of 2 Requirement**: Must have exactly 2, 4, 8, 16, 32, etc. players
- **Winners and Losers Brackets**: Losers from winners bracket drop to losers bracket
- **Grand Finals**: Winners bracket champion vs Losers bracket champion
- **Bracket Reset**: If losers bracket champion wins grand finals, a reset match is played (true double elimination)
- **Auto-Advancement**: Both brackets progress automatically
- **Bracket Visualization**: Shows both brackets and grand finals status

## How to Use

### Creating an Elimination Tournament

1. **Create a Tournament**:
   ```
   /tournament create name:"Tournament Name" format:"Standard" type:"Single Elimination"
   ```
   Or for double elimination:
   ```
   /tournament create name:"Tournament Name" format:"Standard" type:"Double Elimination"
   ```

2. **Register Players**: Must register exactly 2, 4, 8, 16, etc. players
   ```
   /register tournament:"Tournament Name"
   ```

3. **Start Tournament**:
   ```
   /tournament start league:"Tournament Name"
   ```
   - System validates player count is a power of 2
   - Generates seeded bracket automatically
   - Creates Round 1 matches

### Tournament Progression

1. **View Pairings**:
   ```
   /tournament pairings league:"Tournament Name"
   ```

2. **Report Match Results**:
   ```
   /tournament report league:"Tournament Name" your_wins:2 opponent_wins:0
   ```
   - Winners automatically advance
   - When all matches in a round are complete, next round generates automatically
   - Announcement sent to configured channel (if set)

3. **View Bracket**:
   ```
   /tournament bracket league:"Tournament Name"
   ```
   - For single elimination: Shows full bracket tree
   - For double elimination: Shows winners bracket, losers bracket, and grand finals

### Double Elimination Specifics

**Winners Bracket**:
- Matches progress like single elimination
- Losers drop to losers bracket

**Losers Bracket**:
- Receives losers from winners bracket
- Alternates between feeding new losers and matching bracket survivors
- One loss in losers bracket = elimination

**Grand Finals**:
- Winners bracket champion has a "bye" (no losses yet)
- Losers bracket champion has one loss
- If losers champion wins, bracket reset match is played
- If losers champion wins bracket reset, they are the champion
- If winners champion wins either match, they are the champion

## Technical Details

### Database Schema Additions

New fields in `Match` model:
- `bracketPosition`: Tracks position in bracket (e.g., "WB-R1-M1", "LB-R2-M3", "GF")
- `isLosersBracket`: Boolean flag for losers bracket matches
- `isGrandFinals`: Boolean flag for grand finals match
- `isBracketReset`: Boolean flag for bracket reset match

### Service Architecture

**EliminationService** (`src/services/eliminationService.ts`):
- `generateSingleEliminationBracket()`: Creates initial seeded pairings
- `generateNextSingleEliminationRound()`: Advances winners to next round
- `generateDoubleEliminationBracket()`: Creates initial bracket (same as single)
- `generateNextDoubleEliminationRound()`: Handles both brackets simultaneously
- `generateGrandFinals()`: Creates grand finals match
- `needsBracketReset()`: Determines if bracket reset is needed
- Power of 2 validation helpers

**LeagueService** (`src/services/leagueService.ts`):
- `generateSingleEliminationRound()`: Orchestrates single elimination progression
- `generateDoubleEliminationRound()`: Orchestrates double elimination progression
- `checkRoundCompletion()`: Auto-advances when round is complete
- Validates player count on tournament start

### Bracket Visualization

**BracketVisualizer** (`src/utils/bracketVisualizer.ts`):
- Existing functions: `generateTop8Bracket()`, `generateTop4Bracket()`, `generateTop2Bracket()`
- New: `generateDoubleEliminationBracket()`: Shows both brackets side by side
- New: `generateBracketSummary()`: Compact view for any size bracket

### Auto-Advancement

When all matches in a round are complete:
1. `checkRoundCompletion()` detects completion
2. Calls `generateNextRound()` automatically
3. Creates new round and matches
4. Sends announcement to configured channel
5. Players can immediately report new matches

## Limitations and Notes

### Player Count Requirements
- **Must be power of 2**: 2, 4, 8, 16, 32, 64, etc.
- System will suggest nearest valid count if invalid number registers
- Example error: "You have 6 players. Please register 4 or 8 players."

### Bracket Display
- Top 8 and smaller: Full ASCII bracket tree
- Larger brackets: Summary view showing current round
- Double elimination: Simplified layout due to complexity

### Draws
- Elimination tournaments typically don't allow draws
- If a draw is reported, match is not considered complete
- Tournament cannot progress until a winner is determined

### Late Players
- Cannot add players after tournament starts
- All players must register before `/tournament start`
- Dropping players in elimination format may cause issues (not recommended)

## Migration from Swiss

Existing Swiss tournaments are unaffected. The system:
- Routes based on `competitionType` in the league
- Swiss uses `TournamentService` and Swiss pairing logic
- Elimination uses `EliminationService` and bracket logic
- Top Cut (Swiss with Top Cut) still uses single elimination for the cut phase

## Testing Recommendations

1. **Test with 4 players** (easiest):
   - Single elimination: 2 rounds (semifinals + finals)
   - Double elimination: 5 rounds (2 WB, 2 LB, 1 GF)

2. **Test with 8 players**:
   - Single elimination: 3 rounds (QF + SF + F)
   - Double elimination: 8 rounds (3 WB, 4 LB, 1 GF)

3. **Test bracket reset**:
   - In double elimination, have losers bracket champion win grand finals
   - Verify bracket reset match is created
   - Complete bracket reset to verify champion determination

4. **Test error cases**:
   - Try starting with 3, 5, 6, 7 players (should fail)
   - Verify error messages are helpful

## Future Enhancements

Potential improvements:
- [ ] Support for byes in elimination (non-power-of-2 counts)
- [ ] Best-of-3 or best-of-5 match formats
- [ ] Seeding based on prior performance or rankings
- [ ] Modified double elimination (no bracket reset option)
- [ ] Triple elimination format
- [ ] Better bracket visualization for 16+ player brackets
- [ ] Export brackets as images

## Summary

Elimination tournaments are now fully implemented with:
✅ Single elimination with automatic progression
✅ Double elimination with winners/losers brackets
✅ Grand finals and bracket reset
✅ Automatic round advancement
✅ Bracket visualization
✅ Power of 2 validation
✅ Database tracking of bracket positions
✅ Reuses existing bracket visualizer for top cut

The implementation integrates seamlessly with existing Swiss tournament logic and shares the same commands for match reporting and bracket viewing.
