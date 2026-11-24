# CareSlot

**A small practice-management app for clinics.** Patients book appointments and pay a deposit; clinicians manage their schedule and record visits.

**Live demo:** https://careslot-red.vercel.app · No sign-up needed: use the **"Try the demo"** buttons on the home page.

> Demo project. Please don't enter real health information. Payments run in Stripe **test mode**: pay with card `4242 4242 4242 4242`, any future expiry date, any CVC.

## Features

|                         |                                                                                                                                                                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Authentication**      | Sign up and log in with email and password (bcrypt-hashed). Sessions are signed JWTs in `HttpOnly`, `SameSite=Lax` cookies.                                                                                                        |
| **Authorization**       | Two roles: patient and clinician. Every page and server action checks the user's role and ownership on the server (`src/lib/dal.ts`).                                                                                              |
| **Booking**             | 30-minute slots, weekdays 9:00–17:00 Toronto time, up to 14 days ahead. Slots are calculated in the clinic's time zone (DST-safe) and stored in UTC.                                                                               |
| **No double-booking**   | A unique `slotKey` column makes PostgreSQL reject a second active booking for the same clinician and time, even when requests race. Covered by an integration test.                                                                |
| **Payments**            | $25 deposit via Stripe Checkout. Payment is confirmed by checking with Stripe (redirect) **and** by a signature-verified webhook; both paths are idempotent. Cancelling refunds the deposit. Unpaid holds expire after 35 minutes. |
| **Clinician workspace** | Schedule grouped by day, "needs an outcome" counter, mark visits completed or no-show, private visit notes.                                                                                                                        |
| **Production basics**   | Zod validation on every form, accessible forms (labels, `aria-invalid`, live error messages), security headers, `/api/health` endpoint, CI on every push.                                                                          |

## Tech stack

- **Frontend:** Next.js 16 (App Router, Server Components, Server Actions), React 19, TypeScript, Tailwind CSS
- **Backend:** Next.js Server Actions and Route Handlers, Zod, jose (JWT), bcryptjs
- **Database:** PostgreSQL with Prisma ORM 7 (migrations and seed data)
- **Payments:** Stripe Checkout, webhooks and refunds (test mode)
- **Quality:** Vitest (unit and database integration tests), ESLint, Prettier, GitHub Actions
- **Hosting:** Vercel, with Neon serverless PostgreSQL

## How a booking works

```
Patient picks a slot ─► Server Action validates input and checks the slot is real
                     ─► INSERT appointment (status PENDING_PAYMENT, unique slotKey)
                          └─ duplicate slotKey? PostgreSQL rejects it → "someone just booked that time"
                     ─► Stripe Checkout session created → patient pays the $25 deposit
                     ─► Stripe redirect + webhook → appointment CONFIRMED (idempotent)
```

## Project structure

```
prisma/              schema, migrations, seed data
src/app/             pages (App Router), server actions, API routes
  actions/           auth and appointment server actions
  api/               health check, Stripe success redirect, Stripe webhook
src/components/      UI components and client-side forms
src/lib/             data access layer, sessions, scheduling and time-zone logic, Stripe
src/proxy.ts         fast redirect to /login for private pages
tests/               database integration tests
```

## Running it locally

Requirements: Node.js 20.9+ and Docker.

```bash
npm install
cp .env.example .env          # then set SESSION_SECRET (see the comment in the file)
npm run db:up                 # start PostgreSQL in Docker
npx prisma migrate dev        # create the tables
npm run db:seed               # add demo clinicians, patients and appointments
npm run dev                   # http://localhost:3000
```

Payments are optional locally: without `STRIPE_SECRET_KEY`, bookings are confirmed without a deposit.

```bash
npm test             # unit + integration tests (needs the database running)
npm run lint
npm run typecheck
```

## What I'd add next

- Rate limiting on login and sign-up
- Email reminders and confirmations
- Clinician availability settings (working hours, time off)
- Audit log of every change to an appointment
- For real patient data: HIPAA/PHIPA-grade hosting, encryption at rest for notes, and access logging
