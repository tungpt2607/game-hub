'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameModuleListResponse, GameModuleSummary } from '@opes/contracts';
import type { CheckResult, GameSource, SerializedSchema } from '@opes/module-sdk';
import { api } from '../lib/api';
import { FRAME_ALLOW, FRAME_SANDBOX, GameClient, gameHostUrl, sourceKey } from './game-client';

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Form của một game chạy trong khung cách ly ẩn: tải mô tả form (lược đồ trường, mặc định, mẫu) và
 * kiểm tra cấu hình mỗi lần đổi (lỗi, trường ẩn, tên phần tử danh sách). Cấu hình rỗng = mặc định.
 */
export function useGameForm(source: GameSource | null, config: unknown) {
  const [schema, setSchema] = useState<SerializedSchema | null>(null);
  const [check, setCheck] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const client = useRef<GameClient | null>(null);
  const seq = useRef(0);
  const key = source ? sourceKey(source) : null;

  useEffect(() => {
    if (!source) return;
    let alive = true;
    setSchema(null);
    setCheck(null);
    setError(null);
    const frame = document.createElement('iframe');
    frame.title = 'Khung kiểm tra cấu hình game';
    frame.setAttribute('sandbox', FRAME_SANDBOX);
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    Object.assign(frame.style, { position: 'fixed', width: '1px', height: '1px', left: '-10px', top: '-10px', border: '0', opacity: '0' });
    document.body.appendChild(frame);
    let current: GameClient | null = null;
    gameHostUrl()
      .then((url) => {
        if (!alive) return;
        current = new GameClient(frame, url);
        client.current = current;
        return current.load(source).then((s) => alive && setSchema(s));
      })
      .catch((e: unknown) => alive && setError(errorText(e)));
    return () => {
      alive = false;
      current?.destroy();
      client.current = null;
      frame.remove();
    };
    // `key` đại diện cho `source` (object mới ở mỗi lần render).
  }, [key]);

  useEffect(() => {
    if (!schema || !client.current) return;
    const id = ++seq.current;
    // Chưa có cấu hình riêng thì kiểm tra cấu hình mặc định của game.
    client.current.check(config === undefined || config === null ? schema.defaults : config).then(
      (r) => id === seq.current && setCheck(r),
      (e: unknown) => id === seq.current && setError(errorText(e)),
    );
  }, [schema, config]);

  const normalize = useCallback(async (raw: unknown) => {
    if (!client.current) throw new Error('Chưa tải game.');
    return client.current.normalize(raw);
  }, []);

  return { schema, check, error, normalize };
}

/** Khung xem trước hiện trên trang: tạo client cho iframe `frame`, tải game, trả về mô tả game. */
export function useGameFrame(frame: HTMLIFrameElement | null, source: GameSource) {
  const [schema, setSchema] = useState<SerializedSchema | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [client, setClient] = useState<GameClient | null>(null);
  const key = sourceKey(source);

  useEffect(() => {
    if (!frame) return;
    let alive = true;
    let current: GameClient | null = null;
    setSchema(null);
    setError(null);
    gameHostUrl()
      .then((url) => {
        if (!alive) return;
        current = new GameClient(frame, url);
        setClient(current);
        return current.load(source).then((s) => alive && setSchema(s));
      })
      .catch((e: unknown) => alive && setError(errorText(e)));
    return () => {
      alive = false;
      current?.destroy();
      setClient(null);
    };
    // `key` đại diện cho `source`.
  }, [frame, key]);

  return { schema, error, client };
}

export { FRAME_ALLOW, FRAME_SANDBOX };

/** Danh sách game trong cơ sở dữ liệu (chỉ game đã có bản phát hành). */
export function useGameModules() {
  const [modules, setModules] = useState<GameModuleSummary[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    let alive = true;
    api<GameModuleListResponse>('/modules').then(
      (r) => alive && setModules(r.items.filter((m) => m.latestVersion)),
      (e: unknown) => alive && setError(e),
    );
    return () => {
      alive = false;
    };
  }, []);
  return { modules, error };
}
