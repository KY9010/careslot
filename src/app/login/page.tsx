import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth-forms";
import { Card } from "@/components/ui";
import { getCurrentUser, homePathFor } from "@/lib/dal";
import { safeNextPath } from "@/lib/validation";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const user = await getCurrentUser();
  if (user) redirect(homePathFor(user.role));
  const { next } = await searchParams;

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-center text-2xl font-semibold">Log in to CareSlot</h1>
      <Card>
        <LoginForm next={safeNextPath(next) ?? undefined} />
      </Card>
    </div>
  );
}
