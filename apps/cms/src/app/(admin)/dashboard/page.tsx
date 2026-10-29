import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { t } from '@opes/i18n';
import { ApiStatus } from '../../../components/ApiStatus';

type StepState = 'done' | 'inProgress' | 'upcoming';

const STEPS: { step: number; title: string; state: StepState }[] = [
  { step: 1, title: 'Tài liệu thiết kế', state: 'done' },
  { step: 2, title: 'Khung dự án', state: 'inProgress' },
  { step: 3, title: 'Cơ sở dữ liệu', state: 'upcoming' },
  { step: 4, title: 'Đăng nhập CMS, tài khoản, tải media', state: 'upcoming' },
  { step: 5, title: 'Chuẩn module, form tự sinh, chế độ chơi thử', state: 'upcoming' },
  { step: 6, title: 'Game Hứng quà, thư viện template, link chơi thử', state: 'upcoming' },
];

const CHIP: Record<StepState, { label: string; color: 'success' | 'primary' | 'default' }> = {
  done: { label: t('cms.overview.done'), color: 'success' },
  inProgress: { label: t('cms.overview.inProgress'), color: 'primary' },
  upcoming: { label: t('cms.overview.upcoming'), color: 'default' },
};

export default function DashboardPage() {
  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h4" component="h1" fontWeight={700}>
          {t('cms.overview.heading')}
        </Typography>
        <Typography color="text.secondary">{t('cms.overview.lead')}</Typography>
      </div>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                {t('cms.overview.apiStatus')}
              </Typography>
              <ApiStatus />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                {t('cms.overview.roadmap')}
              </Typography>
              <List dense disablePadding>
                {STEPS.map((s) => (
                  <ListItem
                    key={s.step}
                    disableGutters
                    secondaryAction={
                      <Chip size="small" label={CHIP[s.state].label} color={CHIP[s.state].color} />
                    }
                  >
                    <ListItemText primary={`Bước ${s.step}. ${s.title}`} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
