import { redirect } from "next/navigation";
import { demoLogin } from "@/app/actions/auth";
import { SubmitButton } from "@/components/submit-button";
import { ButtonLink, Card } from "@/components/ui";
import { getCurrentUser, homePathFor } from "@/lib/dal";

const features = [
  {
    title: "Real-time availability",
    text: "Patients see open 30-minute slots for the next two weeks, in clinic time.",
  },
  {
    title: "No double-booking",
    text: "A database constraint guarantees one patient per slot, even under simultaneous requests.",
  },
  { title: "Deposits with Stripe", text: "A $25 deposit secures each visit. Cancelling refunds it automatically." },
  {
    title: "Clinician workspace",
    text: "Clinicians see their day, record visit outcomes and keep private visit notes.",
  },
  {
    title: "Secure sessions",
    text: "Hashed passwords, signed HttpOnly cookies and server-side role checks on every action.",
  },
  {
    title: "Built for production",
    text: "Typed end to end, validated inputs, automated tests, CI, and a health-check endpoint.",
  },
];

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect(homePathFor(user.role));

  return (
    <div className="space-y-16">
      <section className="grid items-center gap-10 md:grid-cols-2">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-teal-700">Practice management, simplified</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Book a clinic visit in under a minute.
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            CareSlot lets patients find an open time, pay a small deposit and manage their visits, while clinicians run
            their day from one simple schedule.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/signup">Create a patient account</ButtonLink>
            <ButtonLink href="/login" variant="secondary">
              Log in
            </ButtonLink>
          </div>
        </div>

        <Card>
          <h2 className="text-lg font-semibold">Try the demo, no sign-up needed</h2>
          <p className="mt-1 text-sm text-slate-600">Jump straight in with a ready-made account.</p>
          <div className="mt-5 space-y-3">
            <form action={demoLogin}>
              <input type="hidden" name="role" value="PATIENT" />
              <SubmitButton className="w-full" pendingText="Opening demo…">
                Continue as a demo patient
              </SubmitButton>
            </form>
            <form action={demoLogin}>
              <input type="hidden" name="role" value="CLINICIAN" />
              <SubmitButton variant="secondary" className="w-full" pendingText="Opening demo…">
                Continue as a demo clinician
              </SubmitButton>
            </form>
          </div>
          <div className="mt-5 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            <p className="font-medium text-slate-800">Paying the test deposit</p>
            <p className="mt-1">
              Use Stripe&apos;s test card <span className="font-mono">4242 4242 4242 4242</span>, any future expiry date
              and any 3-digit CVC.
            </p>
          </div>
        </Card>
      </section>

      <section aria-labelledby="features">
        <h2 id="features" className="text-xl font-semibold">
          What&apos;s inside
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="p-5">
              <h3 className="font-medium text-slate-900">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{f.text}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
