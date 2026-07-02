import { useState, useCallback } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

let toastListeners: ((toasts: Toast[]) => void)[] = [];
let toastQueue: Toast[] = [];

function notifyListeners() {
  toastListeners.forEach((fn) => fn([...toastQueue]));
}

export function showToast(message: string, type: Toast['type'] = 'info') {
  const id = Math.random().toString(36).slice(2);
  const toast: Toast = { id, message, type };
  toastQueue = [...toastQueue, toast];
  notifyListeners();
  setTimeout(() => {
    toastQueue = toastQueue.filter((t) => t.id !== id);
    notifyListeners();
  }, 3500);
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
