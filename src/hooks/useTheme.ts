/** Theme follows the system until the user explicitly chooses a preference. */
import { useEffect, useState } from 'react';
export function useTheme() {
  const [preference, setPreference] = useState<string | null>(() => {
    try { const value = localStorage.getItem('quizzer-theme'); return value === 'dark' || value === 'light' ? value : null; } catch { return null; }
  });
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);
  const theme = preference ?? (systemDark ? 'dark' : 'light');
  useEffect(() => {
    const query = matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemDark(query.matches);
    query.addEventListener('change', update); return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'; setPreference(next);
    try { localStorage.setItem('quizzer-theme', next); } catch { /* Theme still works for this tab. */ }
  }
  return { theme, toggle };
}
