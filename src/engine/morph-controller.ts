import { interpolateState } from './interpolate';
import type { TransitionOptions, VisualState } from './types';

export class MorphController {
  private source: VisualState;
  private target: VisualState;
  private startedAt = 0;
  private options: TransitionOptions = { durationMs: 1, easing: 'linear' };

  constructor(initial: VisualState) {
    this.source = initial;
    this.target = initial;
  }

  start(target: VisualState, options: TransitionOptions, timestamp: number): void {
    this.source = this.sample(timestamp);
    this.target = target;
    this.options = options;
    this.startedAt = timestamp;
  }

  sample(timestamp: number): VisualState {
    const rawProgress = this.options.durationMs <= 0 ? 1 : (timestamp - this.startedAt) / this.options.durationMs;
    return interpolateState(this.source, this.target, ease(this.options.easing, Math.min(1, Math.max(0, rawProgress))));
  }

  isComplete(timestamp: number): boolean {
    return timestamp >= this.startedAt + this.options.durationMs;
  }
}

function ease(name: TransitionOptions['easing'], progress: number): number {
  if (name === 'ease-out') return 1 - (1 - progress) ** 3;
  if (name === 'ease-in-out') return progress < .5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
  if (name === 'spring') return 1 - Math.cos(progress * Math.PI * 1.5) * Math.exp(-5 * progress);
  return progress;
}
