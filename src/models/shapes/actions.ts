import { createShapesIdleStates, shapesIdleStates } from './scene';
import type { ModelDefinition } from '../types';
export const shapesModel: ModelDefinition = { id: 'shapes', name: 'Shapes', idle: { states: shapesIdleStates, transition: { durationMs: 950, easing: 'ease-in-out' } } };
export function createShapesModel(pointCount: number): ModelDefinition { return { ...shapesModel, idle: { ...shapesModel.idle, states: createShapesIdleStates(pointCount) } }; }
