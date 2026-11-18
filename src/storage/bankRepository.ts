/** Store local question banks and browser-specific removals apart from attempts. */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { isImportedBank, type ImportedBank } from '../core/importBank';
import { t } from '../i18n';

interface LibraryDatabase extends DBSchema {
  banks: { key: string; value: ImportedBank };
  hiddenBundledBanks: { key: string; value: true };
}

export class BankRepository {
  constructor(private database: IDBPDatabase<LibraryDatabase>) {}

  static async open(name = 'quizzer-library') {
    const database = await openDB<LibraryDatabase>(name, 2, {
      upgrade(database, oldVersion) {
        if (oldVersion < 1) database.createObjectStore('banks', { keyPath: 'id' });
        if (oldVersion < 2) database.createObjectStore('hiddenBundledBanks');
      },
      blocking() {
        database.close();
      },
    });

    return new BankRepository(database);
  }

  async load() {
    const transaction = this.database.transaction(['banks', 'hiddenBundledBanks']);
    const [records, hiddenBankIds] = await Promise.all([
      transaction.objectStore('banks').getAll(),
      transaction.objectStore('hiddenBundledBanks').getAllKeys(),
      transaction.done,
    ]);
    const banks = records.filter(isImportedBank);

    return { banks, hiddenBankIds, invalid: records.length !== banks.length };
  }

  async add(bank: ImportedBank) {
    if (!isImportedBank(bank)) throw new Error(t('importFailed'));

    await this.database.add('banks', bank);
  }

  async remove(bankId: string) {
    await this.database.delete('banks', bankId);
  }

  async hideBundled(bankId: string) {
    await this.database.put('hiddenBundledBanks', true, bankId);
  }

  close() {
    this.database.close();
  }
}
