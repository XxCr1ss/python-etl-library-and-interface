import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeRedirect } from "@/lib/supabase/redirect";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const client = createClient(), code = request.nextUrl.searchParams.get("code");
  let target = "/login?error=invalid_link";
  if (client && code) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) target = safeRedirect(request.nextUrl.searchParams.get("next"));
  }
  const response = NextResponse.redirect(new URL(target, request.nextUrl.origin));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
