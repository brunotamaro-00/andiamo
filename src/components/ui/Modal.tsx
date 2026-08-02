"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, X } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useDragControls,
  useReducedMotion,
} from "motion/react";
import { IconButton } from "./IconButton";
import { springSheet } from "@/lib/motion";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/* Hydration flag: false on the server snapshot, true on the client */
const subscribeNoop = () => () => {};
const getTrue = () => true;
const getFalse = () => false;

/* Bottom-sheet below the sm breakpoint, centered dialog above it */
const SHEET_QUERY = "(max-width: 639px)";
function subscribeSheet(cb: () => void) {
  const mq = window.matchMedia(SHEET_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/* Scroll lock, reference-counted across nested modals.
 *
 * The lock used to be per-instance and its cleanup released unconditionally.
 * EditStopPanel mounts ConfirmDialog (a second Modal) *inside* the still-open
 * edit sheet, so cancelling the delete handed scrolling and interactivity back
 * to the page behind a sheet that was still covering it. */
let scrollLockDepth = 0;
let restoreScrollY = 0;

/** Open modals, innermost last — so only the top one answers Escape. */
const modalStack: string[] = [];

function acquireScrollLock(): () => void {
  const scrollRoot = document.getElementById("scroll-root");
  if (!scrollRoot) return () => {};

  if (scrollLockDepth === 0) {
    restoreScrollY = scrollRoot.scrollTop;
    scrollRoot.style.overflow = "hidden";
    scrollRoot.setAttribute("inert", "");
  }
  scrollLockDepth += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    scrollLockDepth -= 1;
    if (scrollLockDepth > 0) return;
    scrollRoot.style.overflow = "";
    scrollRoot.scrollTop = restoreScrollY;
    scrollRoot.removeAttribute("inert");
  };
}

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Blocks every close path (drag, Escape, backdrop, X) while a mutation is in flight. */
  locked?: boolean;
  /** When set, the header grows a back chevron — for sheets that swap their body
   *  between steps (city form ⇄ position picker) instead of stacking a second modal. */
  onBack?: () => void;
}

export function Modal({ title, onClose, children, locked = false, onBack }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  // Consumers mount/unmount the modal conditionally; the internal flag lets the
  // exit animation finish before onClose() unmounts us (AnimatePresence).
  const [open, setOpen] = useState(true);
  const dragControls = useDragControls();
  const reduced = useReducedMotion();
  // Portal requires the DOM — only mount client-side
  const mounted = useSyncExternalStore(subscribeNoop, getTrue, getFalse);
  const isSheet = useSyncExternalStore(
    subscribeSheet,
    () => window.matchMedia(SHEET_QUERY).matches,
    () => false,
  );

  const lockedRef = useRef(locked);
  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);

  function requestClose() {
    if (lockedRef.current) return;
    setOpen(false);
  }

  /* Restore focus to the element that opened the modal */
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    return () => { opener?.focus(); };
  }, []);

  /* Focus first focusable element + iOS-safe scroll-lock + inert background.
     Safe to inert #scroll-root because the modal is rendered outside it via portal. */
  useEffect(() => {
    const panel = panelRef.current;
    if (panel) {
      // Honor autoFocus first; otherwise focus the body's first focusable —
      // the panel-wide query would land on the header's close button.
      const target =
        panel.querySelector<HTMLElement>("[autofocus]") ??
        bodyRef.current?.querySelector<HTMLElement>(FOCUSABLE) ??
        panel.querySelector<HTMLElement>(FOCUSABLE);
      target?.focus();
    }
    const releaseLock = acquireScrollLock();
    modalStack.push(titleId);
    return () => {
      releaseLock();
      const at = modalStack.lastIndexOf(titleId);
      if (at !== -1) modalStack.splice(at, 1);
    };
  }, [titleId]);

  /* Escape to close + focus trap */
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        // Both instances of a nested pair listen on `document`, so one Escape
        // used to close the ConfirmDialog *and* the sheet behind it.
        if (modalStack.at(-1) !== titleId) return;
        requestClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const elements = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (elements.length === 0) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [titleId]);

  const content = (
    <AnimatePresence onExitComplete={onClose}>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={reduced ? { duration: 0 } : { duration: 0.18 }}
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm px-4 pt-4 pb-0 sm:p-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) requestClose(); }}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={isSheet ? { y: "100%" } : { opacity: 0, scale: 0.96, y: 8 }}
            animate={isSheet ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isSheet ? { y: "100%" } : { opacity: 0, scale: 0.97, y: 8 }}
            transition={reduced ? { duration: 0 } : springSheet}
            // Drag-to-dismiss: mobile sheet only. The drag listens on the
            // handle+header zone (dragControls), never the scrollable body.
            drag={isSheet && !locked ? "y" : false}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.55 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 700) requestClose();
            }}
            className="w-full max-w-sm bg-surface rounded-t-2xl sm:rounded-2xl border border-b-0 sm:border-b border-border max-h-[92dvh] flex flex-col"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Drag zone: handle + header (mobile) */}
            <div
              className="shrink-0 sm:touch-auto touch-none"
              onPointerDown={(e) => {
                if (isSheet && !locked) dragControls.start(e);
              }}
            >
              <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden="true">
                <div className="h-1 w-10 rounded-full bg-border-strong" />
              </div>
              <div className="flex items-center justify-between px-5 pt-3 sm:pt-5 pb-4 border-b border-border">
                <div className="flex items-center gap-1 min-w-0">
                  {onBack && (
                    <IconButton
                      label="Volver"
                      icon={ChevronLeft}
                      onClick={onBack}
                      disabled={locked}
                      className="-ml-3 shrink-0"
                    />
                  )}
                  <h3 id={titleId} className="font-display text-title uppercase tracking-wide text-ink leading-none truncate">
                    {title}
                  </h3>
                </div>
                <IconButton label="Cerrar" icon={X} onClick={requestClose} />
              </div>
            </div>
            {/* Scrollable body */}
            <div ref={bodyRef} className="px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4 overflow-y-auto overscroll-contain space-y-4 flex-1">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Render into #modal-root (outside #scroll-root and body flex flow)
  // so inert on #scroll-root doesn't block modal interaction.
  if (!mounted) return null;
  const portalTarget = document.getElementById("modal-root") ?? document.body;
  return createPortal(content, portalTarget);
}
