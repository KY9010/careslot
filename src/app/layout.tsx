import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { logout } from "@/app/actions/auth";
import { SubmitButton } from "@/components/submit-button";
import { buttonClass } from "@/components/ui";
import { getCurrentUser } from "@/lib/dal";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "CareSlot: book clinic appointments", template: "%s · CareSlot" },
  description:
    "CareSlot is a demo practice-management app: patients book and pay for clinic appointments, clinicians manage their schedule.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:rounded focus:bg-white focus:p-2"
        >
          Skip to content
        </a>
        <div className="bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
          Demo project: please don&apos;t enter real health information. Payments use Stripe test mode (no real money).
        </div>
        <header className="border-b border-slate-200 bg-white">
          <nav
            aria-label="Main"
            className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3"
          >
            <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-teal-800">
              <span aria-hidden className="grid h-8 w-8 place-items-center rounded-lg bg-teal-700 text-sm text-white">
                CS
              </span>
              CareSlot
            </Link>
            {user ? (
              <div className="flex flex-wrap items-center gap-1">
                {user.role === "PATIENT" ? (
                  <>
                    <Link href="/book" className={buttonClass("ghost")}>
                      Book
                    </Link>
                    <Link href="/appointments" className={buttonClass("ghost")}>
                      My appointments
                    </Link>
                  </>
                ) : (
                  <Link href="/schedule" className={buttonClass("ghost")}>
                    My schedule
                  </Link>
                )}
                <span className="hidden px-2 text-sm text-slate-500 sm:inline">
                  {user.name} · {user.role === "CLINICIAN" ? "Clinician" : "Patient"}
                </span>
                <form action={logout}>
                  <SubmitButton variant="secondary" pendingText="Signing out…">
                    Sign out
                  </SubmitButton>
                </form>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className={buttonClass("ghost")}>
                  Log in
                </Link>
                <Link href="/signup" className={buttonClass("primary")}>
                  Sign up
                </Link>
              </div>
            )}
          </nav>
        </header>
        <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
          {children}
        </main>
        <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500">
          CareSlot · Built with Next.js, TypeScript, PostgreSQL, Prisma and Stripe ·{" "}
          <a className="underline hover:text-slate-700" href="https://github.com/KY9010/careslot">
            Source code
          </a>
        </footer>
      </body>
    </html>
  );
}
