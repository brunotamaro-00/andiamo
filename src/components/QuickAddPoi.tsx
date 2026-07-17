"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createPoi } from "@/app/actions/pois";
import { haptics } from "@/lib/haptics";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { PoiForm } from "@/components/PoiPanel";

/** "+" en la card de pendientes de /hoy: anotar un lugar del stop actual sin
 *  navegar hasta el detalle. Reusa el PoiForm canónico de PoiPanel. */
export function QuickAddPoi({
  stopId,
  slug,
  stopLat,
  stopLng,
}: {
  stopId: string;
  slug: string;
  stopLat: number;
  stopLng: number;
}) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    formData.set("stopId", stopId);
    formData.set("slug", slug);
    setOpen(false);
    startTransition(async () => {
      try {
        const result = (await createPoi(formData)) as { error?: string } | undefined;
        if (result?.error) {
          haptics.error();
          toast(result.error, "error");
          return;
        }
        haptics.success();
        toast("Punto agregado");
        router.refresh();
      } catch {
        haptics.error();
        toast("No se pudo agregar. Reintentá.", "error");
      }
    });
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Plus size={13} strokeWidth={1.5} aria-hidden="true" />
        Agregar
      </Button>
      {open && (
        <Modal title="Agregar punto de interés" onClose={() => setOpen(false)}>
          <PoiForm
            stopLat={stopLat}
            stopLng={stopLng}
            onSubmit={handleSubmit}
            onClose={() => setOpen(false)}
          />
        </Modal>
      )}
    </>
  );
}
