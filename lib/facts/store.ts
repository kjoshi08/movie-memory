import { prisma } from "@/lib/db";
import { LEASE_SECONDS, type Fact, type FactStore, type Snapshot } from "@/lib/facts/service";

type LatestRow = Fact & { observedAt: Date };

export const postgresFactStore: FactStore = {
  async latest(userId, movie): Promise<Snapshot | null> {
    const rows = await prisma.$queryRaw<LatestRow[]>`
      SELECT "id", "content", "createdAt", clock_timestamp() AS "observedAt"
      FROM "MovieFact"
      WHERE "userId" = ${userId} AND "movie" = ${movie}
      ORDER BY "createdAt" DESC, "id" DESC
      LIMIT 1
    `;
    const row = rows[0];
    return row ? { fact: { id: row.id, content: row.content, createdAt: row.createdAt }, observedAt: row.observedAt } : null;
  },

  async claim(userId, movie, token) {
    // The conditional UPDATE is atomic across Node processes and hosts.
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      UPDATE "User"
      SET "factLeaseToken" = ${token},
          "factLeaseUntil" = clock_timestamp() + (${LEASE_SECONDS} * interval '1 second')
      WHERE "id" = ${userId} AND "favoriteMovie" = ${movie}
        AND ("factLeaseUntil" IS NULL OR "factLeaseUntil" <= clock_timestamp())
      RETURNING "id"
    `;
    return rows.length === 1;
  },

  async leaseActive(userId) {
    const rows = await prisma.$queryRaw<{ active: boolean }[]>`
      SELECT ("factLeaseToken" IS NOT NULL AND "factLeaseUntil" > clock_timestamp()) AS "active"
      FROM "User" WHERE "id" = ${userId}
    `;
    return rows[0]?.active === true;
  },

  async saveIfOwner(userId, movie, token, content) {
    // The check and insertion are one short transaction, protected by row locking.
    return prisma.$transaction(async (tx) => {
      const owner = await tx.$queryRaw<{ id: string }[]>`
        UPDATE "User" SET "factLeaseToken" = NULL, "factLeaseUntil" = NULL
        WHERE "id" = ${userId} AND "favoriteMovie" = ${movie}
          AND "factLeaseToken" = ${token} AND "factLeaseUntil" > clock_timestamp()
        RETURNING "id"
      `;
      if (!owner.length) return null;
      return tx.movieFact.create({
        data: { userId, movie, content },
        select: { id: true, content: true, createdAt: true },
      });
    });
  },

  async release(userId, token) {
    // The token condition prevents a late worker from releasing its successor's lease.
    await prisma.user.updateMany({
      where: { id: userId, factLeaseToken: token },
      data: { factLeaseToken: null, factLeaseUntil: null },
    });
  },
};
