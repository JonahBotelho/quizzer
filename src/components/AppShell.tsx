/** Shared navigation, theme controls, and persistence status around every screen. */
import type { ReactNode } from 'react';
import { Check, CheckCheck, CircleAlert, LockKeyhole, Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { number, t } from '../i18n';

interface Props {
  historySelected: boolean;
  historyCount: number;
  persistent: boolean;
  saving: boolean;
  onPractice(): void;
  onHistory(): void;
  children: ReactNode;
}

function Header({ historySelected, historyCount, onPractice, onHistory }: Pick<Props, 'historySelected' | 'historyCount' | 'onPractice' | 'onHistory'>) {
  const { theme, toggle } = useTheme();
  return <header className="site-header"><div className="header-inner">
    <button className="brand" aria-label={t('brand')} onClick={onPractice}>
      <span className="brand-mark"><Check size={22} strokeWidth={3} /></span>{t('brand')}
    </button>
    <nav className="main-nav">
      <button className={!historySelected ? 'active' : ''} aria-current={!historySelected ? 'page' : undefined} onClick={onPractice}>
        {t('navPractice')}
      </button>
      <button className={historySelected ? 'active' : ''} aria-current={historySelected ? 'page' : undefined} onClick={onHistory}>
        {t('navHistory')}{historyCount > 0 && <span className="nav-count">{number(historyCount)}</span>}
      </button>
    </nav>
    <button className="icon-button theme-toggle" aria-label={t(theme === 'dark' ? 'themeLight' : 'themeDark')} onClick={toggle}>
      {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  </div></header>;
}

function Footer({ persistent, saving }: Pick<Props, 'persistent' | 'saving'>) {
  return <footer className="site-footer">
    <div><span className="footer-brand">{t('brand')}</span></div>
    <span className={`save-status ${!persistent ? 'unsaved' : ''}`} role="status">
      {persistent ? <CheckCheck size={15} /> : <CircleAlert size={15} />}
      {t(!persistent ? 'memory' : saving ? 'saving' : 'saved')}
    </span>
    <p><LockKeyhole size={12} />{t('privacy')}</p>
  </footer>;
}

export function AppShell({ children, ...props }: Props) {
  return <div className="app-shell">
    <Header {...props} />
    <main className="main-content">{children}</main>
    <Footer persistent={props.persistent} saving={props.saving} />
  </div>;
}
