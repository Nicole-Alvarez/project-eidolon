import { MorphController } from './morph-controller';
import type { VisualState } from './types';
import type { ModelDefinition } from '../models/types';

export class ActionEngine {
  readonly controller: MorphController;
  private index = 0;
  private nextAt = 2_600;
  constructor(private readonly model: ModelDefinition) { this.controller = new MorphController(model.idle.states[0]); }
  tick(timestamp: number): VisualState {
    if (timestamp >= this.nextAt) { this.index = (this.index + 1) % this.model.idle.states.length; this.controller.start(this.model.idle.states[this.index], this.model.idle.transition, timestamp); this.nextAt = timestamp + 2_600; }
    const state = this.controller.sample(timestamp); const breath = Math.sin(timestamp / 700) * .025; const drift = Math.sin(timestamp / 1100) * 3;
    return { elements: state.elements.map((element) => element.id === 'body' ? { ...element, position: { ...element.position, y: element.position.y + drift }, scale: { ...element.scale, y: element.scale.y + breath } } : element) };
  }
}
