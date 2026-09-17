import { blobScenes } from './scene';
import type { ModelDefinition } from '../types';
export const blobModel: ModelDefinition = { id: 'blob', name: 'Blob', idle: { states: [blobScenes.idle, blobScenes.think, blobScenes.listen, blobScenes.search, blobScenes.happy, blobScenes.sleep], transition: { durationMs: 750, easing: 'ease-out' } } };
