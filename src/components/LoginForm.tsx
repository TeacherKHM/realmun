"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, type LoginState } from "@/app/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";
import type { Committee } from "@/lib/types";

type Props = {
  committees: Committee[];
  defaultCommittee?: string;
  next?: string;
};

export function LoginForm({ committees, defaultCommittee, next = "" }: Props) {
  const [state, action] = useActionState<LoginState, FormData>(signIn, { error: null });

  return (
    <form action={action} className="mt-8">
      <fieldset>
        <legend className="label">Comité</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {committees.map((committee) => (
            <label
              key={committee.id}
              className="flex cursor-pointer items-center gap-3 border border-line bg-paper-warm px-3 py-3 text-sm has-checked:border-ink has-checked:bg-white"
            >
              <input
                type="radio"
                name="committee"
                value={committee.code}
                defaultChecked={defaultCommittee === committee.code}
                required
                className="size-4 accent-ink"
              />
              <span aria-hidden className="h-8 w-1" style={{ background: committee.accent }} />
              <span>
                <span className="block font-semibold">{committee.sigla}</span>
                <span className="block text-xs text-muted">{committee.name}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-6">
        <label className="label" htmlFor="password">
          Contraseña del comité
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

      {state.error ? (
        <p role="alert" className="mt-4 border border-sanction/40 bg-sanction/5 px-3 py-2 text-sm text-sanction">
          {state.error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <SubmitButton pendingText="Entrando…">Entrar al comité</SubmitButton>
        <Link href="/" className="text-sm text-muted underline decoration-line underline-offset-4">
          Volver a la portada
        </Link>
      </div>
    </form>
  );
}
