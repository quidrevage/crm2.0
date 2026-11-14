import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const OTP_TYPES: EmailOtpType[] = ["invite", "recovery", "email", "signup", "magiclink", "email_change"];

/**
 * Landing point for links in invitation and password-reset e-mails.
 * Exchanges the one-time token for a session, then continues to an internal page.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = searchParams.get("next") ?? "/";
  // Only same-site paths are accepted, so the link cannot be abused as an open redirect.
  const target = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  const supabase = await createClient();
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  let ok = false;
  if (tokenHash && type && OTP_TYPES.includes(type)) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  } else if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  }

  const url = request.nextUrl.clone();
  url.search = "";
  if (ok) {
    url.pathname = target;
  } else {
    url.pathname = "/login";
    url.searchParams.set("reason", "link");
  }
  return NextResponse.redirect(url);
}
