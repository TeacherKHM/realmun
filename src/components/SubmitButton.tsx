"use client";

import { useFormStatus } from "react-dom";

type Props = {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
  title?: string;
  name?: string;
  value?: string;
  /** Botones de estado (asistencia): marca el que ya está elegido. */
  ariaPressed?: boolean;
};

/** Botón de envío con estado de espera, para formularios con server actions. */
export function SubmitButton({
  children,
  className = "btn btn-primary",
  pendingText,
  title,
  name,
  value,
  ariaPressed,
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
      aria-pressed={ariaPressed}
    >
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
