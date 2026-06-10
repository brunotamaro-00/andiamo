"use client";

import { useState, useTransition } from "react";
import { Pencil, Pin } from "lucide-react";
import { updateStop, deleteStop } from "@/app/actions/stops";
import { haptics } from "@/lib/haptics";
import { dateToStr } from "@/lib/trip";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, SelectField } from "@/components/ui/Field";

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
  datesFixed: boolean;
  isCandidate: boolean;
  isTransit: boolean;
  arrivalMode: "flight" | "ground";
  currentOrder: number;
  allStops: StopOption[];
}

function toDateInput(d: Date | null): string {
  if (!d) return "";
  return dateToStr(new Date(d));
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
  stopId, name, arrivalDate, departureDate, nights, datesFixed, isCandidate, isTransit, arrivalMode,
  currentOrder, allStops, onClose,
}: Props & { onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [pinnedChecked, setPinnedChecked] = useState(datesFixed);
  const [candidateChecked, setCandidateChecked] = useState(isCandidate);
  const [transitChecked, setTransitChecked] = useState(isTransit);
  const [modeValue, setModeValue] = useState<"flight" | "ground">(arrivalMode);
  const [selectedAfterOrder, setSelectedAfterOrder] = useState(currentOrder - 1);

  function handleSave(formData: FormData) {
    formData.set("datesFixed", pinnedChecked ? "true" : "false");
    formData.set("isCandidate", candidateChecked ? "true" : "false");
    formData.set("isTransit", transitChecked ? "true" : "false");
    formData.set("arrivalMode", modeValue);
    // When not pinned, ensure arrivalDate is not sent so the action clears it
    if (!pinnedChecked) formData.delete("arrivalDate");
    setMutationError(null);
    startTransition(async () => {
      try {
        const afterOrder =
          selectedAfterOrder !== currentOrder - 1 ? selectedAfterOrder : undefined;
        const result = await updateStop(stopId, formData, afterOrder);
        if (result?.error) { setMutationError(result.error); return; }
        haptics.success();
        onClose();
      } catch {
        haptics.error();
        setMutationError("Ocurrió un error al guardar. Intentá de nuevo.");
      }
    });
  }

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setMutationError(null);
    haptics.warning();
    startTransition(async () => {
      try {
        await deleteStop(stopId);
      } catch {
        haptics.error();
        setMutationError("No se pudo borrar la ciudad. Intentá de nuevo.");
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
          defaultValue={nights}
          min={0}
        />

        {/* Arrival date — read-only display when not pinned; editable input when pinned */}
        <div className="rounded-[4px] border border-border bg-surface-2 px-3 py-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3 leading-none mb-1">
                Llegada
              </p>
              {!pinnedChecked && (
                <p className="text-sm text-ink">
                  {formatDateDisplay(arrivalDate)}
                  {departureDate && (
                    <span className="text-ink-3"> → {formatDateDisplay(departureDate)}</span>
                  )}
                  <span className="ml-1.5 text-xs text-ink-3">· calculada</span>
                </p>
              )}
            </div>
            <label className="flex items-center gap-1.5 text-xs text-ink-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={pinnedChecked}
                onChange={(e) => setPinnedChecked(e.target.checked)}
                className="rounded border-ink-faint accent-brick focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick"
              />
              <Pin size={11} strokeWidth={2} aria-hidden="true" />
              Fijar fecha
            </label>
          </div>
          {pinnedChecked && (
            <Field
              label=""
              name="arrivalDate"
              type="date"
              defaultValue={toDateInput(arrivalDate)}
            />
          )}
        </div>

        <SelectField
          label="Posición en itinerario"
          name="afterOrder"
          value={String(selectedAfterOrder)}
          onChange={(e) => setSelectedAfterOrder(parseInt(e.target.value))}
        >
          <option value="0">Al principio</option>
          {allStops.map((s) => (
            <option key={s.id} value={String(s.order)}>
              Después de {s.countryFlag} {s.name}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="Cómo llegás"
          name="arrivalMode"
          value={modeValue}
          onChange={(e) => setModeValue(e.target.value as "flight" | "ground")}
        >
          <option value="ground">Auto / Tren</option>
          <option value="flight">Avión</option>
        </SelectField>

        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm text-ink-2 cursor-pointer">
            <input
              type="checkbox"
              checked={candidateChecked}
              onChange={(e) => setCandidateChecked(e.target.checked)}
              className="rounded border-ink-faint accent-brick focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick"
            />
            Candidata (sin decidir)
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-2 cursor-pointer">
            <input
              type="checkbox"
              checked={transitChecked}
              onChange={(e) => setTransitChecked(e.target.checked)}
              className="rounded border-ink-faint accent-brick focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick"
            />
            Tránsito (solo de paso)
          </label>
        </div>

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
            disabled={isPending}
          >
            {isPending ? "Guardando..." : "Guardar"}
          </Button>
        </div>
        {mutationError && (
          <p className="text-xs text-danger font-medium" role="alert">{mutationError}</p>
        )}
      </form>

      {/* Danger zone */}
      <div className="border-t border-border pt-3">
        {confirmDelete ? (
          <div className="space-y-2">
            <p className="text-sm text-danger">
              ¿Borrar &ldquo;{name}&rdquo; y todos sus POIs, notas y documentos?
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setConfirmDelete(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="danger"
                className="flex-1"
                onClick={handleDelete}
                disabled={isPending}
              >
                {isPending ? "Borrando..." : "Sí, borrar"}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="danger"
            className="w-full"
            onClick={handleDelete}
          >
            Borrar ciudad
          </Button>
        )}
      </div>
    </Modal>
  );
}
