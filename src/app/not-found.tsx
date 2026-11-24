import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-sm font-medium text-teal-700">404</p>
      <h1 className="mt-2 text-2xl font-semibold">We couldn&apos;t find that page</h1>
      <p className="mt-2 text-slate-600">It may have moved, or you may not have access to it.</p>
      <ButtonLink href="/" className="mt-6">
        Back to CareSlot
      </ButtonLink>
    </div>
  );
}
