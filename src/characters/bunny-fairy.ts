import type { CharacterDefinition } from './types';

export const bunnyFairy: CharacterDefinition = {
  id: 'bunny-fairy',
  name: 'Bunny Fairy',
  modelPath: 'characters/bunny-fairy/model/bunny_vts.model3.json',
  actions: {
    idle: { kind: 'procedural', name: 'idle' },
    speak: { kind: 'procedural', name: 'speak' },
    wave: { kind: 'procedural', name: 'wave' },
    fox_ear_color: { kind: 'procedural', name: 'fox-ear-color' },
    turn_180: { kind: 'expression', file: 'expressions/180.exp3.json' },
    angry: { kind: 'expression', file: 'expressions/ANGRY.exp3.json' },
    beer: { kind: 'expression', file: 'expressions/BEER.exp3.json' },
    blush: { kind: 'expression', file: 'expressions/Blush.exp3.json' },
    bunny_suit: { kind: 'expression', file: 'expressions/BUNNY SUIT.exp3.json' },
    fox_ear: { kind: 'expression', file: 'expressions/FOX EAR (CAN CHANGE COLOR).exp3.json' },
    hammer: { kind: 'expression', file: 'expressions/hammer.exp3.json' },
    knife: { kind: 'expression', file: 'expressions/KNIFE.exp3.json' },
    no1_flag: { kind: 'expression', file: 'expressions/NO1 Flag.exp3.json' },
    sad: { kind: 'expression', file: 'expressions/sad eyes.exp3.json' },
    shotgun: { kind: 'expression', file: 'expressions/SHOTGUN.exp3.json' },
    ipad: { kind: 'expression', file: 'expressions/TTBlack ipad.exp3.json' },
    ttvava: { kind: 'expression', file: 'expressions/TTvava.exp3.json' },
    ungo: { kind: 'expression', file: 'expressions/ungo.exp3.json' },
    what: { kind: 'expression', file: 'expressions/WHAT.exp3.json' },
  },
};
