"use client";

import { useState, useSyncExternalStore } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

/**
 * Presentación de una sola vez para el deploy público. El banner avisa que los
 * datos son inventados; esto contesta la pregunta que sigue — qué es esto, con
 * qué está hecho y por qué hay dos apps.
 *
 * Solo se monta bajo IS_DEMO (ver layout.tsx). El flag de "ya lo vi" vive en
 * localStorage y se lee recién cuando hidratamos (mismo patrón que `Modal` para
 * el portal): leerlo en el snapshot del server desincroniza la hidratación, y
 * hacerlo en un efecto mete un render de más con el modal ya pintado.
 */
const SEEN_KEY = "andiamo_demo_intro_v1";

const subscribeNoop = () => () => {};
const getTrue = () => true;
const getFalse = () => false;

function alreadySeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    // Safari en modo privado tira al tocar localStorage. Sin memoria preferimos
    // mostrarlo: es una presentación, no un consentimiento.
    return false;
  }
}

export function DemoIntro() {
  const hydrated = useSyncExternalStore(subscribeNoop, getTrue, getFalse);
  const [dismissed, setDismissed] = useState(false);

  function dismiss() {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* idem */
    }
    setDismissed(true);
  }

  if (!hydrated || dismissed || alreadySeen()) return null;

  return (
    <Modal title="Andiamo · demo pública" onClose={dismiss}>
      <p className="text-sm text-ink-2 leading-relaxed">
        App de itinerario de viaje que construí y uso en producción. Next.js 16 · React 19 ·
        Prisma 7 · PostgreSQL · PWA con soporte offline.
      </p>
      <p className="text-sm text-ink-2 leading-relaxed">
        <strong className="text-ink">Todos los datos que ves son inventados</strong> y se
        regeneran cada noche. Podés editar, agregar y borrar lo que quieras.
      </p>
      <p className="text-sm text-ink-2 leading-relaxed">
        Se integra en vivo con <strong className="text-ink">Spitwise</strong>, mi app de gastos:
        el gasto de cada ciudad que ves acá sale de su API. El link está arriba, en la barra.
      </p>
      {/* Único foco del diálogo. Con un link acá adentro, el foco inicial caía
          ahí (React 19 no emite el atributo `autofocus`, así que el fallback de
          Modal agarra el primer focusable) y un Enter se llevaba al visitante a
          la otra app en vez de cerrar. El cross-link vive en el banner, que
          además queda visible siempre. */}
      <Button onClick={dismiss} className="w-full">
        Entrar a la demo
      </Button>
    </Modal>
  );
}
