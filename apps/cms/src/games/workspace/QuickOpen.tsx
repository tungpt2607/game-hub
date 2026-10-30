'use client';

import { useMemo } from 'react';
import { t } from '@opes/i18n';
import { FileIcon } from './FileIcon';
import { QuickPick } from './QuickPick';
import { baseName, dirName } from './vfs';

/** Ctrl+P: gõ vài chữ để tìm và mở nhanh một file (tìm theo tên trước, rồi theo đường dẫn). */
export function QuickOpen({
  open,
  paths,
  onOpen,
  onClose,
}: {
  open: boolean;
  paths: string[];
  onOpen: (path: string) => void;
  onClose: () => void;
}) {
  const items = useMemo(
    () =>
      paths.map((p) => ({
        id: p,
        label: baseName(p),
        description: dirName(p) || undefined,
        searchText: `${baseName(p)} ${p}`,
        icon: <FileIcon path={p} />,
      })),
    [paths],
  );
  return (
    <QuickPick
      open={open}
      placeholder={t('cms.workspace.quickOpenPlaceholder')}
      items={items}
      onPick={(item) => onOpen(item.id)}
      onClose={onClose}
    />
  );
}
