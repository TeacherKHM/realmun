import { DirectionPasswordForm } from "@/components/DirectionPasswordForm";
import { PageHeader, Panel } from "@/components/ui";
import { requireDireccion } from "@/lib/auth";
import { adminKeyStatus } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function PanelSecurityPage() {
  const { email } = await requireDireccion();
  const keyStatus = await adminKeyStatus();

  return (
    <>
      <PageHeader
        title="Seguridad"
        description="Cambia la contraseña de la cuenta de dirección sin salir del panel. Se pide la contraseña actual para confirmar que eres tú."
      />

      {keyStatus !== "ok" ? (
        <p
          role="alert"
          className="mb-5 rounded-control border border-sanction/40 bg-sanction/5 px-4 py-3 text-sm text-sanction"
        >
          {keyStatus === "missing"
            ? "El cambio de contraseña está desactivado: falta SUPABASE_SECRET_KEY en el servidor."
            : "El cambio de contraseña está desactivado: la clave secreta del servidor no es válida."}{" "}
          El resto del panel funciona con normalidad.
        </p>
      ) : null}

      <Panel
        title="Contraseña de la dirección"
        description={`Cuenta ${email ?? "direccion@realmun.mx"}. La contraseña no se guarda en el repositorio.`}
        className="max-w-2xl"
      >
        <DirectionPasswordForm status={keyStatus} />
      </Panel>

      <p className="mt-4 max-w-[68ch] text-xs text-muted">
        Si no recuerdas la contraseña actual, se puede restablecer desde el dashboard de
        Supabase (Authentication → Users) o por el Admin API. La contraseña de fábrica ya no
        está permitida.
      </p>
    </>
  );
}
