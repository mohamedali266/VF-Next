import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();
  if (!session) redirect("/login");
  const role = session.user.role;
  if (role === "ADMIN") redirect("/admin");
  if (role === "MANAGER" || role === "TEAM_LEADER") redirect("/manager");
  redirect("/employee");
}
