/** A separate local database keeps quiz imports independent of attempt migrations. */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { isImportedBank, type ImportedBank } from '../core/importBank';
import { t } from '../i18n';
interface LibraryDatabase extends DBSchema { banks: { key: string; value: ImportedBank } }
export class BankRepository {
  constructor(private database: IDBPDatabase<LibraryDatabase>) {}
  static async open(name = 'quizzer-library') {
    const database = await openDB<LibraryDatabase>(name, 1, {
      upgrade(database) { database.createObjectStore('banks', { keyPath: 'id' }); },
      blocking() { database.close(); },
    });
    return new BankRepository(database);
  }
  async load() {
    const records: unknown[] = await this.database.getAll('banks');
    const banks = records.filter(isImportedBank);
    return { banks, invalid: records.length !== banks.length };
  }
  async add(bank: ImportedBank) {
    if (!isImportedBank(bank)) throw new Error(t('importFailed'));
    await this.database.add('banks', bank);
  }
  close() { this.database.close(); }
}
