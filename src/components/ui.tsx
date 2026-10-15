import Link from "next/link";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="mb-8 border-b border-line pb-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[68ch]">
          <h1 className="text-3xl sm:text-4xl">{title}</h1>
          {description ? <p className="mt-2 text-sm text-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

type PanelProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function Panel({ title, description, actions, children, className = "" }: PanelProps) {
  return (
    <section className={`panel ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line-soft px-5 py-4">
        <div className="max-w-[62ch]">
          <h2 className="text-lg">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

type StatProps = {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "default" | "sanction" | "ok" | "gold";
};

export function Stat({ label, value, hint, tone = "default" }: StatProps) {
  const toneClass =
    tone === "sanction"
      ? "text-sanction"
      : tone === "ok"
        ? "text-ok"
        : tone === "gold"
          ? "text-gold"
          : "text-ink";

  return (
    <div className="border border-line bg-paper-warm px-4 py-3">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className={`mt-1 font-clock text-3xl ${toneClass}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="border border-dashed border-line bg-paper px-4 py-6 text-center text-sm text-muted">
      {children}
    </p>
  );
}

export function NoSession({ code }: { code: string }) {
  return (
    <Empty>
      Este comité todavía no tiene una sesión activa.{" "}
      <Link
        href={`/comite/${code}/sesiones`}
        className="underline decoration-line underline-offset-4"
      >
        Crear o activar una sesión
      </Link>{" "}
      para registrar información.
    </Empty>
  );
}
