import type { Metadata } from "next";
import Link from "next/link";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireClinician } from "@/lib/dal";
import { addDays, clinicDateString, formatClinicTime, formatDayLabel, zonedTimeToUtc } from "@/lib/time";

export const metadata: Metadata = { title: "My schedule" };

export default async function SchedulePage() {
  const user = await requireClinician();
  const today = clinicDateString(new Date());
  const from = zonedTimeToUtc(addDays(today, -7), "00:00");

  const appointments = await prisma.appointment.findMany({
    where: { clinicianId: user.clinician.id, startsAt: { gte: from }, status: { not: "CANCELLED" } },
    include: { patient: { select: { name: true } } },
    orderBy: { startsAt: "asc" },
  });

  const needsOutcome = appointments.filter((a) => a.status === "CONFIRMED" && a.startsAt <= new Date());
  const byDay = new Map<string, typeof appointments>();
  for (const a of appointments) {
    const day = clinicDateString(a.startsAt);
    byDay.set(day, [...(byDay.get(day) ?? []), a]);
  }
  const upcomingDays = [...byDay.keys()].filter((d) => d >= today);
  const pastDays = [...byDay.keys()].filter((d) => d < today).reverse();

  return (
    <div>
      <PageHeader title="My schedule" subtitle={`${user.name} · ${user.clinician.specialty}`} />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Visits today" value={byDay.get(today)?.length ?? 0} />
        <Stat label="Upcoming visits" value={appointments.filter((a) => a.startsAt > new Date()).length} />
        <Stat label="Need an outcome" value={needsOutcome.length} highlight={needsOutcome.length > 0} />
      </div>

      {upcomingDays.length === 0 && pastDays.length === 0 && (
        <Card>
          <p className="text-slate-600">No appointments yet. New bookings will appear here.</p>
        </Card>
      )}

      {upcomingDays.length > 0 && <DayList title="Upcoming" days={upcomingDays} byDay={byDay} today={today} />}
      {pastDays.length > 0 && <DayList title="Last 7 days" days={pastDays} byDay={byDay} today={today} />}
    </div>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <Card className={`p-5 ${highlight ? "border-amber-300 bg-amber-50" : ""}`}>
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-slate-900">{value}</p>
    </Card>
  );
}

function DayList({
  title,
  days,
  byDay,
  today,
}: {
  title: string;
  days: string[];
  byDay: Map<string, { id: string; startsAt: Date; status: string; reason: string; patient: { name: string } }[]>;
  today: string;
}) {
  return (
    <section className="mb-10" aria-label={title}>
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <div className="space-y-6">
        {days.map((day) => (
          <div key={day}>
            <h3 className="mb-2 text-sm font-medium text-slate-500">
              {day === today ? "Today · " : ""}
              {formatDayLabel(day)}
            </h3>
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {byDay.get(day)!.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/schedule/${a.id}`}
                    className="flex flex-wrap items-center gap-4 px-4 py-3 hover:bg-slate-50"
                  >
                    <span className="w-20 font-mono text-sm text-slate-700">{formatClinicTime(a.startsAt)}</span>
                    <span className="flex-1">
                      <span className="block font-medium text-slate-900">{a.patient.name}</span>
                      <span className="block line-clamp-1 text-sm text-slate-500">{a.reason}</span>
                    </span>
                    <StatusBadge status={a.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
