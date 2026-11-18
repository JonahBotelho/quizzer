/** Confirm bank removal in a themed, keyboard-accessible modal. */
import { useEffect, useRef } from 'react';

import { t } from '../i18n';

interface Props {
  name: string;
  onClose(confirmed: boolean): void;
}

export function BankRemovalDialog({ name, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current!;
    element.showModal();

    return () => element.close();
  }, []);

  function close(confirmed: boolean) {
    dialog.current?.close();
    onClose(confirmed);
  }

  return (
    <dialog
      ref={dialog}
      className="modal-dialog bank-removal-dialog"
      aria-labelledby="bank-removal-title"
      aria-describedby="bank-removal-description"
      onCancel={event => {
        event.preventDefault();
        close(false);
      }}
    >
      <h2 id="bank-removal-title">{t('removeBankTitle')}</h2>
      <p id="bank-removal-description">{t('removeBankConfirm', { name })}</p>
      <div className="modal-actions">
        <button type="button" className="button secondary" onClick={() => close(false)}>
          {t('removeBankCancel')}
        </button>
        <button type="button" className="button destructive" onClick={() => close(true)}>
          {t('removeBankAction')}
        </button>
      </div>
    </dialog>
  );
}
