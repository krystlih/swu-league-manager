-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Match" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "leagueId" INTEGER NOT NULL,
    "roundId" INTEGER,
    "player1Id" INTEGER NOT NULL,
    "player2Id" INTEGER,
    "player1Wins" INTEGER NOT NULL DEFAULT 0,
    "player2Wins" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "winnerId" INTEGER,
    "isDraw" BOOLEAN NOT NULL DEFAULT false,
    "isBye" BOOLEAN NOT NULL DEFAULT false,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "tableNumber" INTEGER,
    "bracketPosition" TEXT,
    "isLosersBracket" BOOLEAN NOT NULL DEFAULT false,
    "isGrandFinals" BOOLEAN NOT NULL DEFAULT false,
    "isBracketReset" BOOLEAN NOT NULL DEFAULT false,
    "reportedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Match_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Match_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Match_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES "Player" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Match" ("createdAt", "draws", "id", "isBye", "isCompleted", "isDraw", "leagueId", "player1Id", "player1Wins", "player2Id", "player2Wins", "reportedAt", "roundId", "tableNumber", "winnerId") SELECT "createdAt", "draws", "id", "isBye", "isCompleted", "isDraw", "leagueId", "player1Id", "player1Wins", "player2Id", "player2Wins", "reportedAt", "roundId", "tableNumber", "winnerId" FROM "Match";
DROP TABLE "Match";
ALTER TABLE "new_Match" RENAME TO "Match";
CREATE INDEX "Match_leagueId_idx" ON "Match"("leagueId");
CREATE INDEX "Match_roundId_idx" ON "Match"("roundId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
