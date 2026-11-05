/** Coordinate a single cancellable generation operation without persisting its inputs. */
import { useEffect, useRef, useState } from 'react';
import { GenerationError, generationLimits, validateGenerationRequest } from '../core/generation';
import type { Bank, Question } from '../core/types';
import { extractReference, validateReferenceFiles } from '../generation/documents';
import { requestGeneration } from '../generation/client';
import { generationErrorMessage } from '../generation/errors';

export interface GenerationForm {
  title: string;
  description: string;
  questionCount: number;
  password: string;
}

export interface ReferenceFile {
  id: string;
  file: File;
  text?: string;
  error?: string;
}

export type GenerationPhase = 'idle' | 'extracting' | 'generating' | 'saving';

export type SaveGenerated = (title: string, questions: Question[]) => Promise<Bank>;

export function useQuizGeneration(
  onSave: SaveGenerated,
  onGenerated: (bank: Bank) => void,
  passwordRequired: boolean,
) {
  const [form, setForm] = useState<GenerationForm>({
    title: '',
    description: '',
    questionCount: 10,
    password: '',
  });
  const [files, setFiles] = useState<ReferenceFile[]>([]);
  const [phase, setPhase] = useState<GenerationPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const operation = useRef<AbortController | null>(null);
  const saving = useRef(false);
  useEffect(() => () => operation.current?.abort(), []);

  function cancel(): boolean {
    if (saving.current) return false;

    operation.current?.abort();

    return true;
  }

  function addFiles(selected: File[]) {
    try {
      validateReferenceFiles([...files.map(item => item.file), ...selected]);
      setFiles(current => [
        ...current,
        ...selected.map(file => ({ id: crypto.randomUUID(), file })),
      ]);
      setError(null);
    } catch (reason) {
      setError(generationErrorMessage(reason));
    }
  }

  async function references(signal: AbortSignal) {
    const documents = [];
    let characters = 0;

    for (const item of files) {
      try {
        const text = item.text ?? (await extractReference(item.file, signal));
        signal.throwIfAborted();
        characters += text.length;

        if (characters > generationLimits.characters)
          throw new GenerationError('tooLarge', 'documents');

        documents.push({ name: item.file.name, text });
        setFiles(current =>
          current.map(file => (file.id === item.id ? { ...file, text, error: undefined } : file)),
        );
      } catch (reason) {
        if (!signal.aborted)
          setFiles(current =>
            current.map(file =>
              file.id === item.id ? { ...file, error: generationErrorMessage(reason) } : file,
            ),
          );

        throw reason;
      }
    }

    return documents;
  }

  async function submit() {
    if (operation.current) return;

    const controller = new AbortController();
    operation.current = controller;
    setError(null);

    try {
      const { password, ...brief } = form;
      const draft = { ...brief, ...(passwordRequired ? { password } : {}) };
      validateGenerationRequest({ ...draft, documents: [] }, passwordRequired);
      setPhase('extracting');
      const documents = await references(controller.signal);
      const input = validateGenerationRequest({ ...draft, documents }, passwordRequired);
      setPhase('generating');
      const questions = await requestGeneration(input, controller.signal);
      controller.signal.throwIfAborted();
      saving.current = true;
      setPhase('saving');
      const bank = await onSave(input.title, questions);
      onGenerated(bank);
    } catch (reason) {
      if (!controller.signal.aborted) setError(generationErrorMessage(reason));
    } finally {
      saving.current = false;
      operation.current = null;
      setPhase('idle');
    }
  }

  return {
    form,
    setForm,
    files,
    addFiles,
    removeFile: (id: string) => setFiles(current => current.filter(file => file.id !== id)),
    phase,
    error,
    submit,
    cancel,
  };
}
