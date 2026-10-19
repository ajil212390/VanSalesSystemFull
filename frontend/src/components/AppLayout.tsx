import React, { useState } from 'react';
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
  Tooltip,
  ActionIcon,
  Popover,
  Stack,
} from '@mantine/core';
import {
  IconLayoutDashboard,
  IconUser,
  IconTruck,
  IconRoute,
  IconArrowsJoin2,
  IconUsers,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconSettings,
  IconLogout,
  IconTruckDelivery,
} from '@tabler/icons-react';



import { useDisclosure } from '@mantine/hooks';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export const AppLayout: React.FC = () => {
  const [opened, { toggle }] = useDisclosure();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [settingsOpened, setSettingsOpened] = useState(false);
  const [vanOpsOpened, setVanOpsOpened] = useState(true);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const vanOpsItems = [
    { label: 'Drivers', path: '/drivers', icon: IconUser },
    { label: 'Vehicles', path: '/vehicles', icon: IconTruck },
    { label: 'Routes', path: '/routes', icon: IconRoute },
    { label: 'Allocations', path: '/allocations', icon: IconArrowsJoin2 },
  ];

  const isVanOpsActive = vanOpsItems.some((item) => location.pathname === item.path);


  return (
     <AppShell
      header={{ height: 60 }}
      navbar={{
        width: isCollapsed ? 68 : 240,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      transitionDuration={300}
      transitionTimingFunction="cubic-bezier(0.4, 0, 0.2, 1)"
      padding="lg"
      styles={{
        main: {
          backgroundColor: '#f8fafc',
          color: '#0f172a',
          minHeight: '100vh',
          transition: 'padding-left 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        },
        header: {
          backgroundColor: '#ffffff',
          borderColor: '#e2e8f0',
        },
        navbar: {
          backgroundColor: '#ffffff',
          borderColor: '#e2e8f0',
          transition: 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        },
      }}
    >

      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" color="#334155" />
            <Title order={3} style={{ color: '#800020', fontWeight: 700, letterSpacing: '-0.5px' }}>
              {user?.company_name || 'Van Sales System'}
            </Title>
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

       <AppShell.Navbar p="xs">
        {/* Top Header with Seamless Collapse/Expand Sidebar Icon */}
        <Box
          mb="xs"
          pb="xs"
          style={{
            borderBottom: '1px solid #f1f5f9',
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'space-between',
            padding: isCollapsed ? 0 : '0 4px',
            overflow: 'hidden',
            transition: 'padding 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <Box
            style={{
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              opacity: isCollapsed ? 0 : 1,
              maxWidth: isCollapsed ? 0 : 140,
              transition: 'opacity 200ms ease, max-width 300ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <Text size="xs" fw={700} c="dimmed" tt="uppercase" px="xs" style={{ letterSpacing: '0.8px' }}>
              Menu
            </Text>
          </Box>

          <Tooltip label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'} position="right" withArrow>
            <ActionIcon
              variant="subtle"
              color="gray"
              size={38}
              onClick={() => setIsCollapsed(!isCollapsed)}
              style={{
                borderRadius: '6px',
                flexShrink: 0,
                transition: 'background-color 150ms ease',
              }}
            >
              {isCollapsed ? (
                <IconLayoutSidebarLeftExpand size={20} stroke={1.75} />
              ) : (
                <IconLayoutSidebarLeftCollapse size={20} stroke={1.75} />
              )}
            </ActionIcon>
          </Tooltip>
        </Box>

        {/* Dashboard Link */}
        <Tooltip label="Dashboard" position="right" withArrow disabled={!isCollapsed}>
          <NavLink
            component={Link}
            to="/"
            label="Dashboard"
            leftSection={<IconLayoutDashboard size={20} stroke={1.75} />}
            active={location.pathname === '/'}
            color="burgundy"
            variant="light"
            mb={4}
            onClick={() => opened && toggle()}
            styles={{
              root: {
                borderRadius: '6px',
                height: 40,
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                padding: isCollapsed ? '0' : '0 12px',
                backgroundColor: location.pathname === '/' ? '#fdf2f4' : 'transparent',
                color: location.pathname === '/' ? '#800020' : '#475569',
                fontWeight: location.pathname === '/' ? 600 : 500,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                transition: 'padding 300ms cubic-bezier(0.4, 0, 0.2, 1), background-color 150ms ease',
              },
              section: {
                marginRight: isCollapsed ? 0 : 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'margin-right 300ms cubic-bezier(0.4, 0, 0.2, 1)',
              },
              body: {
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                opacity: isCollapsed ? 0 : 1,
                maxWidth: isCollapsed ? 0 : 160,
                transition: 'opacity 220ms ease, max-width 300ms cubic-bezier(0.4, 0, 0.2, 1)',
              },
            }}
          />
        </Tooltip>

        {/* Van Operations Group (Accordion in Expanded / Flyout in Collapsed) */}
        {isCollapsed ? (
          <Menu
            position="right-start"
            offset={14}
            withArrow
            shadow="md"
            radius="md"
            trigger="hover"
            openDelay={80}
            closeDelay={200}
          >
            <Menu.Target>
              <Box style={{ width: '100%', display: 'flex', justifyContent: 'center' }} mb={4}>
                <Tooltip label="Van Operations" position="right" withArrow>
                  <ActionIcon
                    size={40}
                    variant="light"
                    color="burgundy"
                    style={{
                      borderRadius: '6px',
                      backgroundColor: isVanOpsActive ? '#fdf2f4' : 'transparent',
                      color: isVanOpsActive ? '#800020' : '#475569',
                      width: '100%',
                      height: 40,
                    }}
                  >
                    <IconTruckDelivery size={20} stroke={1.75} />
                  </ActionIcon>
                </Tooltip>
              </Box>
            </Menu.Target>
            <Menu.Dropdown p="xs" style={{ minWidth: 190, borderColor: '#e2e8f0', backgroundColor: '#ffffff' }}>
              <Menu.Label fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.6px', fontSize: '11px' }}>
                Van Operations
              </Menu.Label>
              {vanOpsItems.map((sub) => {
                const SubIcon = sub.icon;
                const isSubActive = location.pathname === sub.path;
                return (
                  <Menu.Item
                    key={sub.path}
                    component={Link}
                    to={sub.path}
                    leftSection={<SubIcon size={18} stroke={1.75} />}
                    style={{
                      borderRadius: '6px',
                      fontWeight: isSubActive ? 600 : 500,
                      backgroundColor: isSubActive ? '#fdf2f4' : 'transparent',
                      color: isSubActive ? '#800020' : '#334155',
                      marginBottom: 2,
                    }}
                  >
                    {sub.label}
                  </Menu.Item>
                );
              })}
            </Menu.Dropdown>
          </Menu>
        ) : (
          <NavLink
            label="Van Operations"
            leftSection={<IconTruckDelivery size={20} stroke={1.75} />}
            opened={vanOpsOpened}
            onChange={setVanOpsOpened}
            active={isVanOpsActive}
            color="burgundy"
            variant="light"
            childrenOffset={12}
            mb={4}
            styles={{
              root: {
                borderRadius: '6px',
                height: 40,
                fontWeight: 600,
                backgroundColor: isVanOpsActive && !vanOpsOpened ? '#fdf2f4' : 'transparent',
                color: isVanOpsActive ? '#800020' : '#334155',
              },
              section: { marginRight: 12 },
            }}
          >
            {vanOpsItems.map((sub) => {
              const SubIcon = sub.icon;
              const isSubActive = location.pathname === sub.path;
              return (
                <NavLink
                  key={sub.path}
                  component={Link}
                  to={sub.path}
                  label={sub.label}
                  leftSection={<SubIcon size={18} stroke={1.75} />}
                  active={isSubActive}
                  color="burgundy"
                  variant="light"
                  mb={2}
                  onClick={() => opened && toggle()}
                  styles={{
                    root: {
                      borderRadius: '6px',
                      height: 36,
                      fontWeight: isSubActive ? 600 : 500,
                      backgroundColor: isSubActive ? '#fdf2f4' : 'transparent',
                      color: isSubActive ? '#800020' : '#475569',
                    },
                    section: { marginRight: 10 },
                  }}
                />
              );
            })}
          </NavLink>
        )}

        {/* Staff Users Link */}
        <Tooltip label="Staff Users" position="right" withArrow disabled={!isCollapsed}>
          <NavLink
            component={Link}
            to="/users"
            label="Staff Users"
            leftSection={<IconUsers size={20} stroke={1.75} />}
            active={location.pathname === '/users'}
            color="burgundy"
            variant="light"
            mb={4}
            onClick={() => opened && toggle()}
            styles={{
              root: {
                borderRadius: '6px',
                height: 40,
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                padding: isCollapsed ? '0' : '0 12px',
                backgroundColor: location.pathname === '/users' ? '#fdf2f4' : 'transparent',
                color: location.pathname === '/users' ? '#800020' : '#475569',
                fontWeight: location.pathname === '/users' ? 600 : 500,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                transition: 'padding 300ms cubic-bezier(0.4, 0, 0.2, 1), background-color 150ms ease',
              },
              section: {
                marginRight: isCollapsed ? 0 : 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'margin-right 300ms cubic-bezier(0.4, 0, 0.2, 1)',
              },
              body: {
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                opacity: isCollapsed ? 0 : 1,
                maxWidth: isCollapsed ? 0 : 160,
                transition: 'opacity 220ms ease, max-width 300ms cubic-bezier(0.4, 0, 0.2, 1)',
              },
            }}
          />
        </Tooltip>

        {/* Bottom Settings Icon with Spinning Animation & Logout Popover */}
        <Box mt="auto" pt="xs" style={{ borderTop: '1px solid #f1f5f9' }}>
          <Popover
            opened={settingsOpened}
            onChange={setSettingsOpened}
            position={isCollapsed ? 'right-end' : 'top-start'}
            withArrow
            shadow="md"
            radius="md"
            offset={12}
          >
            <Popover.Target>
              <Tooltip label="Settings" position="right" withArrow disabled={!isCollapsed || settingsOpened}>
                <NavLink
                  component="button"
                  type="button"
                  label="Settings"
                  leftSection={
                    <IconSettings
                      size={20}
                      stroke={1.75}
                      style={{
                        transform: settingsOpened ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 300ms ease',
                      }}
                    />
                  }
                  active={settingsOpened}
                  color="burgundy"
                  variant="light"
                  onClick={() => setSettingsOpened((o) => !o)}
                  styles={{
                    root: {
                      borderRadius: '6px',
                      height: 40,
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: isCollapsed ? 'center' : 'flex-start',
                      padding: isCollapsed ? '0' : '0 12px',
                      backgroundColor: settingsOpened ? '#fdf2f4' : 'transparent',
                      color: settingsOpened ? '#800020' : '#475569',
                      fontWeight: settingsOpened ? 600 : 500,
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      border: 'none',
                      transition: 'padding 300ms cubic-bezier(0.4, 0, 0.2, 1), background-color 150ms ease',
                    },
                    section: {
                      marginRight: isCollapsed ? 0 : 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'margin-right 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                    },
                    body: {
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      opacity: isCollapsed ? 0 : 1,
                      maxWidth: isCollapsed ? 0 : 160,
                      textAlign: 'left',
                      transition: 'opacity 220ms ease, max-width 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                    },
                  }}
                />
              </Tooltip>
            </Popover.Target>

            <Popover.Dropdown
              p="sm"
              style={{
                minWidth: 190,
                borderColor: '#e2e8f0',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                backgroundColor: '#ffffff',
              }}
            >
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb="xs" style={{ letterSpacing: '0.6px' }}>
                Settings & Session
              </Text>
              <Stack gap="xs">
                <Button
                  fullWidth
                  color="red"
                  variant="light"
                  size="xs"
                  leftSection={<IconLogout size={16} stroke={1.75} />}
                  onClick={handleLogout}
                  styles={{
                    root: {
                      backgroundColor: '#fef2f2',
                      color: '#dc2626',
                      fontWeight: 600,
                      '&:hover': {
                        backgroundColor: '#fee2e2',
                      },
                    },
                  }}
                >
                  Log Out
                </Button>
                <Button
                  fullWidth
                  variant="subtle"
                  color="gray"
                  size="xs"
                  onClick={() => setSettingsOpened(false)}
                >
                  Cancel
                </Button>
              </Stack>
            </Popover.Dropdown>
          </Popover>
        </Box>
      </AppShell.Navbar>


      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
};
