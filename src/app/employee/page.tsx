import { auth } from "@/lib/auth";
import EmployeeDashboardClient from "./EmployeeDashboardClient";

export default async function EmployeeDashboard() {
  const session = await auth();
  const user = session?.user;
  const branchId = user?.branchId;

  const today = new Date().toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <EmployeeDashboardClient
      userName={user?.name || "Agent"}
      todayText={today}
      branchId={branchId}
    />
  );
}
