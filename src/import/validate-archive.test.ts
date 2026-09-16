import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { validateCharacterArchive } from './validate-archive';

describe('validateCharacterArchive', () => {
  it('rejects an archive containing a traversal path', () => {
    const zip = zipSync({ '../escape.moc3': strToU8('x') });
    expect(() => validateCharacterArchive(zip)).toThrow('Unsafe archive path');
  });

  it('rejects a model with a missing texture', () => {
    const zip = zipSync({
      'model/model.model3.json': strToU8(JSON.stringify({ FileReferences: { Moc: 'model.moc3', Textures: ['missing.png'] } })),
      'model/model.moc3': strToU8('x'),
    });
    expect(() => validateCharacterArchive(zip)).toThrow('Missing model reference: missing.png');
  });
});
