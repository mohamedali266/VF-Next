import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import SrSkuClient from "./SrSkuClient";

export default async function EmployeeSrSkuPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return <SrSkuClient />;
}
