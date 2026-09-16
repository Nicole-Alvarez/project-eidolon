import { strFromU8, unzipSync } from 'fflate';

const maxArchiveBytes = 10 * 1024 * 1024;
const maxExpandedBytes = 25 * 1024 * 1024;
const supportedSuffixes = ['.model3.json', '.moc3', '.physics3.json', '.cdi3.json', '.exp3.json', '.png'];

export type ImportedCharacter = {
  id: string;
  name: string;
  modelPath: string;
  files: Readonly<Record<string, Uint8Array>>;
};

export function validateCharacterArchive(bytes: Uint8Array): ImportedCharacter {
  if (bytes.byteLength === 0 || bytes.byteLength > maxArchiveBytes) throw new Error('Character archive exceeds size limit');
  let files: Record<string, Uint8Array>;
  try { files = unzipSync(bytes); } catch { throw new Error('Invalid character archive'); }
  const paths = Object.keys(files);
  if (paths.some((path) => !isSafePath(path))) throw new Error('Unsafe archive path');
  if (Object.values(files).reduce((total, file) => total + file.byteLength, 0) > maxExpandedBytes) throw new Error('Character archive exceeds size limit');
  const modelPaths = paths.filter((path) => path.endsWith('.model3.json'));
  if (modelPaths.length !== 1) throw new Error('Character archive must contain exactly one model3 file');

  const modelPath = modelPaths[0];
  let model: unknown;
  try { model = JSON.parse(strFromU8(files[modelPath])); } catch { throw new Error('Model JSON is invalid'); }
  const references = getReferences(model);
  const modelDirectory = modelPath.slice(0, modelPath.lastIndexOf('/') + 1);
  for (const reference of references) {
    const resolved = normalizePath(modelDirectory, reference);
    if (!files[resolved]) throw new Error(`Missing model reference: ${reference}`);
  }

  const root = modelPath.split('/').slice(0, -1)[0] || 'imported-character';
  return { id: slugify(root), name: root.replaceAll(/[_-]+/g, ' '), modelPath, files: Object.freeze(files) };
}

function isSafePath(path: string): boolean {
  return Boolean(path) && !path.startsWith('/') && !path.split('/').includes('..') && supportedSuffixes.some((suffix) => path.endsWith(suffix));
}

function getReferences(value: unknown): string[] {
  if (!isRecord(value) || !isRecord(value.FileReferences)) throw new Error('Model JSON is invalid');
  const fileReferences = value.FileReferences;
  if (typeof fileReferences.Moc !== 'string' || !Array.isArray(fileReferences.Textures) || !fileReferences.Textures.every((item) => typeof item === 'string')) throw new Error('Model JSON is invalid');
  const optional = ['Physics', 'DisplayInfo', 'Pose'] as const;
  return [fileReferences.Moc, ...fileReferences.Textures, ...optional.flatMap((key) => typeof fileReferences[key] === 'string' ? [fileReferences[key] as string] : [])];
}

function normalizePath(directory: string, reference: string): string {
  if (!isSafePath(reference)) throw new Error('Unsafe archive path');
  return `${directory}${reference}`.replace(/\/+/g, '/');
}

function slugify(value: string): string { return value.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-').replaceAll(/^-|-$/g, '') || 'imported-character'; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
