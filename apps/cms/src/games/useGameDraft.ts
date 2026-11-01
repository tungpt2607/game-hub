import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GameModuleDetail } from '@opes/contracts';
import { api, errorMessage, handleAuthError } from '../lib/api';
import { sameAssets, sameFiles } from './changes';
import { compileGame } from './compiler';
import { fetchGameVersion } from './game-api';
import { clearLocalDraft, readLocalDraft, type LocalDraft } from './localDraft';
import type { GameAssets, GameFiles } from './types';
import { useLocalDraftAutosave } from './useLocalDraftAutosave';

const modulePath = (key: string) => `/modules/${encodeURIComponent(key)}`;

/**
 * Bản nháp code của một game: tải từ máy chủ, sửa, lưu nháp, phát hành, bỏ nháp; tự giữ bản tạm trên
 * trình duyệt. Các hàm thao tác ném lỗi cho nơi gọi hiển thị (lỗi xung đột: MODULE_CONFLICT).
 */
export function useGameDraft(moduleKey: string) {
  const [mod, setMod] = useState<GameModuleDetail | null>(null);
  const [files, setFiles] = useState<GameFiles>({});
  const [assets, setAssets] = useState<GameAssets>({});
  /** Code lúc lưu nháp gần nhất (đánh dấu ● file đã sửa). */
  const [savedFiles, setSavedFiles] = useState<GameFiles>({});
  const [savedAssets, setSavedAssets] = useState<GameAssets>({});
  /** Bản tạm trên trình duyệt đang chờ hỏi Khôi phục / Bỏ đi. */
  const [localOffer, setLocalOffer] = useState<LocalDraft | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  /** Bản nháp vừa được lưu ở nơi khác: cần tải lại. */
  const [conflict, setConflict] = useState(false);

  const apply = useCallback(async (next: GameModuleDetail) => {
    let nextFiles: GameFiles = {};
    let nextAssets: GameAssets = {};
    if (next.draft) {
      nextFiles = next.draft.files;
      nextAssets = next.draft.assets;
    } else if (next.latestVersion) {
      const v = await fetchGameVersion(next.key, next.latestVersion);
      nextFiles = v.files;
      nextAssets = v.assets;
    }
    setFiles(nextFiles);
    setAssets(nextAssets);
    setSavedFiles(nextFiles);
    setSavedAssets(nextAssets);
    setMod(next);
    setConflict(false);
    // Có bản tạm khác bản vừa tải: hỏi người dùng (không tự khôi phục).
    const local = readLocalDraft(next.key);
    if (local && !(sameFiles(local.files, nextFiles) && sameAssets(local.assets, nextAssets)))
      setLocalOffer(local);
    else {
      setLocalOffer(null);
      clearLocalDraft(next.key);
    }
  }, []);

  const load = useCallback(async () => {
    try {
      await apply((await api<{ module: GameModuleDetail }>(modulePath(moduleKey))).module);
    } catch (e) {
      if (handleAuthError(e)) return;
      setLoadError(errorMessage(e));
    }
  }, [moduleKey, apply]);

  useEffect(() => {
    void load();
  }, [load]);

  /** "Chưa lưu" = khác bản đã lưu (gõ rồi xóa về như cũ thì không còn). */
  const dirty = useMemo(
    () => !sameFiles(files, savedFiles) || !sameAssets(assets, savedAssets),
    [files, savedFiles, assets, savedAssets],
  );
  /** Bản nháp trên máy chủ mà bản tạm dựa vào. */
  const serverBase = mod ? (mod.draft?.updatedAt ?? `v:${mod.latestVersion ?? ''}`) : '';

  useLocalDraftAutosave({
    moduleKey: mod?.key ?? null,
    paused: localOffer !== null,
    dirty,
    files,
    assets,
    base: serverBase,
  });

  const change = (nextFiles: GameFiles, nextAssets: GameAssets = assets) => {
    // Sửa tiếp mà không chọn khôi phục: bỏ bản tạm cũ.
    if (localOffer) setLocalOffer(null);
    setFiles(nextFiles);
    setAssets(nextAssets);
  };

  const restoreLocal = () => {
    if (!localOffer) return;
    setLocalOffer(null);
    setFiles(localOffer.files);
    setAssets(localOffer.assets);
  };

  const discardLocal = () => {
    setLocalOffer(null);
    if (mod) clearLocalDraft(mod.key);
  };

  /**
   * Lưu nháp kèm gói đã biên dịch (nếu không lỗi). `prepare` trả về code sẽ lưu (ví dụ sau khi tự
   * định dạng); không có thì lưu code hiện tại.
   */
  const save = async (prepare?: () => Promise<GameFiles | undefined>) => {
    if (!mod) return null;
    const toSave = (await prepare?.()) ?? files;
    const compiled = await compileGame(toSave, assets);
    const res = await api<{ module: GameModuleDetail }>(`${modulePath(mod.key)}/draft`, {
      method: 'PUT',
      body: {
        files: toSave,
        assets,
        schemaJs: compiled.ok ? compiled.schemaJs : null,
        runtimeJs: compiled.ok ? compiled.runtimeJs : null,
        baseUpdatedAt: mod.draft?.updatedAt ?? null,
      },
    });
    setMod(res.module);
    setSavedFiles(toSave);
    setSavedAssets(assets);
    clearLocalDraft(mod.key);
    return res.module;
  };

  /** Phát hành bản nháp (lưu trước nếu còn thay đổi chưa lưu). Trả về game sau khi phát hành. */
  const publish = async (notes: string, prepare?: () => Promise<GameFiles | undefined>) => {
    const current = dirty || !mod?.draft ? await save(prepare) : mod;
    if (!current) return null;
    const res = await api<{ module: GameModuleDetail }>(`${modulePath(current.key)}/publish`, {
      method: 'POST',
      body: { notes: notes.trim() || undefined, baseUpdatedAt: current.draft?.updatedAt ?? null },
    });
    await apply(res.module);
    return res.module;
  };

  /** Bỏ bản nháp, quay về bản phát hành mới nhất. */
  const discardDraft = async () => {
    if (!mod) return;
    const res = await api<{ module: GameModuleDetail }>(`${modulePath(mod.key)}/draft`, {
      method: 'DELETE',
    });
    clearLocalDraft(mod.key);
    await apply(res.module);
  };

  return {
    mod,
    files,
    assets,
    savedFiles,
    localOffer,
    loadError,
    conflict,
    setConflict,
    dirty,
    serverBase,
    load,
    change,
    restoreLocal,
    discardLocal,
    save,
    publish,
    discardDraft,
  };
}
