import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";
import { listCommittees } from "@/lib/data";
import { DIRECCION_CODE, SCHOOL_NAME } from "@/lib/committees";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const nextParam = typeof params.next === "string" ? params.next : "";
  const committees = await listCommittees();
  const defaultCommittee =
    typeof params.comite === "string"
      ? params.comite
      : nextParam.startsWith("/comite/")
        ? nextParam.replace("/comite/", "")
        : nextParam.startsWith("/panel")
          ? DIRECCION_CODE
          : undefined;

  return (
    <main className="flex min-h-dvh flex-col bg-paper">
      <header className="flex items-center justify-between border-b border-line px-6 py-4 text-sm text-muted sm:px-10">
        <Link href="/" className="font-display text-2xl text-ink">
          RealMUN
        </Link>
        <p>{SCHOOL_NAME}</p>
      </header>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl rounded-card border border-line bg-paper-warm px-6 py-8 sm:px-9">
          <h1 className="text-3xl">Acceso de encargados</h1>
          <p className="mt-2 text-sm text-muted">
            Cada comité tiene su contraseña y se abre su consola: cronómetro, asistencia,
            sanciones, hojas y rúbrica. La dirección entra con su propia cuenta para ver
            todos los comités.
          </p>

          {committees.length === 0 ? (
            <p className="mt-8 text-sm text-muted">
              No se pudieron cargar los comités. Revisa la conexión con la base de datos.
            </p>
          ) : (
            <LoginForm
              committees={committees}
              defaultCommittee={defaultCommittee}
              next={nextParam}
            />
          )}
        </div>
      </div>
    </main>
  );
}
