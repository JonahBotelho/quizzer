/** Keep the visible question bank library in sync with local storage and other tabs. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { catalog } from '../catalog';
import { createLocalBank, importBank, type ImportedBank } from '../core/importBank';
import { validateGeneratedQuestions } from '../core/generation';
import type { Question } from '../core/types';
import { withCombinedBank } from '../core/combinedBank';
import { QuizImportError } from '../core/importError';
import { BankRepository } from '../storage/bankRepository';
import type { MessageKey } from '../i18n';

interface Library {
  banks: ImportedBank[];
  hiddenBankIds: string[];
}

function visibleBanks(library: Library) {
  const hidden = new Set(library.hiddenBankIds);
  const bundled = catalog.banks.filter(bank => bank.sample || !hidden.has(bank.id));

  return withCombinedBank([...bundled, ...library.banks]);
}

export function useBankLibrary() {
  const [library, setLibrary] = useState<Library>({ banks: [], hiddenBankIds: [] });
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<MessageKey | null>(null);
  const repository = useRef<BankRepository | null>(null);
  const channel = useRef<BroadcastChannel | null>(null);
  const latestLibrary = useRef(library);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const publishLibrary = useCallback((next: Library) => {
    latestLibrary.current = next;
    setLibrary(next);
  }, []);
  const ordered = useCallback(<T,>(work: () => Promise<T>) => {
    // A refresh from another tab must not replace a newer local write with an older snapshot.
    const result = queue.current.then(work);
    queue.current = result.catch(() => undefined);

    return result;
  }, []);

  useEffect(() => {
    let disposed = false;
    async function refresh() {
      const opened = repository.current;

      if (!opened) return;

      try {
        const { banks, hiddenBankIds, invalid } = await opened.load();
        if (!disposed && repository.current === opened) {
          publishLibrary({ banks, hiddenBankIds });

          if (invalid) setNotice('libraryInvalid');
        }
      } catch {
        if (!disposed && repository.current === opened) {
          opened.close();
          repository.current = null;
          setNotice('libraryUnavailable');
        }
      }
    }
    async function initialize() {
      try {
        const opened = await BankRepository.open();

        if (disposed) {
          opened.close();

          return;
        }

        repository.current = opened;

        if (typeof BroadcastChannel !== 'undefined') {
          channel.current = new BroadcastChannel('quizzer-library-changes');
          channel.current.onmessage = () => {
            void ordered(refresh);
          };
        }
      } catch {
        if (!disposed) setNotice('libraryUnavailable');
      }

      if (disposed) return;

      await ordered(refresh);

      if (!disposed) setReady(true);
    }
    void initialize();

    return () => {
      disposed = true;
      repository.current?.close();
      repository.current = null;
      channel.current?.close();
      channel.current = null;
    };
  }, [ordered, publishLibrary]);

  const banks = useMemo(() => visibleBanks(library), [library]);

  async function importFile(file: File) {
    let raw: string;

    try {
      raw = await file.text();
    } catch {
      throw new QuizImportError('importReadFailed', { file: file.name });
    }

    return ordered(() => saveBank(importBank(file.name, raw, visibleBanks(latestLibrary.current))));
  }
  function saveGenerated(title: string, questions: Question[]) {
    return ordered(async () => {
      const validated = validateGeneratedQuestions(questions, questions.length);
      const bank = createLocalBank(title.trim(), validated, visibleBanks(latestLibrary.current), true);

      return saveBank(bank);
    });
  }
  async function saveBank(bank: ImportedBank) {
    const opened = repository.current;

    if (opened) {
      try {
        await opened.add(bank);
        channel.current?.postMessage('changed');
      } catch {
        opened.close();
        repository.current = null;
        setNotice(bank.source === 'generated' ? 'generationTemporary' : 'librarySaveFailed');
      }
    }

    if (!repository.current && bank.source === 'generated') setNotice('generationTemporary');

    const current = latestLibrary.current;
    publishLibrary({ ...current, banks: [...current.banks, bank] });

    return bank;
  }

  function removeBank(id: string) {
    return ordered(async () => {
      const current = latestLibrary.current;
      const isImported = current.banks.some(bank => bank.id === id);
      const canHide = catalog.banks.some(bank => bank.id === id && !bank.sample) &&
        !current.hiddenBankIds.includes(id);

      if (!ready || (!isImported && !canHide)) return false;

      const opened = repository.current;

      try {
        if (opened) {
          if (isImported) await opened.remove(id);
          else await opened.hideBundled(id);
        }
      } catch {
        setNotice('libraryRemoveFailed');

        return false;
      }

      publishLibrary(isImported
        ? { ...current, banks: current.banks.filter(bank => bank.id !== id) }
        : { ...current, hiddenBankIds: [...current.hiddenBankIds, id] });
      if (opened) {
        setNotice(notice => notice === 'libraryRemoveFailed' ? null : notice);
        channel.current?.postMessage('changed');
      } else {
        setNotice('libraryRemoveTemporary');
      }

      return true;
    });
  }

  return { banks, ready, notice, importFile, saveGenerated, removeBank };
}
