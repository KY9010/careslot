import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, Card, PageHeader, StatusBadge } from "@/components/ui";
import { releaseStaleHolds } from "@/lib/appointments";
import { prisma } from "@/lib/db";
import { requirePatient } from "@/lib/dal";
import { formatClinicDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "My appointments" };

export default async function AppointmentsPage() {
  const patient = await requirePatient();
  await releaseStaleHolds();

  const appointments = await prisma.appointment.findMany({
    where: { patientId: patient.id },
    include: { clinician: { include: { user: { select: { name: true } } } } },
    orderBy: { startsAt: "asc" },
  });

  const now = new Date();
  const upcoming = appointments.filter((a) => a.startsAt >= now && a.status !== "CANCELLED");
  const past = appointments.filter((a) => !upcoming.includes(a)).reverse();

  return (
    <div>
      <PageHeader
        title={`Hi, ${patient.name.split(" ")[0]}`}
        subtitle="Your upcoming and past visits."
        action={<ButtonLink href="/book">Book a visit</ButtonLink>}
      />

      <section aria-labelledby="upcoming" className="space-y-3">
        <h2 id="upcoming" className="text-lg font-semibold">
          Upcoming
        </h2>
        {upcoming.length === 0 ? (
          <Card>
            <p className="text-slate-600">
              No upcoming visits.{" "}
              <Link href="/book" className="text-teal-700 underline">
                Book one now
              </Link>
              .
            </p>
          </Card>
        ) : (
          upcoming.map((a) => <AppointmentRow key={a.id} appt={a} />)
        )}
      </section>

      {past.length > 0 && (
        <section aria-labelledby="past" className="mt-10 space-y-3">
          <h2 id="past" className="text-lg font-semibold">
            Past and cancelled
          </h2>
          {past.map((a) => (
            <AppointmentRow key={a.id} appt={a} />
          ))}
        </section>
      )}
    </div>
  );
}

function AppointmentRow({
  appt,
}: {
  appt: {
    id: string;
    startsAt: Date;
    status: string;
    reason: string;
    clinician: { specialty: string; user: { name: string } };
  };
}) {
  return (
    <Link
      href={`/appointments/${appt.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-teal-600"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-slate-900">{formatClinicDateTime(appt.startsAt)}</p>
          <p className="text-sm text-slate-600">
            {appt.clinician.user.name} · {appt.clinician.specialty}
          </p>
        </div>
        <StatusBadge status={appt.status} />
      </div>
      <p className="mt-2 line-clamp-1 text-sm text-slate-500">{appt.reason}</p>
    </Link>
  );
}
