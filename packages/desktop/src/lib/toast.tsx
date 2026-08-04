import { useState, useCallback, ReactNode } from 'react';

interface Toast {
  id: string;
  message: ReactNode;
  type: 'success' | 'error' | 'info';
  /** If true, the toast will NOT auto-dismiss — must be dismissed via dismissToast() */
  persistent?: boolean;
}

let toastListeners: ((toasts: Toast[]) => void)[] = [];
let toastQueue: Toast[] = [];

function notifyListeners() {
  toastListeners.forEach((fn) => fn([...toastQueue]));
}

export function showToast(message: ReactNode, type: Toast['type'] = 'info', persistent = false): string {
  const id = Math.random().toString(36).slice(2);
  const toast: Toast = { id, message, type, persistent };
  toastQueue = [...toastQueue, toast];
  notifyListeners();
  if (!persistent) {
    setTimeout(() => {
      toastQueue = toastQueue.filter((t) => t.id !== id);
      notifyListeners();
    }, 3500);
  }
  return id;
}

/** Programmatically remove a toast by the id returned from showToast() */
export function dismissToast(id: string) {
  toastQueue = toastQueue.filter((t) => t.id !== id);
  notifyListeners();
}

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>(toastQueue);

  const subscribe = useCallback(() => {
    const fn = (t: Toast[]) => setToasts(t);
    toastListeners.push(fn);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== fn);
    };
  }, []);

  // Subscribe on first use
  useState(() => {
    const unsub = subscribe();
    return unsub;
  });

  return toasts;
}

export function ToastContainer() {
  const toasts = useToasts();
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
