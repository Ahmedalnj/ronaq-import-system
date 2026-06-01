'use client';

import { Toaster } from 'sonner';

export function AppToaster() {
  return (
    <Toaster
      dir="rtl"
      position="top-center"
      richColors
      closeButton
      expand
      duration={4000}
      toastOptions={{
        classNames: {
          toast: 'font-sans text-sm',
          title: 'font-semibold',
          description: 'text-slate-600',
        },
      }}
    />
  );
}
