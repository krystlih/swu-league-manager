# Discord League Manager - Usage Guide

## Overview

This bot helps you run TCG (Trading Card Game) tournaments with automated Swiss pairing, standings tracking, and multiple tournament formats.

## Commands

### 1. Tournament Management (`/tournament`)

#### Create a Tournament
```
/tournament create name:"Weekly Modern" format:"Modern" type:"Swiss" rounds:5
```

**Parameters:**
- `name` (required): Name of your tournament
- `format` (required): Game format (e.g., "Standard", "Modern", "Commander")
- `type` (required): Competition type
  - **Swiss**: Standard Swiss pairing
  - **Swiss with Top Cut**: Swiss rounds followed by elimination
  - **Double Elimination**: Double elimination bracket
  - **Single Elimination**: Single elimination bracket
- `rounds` (optional): Total number of rounds (auto-calculated if not specified)

**Response:** Tournament created with ID, status set to REGISTRATION

#### List Active Tournaments
```
/tournament list
```

Shows all tournaments currently accepting registrations or in progress.

#### Cancel a Tournament
```
/tournament cancel tournament:<tournament_name>
```

Cancels a tournament and removes all tournament data.

#### Delete a Tournament
```
/tournament delete tournament:<tournament_name>
```

Permanently deletes a tournament from the database.

#### View Audit Log
```
/tournament auditlog tournament:<tournament_name>
```

View modification history for a tournament (creator only).

#### Get Help
```
/tournament help
```

Displays comprehensive in-bot guide for all tournament commands.

---

### 2. Player Registration (`/register`)

```
/register tournament:<tournament_name>
```

Registers the user who runs the command for the specified tournament.

**Requirements:**
- Tournament must be in REGISTRATION status
- Player cannot already be registered
- At least 2 players needed to start a tournament

---

### 3. Tournament Operations (`/tournament`)

#### Start a Tournament
```
/tournament start tournament:<tournament_name>
```

**What it does:**
- Changes tournament status from REGISTRATION to IN_PROGRESS
- Creates tournament instance with all registered players
- Tournament must have at least 2 players

#### Generate Next Round Pairings
```
/tournament nextround tournament:<tournament_name>
```

**What it does:**
- Generates Swiss pairings for the next round
- Creates matches in the database
- Assigns table numbers
- Handles BYEs for odd player counts

**Requirements:**
- All matches from current round must be reported
- Tournament must be IN_PROGRESS

**Response:** Displays pairings with table numbers

#### Report Match Result
```
/tournament report match:<match_id> player1_wins:2 player2_wins:1 draws:0
```

**Parameters:**
- `match`: The match to report (autocomplete provided)
- `player1_wins`: Number of games won by player 1
- `player2_wins`: Number of games won by player 2
- `draws`: Number of drawn games (optional, default: 0)

**What it does:**
- Records the match result
- Updates tournament standings
- Calculates tiebreakers (OMW%, GW%, OGW%)
- Updates player records

#### View Current Round Pairings
```
/tournament pairings tournament:<tournament_name>
```

Shows all matches for the current round with:
- Table numbers
- Player matchups
- Match IDs for reporting results
- Completion status (⏳ pending, ✅ complete)

#### Drop from Tournament
```
/tournament drop tournament:<tournament_name>
```

Drops the user from the tournament. They won't receive future pairings.

#### End Tournament
```
/tournament end tournament:<tournament_name>
```

Manually ends a tournament (creator only).

#### View Bracket
```
/tournament bracket tournament:<tournament_name>
```

View elimination bracket for top cut or elimination tournaments.

#### Find Match
```
/tournament findmatch tournament:<tournament_name> player:<player_name>
```

Search for matches by player (creator only).

#### Modify Match
```
/tournament modifymatch match:<match_id> player1_wins:2 player2_wins:1
```

Correct match results (creator only).

#### Repair Round
```
/tournament repairround tournament:<tournament_name>
```

Regenerate current round if pairings are incorrect (creator only).

---

### 4. Standings (`/standings`)

```
/standings tournament:<tournament_name>
```

**Displays:**
- Current rank
- Player name
- Match record (W-L-D)
- Match points (3 for win, 1 for draw, 0 for loss)
- Tiebreakers:
  - **OMW%**: Opponent Match Win Percentage
  - **GW%**: Game Win Percentage
  - **OGW%**: Opponent Game Win Percentage

**Sorting:** Players ranked by match points, then OMW%, then GW%, then OGW%

---

## Workflow Examples

### Example 1: Basic Swiss Tournament

```bash
# 1. Create tournament
/tournament create name:"FNM Modern" format:"Modern" type:"Swiss" rounds:4

# 2. Players register
/register tournament:"FNM Modern"

# 3. Start when ready (need at least 2 players)
/tournament start tournament:"FNM Modern"

# 4. Generate first round
/tournament nextround tournament:"FNM Modern"
# Shows: Table 1: Alice vs Bob, Table 2: Carol vs Dave, etc.

# 5. Players play matches, then report results
/tournament report match:<match_id> player1_wins:2 player2_wins:0
/tournament report match:<match_id> player1_wins:2 player2_wins:1

# 6. Check standings after round
/standings tournament:"FNM Modern"

# 7. Generate next round when all matches complete
/tournament nextround tournament:"FNM Modern"

# 8. Repeat steps 5-7 for remaining rounds
```

### Example 2: Multiple Concurrent Tournaments

```bash
# Create different tournaments
/tournament create name:"Standard League" format:"Standard" type:"Swiss"
/tournament create name:"Legacy Tournament" format:"Legacy" type:"Swiss with Top Cut"

# View all active tournaments
/tournament list

# Players can register for multiple tournaments
/register tournament:"Standard League"
/register tournament:"Legacy Tournament"
```

### Example 3: Handling Odd Players (BYE)

```bash
# With 9 players, one gets a BYE each round
/tournament nextround tournament:"FNM Modern"
# Shows: Table 1: Alice vs Bob, ..., Table 4: Eve vs BYE

# BYE matches auto-complete with 2-0 for the paired player
```

---

## Swiss Pairing Logic

The bot uses the `tournament-organizer` library for professional Swiss pairing:

1. **Round 1**: Random pairings
2. **Subsequent Rounds**: 
   - Players paired with others having similar records
   - Avoids repeat pairings when possible
   - Handles byes for odd player counts
   - Top half plays top half, bottom plays bottom

**Tiebreakers:**
- **Match Points**: Primary ranking (Win=3, Draw=1, Loss=0)
- **OMW%**: Average match win percentage of opponents
- **GW%**: Your game win percentage
- **OGW%**: Average game win percentage of opponents

---

## Best Practices

### Tournament Organization
- Set a registration deadline before starting
- Announce pairings clearly when generating rounds
- Give players time limits for matches
- Report all results promptly to enable next round

### Recommended Round Counts
- 4-8 players: 3 rounds
- 9-16 players: 4 rounds
- 17-32 players: 5 rounds
- 33-64 players: 6 rounds
- Formula: `ceil(log2(players))`

### Multi-Server Setup
- Each Discord server has isolated leagues
- League IDs are unique per server
- Players can be in different leagues across servers

---

## Data Persistence

All data is stored in the database:
- Player profiles (linked to Discord ID)
- League configurations
- Match results and history
- Real-time standings

The bot can be restarted without losing data.

---

## Permissions

**Tournament Organizers** (users with server permissions) can:
- Create leagues
- Start tournaments
- Generate rounds
- Cancel leagues

**All Players** can:
- Register for leagues
- Report their own match results
- View standings and pairings
- Drop from leagues

---

## Troubleshooting

### "League registration is closed"
The league has already started. Ask an organizer to create a new league.

### "Current round is not complete"
All matches must be reported before generating the next round. Use `/tournament pairings` to check which matches are pending.

### "Player is already registered"
You're already signed up for this league.

### Can't find my league
Use `/league list` to see active leagues and their IDs.

### Wrong match result reported
Contact a server admin - they can access the database to correct results.

---

## Support

For issues or questions:
1. Check this documentation
2. Verify bot permissions in server settings
3. Check bot logs for error messages
4. Contact the bot administrator
