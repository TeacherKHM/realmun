import { NextResponse } from "next/server";
import { loadTvPayload } from "@/lib/tv";

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const payload = await loadTvPayload(code);

  if (!payload.committee) {
    return NextResponse.json({ error: "Comité no encontrado" }, { status: 404 });
  }

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
