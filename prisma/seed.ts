// Creates demo clinicians, patients and appointments.
// Safe to run again: it resets the demo accounts' appointments to a fresh state.
// Run with: npm run db:seed
import "dotenv/config";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEMO_CLINICIAN_EMAIL, DEMO_PATIENT_EMAIL } from "../src/lib/demo";
import { SLOT_MINUTES, addDays, clinicDateString, isWeekend, slotKey, zonedTimeToUtc } from "../src/lib/time";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const clinicians = [
  {
    name: "Dr. Priya Shah",
    email: DEMO_CLINICIAN_EMAIL,
    specialty: "Family Medicine",
    bio: "Primary care for all ages, with a focus on preventive care and chronic condition management.",
  },
  {
    name: "Dr. Marcus Chen",
    email: "marcus.chen@demo.careslot.dev",
    specialty: "Physiotherapy",
    bio: "Sports injuries, post-surgery rehab and personalised exercise programs.",
  },
  {
    name: "Dr. Amara Okafor",
    email: "amara.okafor@demo.careslot.dev",
    specialty: "Counselling",
    bio: "Talk therapy for stress, anxiety and life transitions, in person or virtual.",
  },
];

const patients = [
  { name: "Alex Rivera", email: DEMO_PATIENT_EMAIL },
  { name: "Jordan Lee", email: "jordan.lee@demo.careslot.dev" },
  { name: "Sam Patel", email: "sam.patel@demo.careslot.dev" },
];

/** The n-th weekday from today in clinic time (negative = in the past). */
function weekday(offset: number): string {
  let day = clinicDateString(new Date());
  let moved = 0;
  const step = offset >= 0 ? 1 : -1;
  while (isWeekend(day)) day = addDays(day, step);
  while (moved !== offset) {
    day = addDays(day, step);
    if (!isWeekend(day)) moved += step;
  }
  return day;
}

async function upsertUser(name: string, email: string, role: "PATIENT" | "CLINICIAN") {
  // Demo users log in through the "Try the demo" buttons, so their real
  // password is random and never shown anywhere.
  const passwordHash = await bcrypt.hash(randomBytes(24).toString("base64url"), 10);
  return prisma.user.upsert({
    where: { email },
    update: { name, role },
    create: { name, email, role, passwordHash },
  });
}

async function main() {
  const clinicianRecords = [];
  for (const c of clinicians) {
    const user = await upsertUser(c.name, c.email, "CLINICIAN");
    clinicianRecords.push(
      await prisma.clinician.upsert({
        where: { userId: user.id },
        update: { specialty: c.specialty, bio: c.bio },
        create: { userId: user.id, specialty: c.specialty, bio: c.bio },
      }),
    );
  }
  const patientRecords = [];
  for (const p of patients) patientRecords.push(await upsertUser(p.name, p.email, "PATIENT"));

  // Reset the demo appointments so every seed starts clean.
  await prisma.appointment.deleteMany({ where: { patientId: { in: patientRecords.map((p) => p.id) } } });

  const [priya, marcus, amara] = clinicianRecords;
  const [alex, jordan, sam] = patientRecords;

  const visits: {
    clinicianId: string;
    patientId: string;
    day: string;
    time: string;
    reason: string;
    status: "CONFIRMED" | "COMPLETED" | "NO_SHOW";
    notes?: string;
  }[] = [
    {
      clinicianId: priya.id,
      patientId: alex.id,
      day: weekday(-3),
      time: "10:00",
      reason: "Annual check-up",
      status: "COMPLETED",
      notes: "Routine check-up. All good. Follow up in 12 months.",
    },
    {
      clinicianId: priya.id,
      patientId: jordan.id,
      day: weekday(-1),
      time: "09:30",
      reason: "Follow-up on seasonal allergies",
      status: "CONFIRMED",
    },
    {
      clinicianId: priya.id,
      patientId: sam.id,
      day: weekday(-1),
      time: "14:00",
      reason: "Prescription renewal",
      status: "CONFIRMED",
    },
    {
      clinicianId: priya.id,
      patientId: jordan.id,
      day: weekday(-2),
      time: "11:00",
      reason: "Flu shot",
      status: "NO_SHOW",
    },
    {
      clinicianId: priya.id,
      patientId: sam.id,
      day: weekday(1),
      time: "09:00",
      reason: "Blood pressure review",
      status: "CONFIRMED",
    },
    {
      clinicianId: priya.id,
      patientId: jordan.id,
      day: weekday(2),
      time: "15:30",
      reason: "General consultation",
      status: "CONFIRMED",
    },
    {
      clinicianId: marcus.id,
      patientId: alex.id,
      day: weekday(2),
      time: "11:30",
      reason: "Knee pain after running",
      status: "CONFIRMED",
    },
    {
      clinicianId: amara.id,
      patientId: sam.id,
      day: weekday(3),
      time: "13:00",
      reason: "Initial counselling session",
      status: "CONFIRMED",
    },
  ];

  for (const v of visits) {
    const startsAt = zonedTimeToUtc(v.day, v.time);
    await prisma.appointment.create({
      data: {
        clinicianId: v.clinicianId,
        patientId: v.patientId,
        startsAt,
        endsAt: new Date(startsAt.getTime() + SLOT_MINUTES * 60_000),
        reason: v.reason,
        status: v.status,
        slotKey: slotKey(v.clinicianId, startsAt),
        paidAt: new Date(startsAt.getTime() - 3 * 24 * 60 * 60 * 1000),
        notes: v.notes,
      },
    });
  }

  console.log(
    `Seeded ${clinicianRecords.length} clinicians, ${patientRecords.length} patients, ${visits.length} appointments.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
