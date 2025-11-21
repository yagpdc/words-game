import  { useEffect, useRef, useState } from 'react';

type Toast = {
  id: string;
  text: string;
  isOnline: boolean;
};

export function OnlineToastProvider() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const prevOnlineRef = useRef<Set<string>>(new Set());
  const namesRef = useRef<Map<string, string>>(new Map());
  const initialLoadRef = useRef(true);
  const TIMEOUT = 6000;

  useEffect(() => {
    let mounted = true;

    async function resolveName(userId: string): Promise<string> {
      if ((window as any).getUserNameById && typeof (window as any).getUserNameById === 'function') {
        try {
          const name = await (window as any).getUserNameById(userId);
          if (name) return name;
        } catch {}
      }
      // fallback: try fetching user endpoint (optional)
      try {
        const res = await fetch(`/words/users/${userId}`);
        if (res.ok) {
          const json = await res.json();
          return json.name || userId;
        }
      } catch {}
      return userId;
    }

    async function handleOnlineUpdate(e: Event) {
      if (!mounted) return;
      const detail = (e as CustomEvent).detail;
      if (!detail) return;

      // Support server-provided shape: { onlineUsers: [{id,name}], onlineUserIds: [...] }
      const idsFromDetail: string[] = Array.isArray(detail.onlineUserIds)
        ? detail.onlineUserIds
        : Array.isArray(detail.onlineUsers)
        ? detail.onlineUsers.map((u: any) => u.id)
        : [];

      if (idsFromDetail.length === 0) return;

      const newSet = new Set<string>(idsFromDetail);

      // populate/refresh known names from server payload
      if (Array.isArray(detail.onlineUsers)) {
        for (const u of detail.onlineUsers) {
          if (u && u.id) namesRef.current.set(u.id, u.name || u.id);
        }
      }

      if (initialLoadRef.current) {
        prevOnlineRef.current = newSet;
        initialLoadRef.current = false;
        return;
      }

      const newly: string[] = [];
      const removed: string[] = [];

      for (const id of newSet) {
        if (!prevOnlineRef.current.has(id)) newly.push(id);
      }

      for (const id of prevOnlineRef.current) {
        if (!newSet.has(id)) removed.push(id);
      }

      // Update prev set for next round
      prevOnlineRef.current = newSet;

      const currentUserId = (window as any).CURRENT_USER_ID || null;

      // Show online toasts
      for (const id of newly) {
        if (id === currentUserId) continue;

        let name = namesRef.current.get(id) || null;
        if (!name) {
          name = await resolveName(id);
          namesRef.current.set(id, name);
        }
        showToast(`${name} acabou de ficar online`, true);
      }

      // Show offline toasts
      for (const id of removed) {
        if (id === currentUserId) continue;

        let name = namesRef.current.get(id) || null;
        if (!name) {
          name = await resolveName(id);
        }
        showToast(`${name} saiu agora`, false);
        // clean up known name for offline user
        namesRef.current.delete(id);
      }
    }

    window.addEventListener('onlineUsersUpdate', handleOnlineUpdate as EventListener);
    return () => {
      mounted = false;
      window.removeEventListener('onlineUsersUpdate', handleOnlineUpdate as EventListener);
    };
  }, []);

  function showToast(text: string, isOnline: boolean) {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((s) => [...s, { id, text, isOnline }]);
    setTimeout(() => {
      setToasts((s) => s.filter((t) => t.id !== id));
    }, TIMEOUT + 200);
  }

  function removeToast(id: string) {
    setToasts((s) => s.filter((t) => t.id !== id));
  }

  return (
    <div
      id="online-toast-container"
      aria-live="polite"
      className="fixed right-4 bottom-4 z-50 flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="online-toast pointer-events-auto bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg text-sm cursor-pointer max-w-xs transition-all duration-200 ease-in-out opacity-100 animate-fade-in"
          role="status"
          onClick={() => removeToast(t.id)}
        >
          <span className={`inline-flex h-2.5 w-2.5 shrink-0 rounded-full mr-2 ${t.isOnline ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" : "bg-neutral-600"}`}  />
          {t.text}
        </div>
      ))}
      <style>
        {`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(12px);}
          to { opacity: 1; transform: translateY(0);}
        }
        .animate-fade-in {
          animation: fade-in 0.18s;
        }
        `}
      </style>
    </div>
  );
}