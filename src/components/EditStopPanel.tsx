"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { updateStop, deleteStop } from "@/app/actions/stops";
import { haptics } from "@/lib/haptics";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, SelectField } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface StopOption {
  id: string;
  name: string;
  order: number;
  countryFlag: string;
}

interface Props {
  stopId: string;
  slug: string;
  name: string;
  arrivalDate: Date | null;
  departureDate: Date | null;
  nights: number;
  isCandidate: boolean;
  currentOrder: number;
  allStops: StopOption[];
}

function formatDateDisplay(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function EditStopPanel(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton
        label="Editar ciudad"
        icon={Pencil}
        iconSize={15}
        onClick={() => setOpen(true)}
      />
      {open && <EditModal {...props} onClose={() => setOpen(false)} />}
    </>
  );
}

function EditModal({
  stopId, name, arrivalDate, departureDate, nights, isCandidate,
  allStops, onClose,
}: Props & { onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [candidateChecked, setCandidateChecked] = useState(isCandidate);
  // "keep" sentinel: allStops has order gaps (excludes this stop and flex margins),
  // so currentOrder - 1 may not match any rendered option
  const [selectedAfterOrder, setSelectedAfterOrder] = useState("keep");

  function handleSave(formData: FormData) {
    formData.set("isCandidate", candidateChecked ? "true" : "false");
    setMutationError(null);
    startTransition(async () => {
      try {
        const afterOrder =
          selectedAfterOrder === "keep" ? undefined : parseInt(selectedAfterOrder, 10);
        const result = await updateStop(stopId, formData, afterOrder);
        if (result?.error) { setMutationError(result.error); return; }
        haptics.success();
        toast("Ciudad actualizada");
        onClose();
      } catch {
        haptics.error();
        setMutationError("Ocurrió un error al guardar. Intentá de nuevo.");
      }
    });
  }

  function handleDelete() {
    setMutationError(null);
    haptics.warning();
    startTransition(async () => {
      try {
        await deleteStop(stopId);
      } catch {
        haptics.error();
        setMutationError("No se pudo borrar la ciudad. Intentá de nuevo.");
        setConfirmDelete(false);
      }
    });
  }

  return (
    <Modal title="Editar ciudad" onClose={onClose}>
      <form action={handleSave} className="space-y-3">
        <Field label="Nombre" name="name" defaultValue={name} required />

        <Field
          label="Noches"
          name="nights"
          type="number"
          inputMode="numeric"
          defaultValue={nights}
          min={0}
        />

        {/* Arrival — always calculated from trip start + nights + order */}
        <div className="rounded-lg border border-border bg-surface-2 px-3 py-2.5">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3 leading-none mb-1">
            Llegada
          </p>
          <p className="text-sm text-ink">
            {formatDateDisplay(arrivalDate)}
            {departureDate && (
              <span className="text-ink-3"> → {formatDateDisplay(departureDate)}</span>
            )}
            <span className="ml-1.5 text-xs text-ink-3">· calculada</span>
          </p>
        </div>

        <SelectField
          label="Posición en itinerario"
          name="afterOrder"
          value={selectedAfterOrder}
          onChange={(e) => setSelectedAfterOrder(e.target.value)}
        >
          <option value="keep">Mantener posición actual</option>
          <option value="0">Al principio</option>
          {allStops.map((s) => (
            <option key={s.id} value={String(s.order)}>
              Después de {s.name}
            </option>
          ))}
        </SelectField>

        <label className="flex items-center gap-2 text-sm text-ink-2 cursor-pointer">
          <input
            type="checkbox"
            checked={candidateChecked}
            onChange={(e) => setCandidateChecked(e.target.checked)}
            className="rounded border-ink-faint accent-brick focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick"
          />
          Tentativa (sin decidir)
        </label>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
            loading={isPending}
          >
            {isPending ? "Guardando..." : "Guardar"}
          </Button>
        </div>
        {mutationError && (
          <p className="text-xs text-danger font-medium" role="alert">{mutationError}</p>
        )}
      </form>

      {/* Danger zone — the confirmation runs in its own dialog: the stop
          carries notas y documentos, so it follows the ConfirmDialog
          policy (entity with children) instead of the inline row confirm. */}
      <div className="border-t border-border pt-3">
        <Button
          type="button"
          variant="danger"
          className="w-full"
          onClick={() => setConfirmDelete(true)}
        >
          Borrar ciudad
        </Button>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Borrar ciudad"
          message={`¿Borrar "${name}" y todas sus notas y documentos? Esta acción no se puede deshacer.`}
          busy={isPending}
          error={mutationError}
          onConfirm={handleDelete}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </Modal>
  );
}
