import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { t } from '@opes/i18n';

/** Khung chung cho các trang đăng nhập, thiết lập lần đầu, đổi mật khẩu. */
export function AuthCard({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        px: 2,
        py: 4,
        bgcolor: 'background.default',
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 420 }} variant="outlined">
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Typography variant="overline" color="primary">
            {t('app.name')}
          </Typography>
          <Typography variant="h5" component="h1" fontWeight={700} gutterBottom>
            {title}
          </Typography>
          {lead && (
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              {lead}
            </Typography>
          )}
          {children}
        </CardContent>
      </Card>
    </Box>
  );
}
