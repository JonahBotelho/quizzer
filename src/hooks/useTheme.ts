/** Theme follows the system until the user explicitly chooses a preference. */
import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

function readPreference(): Theme | null {
  try {
    const value = localStorage.getItem('quizzer-theme');

    return value === 'dark' || value === 'light' ? value : null;
  } catch {
    return null;
  }
}

export function useTheme() {
  const [preference, setPreference] = useState<Theme | null>(readPreference);
  const [systemDark, setSystemDark] = useState(
    () => matchMedia('(prefers-color-scheme: dark)').matches,
  );
  const theme = preference ?? (systemDark ? 'dark' : 'light');
  useEffect(() => {
    const query = matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemDark(query.matches);
    query.addEventListener('change', update);

    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  function setTheme(next: Theme) {
    setPreference(next);

    try {
      localStorage.setItem('quizzer-theme', next);
    } catch {
      // Theme still works for this tab when browser storage is blocked.
    }
  }
  function toggle() {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }

  return { theme, setTheme, toggle };
}
