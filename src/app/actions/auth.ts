"use server";

import { redirect } from "next/navigation";
import { committeeEmail } from "@/lib/committees";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error: string | null };

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const code = String(formData.get("committee") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  if (!code || !password) {
    return { error: "Elige un comité y escribe la contraseña." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: committeeEmail(code),
    password,
  });

  if (error) {
    return { error: "La contraseña no coincide con ese comité." };
  }

  redirect(next.startsWith("/") ? next : `/comite/${code}`);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
