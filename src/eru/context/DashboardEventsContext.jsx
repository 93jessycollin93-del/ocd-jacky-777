import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const DashboardEventsContext = createContext(null);

const DEFAULT_RULES = [
  {
    id: 'market-to-portfolio',
    source: 'market',
    event: 'priceChange',
    target: 'portfolio',
    action: 'refresh',
    enabled: true,
    auto: true,
  },
  {
    id: 'market-to-alerts',
    source: 'market',
    event: 'priceChange',
    target: 'alerts',
    action: 'checkThresholds',
    enabled: true,
    auto: true,
  },
];

export function DashboardEventsProvider({ children }) {
  const listenersRef = useRef({});
  const [rules, setRules] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('dashboard_widget_rules') || 'null');
      return stored?.length ? stored : DEFAULT_RULES;
    } catch {
      return DEFAULT_RULES;
    }
  });
  const [lastEvent, setLastEvent] = useState(null);

  const persistRules = useCallback((next) => {
    setRules(next);
    localStorage.setItem('dashboard_widget_rules', JSON.stringify(next));
  }, []);

  const emit = useCallback((source, event, payload = {}) => {
    const emittedEvent = {
      id: `${source}-${event}-${Date.now()}`,
      source,
      event,
      payload,
      createdAt: new Date().toISOString(),
    };
    setLastEvent(emittedEvent);

    Object.values(listenersRef.current).forEach((listener) => {
      listener?.(emittedEvent);
    });
  }, []);

  const subscribe = useCallback((id, handler) => {
    listenersRef.current[id] = handler;
    return () => {
      delete listenersRef.current[id];
    };
  }, []);

  const addRule = useCallback((rule) => {
    const next = [...rules, { ...rule, id: `rule-${Date.now()}`, auto: false, enabled: true }];
    persistRules(next);
  }, [rules, persistRules]);

  const toggleRule = useCallback((id) => {
    persistRules(rules.map((rule) => rule.id === id ? { ...rule, enabled: !rule.enabled } : rule));
  }, [rules, persistRules]);

  const deleteRule = useCallback((id) => {
    persistRules(rules.filter((rule) => rule.id !== id));
  }, [rules, persistRules]);

  const value = useMemo(() => ({
    rules,
    lastEvent,
    emit,
    subscribe,
    addRule,
    toggleRule,
    deleteRule,
  }), [rules, lastEvent, emit, subscribe, addRule, toggleRule, deleteRule]);

  return <DashboardEventsContext.Provider value={value}>{children}</DashboardEventsContext.Provider>;
}

const FALLBACK_DASHBOARD_EVENTS = {
  rules: DEFAULT_RULES,
  lastEvent: null,
  emit: () => {},
  subscribe: () => () => {},
  addRule: () => {},
  toggleRule: () => {},
  deleteRule: () => {},
};

export function useDashboardEvents() {
  const context = useContext(DashboardEventsContext);
  return context || FALLBACK_DASHBOARD_EVENTS;
}