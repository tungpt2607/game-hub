'use client';

import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  createSandboxHost,
  describeForm,
  isHostMessage,
  normalizeConfig,
  serializeSchema,
  validateConfig,
  type CheckResult,
  type GameSource,
  type HostReply,
  type HostRequest,
  type ModuleDefinition,
  type RenderState,
} from '@opes/module-sdk';
import { evaluateGame, loadGame } from '../../lib/load-game';

/** Các tên miền CMS được gửi lệnh tới khung này (đặt lúc build từ CMS_PUBLIC_URL). */
const ALLOWED = (process.env.OPES_CMS_ORIGINS ?? '').split(',').filter(Boolean);

type Mod = ModuleDefinition<unknown>;

class Boundary extends Component<{ children: ReactNode; onCrash: (message: string) => void }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    this.props.onCrash(error.message);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="embed-message" role="alert">
          <strong>Game bị lỗi khi chạy</strong>
          <span>{this.state.error.message}</span>
        </div>
      );
    }
    return this.props.children;
  }
}

async function resolve(source: GameSource): Promise<Mod> {
  if (source.kind === 'version') return loadGame(source.key, source.version);
  return evaluateGame(source.code);
}

export function EmbedClient() {
  const [mod, setMod] = useState<Mod | null>(null);
  const [loadCount, setLoadCount] = useState(0);
  const [render, setRender] = useState<RenderState | null>(null);
  const [standalone, setStandalone] = useState(false);
  const modRef = useRef<Mod | null>(null);
  /** Tên miền CMS đang điều khiển khung (để báo lỗi game về đúng nơi). */
  const parentOrigin = useRef<string | null>(null);
  const host = useMemo(() => createSandboxHost(), []);

  useEffect(() => {
    if (window.parent === window) {
      setStandalone(true);
      return;
    }
    const post = (msg: HostReply, origin: string) => window.parent.postMessage(msg, origin);

    const onMessage = async (event: MessageEvent) => {
      if (event.source !== window.parent || !ALLOWED.includes(event.origin) || !isHostMessage(event.data)) return;
      parentOrigin.current = event.origin;
      const req = event.data as HostRequest;
      if (req.type === 'render') {
        setRender(req.state);
        return;
      }
      const reply = (result: unknown) => post({ opes: 1, type: 'reply', id: req.id, ok: true, result }, event.origin);
      const fail = (e: unknown) =>
        post({ opes: 1, type: 'reply', id: req.id, ok: false, error: e instanceof Error ? e.message : String(e) }, event.origin);
      try {
        if (req.type === 'load') {
          const next = await resolve(req.source);
          modRef.current = next;
          setMod(next);
          setLoadCount((n) => n + 1);
          reply(serializeSchema(next));
          return;
        }
        const current = modRef.current;
        if (!current) throw new Error('Chưa tải game.');
        if (req.type === 'check') {
          const result: CheckResult = {
            errors: validateConfig(current.fields, req.config),
            ...describeForm(current.fields, req.config),
          };
          reply(result);
        } else if (req.type === 'normalize') {
          reply(normalizeConfig(current.fields, req.config, current.defaults));
        }
      } catch (e) {
        fail(e);
      }
    };
    const listener = (event: MessageEvent) => void onMessage(event);
    window.addEventListener('message', listener);
    // Báo cho CMS biết khung đã sẵn sàng (tin này không chứa dữ liệu nào).
    window.parent.postMessage({ opes: 1, type: 'ready' } satisfies HostReply, '*');
    return () => window.removeEventListener('message', listener);
  }, []);

  if (standalone) {
    return (
      <div className="embed-message">
        <strong>Khung xem trước game</strong>
        <span>Trang này chỉ dùng bên trong CMS.</span>
      </div>
    );
  }
  if (!mod || !render) return <div className="embed-root" />;
  const Runtime = mod.Runtime;
  return (
    <div className="embed-root">
      <Boundary
        key={`${loadCount}-${render.run}`}
        onCrash={(message) => {
          const origin = parentOrigin.current;
          if (origin) window.parent.postMessage({ opes: 1, type: 'crash', message } satisfies HostReply, origin);
        }}
      >
        <Runtime config={render.config} host={host} initialScreen={render.screen} muted={render.muted} />
      </Boundary>
    </div>
  );
}
