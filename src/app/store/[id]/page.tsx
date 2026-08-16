import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import StoreClient from "./StoreClient";

export default async function StorePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  return (
    <div className="vf-page" style={{ paddingBottom: "2rem" }}>
      <div style={{ padding: "1.25rem" }}>
        <StoreClient storeId={id} />
      </div>
    </div>
  );
}
