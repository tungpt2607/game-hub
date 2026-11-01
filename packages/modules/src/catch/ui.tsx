'use client';

import { type ReactNode } from 'react';
import type { CatchConfig } from './config';

export function Centered({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 24,
        textAlign: 'center',
        overflowY: 'auto',
      }}
    >
      {children}
    </div>
  );
}

export function BigButton({
  config,
  onClick,
  children,
  variant = 'solid',
}: {
  config: CatchConfig;
  onClick: () => void;
  children: ReactNode;
  variant?: 'solid' | 'outline';
}) {
  const solid = variant === 'solid';
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minWidth: 180,
        padding: solid ? '14px 36px' : '10px 24px',
        border: solid ? 'none' : `2px solid ${config.look.text}`,
        borderRadius: 999,
        background: solid ? config.look.primary : 'transparent',
        color: solid ? config.look.buttonText : config.look.text,
        fontFamily: 'inherit',
        fontSize: solid ? 20 : 16,
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: solid ? '0 6px 0 rgba(0,0,0,0.25)' : 'none',
      }}
    >
      {children}
    </button>
  );
}
