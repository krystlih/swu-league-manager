-- AlterTable
ALTER TABLE "League" ADD COLUMN "roundTimerMinutes" INTEGER;

-- AlterTable
ALTER TABLE "Round" ADD COLUMN "timerEndsAt" DATETIME;
ALTER TABLE "Round" ADD COLUMN "timerStartsAt" DATETIME;
