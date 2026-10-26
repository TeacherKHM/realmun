"use client";

import { useActionState } from "react";
import {
  setDirectionPassword,
  type DirectionPasswordState,
} from "@/app/actions/direction-password";
import { SubmitButton } from "@/components/SubmitButton";
import type { AdminKeyState } from "@/lib/supabase/admin";

const INITIAL: DirectionPasswordState = { ok: false, message: null };

type Props = {
  /** La página avisa si falta la clave secreta del servidor o no es válida. */
  status: AdminKeyState;
};

/** Cambio de la contraseña propia de la dirección (presidente / encargado general). */
export function DirectionPasswordForm({ status }: Props) {
  const [state, action] = useActionState(setDirectionPassword, INITIAL);
  const available = status === "ok";

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="label">Contraseña actual</span>
        <input
          name="current"
          type="password"
          required
          autoComplete="current-password"
          className="field"
          disabled={!available}
        />
      </label>

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
          <span className="label">Repetir contraseña nueva</span>
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

      <p className="text-xs text-muted">
        Mínimo 10 caracteres. Una frase larga es más fácil de recordar y más difícil de
        adivinar. No se acepta la contraseña de fábrica.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[42ch] text-xs text-muted">
          Al cambiarla se cerrará esta sesión y volverás al acceso de dirección para entrar
          con la contraseña nueva.
        </p>
        <SubmitButton className="btn btn-primary" pendingText="Guardando…" disabled={!available}>
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
