import { notFound } from "next/navigation";
import { TvBoard } from "@/components/TvBoard";
import { loadTvPayload } from "@/lib/tv";

export const dynamic = "force-dynamic";

export default async function TvPage({ params }: PageProps<"/vista-tv/[code]">) {
  const { code } = await params;
  const payload = await loadTvPayload(code);

  if (!payload.committee) notFound();

  return <TvBoard code={code} initial={payload} />;
}
