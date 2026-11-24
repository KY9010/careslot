"use client";

import { useActionState } from "react";
import { bookAppointment } from "@/app/actions/appointments";
import { SubmitButton } from "@/components/submit-button";
import { Alert, FieldError, inputClass } from "@/components/ui";

type Slot = { iso: string; label: string; available: boolean };

export function BookingForm({
  clinicianId,
  dayLabel,
  slots,
  paymentsEnabled,
}: {
  clinicianId: string;
  dayLabel: string;
  slots: Slot[];
  paymentsEnabled: boolean;
}) {
  const [state, action] = useActionState(bookAppointment, undefined);
  const errors = state?.fieldErrors;
  const anyAvailable = slots.some((s) => s.available);

  return (
    <form action={action} className="mt-6 space-y-6" noValidate>
      <input type="hidden" name="clinicianId" value={clinicianId} />
      {state?.error && <Alert tone="error">{state.error}</Alert>}

      <fieldset aria-describedby="slot-error">
        <legend className="text-sm font-medium text-slate-800">2. Choose a time on {dayLabel}</legend>
        {anyAvailable ? (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {slots.map((slot) => (
              <label key={slot.iso} className={slot.available ? "cursor-pointer" : "cursor-not-allowed"}>
                <input
                  type="radio"
                  name="startsAt"
                  value={slot.iso}
                  disabled={!slot.available}
                  defaultChecked={state?.values?.startsAt === slot.iso}
                  className="peer sr-only"
                />
                <span
                  className={`block rounded-lg border px-2 py-2 text-center text-sm peer-focus-visible:ring-2 peer-focus-visible:ring-teal-600 ${
                    slot.available
                      ? "border-slate-300 bg-white text-slate-800 hover:border-teal-600 peer-checked:border-teal-700 peer-checked:bg-teal-700 peer-checked:text-white"
                      : "border-slate-200 bg-slate-100 text-slate-400 line-through"
                  }`}
                >
                  {slot.label}
                  {!slot.available && <span className="sr-only"> (unavailable)</span>}
                </span>
              </label>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600">No open times on this day. Please pick another day.</p>
        )}
        <FieldError id="slot-error" messages={errors?.startsAt} />
      </fieldset>

      <div>
        <label htmlFor="reason" className="text-sm font-medium text-slate-800">
          3. Reason for visit
        </label>
        <textarea
          id="reason"
          name="reason"
          rows={3}
          maxLength={300}
          defaultValue={state?.values?.reason}
          placeholder="e.g. Follow-up on knee pain"
          className={inputClass}
          aria-invalid={!!errors?.reason}
          aria-describedby="reason-hint reason-error"
        />
        <p id="reason-hint" className="mt-1 text-xs text-slate-500">
          Keep it general. This is a demo, so no real health details.
        </p>
        <FieldError id="reason-error" messages={errors?.reason} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton
          pendingText={paymentsEnabled ? "Opening secure checkout…" : "Booking…"}
          className={anyAvailable ? "" : "pointer-events-none opacity-50"}
        >
          {paymentsEnabled ? "Continue to $25 deposit" : "Book appointment"}
        </SubmitButton>
        {paymentsEnabled && (
          <p className="text-xs text-slate-500">
            You&apos;ll pay on Stripe&apos;s secure page. Cancel any time before the visit for a full refund.
          </p>
        )}
      </div>
    </form>
  );
}
