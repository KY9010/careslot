import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cancelAppointment, payDeposit } from "@/app/actions/appointments";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Card, PageHeader, StatusBadge } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requirePatient } from "@/lib/dal";
import { HOLD_MINUTES, formatClinicDateTime, formatMoney } from "@/lib/time";

export const metadata: Metadata = { title: "Appointment" };

export default async function AppointmentDetail({ params, searchParams }: PageProps<"/appointments/[id]">) {
  const patient = await requirePatient();
  const { id } = await params;
  const query = await searchParams;

  const appt = await prisma.appointment.findUnique({
    where: { id },
    include: { clinician: { include: { user: { select: { name: true } } } } },
  });
  // Someone else's appointment looks exactly like a missing one.
  if (!appt || appt.patientId !== patient.id) notFound();

  const inFuture = appt.startsAt > new Date();
  const canCancel = inFuture && (appt.status === "CONFIRMED" || appt.status === "PENDING_PAYMENT");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/appointments" className="text-sm text-teal-700 underline">
        ← My appointments
      </Link>
      <PageHeader title="Appointment details" action={<StatusBadge status={appt.status} />} />

      {query.paid && appt.status === "CONFIRMED" && (
        <Alert tone="success">Deposit received. Your visit is confirmed. A receipt was sent by Stripe.</Alert>
      )}
      {query.booked && <Alert tone="success">Your visit is booked.</Alert>}
      {query.payment === "cancelled" && appt.status === "PENDING_PAYMENT" && (
        <Alert tone="info">
          Payment wasn&apos;t completed. Your slot is held for {HOLD_MINUTES} minutes from booking.
        </Alert>
      )}
      {query.cancelled && appt.status === "CANCELLED" && (
        <Alert tone="info">
          Appointment cancelled
          {appt.refundedAt ? ` and your ${formatMoney(appt.depositCents)} deposit was refunded` : ""}.
        </Alert>
      )}

      <Card>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Detail label="When">{formatClinicDateTime(appt.startsAt)} (Toronto time)</Detail>
          <Detail label="Clinician">
            {appt.clinician.user.name}, {appt.clinician.specialty}
          </Detail>
          <Detail label="Reason">{appt.reason}</Detail>
          <Detail label="Deposit">
            {appt.refundedAt
              ? `${formatMoney(appt.depositCents)} refunded`
              : appt.paidAt
                ? `${formatMoney(appt.depositCents)} paid`
                : appt.status === "PENDING_PAYMENT"
                  ? `${formatMoney(appt.depositCents)} due`
                  : "Not required"}
          </Detail>
        </dl>

        {(appt.status === "PENDING_PAYMENT" || canCancel) && (
          <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-6">
            {appt.status === "PENDING_PAYMENT" && (
              <form action={payDeposit}>
                <input type="hidden" name="appointmentId" value={appt.id} />
                <SubmitButton pendingText="Opening checkout…">
                  Pay {formatMoney(appt.depositCents)} deposit
                </SubmitButton>
              </form>
            )}
            {canCancel && (
              <form action={cancelAppointment}>
                <input type="hidden" name="appointmentId" value={appt.id} />
                <SubmitButton variant="danger" pendingText="Cancelling…">
                  {appt.paidAt ? "Cancel and refund deposit" : "Cancel booking"}
                </SubmitButton>
              </form>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-slate-900">{children}</dd>
    </div>
  );
}
