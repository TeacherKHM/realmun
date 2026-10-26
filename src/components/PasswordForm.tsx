"use client";

import { useActionState } from "react";
import { setCommitteePassword, type PasswordState } from "@/app/actions/committees";
import { SubmitButton } from "@/components/SubmitButton";
import type { AdminKeyState } from "@/lib/supabase/admin";

const INITIAL: PasswordState = { ok: false, message: null };

type Props = {
  code: string;
  sigla: string;
  /** La página avisa si falta la clave secreta del servidor o no es válida. */
  status: AdminKeyState;
};

/** Cambio de la contraseña compartida de un comité (solo dirección). */
export function PasswordForm({ code, sigla, status }: Props) {
  const [state, action] = useActionState(setCommitteePassword.bind(null, code), INITIAL);
  const available = status === "ok";

  return (
    <form action={action} className="space-y-3 border-t border-line-soft pt-4">
      <div>
        <p className="text-sm font-semibold">Contraseña del comité</p>
        <p className="mt-1 text-xs text-muted">
          Se comparte con los delegados de {sigla}. Al cambiarla, las sesiones abiertas de
          ese comité se cerrarán y habrá que entrar con la nueva.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">Nueva contraseña</span>
          <input
            name="password"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            className="field"
            disabled={!available}
          />
        </label>
        <label className="block">
          <span className="label">Repetir contraseña</span>
          <input
            name="confirm"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            className="field"
            disabled={!available}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">Mínimo 10 caracteres.</p>
        <SubmitButton className="btn btn-quiet" pendingText="Guardando…" disabled={!available}>
          Cambiar contraseña
        </SubmitButton>
      </div>

      {status === "missing" ? (
        <p className="text-sm text-muted">Desactivado: falta la clave secreta del servidor.</p>
      ) : null}

      {status === "invalid" ? (
        <p className="text-sm text-muted">Desactivado: la clave secreta del servidor no es válida.</p>
      ) : null}

      {state.message ? (
        <p
          role={state.ok ? "status" : "alert"}
          className={`text-sm ${state.ok ? "text-ok" : "text-sanction"}`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
