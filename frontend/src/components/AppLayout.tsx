import React from 'react';
import {
  AppShell,
  Burger,
  Group,
  Title,
  Text,
  Badge,
  Button,
  NavLink,
  Menu,
  Box,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export const AppLayout: React.FC = () => {
  const [opened, { toggle }] = useDisclosure();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

       const navItems = [
    { label: 'Dashboard', path: '/' },
    { label: 'Drivers', path: '/drivers' },
    { label: 'Vehicles', path: '/vehicles' },
    { label: 'Routes', path: '/routes' },
    { label: 'Allocations', path: '/allocations' },
    { label: 'Staff Users', path: '/users' },
    { label: 'Company Profile', path: '/company' },
  ];


  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 240,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="lg"
      styles={{
        main: {
          backgroundColor: '#f8fafc',
          color: '#0f172a',
          minHeight: '100vh',
        },
        header: {
          backgroundColor: '#ffffff',
          borderColor: '#e2e8f0',
        },
        navbar: {
          backgroundColor: '#ffffff',
          borderColor: '#e2e8f0',
        },
      }}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" color="#334155" />
            <Title order={3} style={{ color: '#800020', fontWeight: 700, letterSpacing: '-0.5px' }}>
              Future Gas
            </Title>
            {user?.company_name && (
              <Badge variant="outline" color="burgundy" size="md" radius="sm" style={{ borderColor: '#f5c2cb', color: '#800020' }}>
                {user.company_name}
              </Badge>
            )}
          </Group>

          {/* User Menu */}
          <Group gap="sm">
            <Menu shadow="sm" width={180} position="bottom-end">
              <Menu.Target>
                <Button variant="subtle" color="gray" size="sm">
                  <Text size="sm" fw={600} c="#0f172a">
                    {user?.username}
                  </Text>
                  <Badge size="xs" ml="xs" color="burgundy" variant="light" style={{ backgroundColor: '#fdf2f4', color: '#800020' }}>
                    {user?.role}
                  </Badge>
                </Button>
              </Menu.Target>

              <Menu.Dropdown style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
                <Menu.Label c="dimmed">Account</Menu.Label>
                <Menu.Item component={Link} to="/company">
                  Company Profile
                </Menu.Item>
                <Menu.Item component="a" href="http://localhost:8000/api/v1/docs/" target="_blank">
                  API Swagger
                </Menu.Item>
                <Menu.Divider style={{ borderColor: '#e2e8f0' }} />
                <Menu.Item color="red" onClick={handleLogout}>
                  Log Out
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        <Text size="xs" fw={600} c="dimmed" tt="uppercase" px="xs" mb="xs" style={{ letterSpacing: '0.5px' }}>
          Menu
        </Text>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            component={Link}
            to={item.path}
            label={item.label}
            active={location.pathname === item.path}
            color="burgundy"
            variant="light"
            mb={2}
            onClick={() => opened && toggle()}
            styles={{
              root: {
                borderRadius: '4px',
                fontWeight: location.pathname === item.path ? 600 : 500,
                backgroundColor: location.pathname === item.path ? '#fdf2f4' : 'transparent',
                color: location.pathname === item.path ? '#800020' : '#475569',
              },
            }}
          />
        ))}

        <Box mt="auto" pt="sm">
          <NavLink
            component="a"
            href="http://localhost:8000/api/v1/docs/"
            target="_blank"
            label="API Documentation"
            variant="subtle"
            color="gray"
            styles={{
              root: {
                borderRadius: '4px',
                fontSize: '12px',
                color: '#64748b',
              },
            }}
          />
        </Box>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
};
