import { getVapidPublicKey, isWebPushConfigured } from "@/lib/web-push";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    enabled: isWebPushConfigured(),
    publicKey: getVapidPublicKey(),
  });
}
