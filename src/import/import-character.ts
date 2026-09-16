import { validateCharacterArchive, type ImportedCharacter } from './validate-archive';

const databaseName = 'eidolon-characters';

export async function importCharacter(file: File): Promise<ImportedCharacter> {
  const character = validateCharacterArchive(new Uint8Array(await file.arrayBuffer()));
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction('characters', 'readwrite');
    transaction.objectStore('characters').put(character, character.id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new Error('Character import could not be saved'));
  });
  database.close();
  return character;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('characters');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Character import storage is unavailable'));
  });
}
