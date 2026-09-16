import type { ValidatedAction } from '../actions/contract';
import type { CharacterDefinition } from '../characters/types';
import type { Live2DRuntime } from './types';

export class CharacterRuntime {
  private character: CharacterDefinition | undefined;
  private disposed = false;

  constructor(private readonly renderer: Live2DRuntime) {}

  async load(character: CharacterDefinition): Promise<void> {
    this.assertActive();
    this.character = character;
    await this.renderer.load(character.modelPath);
    await this.enterIdle();
  }

  async execute(actions: readonly ValidatedAction[]): Promise<void> {
    this.assertActive();
    const character = this.requireCharacter();
    for (const action of actions) {
      const definition = character.actions[action.action];
      if (!definition) throw new Error(`Unsupported character action: ${action.action}`);
      if (definition.kind === 'expression') await this.renderer.applyExpression(definition.file);
      else await this.renderer.runProcedural(definition.name, action.parameters);
    }
    if (!actions.every((action) => action.action === 'idle')) await this.enterIdle();
  }

  async enterIdle(): Promise<void> {
    this.assertActive();
    await this.renderer.runProcedural('idle', {});
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.renderer.dispose();
  }

  private requireCharacter(): CharacterDefinition {
    if (!this.character) throw new Error('Character is not loaded');
    return this.character;
  }

  private assertActive(): void {
    if (this.disposed) throw new Error('Character runtime is disposed');
  }
}
