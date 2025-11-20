# Discord League Manager - Usage Guide

## Overview

This bot helps you run TCG (Trading Card Game) leagues with automated Swiss pairing, standings tracking, and multiple tournament formats.

## Commands

### 1. League Management (`/league`)

#### Create a League
```
/league create name:"Weekly Modern" format:"Modern" type:"Swiss" rounds:5
```

**Parameters:**
- `name` (required): Name of your league
- `format` (required): Game format (e.g., "Standard", "Modern", "Commander")
- `type` (required): Competition type
  - **Swiss**: Standard Swiss pairing
  - **Swiss with Top Cut**: Swiss rounds followed by elimination
  - **Double Elimination**: Double elimination bracket
  - **Single Elimination**: Single elimination bracket
- `rounds` (optional): Total number of rounds (auto-calculated if not specified)

**Response:** League created with ID, status set to REGISTRATION

#### List Active Leagues
```
/league list
```

Shows all leagues currently accepting registrations or in progress.

#### Cancel a League
```
/league cancel league_id:1
```

Cancels a league and removes all tournament data.

---

### 2. Player Registration (`/register`)

```
/register league_id:1
```

Registers the user who runs the command for the specified league.

**Requirements:**
- League must be in REGISTRATION status
- Player cannot already be registered
- At least 2 players needed to start a league

---

### 3. Tournament Management (`/tournament`)

#### Start a League
```
/tournament start league_id:1
```

**What it does:**
- Changes league status from REGISTRATION to IN_PROGRESS
- Creates tournament instance with all registered players
- League must have at least 2 players

#### Generate Next Round Pairings
```
/tournament nextround league_id:1
```

**What it does:**
- Generates Swiss pairings for the next round
- Creates matches in the database
- Assigns table numbers
- Handles BYEs for odd player counts

**Requirements:**
- All matches from current round must be reported
- League must be IN_PROGRESS

**Response:** Displays pairings with table numbers

#### Report Match Result
```
/tournament report match_id:5 player1_wins:2 player2_wins:1 draws:0
```

**Parameters:**
- `match_id`: The match ID (shown in pairings)
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
/tournament pairings league_id:1
```

Shows all matches for the current round with:
- Table numbers
- Player matchups
- Match IDs for reporting results
- Completion status (⏳ pending, ✅ complete)

#### Drop from League
```
/tournament drop league_id:1
```

Drops the user from the league. They won't receive future pairings.

---

### 4. Standings (`/standings`)

```
/standings league_id:1
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
# 1. Create league
/league create name:"FNM Modern" format:"Modern" type:"Swiss" rounds:4

# 2. Players register (response shows "League created with ID: 1")
/register league_id:1

# 3. Start when ready (need at least 2 players)
/tournament start league_id:1

# 4. Generate first round
/tournament nextround league_id:1
# Shows: Table 1: Alice vs Bob, Table 2: Carol vs Dave, etc.

# 5. Players play matches, then report results
/tournament report match_id:1 player1_wins:2 player2_wins:0
/tournament report match_id:2 player1_wins:2 player2_wins:1

# 6. Check standings after round
/standings league_id:1

# 7. Generate next round when all matches complete
/tournament nextround league_id:1

# 8. Repeat steps 5-7 for remaining rounds
```

### Example 2: Multiple Concurrent Leagues

```bash
# Create different leagues
/league create name:"Standard League" format:"Standard" type:"Swiss"
/league create name:"Legacy Tournament" format:"Legacy" type:"Swiss with Top Cut"

# View all active leagues
/league list

# Players can register for multiple leagues
/register league_id:1
/register league_id:2
```

### Example 3: Handling Odd Players (BYE)

```bash
# With 9 players, one gets a BYE each round
/tournament nextround league_id:1
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
