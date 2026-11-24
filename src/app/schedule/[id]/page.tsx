import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setVisitOutcome } from "@/app/actions/appointments";
import { NotesForm } from "@/components/notes-form";
import { SubmitButton } from "@/components/submit-button";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireClinician } from "@/lib/dal";
import { formatClinicDateTime, formatMoney } from "@/lib/time";

export const metadata: Metadata = { title: "Visit" };

export default async function VisitDetail({ params }: PageProps<"/schedule/[id]">) {
  const user = await requireClinician();
  const { id } = await params;

  const appt = await prisma.appointment.findUnique({
    where: { id },
    include: { patient: { select: { name: true, email: true } } },
  });
  if (!appt || appt.clinicianId !== user.clinician.id) notFound();

  const canRecordOutcome = appt.status === "CONFIRMED" && appt.startsAt <= new Date();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/schedule" className="text-sm text-teal-700 underline">
        ← My schedule
      </Link>
      <PageHeader
        title={appt.patient.name}
        subtitle={formatClinicDateTime(appt.startsAt)}
        action={<StatusBadge status={appt.status} />}
      />

      <Card>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Reason</dt>
            <dd className="mt-1 text-slate-900">{appt.reason}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Patient email</dt>
            <dd className="mt-1 text-slate-900">{appt.patient.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Deposit</dt>
            <dd className="mt-1 text-slate-900">
              {appt.refundedAt ? "Refunded" : appt.paidAt ? `${formatMoney(appt.depositCents)} paid` : "Not paid"}
            </dd>
          </div>
        </dl>

        {canRecordOutcome && (
          <form
            action={setVisitOutcome}
            className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-6"
          >
            <input type="hidden" name="appointmentId" value={appt.id} />
            <span className="text-sm font-medium text-slate-800">Record outcome:</span>
            <SubmitButton name="outcome" value="COMPLETED" pendingText="Saving…">
              Mark completed
            </SubmitButton>
            <SubmitButton name="outcome" value="NO_SHOW" variant="secondary" pendingText="Saving…">
              Mark no-show
            </SubmitButton>
          </form>
        )}
        {appt.status === "CONFIRMED" && !canRecordOutcome && (
          <p className="mt-6 border-t border-slate-100 pt-6 text-sm text-slate-500">
            You can record the outcome once the visit has started.
          </p>
        )}
      </Card>

      <Card>
        <h2 className="font-semibold">Visit notes</h2>
        <p className="text-sm text-slate-500">Private to clinicians. Demo data only.</p>
        <NotesForm appointmentId={appt.id} initialNotes={appt.notes ?? ""} />
      </Card>
    </div>
  );
}
