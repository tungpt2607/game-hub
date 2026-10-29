'use client';

import { useState } from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  isFieldVisible,
  type ConfigErrors,
  type EmojiOrImage,
  type Field,
  type Fields,
  type FontValue,
  type GroupField,
  type ListField,
  type MediaRef,
} from '@opes/module-sdk';
import { t } from '@opes/i18n';
import {
  BooleanInput,
  ColorInput,
  EmojiOrImageInput,
  FontInput,
  MediaInput,
  NumberInput,
  SelectInput,
  TextInput,
} from './inputs';
import { getIn, pathKey, setIn, type Path } from './path';

interface FormCtx {
  root: unknown;
  errors: ConfigErrors;
  set: (path: Path, next: unknown) => void;
}

const domId = (path: Path) => `cfg-${pathKey(path).replace(/\./g, '-')}`;

/** Có lỗi nào nằm trong đường dẫn này (để đánh dấu nhóm / mục danh sách). */
function countErrorsUnder(errors: ConfigErrors, path: Path): number {
  const prefix = pathKey(path);
  return Object.keys(errors).filter((k) => k === prefix || k.startsWith(prefix + '.')).length;
}

function FieldsView({ fields, path, ctx }: { fields: Fields; path: Path; ctx: FormCtx }) {
  return (
    <Stack spacing={2.5}>
      {Object.entries(fields).map(([key, f]) =>
        isFieldVisible(f, ctx.root) ? <FieldView key={key} field={f} path={[...path, key]} ctx={ctx} /> : null,
      )}
    </Stack>
  );
}

function FieldView({ field: f, path, ctx }: { field: Field; path: Path; ctx: FormCtx }) {
  const value = getIn(ctx.root, path);
  const error = ctx.errors[pathKey(path)];
  const common = { id: domId(path), error, onChange: (next: unknown) => ctx.set(path, next) };
  switch (f.type) {
    case 'text':
      return <TextInput {...common} field={f} value={value} />;
    case 'number':
      return <NumberInput {...common} field={f} value={value} />;
    case 'boolean':
      return <BooleanInput {...common} field={f} value={value} />;
    case 'select':
      return <SelectInput {...common} field={f} value={value} />;
    case 'color':
      return <ColorInput {...common} field={f} value={value} />;
    case 'image':
    case 'audio':
      return <MediaInput {...common} field={f} value={(value as MediaRef | null) ?? null} />;
    case 'emojiOrImage':
      return <EmojiOrImageInput {...common} field={f} value={value as EmojiOrImage} />;
    case 'font':
      return <FontInput {...common} field={f} value={value as FontValue} />;
    case 'group':
      return <GroupView field={f} path={path} ctx={ctx} nested />;
    case 'list':
      return <ListView field={f} path={path} ctx={ctx} />;
  }
}

function GroupView({ field: f, path, ctx, nested }: { field: GroupField; path: Path; ctx: FormCtx; nested?: boolean }) {
  const errorCount = countErrorsUnder(ctx.errors, path);
  if (nested) {
    return (
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          {f.label}
        </Typography>
        {f.help && (
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {f.help}
          </Typography>
        )}
        <Box sx={{ pl: 2, borderLeft: 2, borderColor: 'divider' }}>
          <FieldsView fields={f.fields} path={path} ctx={ctx} />
        </Box>
      </Box>
    );
  }
  return (
    <Accordion defaultExpanded={!f.collapsed} disableGutters variant="outlined" id={`${domId(path)}-group`}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography fontWeight={600}>{f.label}</Typography>
          {errorCount > 0 && <Chip size="small" color="error" label={errorCount} />}
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        {f.help && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {f.help}
          </Typography>
        )}
        <FieldsView fields={f.fields} path={path} ctx={ctx} />
      </AccordionDetails>
    </Accordion>
  );
}

function ListView({ field: f, path, ctx }: { field: ListField; path: Path; ctx: FormCtx }) {
  const raw = getIn(ctx.root, path);
  const items = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
  const error = ctx.errors[pathKey(path)];
  const canAdd = f.max === undefined || items.length < f.max;
  const canRemove = f.min === undefined || items.length > f.min;
  const [open, setOpen] = useState<number | null>(items.length > 0 ? 0 : null);

  const update = (next: unknown[]) => ctx.set(path, next);
  const move = (from: number, to: number) => {
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved!);
    update(next);
    setOpen(to);
  };

  return (
    <Box id={domId(path)}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="subtitle2">
          {f.label}{' '}
          <Typography component="span" variant="body2" color="text.secondary">
            ({t('cms.moduleForm.itemCount', { count: items.length })}
            {f.max !== undefined ? ` / ${f.max}` : ''})
          </Typography>
        </Typography>
        <Button
          size="small"
          startIcon={<AddIcon />}
          disabled={!canAdd}
          onClick={() => {
            update([...items, structuredClone(f.newItem)]);
            setOpen(items.length);
          }}
        >
          {t('cms.moduleForm.add')}
        </Button>
      </Stack>
      {(error || f.help) && (
        <Typography variant="body2" color={error ? 'error' : 'text.secondary'} sx={{ mb: 1 }}>
          {error ?? f.help}
        </Typography>
      )}
      <Stack spacing={1}>
        {items.map((item, i) => {
          const itemPath = [...path, i];
          const itemErrors = countErrorsUnder(ctx.errors, itemPath);
          const label = f.itemLabel ? f.itemLabel(item as never, i) : `${f.label} ${i + 1}`;
          const expanded = open === i;
          return (
            <Paper key={i} variant="outlined" sx={{ borderColor: itemErrors ? 'error.main' : undefined }}>
              <Stack direction="row" alignItems="center" sx={{ pl: 1.5, pr: 0.5, py: 0.5 }}>
                <Box
                  role="button"
                  tabIndex={0}
                  aria-expanded={expanded}
                  onClick={() => setOpen(expanded ? null : i)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setOpen(expanded ? null : i);
                    }
                  }}
                  sx={{ flexGrow: 1, minWidth: 0, cursor: 'pointer', py: 0.5 }}
                >
                  <Typography variant="body2" noWrap fontWeight={expanded ? 600 : 400}>
                    {label}
                  </Typography>
                </Box>
                {itemErrors > 0 && <Chip size="small" color="error" label={itemErrors} sx={{ mr: 0.5 }} />}
                <Tooltip title={t('cms.moduleForm.moveUp')}>
                  <span>
                    <IconButton size="small" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label={t('cms.moduleForm.moveUp')}>
                      <ArrowUpwardIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title={t('cms.moduleForm.moveDown')}>
                  <span>
                    <IconButton
                      size="small"
                      disabled={i === items.length - 1}
                      onClick={() => move(i, i + 1)}
                      aria-label={t('cms.moduleForm.moveDown')}
                    >
                      <ArrowDownwardIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title={t('cms.moduleForm.remove')}>
                  <span>
                    <IconButton
                      size="small"
                      disabled={!canRemove}
                      onClick={() => {
                        update(items.filter((_, j) => j !== i));
                        setOpen(null);
                      }}
                      aria-label={t('cms.moduleForm.remove')}
                    >
                      <DeleteOutline fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
              {expanded && (
                <Box sx={{ p: 2, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
                  <FieldsView fields={f.item} path={itemPath} ctx={ctx} />
                </Box>
              )}
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );
}

/** Tên dễ đọc của một đường dẫn lỗi, ví dụ "Vật phẩm › 2 › Điểm". */
function errorLabel(fields: Fields, key: string): string {
  const parts = key.split('.');
  const labels: string[] = [];
  let current: Fields | undefined = fields;
  for (let i = 0; i < parts.length && current; i++) {
    const f: Field | undefined = current[parts[i]!];
    if (!f) break;
    labels.push(f.label);
    if (f.type === 'group') current = f.fields;
    else if (f.type === 'list') {
      const index = parts[i + 1];
      if (index === undefined) break;
      labels.push(String(Number(index) + 1));
      current = f.item;
      i++;
    } else current = undefined;
  }
  return labels.join(' › ');
}

interface SchemaFormProps<Config> {
  fields: Fields;
  value: Config;
  errors: ConfigErrors;
  onChange: (next: Config) => void;
  /** Hiện bảng tóm tắt lỗi phía trên form. */
  showSummary?: boolean;
}

/** Form tự sinh từ lược đồ trường của module. Nhóm cấp đầu là các mục gập/mở. */
export function SchemaForm<Config>({ fields, value, errors, onChange, showSummary = true }: SchemaFormProps<Config>) {
  const ctx: FormCtx = { root: value, errors, set: (path, next) => onChange(setIn(value, path, next)) };
  const errorKeys = Object.keys(errors);

  const focusError = (key: string) => {
    const el =
      document.getElementById(`cfg-${key.replace(/\./g, '-')}`) ??
      document.getElementById(`cfg-${key.split('.')[0]}-group`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) el.focus({ preventScroll: true });
  };

  return (
    <Stack spacing={2}>
      {showSummary && errorKeys.length > 0 && (
        <Alert severity="warning">
          <AlertTitle>{t('cms.moduleForm.errorsTitle')}</AlertTitle>
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            {errorKeys.slice(0, 8).map((key) => (
              <li key={key}>
                <Link component="button" type="button" onClick={() => focusError(key)} sx={{ textAlign: 'left' }}>
                  {errorLabel(fields, key)}
                </Link>
                : {errors[key]}
              </li>
            ))}
            {errorKeys.length > 8 && <li>…</li>}
          </Box>
        </Alert>
      )}
      <Box>
        {Object.entries(fields).map(([key, f]) => {
          if (!isFieldVisible(f, value)) return null;
          if (f.type === 'group') return <GroupView key={key} field={f} path={[key]} ctx={ctx} />;
          // Trường lẻ ở cấp đầu: đặt trong khung riêng cho thống nhất với các nhóm.
          return (
            <Accordion key={key} defaultExpanded disableGutters variant="outlined" id={`cfg-${key}-group`}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography fontWeight={600}>{f.label}</Typography>
                  {countErrorsUnder(errors, [key]) > 0 && (
                    <Chip size="small" color="error" label={countErrorsUnder(errors, [key])} />
                  )}
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <FieldView field={f} path={[key]} ctx={ctx} />
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>
    </Stack>
  );
}
