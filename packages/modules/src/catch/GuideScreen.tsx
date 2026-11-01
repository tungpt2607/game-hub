'use client';

import {} from 'react';
import { EmojiOrImageView } from '@opes/module-sdk/react';
import type { CatchConfig } from './config';
import { BigButton, Centered } from './ui';

function itemNote(item: CatchConfig['items'][number], usesLives: boolean): string {
  const parts: string[] = [];
  if (item.points !== 0) parts.push(`${item.points > 0 ? '+' : ''}${item.points} điểm`);
  if (usesLives && item.loseLifeOnCatch) parts.push('hứng phải mất 1 mạng');
  if (usesLives && item.loseLifeOnMiss) parts.push('để rơi mất 1 mạng');
  return parts.join(' · ') || 'Không tính điểm';
}

export function GuideScreen({ config, onPlay }: { config: CatchConfig; onPlay: () => void }) {
  const usesLives = config.rules.endMode !== 'time';
  const usesTime = config.rules.endMode !== 'lives';
  const rules = [
    usesTime ? `⏱ ${config.rules.duration} giây` : '',
    usesLives ? `❤️ ${config.rules.lives} mạng` : '',
  ]
    .filter(Boolean)
    .join('   ');
  return (
    <Centered>
      <h2 style={{ margin: 0, fontSize: 28 }}>Cách chơi</h2>
      {config.guide.text && (
        <p style={{ margin: 0, fontSize: 16, whiteSpace: 'pre-line' }}>{config.guide.text}</p>
      )}
      {config.guide.image && (
        <img
          src={config.guide.image.url}
          alt=""
          style={{ maxWidth: '80%', maxHeight: 160, objectFit: 'contain' }}
        />
      )}
      <div
        style={{
          display: 'grid',
          gap: 8,
          width: '100%',
          maxWidth: 320,
          padding: 12,
          borderRadius: 16,
          background: 'rgba(0,0,0,0.18)',
          textAlign: 'left',
        }}
      >
        {config.items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 40, display: 'flex', justifyContent: 'center' }}>
              <EmojiOrImageView value={item.symbol} size={36} />
            </span>
            <span style={{ fontSize: 16, fontWeight: 600 }}>{itemNote(item, usesLives)}</span>
          </div>
        ))}
      </div>
      {rules && <div style={{ fontSize: 16, fontWeight: 600 }}>{rules}</div>}
      <BigButton config={config} onClick={onPlay}>
        {config.guide.playLabel}
      </BigButton>
    </Centered>
  );
}
