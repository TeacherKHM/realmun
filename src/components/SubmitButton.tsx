"use client";

import { useFormStatus } from "react-dom";

type Props = {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
  title?: string;
  name?: string;
  value?: string;
};

/** Botón de envío con estado de espera, para formularios con server actions. */
export function SubmitButton({
  children,
  className = "btn btn-primary",
  pendingText,
  title,
  name,
  value,
}: Props) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      title={title}
      name={name}
      value={value}
    >
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
