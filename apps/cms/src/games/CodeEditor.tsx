'use client';

import dynamic from 'next/dynamic';
import type { BeforeMount, OnMount } from '@monaco-editor/react';
import LinearProgress from '@mui/material/LinearProgress';
import { extOf } from './zip';

/** Trình sửa code (Monaco, tải từ CDN khi mở trang lần đầu). */
const Monaco = dynamic(() => import('@monaco-editor/react'), { ssr: false, loading: () => <LinearProgress /> });

const LANGUAGE: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  json: 'json',
  md: 'markdown',
  txt: 'plaintext',
};

export type EditorApi = Parameters<OnMount>[0];

const beforeMount: BeforeMount = (monaco) => {
  // Không có thư viện kiểu của React/module-sdk trong trình sửa: tắt báo lỗi kiểu, giữ báo lỗi cú pháp.
  // Lỗi thật lấy từ bước biên dịch.
  for (const defaults of [monaco.languages.typescript.typescriptDefaults, monaco.languages.typescript.javascriptDefaults]) {
    defaults.setDiagnosticsOptions({ noSemanticValidation: true, noSyntaxValidation: false });
    defaults.setCompilerOptions({
      jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
    });
  }
};

export function CodeEditor({
  path,
  value,
  readOnly,
  onChange,
  onMount,
  height,
}: {
  path: string;
  value: string;
  readOnly?: boolean;
  onChange: (value: string) => void;
  onMount?: (editor: EditorApi) => void;
  height: number | string;
}) {
  return (
    <Monaco
      path={path}
      height={height}
      language={LANGUAGE[extOf(path)] ?? 'plaintext'}
      value={value}
      theme="vs-dark"
      beforeMount={beforeMount}
      onMount={(editor) => onMount?.(editor)}
      onChange={(v) => onChange(v ?? '')}
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 13,
        tabSize: 2,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        wordWrap: 'on',
      }}
    />
  );
}
