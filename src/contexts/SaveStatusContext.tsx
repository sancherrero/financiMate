'use client';

import * as React from 'react';

export type SaveStatusState = 'local' | 'synced' | 'pending' | 'error';

export interface SaveStatusContextValue {
  /** Estado derivado para la UI (local | synced | pending | error) */
  status: SaveStatusState;
  /** Marcar que hay cambios sin guardar */
  setPending: (pending: boolean) => void;
  /** Marcar error de persistencia */
  setError: (error: boolean) => void;
}

const defaultValue: SaveStatusContextValue = {
  status: 'synced',
  setPending: () => {},
  setError: () => {},
};

const SaveStatusContext = React.createContext<SaveStatusContextValue>(defaultValue);

export interface SaveStatusProviderProps {
  children: React.ReactNode;
}

/**
 * Provee el estado de guardado (pendiente/error) para SaveStatusPill.
 * La lógica "Local" vs "Sincronizado" se resuelve en SaveStatusPill con useUser.
 */
export function SaveStatusProvider({ children }: SaveStatusProviderProps) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState(false);

  const value = React.useMemo<SaveStatusContextValue>(() => ({
    status: error ? 'error' : pending ? 'pending' : 'synced',
    setPending,
    setError,
  }), [pending, error]);

  return (
    <SaveStatusContext.Provider value={value}>
      {children}
    </SaveStatusContext.Provider>
  );
}

export function useSaveStatus(): SaveStatusContextValue {
  const ctx = React.useContext(SaveStatusContext);
  return ctx ?? defaultValue;
}
