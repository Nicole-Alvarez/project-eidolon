import { bunnyFairy } from './bunny-fairy';
import type { CharacterDefinition } from './types';

const bundledCharacters = new Map([[bunnyFairy.id, bunnyFairy]]);

export function getCharacter(id: string): CharacterDefinition | undefined {
  return bundledCharacters.get(id);
}

export function getBundledCharacters(): readonly CharacterDefinition[] {
  return [...bundledCharacters.values()];
}
