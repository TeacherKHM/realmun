import { RubricEditor } from "@/components/RubricEditor";
import { Empty, NoSession, PageHeader } from "@/components/ui";
import { getRubricMap, listDelegates, resolveConsole } from "@/lib/data";
import { getRubricCriteria, RUBRIC_SCALE } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RubricPage({ params }: PageProps<"/comite/[code]/rubrica">) {
  const { code } = await params;
  const { committee, session } = await resolveConsole(code);

  if (!session) {
    return (
      <>
        <PageHeader title="Rúbrica" description="Evaluación de cada delegado por sesión." />
        <NoSession code={committee.code} />
      </>
    );
  }

  const [delegates, rubric] = await Promise.all([
    listDelegates(committee.id, true),
    getRubricMap(session.id),
  ]);
  const rubricCriteria = getRubricCriteria(committee);

  if (delegates.length === 0) {
    return (
      <>
        <PageHeader title="Rúbrica" description="Evaluación de cada delegado por sesión." />
        <Empty>Agrega delegados antes de evaluarlos.</Empty>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Rúbrica"
        description={`${rubricCriteria.length} criterios, escala ${RUBRIC_SCALE.min} a ${RUBRIC_SCALE.max}, por delegado y sesión (${session.title}).`}
      />
      <RubricEditor committee={committee} session={session} delegates={delegates} rubric={rubric} />
    </>
  );
}
