import type { TransitionOptions, VisualState } from '../engine/types';
export type ModelId = 'blob' | 'shapes';
export type ModelDefinition = { id: ModelId; name: string; idle: { states: VisualState[]; transition: TransitionOptions } };
