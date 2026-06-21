import { useCallback, useMemo, useState } from 'react';

/**
 * useSelection — minimal multi-select state over a set of item ids.
 *
 * Used by the library and playlist pages to drive "selection mode": toggle
 * items, select-all/clear, and read the current selection. Kept UI-agnostic so
 * both pages share identical behavior.
 */
export function useSelection() {
  const [active, setActive] = useState(false);
  const [ids, setIds] = useState(() => new Set());

  const toggle = useCallback((id) => {
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clear = useCallback(() => setIds(new Set()), []);

  const selectAll = useCallback((allIds = []) => {
    setIds(new Set(allIds));
  }, []);

  const exit = useCallback(() => {
    setActive(false);
    setIds(new Set());
  }, []);

  const isSelected = useCallback((id) => ids.has(id), [ids]);

  return useMemo(
    () => ({
      active,
      enter: () => setActive(true),
      exit,
      ids,
      count: ids.size,
      toggle,
      clear,
      selectAll,
      isSelected,
    }),
    [active, exit, ids, toggle, clear, selectAll, isSelected],
  );
}
