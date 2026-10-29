'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import ExtensionOutlined from '@mui/icons-material/ExtensionOutlined';
import ImageOutlined from '@mui/icons-material/ImageOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import PeopleOutlined from '@mui/icons-material/PeopleOutlined';
import { t } from '@opes/i18n';

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
    availableInStep: 6,
  },
  { label: t('cms.nav.media'), href: '/media', icon: <ImageOutlined />, availableInStep: 4 },
  { label: t('cms.nav.users'), href: '/users', icon: <PeopleOutlined />, availableInStep: 4 },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

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
              selected={pathname === item.href}
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
          <Typography variant="h6" component="div" noWrap>
            {NAV.find((item) => item.href === pathname)?.label ?? t('app.name')}
          </Typography>
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
  );
}
