'use client';

import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import type { RuntimeProps } from '@opes/module-sdk';
import { useFont, useSound } from '@opes/module-sdk/react';
import type { CatchConfig } from './config';
import { readBest, writeBest } from './best-score';
import { BigButton, Centered } from './ui';
import { GuideScreen } from './GuideScreen';
import { PlayScene } from './PlayScene';
import { EndScreen } from './EndScreen';

type Screen = 'intro' | 'guide' | 'play' | 'end';

const CSS = `
@keyframes opes-catch-pop { from { transform: scale(.6); opacity: 0 } to { transform: scale(1); opacity: 1 } }
@keyframes opes-catch-banner { 0% { transform: scale(.7); opacity: 0 } 15% { transform: scale(1.05); opacity: 1 } 80% { opacity: 1 } 100% { opacity: 0 } }
@media (prefers-reduced-motion: reduce) { .opes-catch-anim { animation: none !important } }
`;

export function CatchRuntime({
  config,
  host,
  initialScreen,
  muted,
  storageKey,
}: RuntimeProps<CatchConfig>) {
  const fontFamily = useFont(config.look.font);
  const music = useSound(config.sound.music, { muted, loop: true, volume: 0.45 });
  const catchSound = useSound(config.sound.catch, { muted });
  const badSound = useSound(config.sound.bad, { muted });
  const endSound = useSound(config.sound.end, { muted });

  const firstScreen: Screen =
    initialScreen === 'play' || initialScreen === 'end'
      ? initialScreen
      : initialScreen === 'guide' && config.guide.enabled
        ? 'guide'
        : 'intro';
  const [screen, setScreen] = useState<Screen>(firstScreen);
  const [runKey, setRunKey] = useState(0);
  const [result, setResult] = useState({ score: 0, best: null as number | null, newBest: false });
  const bestKey = `opes-catch-best:${storageKey ?? `${host.mode}-preview`}`;

  useEffect(() => {
    setResult((r) => ({ ...r, best: readBest(bestKey) }));
  }, [bestKey]);

  useEffect(() => () => music.stop(), [music]);

  const play = useCallback(() => {
    setScreen('play');
    setRunKey((k) => k + 1);
    music.play();
  }, [music]);

  const finish = useCallback(
    (score: number) => {
      music.stop();
      endSound.play();
      const prev = readBest(bestKey);
      const newBest = prev === null || score > prev;
      if (newBest) writeBest(bestKey, score);
      setResult({ score, best: newBest ? score : prev, newBest: newBest && prev !== null });
      setScreen('end');
    },
    [music, endSound, bestKey],
  );

  const root: CSSProperties = {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    fontFamily,
    color: config.look.text,
    background: config.look.background,
    backgroundImage: config.look.backgroundImage
      ? `url(${JSON.stringify(config.look.backgroundImage.url)})`
      : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
  };

  return (
    <div style={root}>
      <style>{CSS}</style>
      {screen === 'intro' && (
        <Centered>
          {config.content.logo && (
            <img
              src={config.content.logo.url}
              alt=""
              style={{ maxWidth: '62%', maxHeight: 130, objectFit: 'contain' }}
            />
          )}
          <h1 style={{ margin: 0, fontSize: 34, lineHeight: 1.15 }}>{config.content.title}</h1>
          {config.content.intro && (
            <p style={{ margin: 0, fontSize: 17, opacity: 0.92, whiteSpace: 'pre-line' }}>
              {config.content.intro}
            </p>
          )}
          <BigButton
            config={config}
            onClick={() => (config.guide.enabled ? setScreen('guide') : play())}
          >
            {config.content.startLabel}
          </BigButton>
        </Centered>
      )}

      {screen === 'guide' && <GuideScreen config={config} onPlay={play} />}

      {screen === 'play' && (
        <PlayScene
          key={runKey}
          config={config}
          host={host}
          sounds={{ catch: catchSound, bad: badSound }}
          onEnd={finish}
        />
      )}

      {screen === 'end' && <EndScreen config={config} result={result} onReplay={play} />}
    </div>
  );
}
