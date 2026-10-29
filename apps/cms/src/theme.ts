'use client';

import { createTheme } from '@mui/material/styles';

/** Giao diện CMS. Màu chính có thể đổi theo nhận diện của OPES. */
export const theme = createTheme({
  cssVariables: true,
  palette: {
    primary: { main: '#0a7a63' },
    secondary: { main: '#c2185b' },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: 'Roboto, "Segoe UI", system-ui, -apple-system, sans-serif',
  },
});
