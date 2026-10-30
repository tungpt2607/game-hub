'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameAssets, GameFiles } from '../../types';
import { isTsPath } from './extensions';
import type { TsDiagnostic, TsOutlineItem } from './protocol';
import { latestOnly, TsClient, type TsStatus } from './tsClient';

/** Thời gian chờ sau lần sửa cuối trước khi kiểm tra lỗi cả game (ms). */
const DIAGNOSTICS_DELAY = 800;
const OUTLINE_DELAY = 400;

/**
 * TypeScript cho khu sửa code: một worker cho mỗi khu, đồng bộ file, lỗi kiểu của mọi file (bảng Vấn đề)
 * và danh sách hàm của file đang mở (thanh đường dẫn, Ctrl+Shift+O). Các việc nặng đều chờ ngừng gõ.
 */
export function useTypeScript(files: GameFiles, assets: GameAssets, activePath: string | null, activeText: string | null) {
  const client = useMemo(() => new TsClient(), []);
  const [status, setStatus] = useState<TsStatus>('loading');
  const [diagnostics, setDiagnostics] = useState<Record<string, TsDiagnostic[]>>({});
  const [outline, setOutline] = useState<TsOutlineItem[]>([]);

  useEffect(() => {
    const off = client.subscribe(setStatus);
    return () => {
      off();
      client.dispose();
    };
  }, [client]);

  const syncAndCheck = useMemo(
    () =>
      latestOnly(async (f: GameFiles, assetPaths: string[]) => {
        await client.request({ type: 'sync', files: f, assets: assetPaths });
        return client.request({ type: 'allDiagnostics' });
      }),
    [client],
  );
  const assetPaths = useMemo(() => Object.keys(assets).sort(), [assets]);
  // Lần đầu đồng bộ ngay để gợi ý code biết mọi file; sau đó chờ ngừng gõ.
  const first = useRef(true);

  useEffect(() => {
    const delay = first.current ? 0 : DIAGNOSTICS_DELAY;
    first.current = false;
    const timer = setTimeout(() => {
      syncAndCheck(files, assetPaths).then(
        (result) => result && setDiagnostics(result),
        () => {},
      );
    }, delay);
    return () => clearTimeout(timer);
  }, [syncAndCheck, files, assetPaths]);

  const loadOutline = useMemo(() => latestOnly((path: string, text: string) => client.request({ type: 'outline', path, text })), [client]);
  useEffect(() => {
    if (!activePath || activeText === null || !isTsPath(activePath)) {
      setOutline([]);
      return;
    }
    const timer = setTimeout(() => {
      loadOutline(activePath, activeText).then(
        (items) => items && setOutline(items),
        () => {},
      );
    }, OUTLINE_DELAY);
    return () => clearTimeout(timer);
  }, [loadOutline, activePath, activeText]);

  return { client, status, diagnostics, outline };
}
