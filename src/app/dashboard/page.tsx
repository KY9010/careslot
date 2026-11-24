import { redirect } from "next/navigation";
import { homePathFor, requireUser } from "@/lib/dal";

export default async function Dashboard() {
  const user = await requireUser();
  redirect(homePathFor(user.role));
}
