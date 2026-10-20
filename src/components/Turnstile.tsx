"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string;
      remove: (id: string) => void;
      reset: (id?: string) => void;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/**
 * Captcha de Cloudflare Turnstile. Solo aparece si hay `NEXT_PUBLIC_TURNSTILE_SITE_KEY`;
 * sin llave el formulario funciona igual (y Supabase Auth debe tener el captcha apagado).
 * El token viaja como `captchaToken`, que es lo que espera `signInWithPassword`.
 */
export function Turnstile() {
  const [ready, setReady] = useState(false);
  const holder = useRef<HTMLDivElement>(null);
  const token = useRef<HTMLInputElement>(null);
  const widget = useRef<string | null>(null);

  useEffect(() => {
    if (!SITE_KEY || !ready || !holder.current || widget.current || !window.turnstile) return;

    widget.current = window.turnstile.render(holder.current, {
      sitekey: SITE_KEY,
      theme: "light",
      language: "es",
      callback: (value: string) => {
        if (token.current) token.current.value = value;
      },
      "expired-callback": () => {
        if (token.current) token.current.value = "";
      },
      "error-callback": () => {
        if (token.current) token.current.value = "";
      },
    });

    return () => {
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current);
      widget.current = null;
    };
  }, [ready]);

  if (!SITE_KEY) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setReady(true)}
      />
      <div ref={holder} className="mt-5" />
      <input ref={token} type="hidden" name="captchaToken" />
    </>
  );
}
