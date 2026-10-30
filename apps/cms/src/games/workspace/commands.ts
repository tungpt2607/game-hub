import { t } from '@opes/i18n';

/** Một lệnh trong bảng lệnh (Ctrl+Shift+P); phím tắt cũng chạy lệnh theo `id`. */
export interface Command {
  id: string;
  label: string;
  /** Phím tắt hiện bên phải. */
  hint?: string;
  run: () => void;
}

export interface CommandActions {
  save: () => void;
  quickOpen: () => void;
  searchAll: () => void;
  outline: () => void;
  format: () => void;
  toggleFormatOnSave: () => void;
  formatOnSave: boolean;
  definition: () => void;
  references: () => void;
  rename: () => void;
  back: () => void;
  forward: () => void;
  findInFile: () => void;
  toggleProblems: () => void;
  closeTab: () => void;
  closeAllTabs: () => void;
  newFile: () => void;
  newFolder: () => void;
  collapseAll: () => void;
  palette: () => void;
}

/** Danh sách lệnh của khu sửa code. Giữ một chỗ để bảng lệnh, phím tắt và tài liệu khớp nhau. */
export function buildCommands(a: CommandActions): Command[] {
  return [
    { id: 'save', label: t('cms.editor.cmd.save'), hint: 'Ctrl+S', run: a.save },
    { id: 'quickOpen', label: t('cms.editor.cmd.quickOpen'), hint: 'Ctrl+P', run: a.quickOpen },
    { id: 'commands', label: t('cms.editor.cmdPalette'), hint: 'Ctrl+Shift+P', run: a.palette },
    { id: 'searchAll', label: t('cms.editor.cmd.searchAll'), hint: 'Ctrl+Shift+F', run: a.searchAll },
    { id: 'findInFile', label: t('cms.editor.cmd.findInFile'), hint: 'Ctrl+F', run: a.findInFile },
    { id: 'outline', label: t('cms.editor.cmd.outline'), hint: 'Ctrl+Shift+O', run: a.outline },
    { id: 'definition', label: t('cms.editor.cmd.definition'), hint: 'F12', run: a.definition },
    { id: 'references', label: t('cms.editor.cmd.references'), hint: 'Shift+F12', run: a.references },
    { id: 'rename', label: t('cms.editor.cmd.rename'), hint: 'F2', run: a.rename },
    { id: 'back', label: t('cms.editor.cmd.back'), hint: 'Alt+←', run: a.back },
    { id: 'forward', label: t('cms.editor.cmd.forward'), hint: 'Alt+→', run: a.forward },
    { id: 'format', label: t('cms.editor.cmd.format'), hint: 'Shift+Alt+F', run: a.format },
    {
      id: 'toggleFormatOnSave',
      label: a.formatOnSave ? t('cms.editor.cmd.formatOnSaveOff') : t('cms.editor.cmd.formatOnSaveOn'),
      run: a.toggleFormatOnSave,
    },
    { id: 'toggleProblems', label: t('cms.editor.cmd.problems'), run: a.toggleProblems },
    { id: 'closeTab', label: t('cms.editor.cmd.closeTab'), run: a.closeTab },
    { id: 'closeAllTabs', label: t('cms.editor.cmd.closeAllTabs'), run: a.closeAllTabs },
    { id: 'newFile', label: t('cms.workspace.newFile'), run: a.newFile },
    { id: 'newFolder', label: t('cms.workspace.newFolder'), run: a.newFolder },
    { id: 'collapseAll', label: t('cms.workspace.collapseAll'), run: a.collapseAll },
  ];
}
