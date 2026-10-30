import { createContext, useContext, useState, type ReactNode } from 'react';
type SavedContext = { saved: string[]; toggle: (id: string) => void; clear: () => void };
const Context = createContext<SavedContext>({ saved: [], toggle: () => {}, clear: () => {} });
export function SavedProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<string[]>([]);
  return <Context.Provider value={{ saved, toggle: id => setSaved(old => old.includes(id) ? old.filter(v => v !== id) : [...old, id]), clear: () => setSaved([]) }}>{children}</Context.Provider>;
}
export const useSaved = () => useContext(Context);
