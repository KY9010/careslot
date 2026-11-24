import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth-forms";
import { Card } from "@/components/ui";
import { getCurrentUser, homePathFor } from "@/lib/dal";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect(homePathFor(user.role));

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-2 text-center text-2xl font-semibold">Create your patient account</h1>
      <p className="mb-6 text-center text-sm text-slate-600">Book and manage clinic visits in one place.</p>
      <Card>
        <SignupForm />
      </Card>
    </div>
  );
}
