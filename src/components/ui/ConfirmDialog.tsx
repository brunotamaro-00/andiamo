"use client";

import { Modal } from "./Modal";
import { Button } from "./Button";

/** Destructive-action confirmation on top of the sheet Modal.
 *  Deletion policy: individual rows keep InlineDeleteConfirm (faster);
 *  entities with children / expensive-to-recreate data use this dialog. */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Sí, borrar",
  busy = false,
  error,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose} locked={busy}>
      <p className="text-sm text-ink-2">{message}</p>
      {error && (
        <p className="text-xs text-danger font-medium" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          className="flex-1"
          onClick={onClose}
          disabled={busy}
          autoFocus
        >
          Cancelar
        </Button>
        <Button
          type="button"
          variant="danger"
          className="flex-1"
          onClick={onConfirm}
          loading={busy}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
