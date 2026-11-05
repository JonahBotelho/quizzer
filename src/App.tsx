/** Render the current practice screen inside shared navigation and storage notices. */
import { CircleAlert, X } from 'lucide-react';
import { sessionStore } from './hooks/useQuizSession';
import { usePracticeFlow } from './hooks/usePracticeFlow';
import { useBankLibrary } from './hooks/useBankLibrary';
import { AppShell } from './components/AppShell';
import { Setup } from './components/Setup';
import { Quiz } from './components/Quiz';
import { Results } from './components/Results';
import { History } from './components/History';
import { t } from './i18n';

export function App() {
  const flow = usePracticeFlow();
  const { state, screen, result } = flow;
  const library = useBankLibrary();

  return (
    <AppShell
      historySelected={screen === 'history'}
      historyCount={state.history.length}
      persistent={state.persistent}
      saving={state.saving}
      onPractice={flow.showSetup}
      onHistory={flow.showHistory}
    >
      {state.notice && (
        <div className="notice" role="status">
          <CircleAlert size={19} />
          <p>{t(state.notice)}</p>
          <button
            className="icon-button"
            aria-label={t('noticeClose')}
            onClick={() => sessionStore.dismissNotice()}
          >
            <X size={17} />
          </button>
        </div>
      )}
      {library.notice && (
        <p className="notice" role="status">
          {t(library.notice)}
        </p>
      )}
      {!state.ready ? (
        <p role="status" className="loading">
          {t('loading')}
        </p>
      ) : (
        <>
          {screen === 'setup' && (
            <Setup
              banks={library.banks}
              importReady={library.ready}
              onImport={library.importFile}
              onSaveGenerated={library.saveGenerated}
              active={state.active}
              busy={state.saving}
              onStart={flow.start}
              onResume={flow.resume}
              onDiscard={flow.discard}
            />
          )}
          {screen === 'quiz' && state.active && (
            <Quiz
              attempt={state.active}
              busy={state.saving}
              onAnswer={(position, answer) => {
                void sessionStore.answer(state.active!.id, position, answer);
              }}
              onNavigate={position => {
                void sessionStore.navigate(state.active!.id, position);
              }}
              onFinish={flow.finish}
              onBack={flow.showSetup}
            />
          )}
          {screen === 'results' &&
            (result ? (
              <Results
                banks={library.banks}
                attempt={result}
                busy={state.saving}
                onRepeat={flow.start}
                onSetup={flow.showSetup}
              />
            ) : (
              <div className="empty-state">
                <p>{t('resultMissing')}</p>
                <button className="button" onClick={flow.showHistory}>
                  {t('navHistory')}
                </button>
              </div>
            ))}
          {screen === 'history' && (
            <History
              attempts={state.history}
              busy={state.saving}
              onOpen={flow.openResult}
              onDelete={flow.deleteCompleted}
              onSetup={flow.showSetup}
            />
          )}
        </>
      )}
    </AppShell>
  );
}
