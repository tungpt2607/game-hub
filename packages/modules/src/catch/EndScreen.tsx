'use client';

import { useState } from 'react';
import type { CatchConfig } from './config';
import { pickEndMessage } from './engine';
import { BigButton, Centered } from './ui';
import { Confetti } from './Confetti';

export function EndScreen({
  config,
  result,
  onReplay,
}: {
  config: CatchConfig;
  result: { score: number; best: number | null; newBest: boolean };
  onReplay: () => void;
}) {
  const [note, setNote] = useState<string | null>(null);
  const message = pickEndMessage(config.end.messages, result.score);

  const share = async () => {
    const text = config.end.shareText.replaceAll('{score}', String(result.score));
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: config.content.title, text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`.trim());
      setNote('Đã sao chép link, dán vào Zalo/Facebook để chia sẻ.');
    } catch {
      // Người chơi đóng bảng chia sẻ: không cần báo gì.
    }
  };

  return (
    <>
      <Confetti colors={[config.look.primary, config.look.text, '#FACC15', '#22C55E', '#EC4899']} />
      <Centered>
        <h1 style={{ margin: 0, fontSize: 32 }}>{config.end.title}</h1>
        <div
          style={{
            fontSize: 76,
            fontWeight: 800,
            lineHeight: 1,
            textShadow: '0 4px 12px rgba(0,0,0,0.25)',
          }}
        >
          {result.score}
        </div>
        {config.end.showBest && result.best !== null && (
          <div style={{ fontSize: 16, fontWeight: 600, opacity: 0.95 }}>
            {result.newBest ? '🏆 Kỷ lục mới!' : `🏆 Cao nhất: ${result.best}`}
          </div>
        )}
        {message && <p style={{ margin: 0, fontSize: 18, whiteSpace: 'pre-line' }}>{message}</p>}
        <BigButton config={config} onClick={onReplay}>
          {config.end.replayLabel}
        </BigButton>
        {config.end.ctaEnabled && config.end.ctaUrl && (
          <BigButton
            config={config}
            variant="outline"
            onClick={() => window.open(config.end.ctaUrl, '_blank', 'noopener,noreferrer')}
          >
            {config.end.ctaLabel}
          </BigButton>
        )}
        {config.end.shareEnabled && (
          <BigButton config={config} variant="outline" onClick={() => void share()}>
            Chia sẻ
          </BigButton>
        )}
        {note && <div style={{ fontSize: 14 }}>{note}</div>}
      </Centered>
    </>
  );
}
