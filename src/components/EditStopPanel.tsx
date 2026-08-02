"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { updateStop, deleteStop } from "@/app/actions/stops";
import { haptics } from "@/lib/haptics";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";
import { NightsStepper } from "@/components/ui/NightsStepper";
import { ToggleRow } from "@/components/ui/ToggleRow";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  ItineraryPositionPicker,
  PositionField,
  PositionPickerFooter,
} from "@/components/ItineraryPositionPicker";
import {
  afterOrderForSlot,
  currentSlotIndex,
  type SpineStop,
} from "@/lib/itinerary-slots";

interface Props {
  stopId: string;
  slug: string;
  name: string;
  countryFlag: string;
  nights: number;
  isCandidate: boolean;
  /** Pseudo-cities (Pititas) run in parallel to the sequence — excluded from
   *  `recalculateItinerary`, so they must not move the preview's cursor. */
  isLocal?: boolean;
  currentOrder: number;
  /** The itinerary spine WITHOUT this stop. */
  allStops: SpineStop[];
  tripStartStr: string | null;
}

export function EditStopPanel(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton
        label="Editar ciudad"
        icon={Pencil}
        iconSize={15}
        variant="quiet"
        onClick={() => setOpen(true)}
      />
      {open && <EditModal {...props} onClose={() => setOpen(false)} />}
    </>
  );
}

function EditModal({
  stopId, name, countryFlag, nights: initialNights, isCandidate, isLocal,
  currentOrder, allStops, tripStartStr, onClose,
}: Props & { onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [candidateChecked, setCandidateChecked] = useState(isCandidate);
  const [nights, setNights] = useState(initialNights);
  const [editedName, setEditedName] = useState(name);
  // The gap this stop already occupies. Preselecting it retires the old
  // "Mantener posición actual" sentinel: leave it alone and nothing moves.
  const homeSlot = currentSlotIndex(allStops, currentOrder);
  const [slot, setSlot] = useState(homeSlot);

  const moving = {
    name: editedName,
    countryFlag,
    nights,
    isCandidate: candidateChecked,
    countsTowardCursor: !isLocal,
  };

  function handleSave(formData: FormData) {
    formData.set("isCandidate", candidateChecked ? "true" : "false");
    setMutationError(null);
    startTransition(async () => {
      try {
        const afterOrder =
          slot === homeSlot ? undefined : afterOrderForSlot(allStops, slot);
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

  if (showPicker) {
    return (
      <Modal
        title="Posición"
        onClose={onClose}
        onBack={() => setShowPicker(false)}
        locked={isPending}
      >
        <ItineraryPositionPicker
          spine={allStops}
          moving={moving}
          slot={slot}
          onChange={setSlot}
          tripStartStr={tripStartStr}
        />
        <PositionPickerFooter onDone={() => setShowPicker(false)} />
      </Modal>
    );
  }

  return (
    <Modal title="Editar ciudad" onClose={onClose} locked={isPending}>
      <form action={handleSave} className="space-y-3">
        <Field
          label="Nombre"
          name="name"
          value={editedName}
          onChange={(e) => setEditedName(e.target.value)}
          required
        />

        <NightsStepper value={nights} onChange={setNights} />

        {/* No "Llegada" field: the date is derived from tripStartDate + order +
            nights and can't be typed. It now shows where it belongs — inside
            the position picker, as the consequence of the position. */}
        <PositionField
          spine={allStops}
          moving={moving}
          slot={slot}
          tripStartStr={tripStartStr}
          onOpen={() => setShowPicker(true)}
        />

        <ToggleRow
          label="Tentativa (sin decidir)"
          hint="Recibe fechas pero no corre al resto del viaje."
          checked={candidateChecked}
          onChange={setCandidateChecked}
        />

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
