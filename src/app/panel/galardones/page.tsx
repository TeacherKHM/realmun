import { getMunAwards } from "@/app/actions/awards";
import { Empty, PageHeader, Panel } from "@/components/ui";
import { formatScore } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AwardsPage() {
  const awards = await getMunAwards();

  return (
    <>
      <PageHeader
        title="Mejor delegado y mejores posturas"
        description="Vista global para el presidente. Promedio ponderado por criterios de rúbrica en todas las sesiones."
      />

      {!Array.isArray(awards) || awards.length === 0 ? (
        <Empty>Sin evaluaciones de rúbrica para generar el ranking.</Empty>
      ) : (
        <div className="space-y-3">
          {(awards as Array<Record<string, unknown>>).map((row, index) => (
            <Panel
              key={`${row.code as string}-${row.delegate_id as string}`}
              title={`${index + 1}. ${row.delegate_name as string}`}
              description={`${row.delegation ? (row.delegation as string) : "Sin delegación"} · ${row.sigla as string} — ${row.name as string}`}
              actions={
                <span className="font-clock tabular-nums text-3xl">
                  {formatScore(Number(row.promedio))}
                </span>
              }
            >
              <p className="text-sm text-muted">
                {Number(row.evaluaciones)} ítems evaluados en la rúbrica
              </p>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
