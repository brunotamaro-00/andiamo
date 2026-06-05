"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { IconButton } from "./IconButton";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  // Portal requires the DOM — only mount client-side
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
      const first = panel.querySelector<HTMLElement>(FOCUSABLE);
      first?.focus();
    }
    const scrollRoot = document.getElementById("scroll-root");
    if (scrollRoot) {
      const scrollY = scrollRoot.scrollTop;
      scrollRoot.style.overflow = "hidden";
      scrollRoot.setAttribute("inert", "");
      return () => {
        scrollRoot.style.overflow = "";
        scrollRoot.scrollTop = scrollY;
        scrollRoot.removeAttribute("inert");
      };
    }
  }, []);

  /* Escape to close + focus trap */
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); return; }
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
  }, [onClose]);

  const content = (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-fade-in"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-sm bg-surface rounded-[6px] border-2 border-border max-h-[90vh] flex flex-col animate-slide-up"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Fixed header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border shrink-0">
          <h3 id={titleId} className="font-display text-[15px] uppercase tracking-wide text-ink leading-none">
            {title}
          </h3>
          <IconButton label="Cerrar" icon={X} onClick={onClose} />
        </div>
        {/* Scrollable body */}
        <div className="px-5 py-4 overflow-y-auto overscroll-contain space-y-4 flex-1">
          {children}
        </div>
      </div>
    </div>
  );

  // Render into #modal-root (outside #scroll-root and body flex flow)
  // so inert on #scroll-root doesn't block modal interaction.
  if (!mounted) return null;
  const portalTarget = document.getElementById("modal-root") ?? document.body;
  return createPortal(content, portalTarget);
}
