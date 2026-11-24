import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingForm } from "@/components/booking-form";
import { Card, PageHeader } from "@/components/ui";
import { getTakenSlotTimes, releaseStaleHolds } from "@/lib/appointments";
import { prisma } from "@/lib/db";
import { requirePatient } from "@/lib/dal";
import { paymentsEnabled } from "@/lib/stripe";
import {
  MIN_LEAD_MINUTES,
  addDays,
  formatClinicTime,
  formatDayLabel,
  slotStartsForDay,
  upcomingClinicDays,
  zonedTimeToUtc,
} from "@/lib/time";

export const metadata: Metadata = { title: "Choose a time" };

export default async function ClinicianAvailability({ params, searchParams }: PageProps<"/book/[clinicianId]">) {
  await requirePatient();
  const { clinicianId } = await params;
  const { date } = await searchParams;

  const clinician = await prisma.clinician.findUnique({
    where: { id: clinicianId },
    include: { user: { select: { name: true } } },
  });
  if (!clinician) notFound();

  const now = new Date();
  const days = upcomingClinicDays(now);
  const selectedDay = typeof date === "string" && days.includes(date) ? date : days[0];

  await releaseStaleHolds();
  const dayStart = zonedTimeToUtc(selectedDay, "00:00");
  const dayEnd = zonedTimeToUtc(addDays(selectedDay, 1), "00:00");
  const taken = await getTakenSlotTimes(clinician.id, dayStart, dayEnd);
  const earliest = now.getTime() + MIN_LEAD_MINUTES * 60_000;

  const slots = slotStartsForDay(selectedDay).map((s) => ({
    iso: s.toISOString(),
    label: formatClinicTime(s),
    available: s.getTime() >= earliest && !taken.has(s.getTime()),
  }));

  return (
    <div>
      <Link href="/book" className="text-sm text-teal-700 underline">
        ← All clinicians
      </Link>
      <PageHeader
        title={`Book with ${clinician.user.name}`}
        subtitle={`${clinician.specialty} · Times shown in Toronto time`}
      />

      <Card>
        <h2 className="text-sm font-medium text-slate-800" id="day-label">
          1. Choose a day
        </h2>
        <nav aria-labelledby="day-label" className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {days.map((d) => (
            <Link
              key={d}
              href={`/book/${clinician.id}?date=${d}`}
              aria-current={d === selectedDay ? "date" : undefined}
              className={`shrink-0 rounded-lg border px-3 py-2 text-sm ${
                d === selectedDay
                  ? "border-teal-700 bg-teal-700 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:border-teal-600"
              }`}
            >
              {formatDayLabel(d)}
            </Link>
          ))}
        </nav>

        <BookingForm
          key={selectedDay}
          clinicianId={clinician.id}
          dayLabel={formatDayLabel(selectedDay)}
          slots={slots}
          paymentsEnabled={paymentsEnabled}
        />
      </Card>
    </div>
  );
}
