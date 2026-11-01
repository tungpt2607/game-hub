import { type EmojiOrImage, type FontValue, type MediaRef } from '@opes/module-sdk/core';

/**
 * Hứng quà + câu hỏi (game.catch-quiz). Mọi kích thước tính theo khung thiết kế 1080 × 1920 px;
 * khi chơi, khung được thu phóng vừa màn hình.
 */
export const DESIGN_W = 1080;
export const DESIGN_H = 1920;

export type GroupEffect = 'score' | 'question' | 'life';
export type WrongPenalty = 'life' | 'points' | 'none';

export interface ItemSymbol extends Record<string, unknown> {
  symbol: EmojiOrImage;
}

export interface ItemGroup extends Record<string, unknown> {
  name: string;
  symbols: ItemSymbol[];
  points: number;
  /** Tỉ lệ xuất hiện tương đối (%). */
  ratio: number;
  effect: GroupEffect;
  glow: string;
  pulse: boolean;
}

export interface Phase extends Record<string, unknown> {
  /** Giai đoạn kéo dài tới giây thứ mấy. */
  until: number;
  /** Tốc độ rơi (px/giây trên khung 1080 × 1920). */
  speed: number;
  /** Nhịp thả một đợt (mili giây). */
  interval: number;
  /** Số vật phẩm mỗi đợt. */
  waveSize: number;
}

export interface Answer extends Record<string, unknown> {
  text: string;
  correct: boolean;
}

export interface Question extends Record<string, unknown> {
  text: string;
  answers: Answer[];
}

export interface CatchQuizConfig {
  start: {
    enabled: boolean;
    title: string;
    text: string;
    logo: MediaRef | null;
    buttonLabel: string;
  };
  look: {
    background: string;
    backgroundImage: MediaRef | null;
    text: string;
    font: FontValue;
    numberFont: FontValue;
    buttonFrom: string;
    buttonTo: string;
    buttonText: string;
    overlayTint: string;
  };
  hud: {
    timerBoard: MediaRef | null;
    timerIcon: MediaRef | null;
    scoreBoard: MediaRef | null;
    heart: EmojiOrImage;
    warnColor: string;
    timerWarnAt: number;
  };
  catcher: {
    normal: EmojiOrImage;
    hurt: EmojiOrImage;
    width: number;
    height: number;
    bottom: number;
    insetX: number;
    catchTop: number;
    catchBottom: number;
    keyboardSpeed: number;
  };
  groups: ItemGroup[];
  rules: {
    duration: number;
    lives: number;
    lanes: number;
    itemSize: number;
    countdown: boolean;
    countdownFrom: number;
    startText: string;
  };
  phases: Phase[];
  quiz: {
    questions: Question[];
    shuffleAnswers: boolean;
    card: MediaRef | null;
    hurtSeconds: number;
    correctBonus: number;
    wrongPenalty: WrongPenalty;
    wrongPoints: number;
    continueLabel: string;
    continueCountdown: boolean;
  };
  end: {
    title: string;
    mascot: EmojiOrImage;
    ctaEnabled: boolean;
    ctaLabel: string;
    ctaUrl: string;
    ctaAppendScore: boolean;
    replayEnabled: boolean;
    replayLabel: string;
  };
  sound: {
    music: MediaRef | null;
    catch: MediaRef | null;
    bad: MediaRef | null;
    correct: MediaRef | null;
    wrong: MediaRef | null;
    end: MediaRef | null;
  };
}
