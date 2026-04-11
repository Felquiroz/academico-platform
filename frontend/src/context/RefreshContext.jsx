import { createContext, useContext, useState, useCallback } from 'react';

const RefreshContext = createContext(null);

export function RefreshProvider({ children }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return (
    <RefreshContext.Provider value={{ refreshTrigger, triggerRefresh }}>
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefresh() {
  const context = useContext(RefreshContext);
  if (!context) {
    return { refreshTrigger: 0, triggerRefresh: () => {} };
  }
  return context;
}