export type Point = { x: number; y: number };
export type GradientPaint = { type: 'radial-gradient'; innerColor: string; outerColor: string; focal: Point; radius: number };
export type Paint = string | GradientPaint;

export type Transform = {
  position: Point;
  scale: Point;
  rotation: number;
};

type ElementBase = Transform & {
  id: string;
  layer: number;
  opacity: number;
  fill?: Paint;
  stroke?: Paint;
  strokeWidth?: number;
};

export type CircleElement = ElementBase & { kind: 'circle' | 'particle'; radius: number };
export type RectElement = ElementBase & { kind: 'rect'; width: number; height: number; cornerRadius?: number };
export type LineElement = ElementBase & { kind: 'line'; to: Point };
export type PathElement = ElementBase & { kind: 'path'; points: Point[]; closed: boolean };
export type TextElement = ElementBase & { kind: 'text'; text: string; fontSize: number; fontFamily?: string; align?: CanvasTextAlign };
export type GroupElement = ElementBase & { kind: 'group'; children: string[] };

export type VisualElement = CircleElement | RectElement | LineElement | PathElement | TextElement | GroupElement;

export type VisualState = { elements: VisualElement[] };

export type EasingName = 'linear' | 'ease-out' | 'ease-in-out' | 'spring';
export type TransitionOptions = { durationMs: number; easing: EasingName };
export type ActionId = 'idle' | 'think' | 'listen' | 'search' | 'happy' | 'sleep' | 'reset';

export type RegisteredAction = {
  id: ActionId;
  target: VisualState;
  transition: TransitionOptions;
};
