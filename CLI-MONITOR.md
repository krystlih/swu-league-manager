# SWU League Manager - CLI Monitor Tool

A command-line interface tool for monitoring and inspecting the SWU League Manager database in real-time.

## Usage

Run the monitor tool with:

```bash
npm run monitor
```

## Features

### 1. View Active Leagues
- Lists all leagues in REGISTRATION, IN_PROGRESS, or TOP_CUT status
- Shows player count, match count, round information
- Displays timer settings if configured

### 2. View Recent Matches
- Shows the last 20 matches created
- Displays match status (completed ✅ or pending ⏳)
- Includes player names, results, and table numbers

### 3. View Database Statistics
- **Overview**: Total leagues, active leagues, completed leagues
- **Players**: Total registered players and registrations
- **Matches**: Total matches, completion rate, pending matches
- **Rounds**: Total rounds played across all tournaments

### 4. View Leagues by Status
- Groups leagues by their current status
- Shows count for each status (REGISTRATION, IN_PROGRESS, TOP_CUT, COMPLETED, CANCELLED)

### 5. View Active Players
- Lists the top 20 most active players
- Shows registration count and total matches played
- Displays Discord IDs for reference

### 6. View Recent Registrations
- Shows the last 20 player registrations
- Displays player record and match points
- Indicates if player is active or dropped

### 7. View Match Completion Rate
- Shows completion percentage for each active tournament
- Helps identify tournaments with pending matches
- Displays current round progress

### 8. Monitor Specific League
- Interactive selection of an active league
- Detailed view including:
  - League information and settings
  - Current round matches with status
  - Match completion rate for current round
  - Top 10 current standings
- Perfect for monitoring ongoing tournaments

### 9. View Audit Log
- Shows the last 20 audit log entries
- Displays actions taken by tournament organizers
- Includes timestamps, user information, and descriptions
- Useful for tracking tournament modifications

## Example Output

```
╔════════════════════════════════════════════╗
║   SWU League Manager - Monitor Tool       ║
╚════════════════════════════════════════════╝

1. View Active Leagues
2. View Recent Matches
3. View Database Statistics
4. View Leagues by Status
5. View Active Players
6. View Recent Registrations
7. View Match Completion Rate
8. Monitor Specific League
9. View Audit Log
0. Exit

Select option: 3

═══ DATABASE STATISTICS ═══

╔═══════════════════════════════════════╗
║            OVERVIEW                   ║
╠═══════════════════════════════════════╣
║ Total Leagues:                     45 ║
║ Active Leagues:                     3 ║
║ Completed Leagues:                 42 ║
║ Total Players:                    156 ║
║ Total Registrations:              892 ║
╠═══════════════════════════════════════╣
║            MATCHES                    ║
╠═══════════════════════════════════════╣
║ Total Matches:                   1247 ║
║ Completed Matches:               1198 ║
║ Pending Matches:                   49 ║
║ Completion Rate:                96.1% ║
║ Total Rounds:                     234 ║
╚═══════════════════════════════════════╝
```

## Use Cases

- **Tournament Monitoring**: Check the status of active tournaments in real-time
- **Match Tracking**: See which matches are complete and which are pending
- **Player Activity**: Monitor player participation and engagement
- **Database Health**: View statistics to understand system usage
- **Audit Tracking**: Review tournament modifications and changes
- **Troubleshooting**: Identify issues with specific leagues or matches

## Tips

- Use option 8 (Monitor Specific League) for detailed tournament tracking during events
- Check option 7 (Match Completion Rate) to see which rounds are holding up tournament progress
- Review option 9 (Audit Log) to track any manual corrections or modifications made by organizers
- Option 3 (Database Statistics) provides a quick health check of the entire system

## Requirements

- Node.js and npm installed
- Access to the SWU League Manager database
- TypeScript compiled (runs automatically with `npm run monitor`)

## Navigation

- Enter the number corresponding to your choice
- Press Enter to continue after viewing results
- Enter 0 to exit the monitor tool
- For option 8, select a league number or 0 to cancel

## Notes

- All dates and times are displayed in your local timezone
- Match completion rates update in real-time based on database state
- The tool requires read access to the database but does not modify any data
- Press Ctrl+C at any time to exit immediately
