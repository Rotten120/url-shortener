import { PrismaClient } from "@prisma/client"

const globalForPrismaClient = globalThis;

export const prisma = globalForPrismaClient.prisma || new PrismaClient();

if(process.env.NODE_ENV !== "production") {
  globalForPrismaClient.prisma = prisma;
}
