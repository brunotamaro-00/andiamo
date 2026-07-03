import { Check, X } from "lucide-react";
import { rowActionBtn } from "./row-action";

interface InlineDeleteConfirmProps {
  label: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** "¿Borrar? ✓ ✗" inline confirmation — replaces the three-panel duplicated pattern. */
export function InlineDeleteConfirm({ label, onConfirm, onCancel }: InlineDeleteConfirmProps) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      {/* Hidden on ultra-narrow screens to avoid horizontal overflow — the
          buttons keep their aria-labels */}
      <span className="hidden min-[360px]:inline text-xs text-danger mr-1 whitespace-nowrap">¿Borrar?</span>
      <button
        onClick={onConfirm}
        aria-label={`Confirmar borrado de "${label}"`}
        className={`${rowActionBtn} text-danger hover:bg-danger-bg`}
      >
        <Check size={16} strokeWidth={2} aria-hidden="true" />
      </button>
      <button
        onClick={onCancel}
        aria-label="Cancelar borrado"
        className={`${rowActionBtn} text-ink-2 hover:bg-surface-2`}
      >
        <X size={16} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}
