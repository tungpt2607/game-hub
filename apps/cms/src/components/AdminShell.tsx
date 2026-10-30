'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import ExtensionOutlined from '@mui/icons-material/ExtensionOutlined';
import ImageOutlined from '@mui/icons-material/ImageOutlined';
import KeyOutlined from '@mui/icons-material/KeyOutlined';
import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import PeopleOutlined from '@mui/icons-material/PeopleOutlined';
import ScienceOutlined from '@mui/icons-material/ScienceOutlined';
import SportsEsportsOutlined from '@mui/icons-material/SportsEsportsOutlined';
import type { MeResponse, User } from '@opes/contracts';
import { t } from '@opes/i18n';
import { api, handleAuthError } from '../lib/api';
import { AuthContext } from './AuthContext';

const DRAWER_WIDTH = 248;

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  /** Bước trong lộ trình mà mục này được bật; chưa tới thì hiện mờ. */
  availableInStep?: number;
}

const NAV: NavItem[] = [
  { label: t('cms.nav.overview'), href: '/dashboard', icon: <DashboardOutlined /> },
  {
    label: t('cms.nav.templates'),
    href: '/templates',
    icon: <ExtensionOutlined />,
  },
  { label: t('cms.nav.games'), href: '/games', icon: <SportsEsportsOutlined /> },
  { label: t('cms.nav.playground'), href: '/playground', icon: <ScienceOutlined /> },
  { label: t('cms.nav.media'), href: '/media', icon: <ImageOutlined /> },
  { label: t('cms.nav.users'), href: '/users', icon: <PeopleOutlined /> },
];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

/** Khung trang quản trị: kiểm tra đăng nhập, menu trái, thanh trên có menu tài khoản. */
export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  useEffect(() => {
    api<MeResponse>('/auth/me')
      .then(({ user }) => {
        if (user.mustChangePassword) router.replace('/change-password');
        else setUser(user);
      })
      .catch((e: unknown) => {
        if (!handleAuthError(e)) router.replace('/login');
      });
  }, [router]);

  async function logout() {
    setMenuAnchor(null);
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    router.replace('/login');
  }

  if (!user) {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress aria-label={t('common.loading')} />
      </Box>
    );
  }

  const nav = (
    <Box>
      <Toolbar>
        <Typography variant="subtitle1" fontWeight={700} color="primary">
          {t('app.name')}
        </Typography>
      </Toolbar>
      <List component="nav" aria-label={t('app.name')}>
        {NAV.map((item) => {
          const disabled = item.availableInStep !== undefined;
          return (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              selected={pathname === item.href || pathname.startsWith(`${item.href}/`)}
              disabled={disabled}
              onClick={() => setMobileOpen(false)}
              sx={{ mx: 1, borderRadius: 2 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText
                primary={item.label}
                secondary={
                  disabled ? t('cms.nav.comingIn', { step: item.availableInStep ?? '' }) : undefined
                }
              />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );

  return (
    <AuthContext.Provider value={user}>
      <Box sx={{ display: 'flex', minHeight: '100dvh' }}>
        <AppBar
          position="fixed"
          color="inherit"
          elevation={0}
          sx={{
            width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
            ml: { md: `${DRAWER_WIDTH}px` },
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Toolbar>
            <IconButton
              edge="start"
              aria-label="Mở menu"
              onClick={() => setMobileOpen(true)}
              sx={{ mr: 1, display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" component="div" noWrap sx={{ flexGrow: 1 }}>
              {NAV.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.label ?? t('app.name')}
            </Typography>
            <IconButton
              aria-label={t('cms.account.menu')}
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              size="small"
            >
              <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 15 }}>
                {initials(user.name)}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={() => setMenuAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography fontWeight={600}>{user.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {user.email}
                </Typography>
              </Box>
              <Divider />
              <MenuItem component={Link} href="/change-password" onClick={() => setMenuAnchor(null)}>
                <ListItemIcon>
                  <KeyOutlined fontSize="small" />
                </ListItemIcon>
                {t('cms.account.changePassword')}
              </MenuItem>
              <MenuItem onClick={logout}>
                <ListItemIcon>
                  <LogoutOutlined fontSize="small" />
                </ListItemIcon>
                {t('cms.account.logout')}
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            ModalProps={{ keepMounted: true }}
            sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
          >
            {nav}
          </Drawer>
          <Drawer
            variant="permanent"
            open
            sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
          >
            {nav}
          </Drawer>
        </Box>

        <Box component="main" sx={{ flexGrow: 1, minWidth: 0, p: { xs: 2, md: 4 } }}>
          <Toolbar />
          {children}
        </Box>
      </Box>
    </AuthContext.Provider>
  );
}
