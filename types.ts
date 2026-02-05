
export enum SetupType {
  PLAYGROUND = 'Playground',
  BOUNCY_CASTLE = 'Bouncy Castle',
  PIN_MACHINE = 'Pin Machine',
  GRAVITY_WELL = 'Gravity Well',
  THE_GRINDER = 'The Grinder'
}

export interface NarratorComment {
  text: string;
  mood: 'snarky' | 'impressed' | 'concerned' | 'evil';
}

export interface SetupConfig {
  name: string;
  gravity: { x: number; y: number };
  description: string;
}
