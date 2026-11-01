import { type EmojiOrImage, type FontValue, type MediaRef } from '@opes/module-sdk/core';

export type EndMode = 'time' | 'lives' | 'either';
export type DifficultyMode = 'ramp' | 'levels';
export type BasketSize = 'small' | 'medium' | 'large';

export interface CatchItem extends Record<string, unknown> {
  symbol: EmojiOrImage;
  points: number;
  /** Tần suất xuất hiện tương đối (1–10). */
  weight: number;
  loseLifeOnCatch: boolean;
  loseLifeOnMiss: boolean;
}

export interface EndMessage extends Record<string, unknown> {
  minScore: number;
  message: string;
}

export interface CatchConfig {
  content: {
    title: string;
    intro: string;
    startLabel: string;
    logo: MediaRef | null;
  };
  guide: {
    enabled: boolean;
    text: string;
    image: MediaRef | null;
    playLabel: string;
  };
  look: {
    background: string;
    backgroundImage: MediaRef | null;
    text: string;
    primary: string;
    buttonText: string;
    font: FontValue;
  };
  basket: {
    symbol: EmojiOrImage;
    size: BasketSize;
  };
  rules: {
    endMode: EndMode;
    duration: number;
    lives: number;
    countdown: boolean;
  };
  difficulty: {
    mode: DifficultyMode;
    fallStart: number;
    fallEnd: number;
    spawnStart: number;
    spawnEnd: number;
    rampSeconds: number;
    pointsPerLevel: number;
    maxLevel: number;
  };
  items: CatchItem[];
  sound: {
    music: MediaRef | null;
    catch: MediaRef | null;
    bad: MediaRef | null;
    end: MediaRef | null;
  };
  end: {
    title: string;
    messages: EndMessage[];
    showBest: boolean;
    replayLabel: string;
    ctaEnabled: boolean;
    ctaLabel: string;
    ctaUrl: string;
    shareEnabled: boolean;
    shareText: string;
  };
}
