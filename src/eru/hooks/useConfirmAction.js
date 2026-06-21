import { useState, useCallback } from 'react';

/**
 * useConfirmAction
 * ----------------------------------------------------------------------------
 * Small hook that wraps a high-risk action behind a confirmation dialog.
 * Pairs with <ConfirmDialog /> for a uniform mobile-first confirm flow.
 *
 * Usage:
 *   const confirm = useConfirmAction();
 *   <button onClick={() => confirm.ask({
 *     title: 'Delete listing?',
 *     description: 'This cannot be undone.',
 *     tone: 'danger',
 *     confirmLabel: 'Delete',
 *     onConfirm: async () => { await base44.entities.X.delete(id); },
 *   })}>Delete</button>
 *
 *   <ConfirmDialog
 *     open={confirm.open}
 *     {...confirm.props}
 *     onConfirm={confirm.handleConfirm}
 *     onCancel={confirm.dismiss}
 *     busy={confirm.busy}
 *   />
 * --------------------------------------------------------------------------*/
export default function useConfirmAction() {
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);

  const ask = useCallback((payload) => {
    setPending(payload || {});
  }, []);

  const dismiss = useCallback(() => {
    if (busy) return;
    setPending(null);
  }, [busy]);

  const handleConfirm = useCallback(async () => {
    if (!pending?.onConfirm) {
      setPending(null);
      return;
    }
    try {
      setBusy(true);
      await pending.onConfirm();
      setPending(null);
    } catch (err) {
      // Surface error via callback; keep dialog open so user can retry.
      pending.onError?.(err);
    } finally {
      setBusy(false);
    }
  }, [pending]);

  return {
    open: !!pending,
    busy,
    props: {
      title: pending?.title || 'Are you sure?',
      description: pending?.description,
      confirmLabel: pending?.confirmLabel || 'Confirm',
      cancelLabel: pending?.cancelLabel || 'Cancel',
      tone: pending?.tone || 'default',
    },
    ask,
    dismiss,
    handleConfirm,
  };
}