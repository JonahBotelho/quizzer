/** Studio navigation, appearance controls, and privacy footer. */
import type { ReactNode } from 'react';
import { History, LockKeyhole, Moon, Play, Sun } from 'lucide-react';

import { useTheme } from '../hooks/useTheme';
import { number, t } from '../i18n';

interface Props {
  historySelected: boolean;
  historyCount: number;
  onPractice(): void;
  onHistory(): void;
  children: ReactNode;
}

function Navigation(props: Omit<Props, 'children'>) {
  const { theme, toggle } = useTheme();

  return (
    <header className="site-header">
      <div className="header-inner">
        <button className="brand" aria-label={t('brand')} onClick={props.onPractice}>
          {t('brand')}
        </button>
        <nav className="main-nav" aria-label={t('mainNavigation')}>
          <button
            className={!props.historySelected ? 'active' : ''}
            aria-current={!props.historySelected ? 'page' : undefined}
            onClick={props.onPractice}
          >
            <Play size={23} aria-hidden="true" />
            {t('navPractice')}
          </button>
          <button
            className={props.historySelected ? 'active' : ''}
            aria-current={props.historySelected ? 'page' : undefined}
            onClick={props.onHistory}
          >
            <History size={23} aria-hidden="true" />
            {t('navHistory')}
            {props.historyCount > 0 && (
              <span className="nav-count">{number(props.historyCount)}</span>
            )}
          </button>
        </nav>
        <button
          className="theme-toggle"
          data-theme={theme}
          aria-label={t(theme === 'dark' ? 'themeLight' : 'themeDark')}
          onClick={toggle}
        >
          <span className="theme-toggle-track" aria-hidden="true">
            <Sun size={18} />
            <Moon size={18} />
          </span>
          <span className="theme-toggle-thumb" aria-hidden="true">
            {theme === 'light' ? <Sun size={19} /> : <Moon size={19} />}
          </span>
        </button>
      </div>
    </header>
  );
}

export function AppShell({ children, ...props }: Props) {
  return (
    <div className="app-shell">
      <Navigation {...props} />
      <main className="main-content">{children}</main>
      <footer className="site-footer">
        <LockKeyhole size={16} aria-hidden="true" />
        <p>{t('privacy')}</p>
      </footer>
    </div>
  );
}
