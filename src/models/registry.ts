import { blobModel } from './blob';
import { shapesModel } from './shapes';
import type { ModelDefinition, ModelId } from './types';
export const models: Record<ModelId, ModelDefinition> = { blob: blobModel, shapes: shapesModel };
export const modelList = [blobModel, shapesModel];
