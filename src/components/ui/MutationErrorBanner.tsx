import { AlertCircle } from "lucide-react";

/** Shared inline error line for optimistic panel mutations. */
export function MutationErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="text-xs text-danger flex items-center gap-1.5 mb-2" role="alert">
      <AlertCircle size={12} strokeWidth={1.5} aria-hidden="true" className="shrink-0" />
      {message}
    </p>
  );
}
