'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import type { TryResponse } from '@opes/contracts';
import { createSandboxHost, type ModuleDefinition } from '@opes/module-sdk';
import { t } from '@opes/i18n';
import { loadGame } from '../../../lib/load-game';

type State =
  | { kind: 'loading' }
  | { kind: 'network' }
  | { kind: 'response'; data: TryResponse };

async function fetchTry(token: string): Promise<TryResponse | null> {
  try {
    const res = await fetch(`/api/public/try/${encodeURIComponent(token)}`, { cache: 'no-store', credentials: 'same-origin' });
    return (await res.json()) as TryResponse;
  } catch {
    return null;
  }
}

function Message({ title, text }: { title: string; text?: string }) {
  return (
    <main className="screen">
      <div className="card" role="status">
        <h1>{title}</h1>
        {text && <p>{text}</p>}
      </div>
    </main>
  );
}

function PasswordForm({ token, title, onUnlocked }: { token: string; title: string; onUnlocked: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/try/${encodeURIComponent(token)}/unlock`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
        credentials: 'same-origin',
      });
      if (res.ok) {
        onUnlocked();
        return;
      }
      const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      setError(body?.error?.message ?? t('play.try.wrongPassword'));
    } catch {
      setError(t('play.try.network'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="screen">
      <form className="card" onSubmit={submit}>
        <div aria-hidden="true" style={{ fontSize: 40 }}>
          🔒
        </div>
        <h1>{title}</h1>
        <p>{t('play.try.passwordLead')}</p>
        <label className="field">
          <span>{t('play.try.password')}</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            autoComplete="off"
            required
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="primary" disabled={busy || !password}>
          {busy ? t('play.try.checking') : t('play.try.unlock')}
        </button>
      </form>
    </main>
  );
}

type GameState = { kind: 'loading' } | { kind: 'ready'; mod: ModuleDefinition<unknown> } | { kind: 'error' };

function Game({
  token,
  moduleKey,
  moduleVersion,
  config,
  title,
}: {
  token: string;
  moduleKey: string;
  moduleVersion: string;
  config: Record<string, unknown>;
  title: string;
}) {
  const [game, setGame] = useState<GameState>({ kind: 'loading' });
  const host = useMemo(() => createSandboxHost(), []);
  const [muted, setMuted] = useState(false);
  useEffect(() => {
    document.title = title;
  }, [title]);
  useEffect(() => {
    let alive = true;
    setGame({ kind: 'loading' });
    loadGame(moduleKey, moduleVersion).then(
      (mod) => alive && setGame({ kind: 'ready', mod }),
      () => alive && setGame({ kind: 'error' }),
    );
    return () => {
      alive = false;
    };
  }, [moduleKey, moduleVersion]);
  if (game.kind === 'loading') return <Loading />;
  if (game.kind === 'error') return <Message title={t('play.try.gameErrorTitle')} text={t('play.try.gameErrorText')} />;
  const Runtime = game.mod.Runtime;
  return (
    <div className="game-backdrop">
      <div className="game-frame">
        <Runtime config={config} host={host} muted={muted} storageKey={`try:${token}`} />
        <button
          type="button"
          className="sound-toggle"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? t('play.try.unmute') : t('play.try.mute')}
          aria-pressed={muted}
        >
          {muted ? '🔇' : '🔊'}
        </button>
        <div className="try-badge">{t('play.try.badge')}</div>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <main className="screen">
      <div className="card" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true" />
        <h1>{t('play.try.preparing')}</h1>
      </div>
    </main>
  );
}

export function TryClient({ token }: { token: string }) {
  const [state, setState] = useState<State>({ kind: 'loading' });

  const load = useCallback(async () => {
    const data = await fetchTry(token);
    setState(data ? { kind: 'response', data } : { kind: 'network' });
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.kind === 'loading') return <Loading />;
  if (state.kind === 'network') return <Message title={t('play.try.networkTitle')} text={t('play.try.network')} />;

  const data = state.data;
  switch (data.status) {
    case 'ok':
      return (
        <Game
          token={token}
          moduleKey={data.moduleKey}
          moduleVersion={data.moduleVersion}
          config={data.config}
          title={data.title}
        />
      );
    case 'password_required':
      return <PasswordForm token={token} title={data.title} onUnlocked={() => void load()} />;
    case 'expired':
      return <Message title={t('play.try.expiredTitle')} text={t('play.try.askSender')} />;
    case 'disabled':
      return <Message title={t('play.try.disabledTitle')} text={t('play.try.askSender')} />;
    case 'not_published':
      return <Message title={t('play.try.notPublishedTitle')} text={t('play.try.notPublishedText')} />;
    default:
      return <Message title={t('play.try.notFoundTitle')} text={t('play.try.notFoundText')} />;
  }
}
