// Integration test against a real PostgreSQL database.
// Proves the database itself prevents double-booking, even when two requests
// for the same slot arrive at exactly the same time (a race condition).
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../src/generated/prisma/client";
import { slotKey } from "../src/lib/time";

const hasDb = Boolean(process.env.DATABASE_URL);
const prisma = hasDb
  ? new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })
  : null;
const tag = `test-${Date.now()}`;
let clinicianId = "";
let patientIds: string[] = [];

describe.skipIf(!hasDb)("double-booking guard (database)", () => {
  beforeAll(async () => {
    const doctor = await prisma!.user.create({
      data: { name: "Dr. Test", email: `${tag}-dr@example.test`, passwordHash: "x", role: "CLINICIAN" },
    });
    clinicianId = (await prisma!.clinician.create({ data: { userId: doctor.id, specialty: "Testing", bio: "" } })).id;
    patientIds = await Promise.all(
      [1, 2, 3].map(
        async (n) =>
          (
            await prisma!.user.create({
              data: { name: `Patient ${n}`, email: `${tag}-p${n}@example.test`, passwordHash: "x" },
            })
          ).id,
      ),
    );
  });

  afterAll(async () => {
    await prisma!.user.deleteMany({ where: { email: { startsWith: tag } } }); // cascades to appointments
    await prisma!.$disconnect();
  });

  const book = (patientId: string, startsAt: Date) =>
    prisma!.appointment.create({
      data: {
        patientId,
        clinicianId,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 30 * 60_000),
        reason: "Race test",
        slotKey: slotKey(clinicianId, startsAt),
      },
    });

  it("lets exactly one of three simultaneous bookings for the same slot succeed", async () => {
    const startsAt = new Date("2030-01-15T14:00:00Z");
    const results = await Promise.allSettled(patientIds.map((p) => book(p, startsAt)));

    const succeeded = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(2);
    for (const f of failed) {
      expect(f.reason).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
      expect(f.reason.code).toBe("P2002"); // unique constraint violation
    }
  });

  it("frees the slot again once the appointment is cancelled", async () => {
    const startsAt = new Date("2030-01-15T15:00:00Z");
    const first = await book(patientIds[0], startsAt);
    await prisma!.appointment.update({ where: { id: first.id }, data: { status: "CANCELLED", slotKey: null } });

    await expect(book(patientIds[1], startsAt)).resolves.toMatchObject({ patientId: patientIds[1] });
  });
});
