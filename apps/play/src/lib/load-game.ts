import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import * as sdk from '@opes/module-sdk';
import * as sdkCore from '@opes/module-sdk/core';
import * as sdkReact from '@opes/module-sdk/react';
import type { ModuleDefinition } from '@opes/module-sdk';

/**
 * Chạy gói game lấy từ cơ sở dữ liệu (Bước 7). Gói là CommonJS; các thư viện game được dùng
 * (React và @opes/module-sdk) do trang chơi cung cấp qua `require`, nên game dùng chung một React
 * với trang. Thư viện khác bị từ chối (quyết định 141).
 */
const LIBRARIES: Record<string, unknown> = {
  react: React,
  'react/jsx-runtime': jsxRuntime,
  '@opes/module-sdk': sdk,
  '@opes/module-sdk/core': sdkCore,
  '@opes/module-sdk/react': sdkReact,
};

export function evaluateGame(code: string): ModuleDefinition<unknown> {
  const module: { exports: Record<string, unknown> } = { exports: {} };
  const require = (name: string) => {
    if (Object.prototype.hasOwnProperty.call(LIBRARIES, name)) return LIBRARIES[name];
    throw new Error(`Game dùng thư viện không được hỗ trợ: "${name}".`);
  };
  new Function('module', 'exports', 'require', code)(module, module.exports, require);
  const def = (module.exports.default ?? module.exports) as Partial<ModuleDefinition<unknown>>;
  if (!def || typeof def.Runtime !== 'function' || typeof def.key !== 'string' || !def.fields) {
    throw new Error('Gói game không đúng chuẩn (thiếu key, fields hoặc Runtime).');
  }
  return def as ModuleDefinition<unknown>;
}

const cache = new Map<string, Promise<ModuleDefinition<unknown>>>();

/** Tải gói chạy của một phiên bản game qua API (cùng tên miền nhờ /api), mỗi phiên bản tải một lần. */
export function loadGame(key: string, version: string): Promise<ModuleDefinition<unknown>> {
  const id = `${key}@${version}`;
  let pending = cache.get(id);
  if (!pending) {
    pending = (async () => {
      const res = await fetch(`/api/public/modules/${encodeURIComponent(key)}/${encodeURIComponent(version)}/runtime.js`);
      if (!res.ok) throw new Error(`Không tải được game ${key} phiên bản ${version}.`);
      return evaluateGame(await res.text());
    })();
    pending.catch(() => cache.delete(id));
    cache.set(id, pending);
  }
  return pending;
}
