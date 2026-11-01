import { useMemo } from 'react';
import { t } from '@opes/i18n';
import type { Command } from './commands';
import { QuickOpen } from './QuickOpen';
import { QuickPick } from './QuickPick';
import type { TsOutlineItem } from './ts/protocol';
import { kindLabel } from './workspace-utils';

export type PickerKind = 'files' | 'commands' | 'outline';

/** Các bảng chọn nhanh: mở file (Ctrl+P), bảng lệnh (Ctrl+Shift+P), ký hiệu trong file (Ctrl+Shift+O). */
export function WorkspacePickers({
  open,
  onClose,
  paths,
  onOpenFile,
  commands,
  outline,
  onPickOutline,
}: {
  /** Bảng đang mở; null thì đóng hết. */
  open: PickerKind | null;
  onClose: () => void;
  paths: string[];
  onOpenFile: (path: string) => void;
  commands: Command[];
  outline: TsOutlineItem[];
  onPickOutline: (item: TsOutlineItem) => void;
}) {
  const outlineItems = useMemo(
    () =>
      outline.map((o, i) => ({
        id: String(i),
        label: o.name,
        description: kindLabel(o.kind),
        depth: o.depth,
        searchText: o.name,
      })),
    [outline],
  );
  return (
    <>
      <QuickOpen open={open === 'files'} paths={paths} onOpen={onOpenFile} onClose={onClose} />
      <QuickPick
        open={open === 'commands'}
        placeholder={t('cms.editor.cmdPlaceholder')}
        items={commands.map((c) => ({ id: c.id, label: c.label, hint: c.hint }))}
        onPick={(item) => commands.find((c) => c.id === item.id)?.run()}
        onClose={onClose}
      />
      <QuickPick
        open={open === 'outline'}
        placeholder={t('cms.editor.outlinePlaceholder')}
        items={outlineItems}
        keepOrder
        onPick={(item) => {
          const o = outline[Number(item.id)];
          if (o) onPickOutline(o);
        }}
        onClose={onClose}
      />
    </>
  );
}
