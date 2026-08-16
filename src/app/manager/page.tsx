import { auth } from "@/lib/auth";
import ManagerDashboardClient from "./ManagerDashboardClient";

export default async function ManagerDashboard() {
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
    <ManagerDashboardClient
      userName={user?.name || "Manager"}
      todayText={today}
      branchId={branchId}
    />
  );
}
