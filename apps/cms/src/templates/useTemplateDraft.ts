import { useCallback, useEffect, useState } from 'react';
import type { TemplateDetail, TemplateVersionResponse } from '@opes/contracts';
import { api, errorMessage, handleAuthError } from '../lib/api';

/** Phần người dùng sửa được của template. */
export interface TemplateDraft {
  name: string;
  brandName: string;
  note: string;
  config: Record<string, unknown>;
}

const fromTemplate = (tpl: TemplateDetail): TemplateDraft => ({
  name: tpl.name,
  brandName: tpl.brandName ?? '',
  note: tpl.note ?? '',
  config: tpl.config,
});

/**
 * Bản nháp của một template: tải, sửa, lưu nháp, công bố, nâng phiên bản game, khôi phục bản đã
 * công bố. Các hàm thao tác ném lỗi cho nơi gọi hiển thị (lỗi xung đột: TEMPLATE_CONFLICT).
 */
export function useTemplateDraft(id: string) {
  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [draft, setDraft] = useState<TemplateDraft | null>(null);
  const [dirty, setDirty] = useState(false);
  /** Tăng khi nạp lại dữ liệu từ máy chủ, để form tạo lại (bỏ trạng thái đang gõ dở). */
  const [formKey, setFormKey] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  /** Template vừa được lưu ở nơi khác: cần tải lại. */
  const [conflict, setConflict] = useState(false);

  const apply = useCallback((tpl: TemplateDetail) => {
    setTemplate(tpl);
    setDraft(fromTemplate(tpl));
    setDirty(false);
    setConflict(false);
    setFormKey((k) => k + 1);
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await api<{ template: TemplateDetail }>(`/templates/${id}`);
      apply(res.template);
    } catch (e) {
      if (handleAuthError(e)) return;
      setLoadError(errorMessage(e));
    }
  }, [id, apply]);

  useEffect(() => {
    void load();
  }, [load]);

  const update = (patch: Partial<TemplateDraft>) => {
    setDraft((d) => (d ? { ...d, ...patch } : d));
    setDirty(true);
  };

  /** Lưu nháp; trả về bản mới (để công bố / nâng cấp dùng tiếp). */
  const save = async (): Promise<TemplateDetail | null> => {
    if (!template || !draft) return null;
    const res = await api<{ template: TemplateDetail }>(`/templates/${template.id}`, {
      method: 'PUT',
      body: { ...draft, baseRevision: template.revision },
    });
    setTemplate(res.template);
    setDirty(false);
    return res.template;
  };

  /** Gọi một thao tác trên bản đã lưu (lưu trước nếu còn thay đổi). */
  const afterSave = async (path: string) => {
    const current = dirty ? await save() : template;
    if (!current) return null;
    const res = await api<{ template: TemplateDetail }>(`/templates/${current.id}/${path}`, {
      method: 'POST',
      body: { baseRevision: current.revision },
    });
    return res.template;
  };

  /** Công bố bản nháp. */
  const publish = async () => {
    const next = await afterSave('publish');
    if (next) setTemplate(next);
    return next;
  };

  /** Chuyển template sang phiên bản game mới nhất. */
  const upgrade = async () => {
    const next = await afterSave('upgrade');
    if (next) apply(next);
    return next;
  };

  /** Lấy cấu hình một bản đã công bố làm bản nháp. */
  const restore = async (version: number) => {
    if (!template) return;
    const res = await api<{ template: TemplateDetail }>(
      `/templates/${template.id}/versions/${version}/restore`,
      { method: 'POST', body: { baseRevision: template.revision } },
    );
    apply(res.template);
  };

  const fetchVersion = (version: number) =>
    api<TemplateVersionResponse>(`/templates/${id}/versions/${version}`);

  return {
    template,
    draft,
    dirty,
    formKey,
    loadError,
    conflict,
    setConflict,
    load,
    update,
    save,
    publish,
    upgrade,
    restore,
    fetchVersion,
  };
}
