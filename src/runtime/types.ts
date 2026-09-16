import type { ProceduralActionName } from '../characters/types';

export interface Live2DRuntime {
  load(modelUrl: string): Promise<void>;
  applyExpression(file: string): Promise<void>;
  runProcedural(name: ProceduralActionName, parameters: Readonly<Record<string, string>>): Promise<void>;
  dispose(): void;
}
