"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signIn, type LoginState } from "@/app/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";
import { Turnstile } from "@/components/Turnstile";
import { DIRECCION_CODE } from "@/lib/committees";
import type { Committee } from "@/lib/types";

type Props = {
  committees: Committee[];
  defaultCommittee?: string;
  next?: string;
};

export function LoginForm({ committees, defaultCommittee, next = "" }: Props) {
  const [state, action] = useActionState<LoginState, FormData>(signIn, {
    error: null,
    attempt: 0,
  });
  const [selected, setSelected] = useState(defaultCommittee ?? "");
  const isDireccion = selected === DIRECCION_CODE;

  return (
    <form action={action} className="mt-8">
      {/* El comité viaja aparte: React limpia el formulario tras cada intento
          fallido y los radios perderían la selección. */}
      <input type="hidden" name="committee" value={selected} />

      <fieldset key={state.attempt}>
        <legend className="label">Comité</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {committees.map((committee) => (
            <label
              key={committee.id}
              className="flex cursor-pointer items-center gap-3 rounded-control border border-line bg-paper-warm px-3 py-3 text-sm has-checked:border-ink has-checked:bg-white"
            >
              <input
                type="radio"
                name="committee-choice"
                value={committee.code}
                className="size-4 accent-ink"
                checked={selected === committee.code}
                onChange={() => setSelected(committee.code)}
                aria-label={`Acceder como ${committee.sigla}: ${committee.name}`}
              />
              <span aria-hidden className="h-8 w-1" style={{ background: committee.accent }} />
              <span>
                <span className="block font-semibold">{committee.sigla}</span>
                <span className="block text-xs text-muted">{committee.name}</span>
              </span>
            </label>
          ))}
        </div>

        <label className="mt-2 flex cursor-pointer items-center gap-3 rounded-control border border-line bg-paper-warm px-3 py-3 text-sm has-checked:border-ink has-checked:bg-white">
          <input
            type="radio"
            name="committee-choice"
            value={DIRECCION_CODE}
            className="size-4 accent-ink"
            checked={isDireccion}
            onChange={() => setSelected(DIRECCION_CODE)}
            aria-label="Acceder como dirección (presidente o encargado general)"
          />
          <span aria-hidden className="h-8 w-1 bg-ink" />
          <span>
            <span className="block font-semibold">Dirección</span>
            <span className="block text-xs text-muted">
              Presidente o encargado general: ve todos los comités
            </span>
          </span>
        </label>
      </fieldset>

      <div className="mt-6">
        <label className="label" htmlFor="password">
          {isDireccion ? "Contraseña de la dirección" : "Contraseña del comité"}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="field"
        />
      </div>

      <input type="hidden" name="next" value={next} />

      <Turnstile />

      {state.error ? (
        <p role="alert" className="mt-4 rounded-control border border-sanction/40 bg-sanction/5 px-3 py-2 text-sm text-sanction">
          {state.error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <SubmitButton pendingText="Entrando…">
          {isDireccion ? "Entrar como dirección" : "Entrar al comité"}
        </SubmitButton>
        <Link href="/" className="link">
          Volver a la portada
        </Link>
      </div>
    </form>
  );
}
