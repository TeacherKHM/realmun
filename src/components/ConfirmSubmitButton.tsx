"use client";

import { useFormStatus } from "react-dom";

type Props = {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
  /** Qué se pierde si se confirma; el mensaje va completo, no como pregunta suelta. */
  confirmMessage: string;
};

/**
 * Botón de envío para acciones que borran. Antes de enviar el formulario pide
 * confirmación: en la consola una sesión eliminada se lleva asistencia,
 * sanciones, hojas y evaluaciones.
 */
export function ConfirmSubmitButton({
  children,
  className = "btn btn-danger",
  pendingText,
  confirmMessage,
}: Props) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) event.preventDefault();
      }}
    >
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
