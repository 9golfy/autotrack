import { PrismaClient } from "@prisma/client";

type BigIntWithJson = bigint & {
  toJSON?: () => string;
};

// BigInt serialization fix for JSON.stringify (Next.js API responses)
const bigIntPrototype = BigInt.prototype as BigIntWithJson;

if (!bigIntPrototype.toJSON) {
  bigIntPrototype.toJSON = function () {
    return this.toString();
  };
}

const globalForPrisma = global as typeof globalThis & {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
