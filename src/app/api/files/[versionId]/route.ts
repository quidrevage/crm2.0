import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const SIGNED_URL_SECONDS = 60;

/**
 * Opens or downloads one stored file version.
 * Access is checked against the signed-in user (row-level security on the version row and the
 * storage object); the browser then receives a link that expires after one minute.
 * No permanent or public link to a document ever exists.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ versionId: string }> }) {
  const { versionId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(versionId)) return new NextResponse("Not found", { status: 404 });

  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const supabase = await createClient();
  const { data: version } = await supabase
    .from("document_versions")
    .select("storage_path, original_filename, mime_type")
    .eq("id", versionId)
    .maybeSingle();
  if (!version) return new NextResponse("Not found", { status: 404 });

  const inline = request.nextUrl.searchParams.get("inline") === "1";
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(version.storage_path, SIGNED_URL_SECONDS, { download: inline ? false : version.original_filename });
  if (error || !data) return new NextResponse("Not found", { status: 404 });

  const response = NextResponse.redirect(data.signedUrl, 302);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
