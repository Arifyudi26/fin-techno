-- AlterEnum
BEGIN;
CREATE TYPE "LoginProvider_new" AS ENUM ('APP', 'GOOGLE', 'FACEBOOK');
ALTER TABLE "public"."User" ALTER COLUMN "loginProvider" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "loginProvider" TYPE "LoginProvider_new" USING ("loginProvider"::text::"LoginProvider_new");
ALTER TYPE "LoginProvider" RENAME TO "LoginProvider_old";
ALTER TYPE "LoginProvider_new" RENAME TO "LoginProvider";
DROP TYPE "public"."LoginProvider_old";
ALTER TABLE "User" ALTER COLUMN "loginProvider" SET DEFAULT 'APP';
COMMIT;
