import { toast, type ExternalToast } from 'sonner';

type ConfirmOptions = {
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
} & ExternalToast;

/** رسائل نجاح وفشل */
export const notify = {
  success: (message: string, options?: ExternalToast) =>
    toast.success(message, options),
  error: (message: string, options?: ExternalToast) =>
    toast.error(message, options),
  info: (message: string, options?: ExternalToast) =>
    toast.info(message, options),
  warning: (message: string, options?: ExternalToast) =>
    toast.warning(message, options),
};

/** تأكيد عبر toast بدلاً من window.confirm — يُرجع true عند الضغط على تأكيد */
export function confirmToast(
  message: string,
  options?: ConfirmOptions
): Promise<boolean> {
  const {
    description,
    confirmLabel = 'تأكيد',
    cancelLabel = 'إلغاء',
    ...toastOptions
  } = options ?? {};

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    toast(message, {
      description,
      duration: Infinity,
      ...toastOptions,
      action: {
        label: confirmLabel,
        onClick: () => finish(true),
      },
      cancel: {
        label: cancelLabel,
        onClick: () => finish(false),
      },
      onDismiss: () => finish(false),
      onAutoClose: () => finish(false),
    });
  });
}

/** تأكيد حذف ثم تنفيذ العملية مع toasts للنجاح/الخطأ */
export async function confirmDelete(
  message: string,
  onConfirm: () => Promise<void>,
  options?: ConfirmOptions & { successMessage?: string }
): Promise<boolean> {
  const ok = await confirmToast(message, {
    confirmLabel: options?.confirmLabel ?? 'نعم، احذف',
    cancelLabel: options?.cancelLabel ?? 'إلغاء',
    description: options?.description,
    ...options,
  });

  if (!ok) return false;

  try {
    await onConfirm();
    if (options?.successMessage) {
      notify.success(options.successMessage);
    }
    return true;
  } catch (err) {
    notify.error(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    return false;
  }
}

export function getErrorMessage(err: unknown, fallback = 'حدث خطأ غير متوقع'): string {
  return err instanceof Error ? err.message : fallback;
}
