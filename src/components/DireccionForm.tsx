"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, type LoginState } from "@/app/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";
import { Turnstile } from "@/components/Turnstile";
import { DIRECCION_CODE } from "@/lib/committees";

/** Acceso cerrado de la dirección: una sola contraseña, sin lista de comités. */
export function DireccionForm() {
  const [state, action] = useActionState<LoginState, FormData>(signIn, { error: null });

  return (
    <form action={action} className="mt-8">
      <input type="hidden" name="committee" value={DIRECCION_CODE} />
      <input type="hidden" name="next" value="/panel" />

      <label className="label" htmlFor="password">
        Contraseña de la dirección
      </label>
      <input
        id="password"
        name="password"
        type="password"
        required
        autoComplete="current-password"
        autoFocus
        className="field"
      />

      <Turnstile />

      {state.error ? (
        <p
          role="alert"
          className="mt-5 rounded-control border border-sanction/40 bg-sanction/5 px-3 py-2 text-sm text-sanction"
        >
          {state.error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <SubmitButton pendingText="Entrando…">Entrar al panel</SubmitButton>
        <Link href="/login" className="text-sm text-white/70 underline underline-offset-4 hover:text-white">
          Acceso de comités
        </Link>
      </div>
    </form>
  );
}
