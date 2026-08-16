import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import StoreClient from "./StoreClient";

export default async function StorePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  return <StoreClient storeId={id} />;
}
