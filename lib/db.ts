import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

const db = globalThis.prisma ?? new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL },
  },
  log: process.env.NODE_ENV === "development" ? ["error"] : [],
});
if (process.env.NODE_ENV !== "production") globalThis.prisma = db;

export default db;
