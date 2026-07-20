import React, { createContext, useContext, useState, useCallback } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Info, 
  Loader2, 
  X, 
  HelpCircle 
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  onConfirm: () => void | Promise<void>;
}

interface ToastContextType {
  toast: {
    success: (message: string, duration?: number) => string;
    error: (message: string, duration?: number) => string;
    warning: (message: string, duration?: number) => string;
    info: (message: string, duration?: number) => string;
    loading: (message: string) => string;
    dismiss: (id: string) => void;
  };
  showConfirm: (options: ConfirmDialogOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmModal, setConfirmModal] = useState<ConfirmDialogOptions | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const addToast = useCallback((type: ToastType, message: string, duration = 4000): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { id, type, message, duration }]);

    if (type !== 'loading' && duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg: string, dur?: number) => addToast('success', msg, dur),
    error: (msg: string, dur?: number) => addToast('error', msg, dur ?? 5000),
    warning: (msg: string, dur?: number) => addToast('warning', msg, dur),
    info: (msg: string, dur?: number) => addToast('info', msg, dur),
    loading: (msg: string) => addToast('loading', msg, 0),
    dismiss: dismissToast,
  };

  const showConfirm = useCallback((options: ConfirmDialogOptions) => {
    setConfirmModal(options);
  }, []);

  const handleConfirmAction = async () => {
    if (!confirmModal) return;
    setIsConfirming(true);
    try {
      await confirmModal.onConfirm();
    } catch (err: any) {
      console.error("Error executing confirmation action:", err);
    } finally {
      setIsConfirming(false);
      setConfirmModal(null);
    }
  };

  return (
    <ToastContext.Provider value={{ toast, showConfirm }}>
      {children}

      {/* Floating Toast Containers (Top Right) */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((item) => {
          let bgColor = 'bg-slate-900 border-slate-800 text-white';
          let icon = <Info className="w-5 h-5 text-blue-400 shrink-0" />;

          if (item.type === 'success') {
            bgColor = 'bg-emerald-950/95 border-emerald-800 text-emerald-100 shadow-emerald-950/40';
            icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
          } else if (item.type === 'error') {
            bgColor = 'bg-rose-950/95 border-rose-800 text-rose-100 shadow-rose-950/40';
            icon = <XCircle className="w-5 h-5 text-rose-400 shrink-0" />;
          } else if (item.type === 'warning') {
            bgColor = 'bg-amber-950/95 border-amber-800 text-amber-100 shadow-amber-950/40';
            icon = <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
          } else if (item.type === 'info') {
            bgColor = 'bg-blue-950/95 border-blue-800 text-blue-100 shadow-blue-950/40';
            icon = <Info className="w-5 h-5 text-blue-400 shrink-0" />;
          } else if (item.type === 'loading') {
            bgColor = 'bg-slate-900/95 border-slate-700 text-slate-100';
            icon = <Loader2 className="w-5 h-5 text-blue-400 animate-spin shrink-0" />;
          }

          return (
            <div
              key={item.id}
              className={`pointer-events-auto flex items-start p-3.5 rounded-xl border backdrop-blur-md shadow-lg transition-all animate-in slide-in-from-top-2 ${bgColor}`}
            >
              <div className="mr-3 mt-0.5">{icon}</div>
              <div className="flex-1 text-xs font-medium leading-relaxed pr-2">
                {item.message}
              </div>
              {item.type !== 'loading' && (
                <button
                  onClick={() => dismissToast(item.id)}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer p-0.5 rounded-lg hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Tailwind Global Confirmation Dialog Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-[99999] animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl p-6 relative overflow-hidden">
            <div className="flex items-start space-x-4">
              <div className={`p-3 rounded-xl shrink-0 ${
                confirmModal.type === 'danger' ? 'bg-rose-100 text-rose-600' :
                confirmModal.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                confirmModal.type === 'success' ? 'bg-emerald-100 text-emerald-600' :
                'bg-blue-100 text-blue-600'
              }`}>
                {confirmModal.type === 'danger' ? <XCircle className="w-6 h-6" /> :
                 confirmModal.type === 'warning' ? <AlertTriangle className="w-6 h-6" /> :
                 confirmModal.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> :
                 <HelpCircle className="w-6 h-6" />}
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900 leading-snug">{confirmModal.title}</h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{confirmModal.message}</p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                disabled={isConfirming}
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                {confirmModal.cancelText || 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isConfirming}
                onClick={handleConfirmAction}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md transition-all flex items-center cursor-pointer disabled:opacity-50 ${
                  confirmModal.type === 'danger' ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20' :
                  confirmModal.type === 'warning' ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20' :
                  confirmModal.type === 'success' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20' :
                  'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'
                }`}
              >
                {isConfirming && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                {confirmModal.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
