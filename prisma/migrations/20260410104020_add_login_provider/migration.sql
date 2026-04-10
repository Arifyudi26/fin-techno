-- CreateEnum
CREATE TYPE "LoginProvider" AS ENUM ('APP', 'GOOGLE', 'TWITTER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "loginProvider" "LoginProvider" NOT NULL DEFAULT 'APP';
