/** Combines bundled and browser-imported banks for setup and repeat attempts. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { catalog } from '../catalog';
import { createLocalBank, importBank, type ImportedBank } from '../core/importBank';
import { validateGeneratedQuestions } from '../core/generation';
import type { Question } from '../core/types';
import { withCombinedBank } from '../core/combinedBank';
import { QuizImportError } from '../core/importError';
import { BankRepository } from '../storage/bankRepository';
import type { MessageKey } from '../i18n';
export function useBankLibrary() {
  const [imports, setImports] = useState<ImportedBank[]>([]);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<MessageKey | null>(null);
  const repository = useRef<BankRepository | null>(null);
  const channel = useRef<BroadcastChannel | null>(null);
  const latestBanks = useRef<ImportedBank[]>([]);
  const pendingBanks = useRef(new Map<string, ImportedBank>());
  useEffect(() => {
    let disposed = false;
    async function refresh() {
      const opened = repository.current;
      if (!opened) return;
      try {
        const saved = await opened.load();
        // Ignore in-flight reads after unmount or a write failure switches to memory.
        if (!disposed && repository.current === opened) {
          const merged = new Map(saved.banks.map(bank => [bank.id, bank]));
          for (const bank of pendingBanks.current.values()) merged.set(bank.id, bank);
          latestBanks.current = [...merged.values()];
          setImports(latestBanks.current);
          if (saved.invalid) setNotice('libraryInvalid');
        }
      } catch {
        if (!disposed && repository.current === opened) {
          opened.close(); repository.current = null; setNotice('libraryUnavailable');
        }
      }
    }
    async function initialize() {
      try {
        const opened = await BankRepository.open();
        if (disposed) { opened.close(); return; }
        repository.current = opened;
        await refresh();
        if (disposed) return;
        if (typeof BroadcastChannel !== 'undefined') {
          channel.current = new BroadcastChannel('quizzer-library-changes');
          channel.current.onmessage = () => { void refresh(); };
        }
      } catch { if (!disposed) setNotice('libraryUnavailable'); }
      if (!disposed) setReady(true);
    }
    void initialize();
    return () => { disposed = true; repository.current?.close(); channel.current?.close(); };
  }, []);
  const banks = useMemo(() => withCombinedBank([...catalog.banks, ...imports]), [imports]);
  async function importFile(file: File) {
    let raw: string;
    try { raw = await file.text(); } catch { throw new QuizImportError('importReadFailed', { file: file.name }); }
    return saveBank(importBank(file.name, raw, withCombinedBank([...catalog.banks, ...latestBanks.current])));
  }
  async function saveGenerated(title: string, questions: Question[]) {
    const validated = validateGeneratedQuestions(questions, questions.length);
    const bank = createLocalBank(title.trim(), validated, withCombinedBank([...catalog.banks, ...latestBanks.current]), true);
    return saveBank(bank);
  }
  async function saveBank(bank: ImportedBank) {
    pendingBanks.current.set(bank.id, bank);
    latestBanks.current = [...latestBanks.current, bank];
    const opened = repository.current;
    if (opened) {
      try { await opened.add(bank); channel.current?.postMessage('changed'); }
      catch {
        opened.close();
        repository.current = null;
        setNotice(bank.source === 'generated' ? 'generationTemporary' : 'librarySaveFailed');
      }
    }
    if (!repository.current && bank.source === 'generated') setNotice('generationTemporary');
    pendingBanks.current.delete(bank.id);
    setImports(current => [...current.filter(item => item.id !== bank.id), bank]);
    return bank;
  }
  return { banks, ready, notice, importFile, saveGenerated };
}
