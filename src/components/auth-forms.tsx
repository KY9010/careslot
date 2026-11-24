"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, signup } from "@/app/actions/auth";
import { SubmitButton } from "@/components/submit-button";
import { Alert, FieldError, inputClass } from "@/components/ui";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(login, undefined);
  const errors = state?.fieldErrors;

  return (
    <form action={action} className="space-y-5" noValidate>
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <label htmlFor="email" className="text-sm font-medium text-slate-800">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state?.values?.email}
          className={inputClass}
          aria-invalid={!!errors?.email}
          aria-describedby="email-error"
        />
        <FieldError id="email-error" messages={errors?.email} />
      </div>
      <div>
        <label htmlFor="password" className="text-sm font-medium text-slate-800">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
          aria-invalid={!!errors?.password}
          aria-describedby="password-error"
        />
        <FieldError id="password-error" messages={errors?.password} />
      </div>
      <SubmitButton className="w-full" pendingText="Logging in…">
        Log in
      </SubmitButton>
      <p className="text-center text-sm text-slate-600">
        New to CareSlot?{" "}
        <Link href="/signup" className="font-medium text-teal-700 underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function SignupForm() {
  const [state, action] = useActionState(signup, undefined);
  const errors = state?.fieldErrors;

  return (
    <form action={action} className="space-y-5" noValidate>
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <div>
        <label htmlFor="name" className="text-sm font-medium text-slate-800">
          Full name
        </label>
        <input
          id="name"
          name="name"
          autoComplete="name"
          required
          defaultValue={state?.values?.name}
          className={inputClass}
          aria-invalid={!!errors?.name}
          aria-describedby="name-error"
        />
        <FieldError id="name-error" messages={errors?.name} />
      </div>
      <div>
        <label htmlFor="email" className="text-sm font-medium text-slate-800">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state?.values?.email}
          className={inputClass}
          aria-invalid={!!errors?.email}
          aria-describedby="email-error"
        />
        <FieldError id="email-error" messages={errors?.email} />
      </div>
      <div>
        <label htmlFor="password" className="text-sm font-medium text-slate-800">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          className={inputClass}
          aria-invalid={!!errors?.password}
          aria-describedby="password-hint password-error"
        />
        <p id="password-hint" className="mt-1 text-xs text-slate-500">
          At least 8 characters, with a letter and a number.
        </p>
        <FieldError id="password-error" messages={errors?.password} />
      </div>
      <SubmitButton className="w-full" pendingText="Creating account…">
        Create account
      </SubmitButton>
      <p className="text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-teal-700 underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
