import type { Point, VisualState } from '../../engine/types';
import { sampleClosedSpline } from '../../shared/geometry';

type SceneRecipe = {
  body: Point[];
  innerColor: string;
  outerColor: string;
  orbitOffset: number;
  eyeY: number;
  sparkY: number;
};

const baseline: SceneRecipe = {
  body: [{ x: 65, y: 90 }, { x: 120, y: 48 }, { x: 205, y: 58 }, { x: 255, y: 118 }, { x: 245, y: 200 }, { x: 175, y: 250 }, { x: 88, y: 232 }, { x: 48, y: 164 }],
  innerColor: '#6b7cff', outerColor: '#2ac7f4', orbitOffset: 0, eyeY: 145, sparkY: 58,
};

function scene(recipe: SceneRecipe): VisualState {
  return {
    elements: [
      { id: 'body', kind: 'path', layer: 2, opacity: 1, position: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, rotation: 0, fill: { type: 'radial-gradient', innerColor: recipe.innerColor, outerColor: recipe.outerColor, focal: { x: 145, y: 126 }, radius: 176 }, points: sampleClosedSpline(recipe.body, 2048), closed: true },
      { id: 'highlight', kind: 'path', layer: 3, opacity: 0.34, position: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, rotation: 0, fill: '#f4f8ff', points: [{ x: 105, y: 88 }, { x: 164, y: 66 }, { x: 204, y: 115 }, { x: 148, y: 142 }], closed: true },
      { id: 'left-orbit', kind: 'line', layer: 1, opacity: 0.7, position: { x: 43, y: 126 + recipe.orbitOffset }, scale: { x: 1, y: 1 }, rotation: -0.34, stroke: '#9077ff', strokeWidth: 3, to: { x: 250, y: 0 } },
      { id: 'right-orbit', kind: 'line', layer: 1, opacity: 0.6, position: { x: 58, y: 198 - recipe.orbitOffset }, scale: { x: 1, y: 1 }, rotation: 0.28, stroke: '#49d7ff', strokeWidth: 3, to: { x: 210, y: 0 } },
      { id: 'left-eye', kind: 'path', layer: 4, opacity: 0.9, position: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, rotation: 0, stroke: '#ffffff', strokeWidth: 7, points: [{ x: 120, y: recipe.eyeY }, { x: 130, y: recipe.eyeY - 10 }, { x: 140, y: recipe.eyeY }], closed: false },
      { id: 'right-eye', kind: 'path', layer: 4, opacity: 0.9, position: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, rotation: 0, stroke: '#ffffff', strokeWidth: 7, points: [{ x: 164, y: recipe.eyeY }, { x: 174, y: recipe.eyeY - 10 }, { x: 184, y: recipe.eyeY }], closed: false },
      { id: 'spark-a', kind: 'particle', layer: 3, opacity: 0.9, position: { x: 55, y: recipe.sparkY }, scale: { x: 1, y: 1 }, rotation: 0, radius: 13, fill: '#ff9b75' },
      { id: 'spark-b', kind: 'particle', layer: 3, opacity: 0.85, position: { x: 258, y: 228 - recipe.orbitOffset }, scale: { x: 1, y: 1 }, rotation: 0, radius: 11, fill: '#c35cff' },
    ],
  };
}

export const blobScenes = {
  idle: scene(baseline),
  think: scene({ ...baseline, body: [{ x: 54, y: 84 }, { x: 126, y: 39 }, { x: 216, y: 68 }, { x: 264, y: 134 }, { x: 230, y: 210 }, { x: 164, y: 258 }, { x: 75, y: 220 }, { x: 42, y: 147 }], innerColor: '#8e5cff', outerColor: '#3f79ff', orbitOffset: -16, eyeY: 132, sparkY: 42 }),
  listen: scene({ ...baseline, body: [{ x: 58, y: 74 }, { x: 139, y: 47 }, { x: 225, y: 71 }, { x: 251, y: 147 }, { x: 235, y: 218 }, { x: 147, y: 247 }, { x: 60, y: 213 }, { x: 39, y: 133 }], innerColor: '#60d9ff', outerColor: '#4f7dff', orbitOffset: 12, eyeY: 153, sparkY: 68 }),
  search: scene({ ...baseline, body: [{ x: 46, y: 108 }, { x: 108, y: 43 }, { x: 207, y: 47 }, { x: 271, y: 111 }, { x: 249, y: 197 }, { x: 191, y: 264 }, { x: 89, y: 241 }, { x: 34, y: 179 }], innerColor: '#4f9bff', outerColor: '#37e3d5', orbitOffset: 22, eyeY: 139, sparkY: 34 }),
  happy: scene({ ...baseline, body: [{ x: 55, y: 95 }, { x: 124, y: 31 }, { x: 218, y: 62 }, { x: 270, y: 129 }, { x: 237, y: 226 }, { x: 172, y: 266 }, { x: 78, y: 225 }, { x: 31, y: 150 }], innerColor: '#ff7ac4', outerColor: '#7a67ff', orbitOffset: -24, eyeY: 151, sparkY: 25 }),
  sleep: scene({ ...baseline, body: [{ x: 58, y: 126 }, { x: 126, y: 85 }, { x: 208, y: 90 }, { x: 252, y: 147 }, { x: 229, y: 214 }, { x: 167, y: 239 }, { x: 79, y: 220 }, { x: 42, y: 171 }], innerColor: '#7b70d8', outerColor: '#3a4c99', orbitOffset: 5, eyeY: 161, sparkY: 84 }),
};
