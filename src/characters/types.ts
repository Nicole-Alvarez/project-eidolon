export type ProceduralActionName = 'idle' | 'wave' | 'speak' | 'fox-ear-color';

export type CharacterActionDefinition =
  | { kind: 'expression'; file: string }
  | { kind: 'procedural'; name: ProceduralActionName };

export type CharacterDefinition = {
  id: string;
  name: string;
  modelPath: string;
  actions: Readonly<Record<string, CharacterActionDefinition>>;
};
