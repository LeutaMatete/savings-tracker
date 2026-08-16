-- AlterTable
ALTER TABLE "Budget" ADD COLUMN     "lastVelocityWarnedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "velocityAlertsEnabled" BOOLEAN NOT NULL DEFAULT false;
