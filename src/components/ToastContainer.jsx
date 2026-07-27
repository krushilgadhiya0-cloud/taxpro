import React from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export default function ToastContainer({ toasts, onCloseToast }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl glass-panel border backdrop-blur-2xl shadow-2xl flex items-start gap-3 animate-fade-in transition-all ${
              isSuccess
                ? 'border-emerald-500/50 bg-emerald-500/10 text-white shadow-emerald-500/20'
                : isError
                ? 'border-red-500/50 bg-red-500/10 text-white shadow-red-500/20'
                : isWarning
                ? 'border-amber-500/50 bg-amber-500/10 text-white shadow-amber-500/20'
                : 'border-cyan-500/50 bg-cyan-500/10 text-white shadow-cyan-500/20'
            }`}
          >
            {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />}
            {isError && <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />}
            {isWarning && <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />}
            {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />}

            <div className="flex-1">
              <p className="text-xs font-semibold leading-relaxed">{toast.message}</p>
            </div>

            <button
              onClick={() => onCloseToast(toast.id)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
