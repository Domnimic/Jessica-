import React, { useEffect, useState } from 'react';

export interface ToastItem {
  id: string;
  title: string;
  message: string;
  type?: 'normal' | 'warning' | 'success';
}

interface NotificationToastProps {
  toast: ToastItem | null;
  onDismiss: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ toast, onDismiss }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (toast) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onDismiss, 300);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast, onDismiss]);

  if (!toast) return null;

  const isWarning = toast.type === 'warning' || toast.title.includes('ALERT') || toast.title.includes('CAUTION');
  const isSuccess = toast.title.includes('COMPLETED') || toast.title.includes('COLLECTED') || toast.title.includes('ONLINE');

  return (
    <div
      className={`absolute top-12 [@media(min-height:540px)]:top-16 left-1/2 -translate-x-1/2 z-50 max-w-md w-[88%] px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl border shadow-2xl transition-all duration-300 pointer-events-auto ${
        visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-95'
      } ${
        isWarning
          ? 'bg-rose-950/95 border-rose-500 text-rose-100 shadow-rose-900/50'
          : isSuccess
          ? 'bg-emerald-950/95 border-emerald-500 text-emerald-100 shadow-emerald-900/50'
          : 'bg-slate-900/95 border-cyan-500 text-cyan-100 shadow-cyan-950/50'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl mt-0.5">
          {isWarning ? '⚠️' : isSuccess ? '🌟' : '🚀'}
        </div>
        <div className="flex-1">
          <div className="font-game font-bold tracking-wide text-sm sm:text-base">
            {toast.title}
          </div>
          <div className="text-xs sm:text-sm font-medium opacity-90 mt-0.5 leading-snug">
            {toast.message}
          </div>
        </div>
      </div>
    </div>
  );
};
