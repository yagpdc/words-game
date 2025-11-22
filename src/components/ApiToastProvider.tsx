import { useEffect, useState } from "react";

type ApiToast = { id: string; text: string; status: number | null };

export function ApiToastProvider() {
  const [toasts, setToasts] = useState<ApiToast[]>([]);
  const TIMEOUT = 5000;

  useEffect(() => {
    // expose global helper
    (window as any).showApiToast = (text: string, status: number | null = null) => {
      const id = `api-toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((s) => [...s, { id, text, status }]);
      setTimeout(() => setToasts((s) => s.filter((t) => t.id !== id)), TIMEOUT + 200);
    };

    return () => {
      try {
        delete (window as any).showApiToast;
      } catch {}
    };
  }, []);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg text-sm max-w-xs border-l-4"
          style={{ borderColor: t.status && t.status >= 400 ? "#f87171" : "#34d399" }}
        >
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <div className="font-semibold">{t.status ? `Status ${t.status}` : "Info"}</div>
              <div className="text-sm text-neutral-200">{t.text}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ApiToastProvider;
