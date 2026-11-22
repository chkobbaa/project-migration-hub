import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const ThemeContext = createContext({ dark: false, setDark: (_dark: boolean) => {} });
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem('creativescroll-theme');
    setDark(saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches);
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('creativescroll-theme', dark ? 'dark' : 'light');
  }, [dark, ready]);
  return <ThemeContext.Provider value={{ dark, setDark }}>{children}</ThemeContext.Provider>;
}
export const useTheme = () => useContext(ThemeContext);