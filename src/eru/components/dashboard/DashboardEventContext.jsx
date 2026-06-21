import { createContext, useContext, useMemo, useRef, useState } from 'react';

const DashboardEventContext = createContext(null);
const RULES_KEY = 'dashboard_widget_rules';

const DEFAULT_RULES = [
  { id: 'market-refresh-portfolio', enabled: true, source: 'market', condition: 'refresh', target: 'portfolio', action: 'refresh_summary' },
  { id: 'market-check-alerts', enabled: true, source: 'market', condition: 'price_change', target: 'alerts', action: 'scan_alerts' },
];

export function DashboardEventProvider({ children }) {
  const listenersRef = useRef({});
  const [eventLog, setEventLog] = useState([]);
  const [rules, setRules] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(RULES_KEY)) || DEFAULT_RULES;
    } catch {
      return DEFAULT_RULES;
    }
  });

  const saveRules = (next) => {
    setRules(next);
    localStorage.setItem(RULES_KEY, JSON.stringify(next));
  };

  const subscribe = (eventName, callback) => {
    if (!listenersRef.current[eventName]) listenersRef.current[eventName] = new Set();
    listenersRef.current[eventName].add(callback);
    return () => listenersRef.current[eventName]?.delete(callback);
  };

  const emit = (eventName, payload = {}) => {
    setEventLog((prev) => [{ eventName, payload, id: Date.now() + Math.random() }, ...prev].slice(0, 12));
    listenersRef.current[eventName]?.forEach((callback) => callback(payload));
  };

  const toggleRule = (ruleId) => {
    saveRules(rules.map((rule) => rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule));
  };

  const addRule = (rule) => {
    saveRules([{ id: `rule-${Date.now()}`, enabled: true, ...rule }, ...rules]);
  };

  const value = useMemo(() => ({ emit, subscribe, eventLog, rules, toggleRule, addRule }), [eventLog, rules]);

  return <DashboardEventContext.Provider value={value}>{children}</DashboardEventContext.Provider>;
}

export function useDashboardEvents() {
  const context = useContext(DashboardEventContext);
  if (!context) throw new Error('useDashboardEvents must be used within DashboardEventProvider');
  return context;
}