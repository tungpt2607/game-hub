import InputAdornment from '@mui/material/InputAdornment';
import type { SxProps, Theme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import SearchIcon from '@mui/icons-material/Search';

export interface SearchFieldProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  sx?: SxProps<Theme>;
}

/**
 * Ô tìm kiếm có biểu tượng kính lúp. Điều khiển từ ngoài (value + onChange); nơi dùng tự debounce
 * trước khi gọi API (xem useDebouncedValue trong lib/).
 */
export function SearchField({ id, value, onChange, placeholder, autoFocus, sx }: SearchFieldProps) {
  return (
    <TextField
      id={id}
      size="small"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoFocus={autoFocus}
      fullWidth
      sx={sx}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        },
        htmlInput: { 'aria-label': placeholder },
      }}
    />
  );
}
