import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import CstClient from "./CstClient";

export default async function EmployeeCstPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return <CstClient />;
}
