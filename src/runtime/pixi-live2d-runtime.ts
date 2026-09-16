import { Application } from 'pixi.js';
import type { ProceduralActionName } from '../characters/types';
import type { Live2DRuntime } from './types';

type CoreModel = {
  setParameterValueById(id: string, value: number): void;
  addParameterValueById(id: string, value: number): void;
};

type ModelFacade = {
  x: number;
  y: number;
  scale: { set(value: number): void };
  width: number;
  height: number;
  internalModel: { coreModel: CoreModel };
  destroy(options?: unknown): void;
};

type Live2DFactory = { from(url: string, options?: unknown): Promise<ModelFacade> };

declare global {
  var Live2DCubismCore: unknown | undefined;
}

export class PixiLive2DRuntime implements Live2DRuntime {
  private app: Application | undefined;
  private model: ModelFacade | undefined;
  private modelUrl: string | undefined;
  private idleTimer: number | undefined;

  constructor(private readonly canvas: HTMLCanvasElement) {}

  async load(modelUrl: string): Promise<void> {
    if (!globalThis.Live2DCubismCore) {
      throw new Error('Cubism Core is not installed. Add the licensed Core build to src/vendor/live2dcubismcore.min.js.');
    }
    this.dispose();
    const { Live2DModel } = await import('pixi-live2d-display/cubism4') as { Live2DModel: Live2DFactory };
    this.app = new Application({ view: this.canvas, transparent: true, resizeTo: this.canvas.parentElement ?? undefined });
    this.model = await Live2DModel.from(modelUrl, { autoInteract: false });
    this.modelUrl = modelUrl;
    this.fitModel();
    this.app.stage.addChild(this.model as never);
  }

  async applyExpression(file: string): Promise<void> {
    const model = this.requireModel();
    const url = new URL(`../${file}`, this.requireModelUrl());
    const response = await fetch(url);
    if (!response.ok) throw new Error('Character expression could not be loaded');
    const expression: unknown = await response.json();
    if (!isExpression(expression)) throw new Error('Character expression is invalid');
    for (const parameter of expression.Parameters) {
      if (parameter.Blend === 'Add') model.internalModel.coreModel.addParameterValueById(parameter.Id, parameter.Value);
      else model.internalModel.coreModel.setParameterValueById(parameter.Id, parameter.Value);
    }
  }

  async runProcedural(name: ProceduralActionName, parameters: Readonly<Record<string, string>>): Promise<void> {
    const core = this.requireModel().internalModel.coreModel;
    if (name === 'idle') {
      if (this.idleTimer !== undefined) return;
      this.idleTimer = window.setInterval(() => {
        const phase = Date.now() / 800;
        core.setParameterValueById('ParamBreath', 0.5 + Math.sin(phase) * 0.15);
        core.setParameterValueById('ParamHairFront', Math.sin(phase / 2) * 0.2);
      }, 32);
      return;
    }
    this.stopIdle();
    if (name === 'wave') await this.oscillate('ParamAngleZ', 15, 550);
    if (name === 'fox-ear-color') core.setParameterValueById('Param10', 1);
    if (name === 'speak') await this.speak(parameters.text ?? '');
  }

  dispose(): void {
    this.stopIdle();
    this.model?.destroy({ children: true });
    this.model = undefined;
    this.app?.destroy(true, { children: true });
    this.app = undefined;
    this.modelUrl = undefined;
    globalThis.speechSynthesis?.cancel();
  }

  private async speak(text: string): Promise<void> {
    const core = this.requireModel().internalModel.coreModel;
    if ('speechSynthesis' in globalThis && text) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => core.setParameterValueById('ParamMouthOpenY', 0);
      globalThis.speechSynthesis.speak(utterance);
    }
    await this.oscillate('ParamMouthOpenY', 1, Math.min(2_000, Math.max(250, text.length * 35)));
  }

  private async oscillate(parameter: string, amplitude: number, duration: number): Promise<void> {
    const core = this.requireModel().internalModel.coreModel;
    const started = performance.now();
    await new Promise<void>((resolve) => {
      const tick = (now: number) => {
        const progress = Math.min(1, (now - started) / duration);
        core.setParameterValueById(parameter, Math.sin(progress * Math.PI * 4) * amplitude * (1 - progress));
        if (progress < 1) requestAnimationFrame(tick); else resolve();
      };
      requestAnimationFrame(tick);
    });
    core.setParameterValueById(parameter, 0);
  }

  private fitModel(): void {
    const model = this.requireModel();
    const width = this.canvas.clientWidth || 320;
    const height = this.canvas.clientHeight || 420;
    model.scale.set(Math.min(width / model.width, height / model.height) * 0.9);
    model.x = width / 2;
    model.y = height / 2;
  }

  private stopIdle(): void {
    if (this.idleTimer !== undefined) window.clearInterval(this.idleTimer);
    this.idleTimer = undefined;
  }

  private requireModel(): ModelFacade {
    if (!this.model) throw new Error('Live2D model is not loaded');
    return this.model;
  }

  private requireModelUrl(): string {
    if (!this.modelUrl) throw new Error('Live2D model is not loaded');
    return this.modelUrl;
  }
}

function isExpression(value: unknown): value is { Parameters: Array<{ Id: string; Value: number; Blend?: string }> } {
  return typeof value === 'object' && value !== null && 'Parameters' in value && Array.isArray((value as { Parameters: unknown }).Parameters) &&
    (value as { Parameters: unknown[] }).Parameters.every((parameter) => typeof parameter === 'object' && parameter !== null && typeof (parameter as { Id?: unknown }).Id === 'string' && typeof (parameter as { Value?: unknown }).Value === 'number');
}
