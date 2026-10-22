import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeRedirect } from "@/lib/supabase/redirect";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const client = createClient(), hash = request.nextUrl.searchParams.get("token_hash"), type = request.nextUrl.searchParams.get("type");
  let target = "/login?error=invalid_link";
  if (client && hash && (type === "email" || type === "signup" || type === "recovery")) {
    const { error } = await client.auth.verifyOtp({ token_hash: hash, type });
    if (!error) target = type === "recovery" ? "/reset-password" : safeRedirect(request.nextUrl.searchParams.get("next"));
  }
  const response = NextResponse.redirect(new URL(target, request.nextUrl.origin));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
