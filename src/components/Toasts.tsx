import type { Toast } from "../hooks/useGame";

export function Toasts({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="toast-layer" aria-live="polite">
      {toasts.map((t) => (
        <div className={`toast toast-${t.kind}`} key={t.id}>
          {t.icon && <span className="toast-icon">{t.icon}</span>}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
