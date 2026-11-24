"use client";

import { useActionState } from "react";
import { saveVisitNotes } from "@/app/actions/appointments";
import { SubmitButton } from "@/components/submit-button";
import { Alert, FieldError, inputClass } from "@/components/ui";

export function NotesForm({ appointmentId, initialNotes }: { appointmentId: string; initialNotes: string }) {
  const [state, action] = useActionState(saveVisitNotes, undefined);

  return (
    <form action={action} className="mt-4 space-y-3">
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <label htmlFor="notes" className="sr-only">
        Visit notes
      </label>
      <textarea
        id="notes"
        name="notes"
        rows={6}
        maxLength={2000}
        defaultValue={initialNotes}
        placeholder="e.g. Reviewed exercises, follow up in 2 weeks."
        className={inputClass}
        aria-invalid={!!state?.fieldErrors?.notes}
        aria-describedby="notes-error"
      />
      <FieldError id="notes-error" messages={state?.fieldErrors?.notes} />
      {state?.success && <Alert tone="success">{state.success}</Alert>}
      <SubmitButton pendingText="Saving…">Save notes</SubmitButton>
    </form>
  );
}
