"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { updateStop, deleteStop, moveStop } from "@/app/actions/stops";
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
  nights: number;
  datesFixed: boolean;
  isCandidate: boolean;
  currentOrder: number;
  allStops: StopOption[];
}

function toDateInput(d: Date | null): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
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
  stopId, name, arrivalDate, nights, datesFixed, isCandidate,
  currentOrder, allStops, onClose,
}: Props & { onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [fixedChecked, setFixedChecked] = useState(datesFixed);
  const [candidateChecked, setCandidateChecked] = useState(isCandidate);
  // Default: currently after the stop with order = currentOrder - 1
  const [selectedAfterOrder, setSelectedAfterOrder] = useState(currentOrder - 1);

  function handleSave(formData: FormData) {
    formData.set("datesFixed", fixedChecked ? "true" : "false");
    formData.set("isCandidate", candidateChecked ? "true" : "false");
    startTransition(async () => {
      await updateStop(stopId, formData);
      if (selectedAfterOrder !== currentOrder - 1) {
        await moveStop(stopId, selectedAfterOrder);
      }
      onClose();
    });
  }

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(() => {
      deleteStop(stopId);
    });
  }

  return (
    <Modal title="Editar ciudad" onClose={onClose}>
      <form action={handleSave} className="space-y-3">
        <Field label="Nombre" name="name" defaultValue={name} required />
        <div className="grid grid-cols-[2fr_1fr] gap-2">
          <Field
            label="Llegada"
            name="arrivalDate"
            type="date"
            defaultValue={toDateInput(arrivalDate)}
          />
          <Field
            label="Noches"
            name="nights"
            type="number"
            defaultValue={nights}
            min={0}
          />
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

        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm text-ink-2 cursor-pointer">
            <input
              type="checkbox"
              checked={fixedChecked}
              onChange={(e) => setFixedChecked(e.target.checked)}
              className="rounded border-ink-faint accent-coral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
            />
            Fechas confirmadas
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-2 cursor-pointer">
            <input
              type="checkbox"
              checked={candidateChecked}
              onChange={(e) => setCandidateChecked(e.target.checked)}
              className="rounded border-ink-faint accent-coral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
            />
            Candidata (sin decidir)
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
