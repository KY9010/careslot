import type { Metadata } from "next";
import { ButtonLink, Card, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requirePatient } from "@/lib/dal";
import { paymentsEnabled } from "@/lib/stripe";
import { formatMoney } from "@/lib/time";

export const metadata: Metadata = { title: "Book a visit" };

export default async function BookPage() {
  await requirePatient();
  const clinicians = await prisma.clinician.findMany({
    include: { user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  });

  return (
    <div>
      <PageHeader
        title="Book a visit"
        subtitle={`Choose a clinician to see their open times.${paymentsEnabled ? ` A ${formatMoney(2500)} deposit secures your booking.` : ""}`}
      />
      <div className="grid gap-4 md:grid-cols-3">
        {clinicians.map((c) => (
          <Card key={c.id} className="flex flex-col">
            <div
              className="grid h-12 w-12 place-items-center rounded-full bg-teal-100 font-semibold text-teal-800"
              aria-hidden
            >
              {c.user.name
                .replace("Dr. ", "")
                .split(" ")
                .map((p) => p[0])
                .join("")}
            </div>
            <h2 className="mt-4 font-semibold text-slate-900">{c.user.name}</h2>
            <p className="text-sm font-medium text-teal-700">{c.specialty}</p>
            <p className="mt-2 flex-1 text-sm text-slate-600">{c.bio}</p>
            <ButtonLink href={`/book/${c.id}`} className="mt-5">
              See availability
            </ButtonLink>
          </Card>
        ))}
      </div>
    </div>
  );
}
