import React, { useState, useEffect } from 'react';
import {
  AppShell,
  Burger,
  Group,
  Title,
  Text,
  Button,
  NavLink,
  Menu,
  Box,
  Tooltip,
  ActionIcon,
  Popover,
  Stack,
  Avatar,
  Divider,
  UnstyledButton,
  ScrollArea,
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
  IconClipboardList,
  IconFolders,
  IconCategory,
  IconPackage,
  IconBuildingBank,
  IconChevronDown,
  IconExternalLink,
  IconReceipt,
  IconCreditCard,
  IconChartBar,
} from '@tabler/icons-react';

import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export const AppLayout: React.FC = () => {
  const [opened, { toggle }] = useDisclosure();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const effectiveCollapsed = isDesktop ? isCollapsed : false;
  const [settingsOpened, setSettingsOpened] = useState(false);
  const [vanOpsOpened, setVanOpsOpened] = useState(false);
  const [masterOpened, setMasterOpened] = useState(false);
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
    { label: 'Add User', path: '/users', icon: IconUsers },
    { label: 'Allocations', path: '/allocations', icon: IconArrowsJoin2 },
  ];

  const isVanOpsActive = vanOpsItems.some((item) => location.pathname === item.path);

  const masterItems = [
    { label: 'Category', path: '/categories', icon: IconCategory },
    { label: 'Products', path: '/products', icon: IconPackage },
    { label: 'Accounts', path: '/accounts', icon: IconBuildingBank },
  ];

  const isMasterActive = masterItems.some((item) => location.pathname === item.path);

  useEffect(() => {
    if (isVanOpsActive) setVanOpsOpened(true);
  }, [isVanOpsActive]);

  useEffect(() => {
    if (isMasterActive) setMasterOpened(true);
  }, [isMasterActive]);

  const getBreadcrumb = () => {
    switch (location.pathname) {
      case '/':
        return { section: 'Overview', title: 'Dashboard' };
      case '/drivers':
        return { section: 'Van Operations', title: 'Drivers' };
      case '/vehicles':
        return { section: 'Van Operations', title: 'Vehicles' };
      case '/routes':
        return { section: 'Van Operations', title: 'Routes' };
      case '/users':
        return { section: 'Van Operations', title: 'Add User' };
      case '/allocations':
        return { section: 'Van Operations', title: 'Allocations' };
      case '/categories':
        return { section: 'Master', title: 'Categories' };
      case '/products':
        return { section: 'Master', title: 'Products' };
      case '/price-update':
        return { section: 'Master', title: 'Price Update' };
      case '/accounts':
        return { section: 'Master', title: 'Accounts' };
      case '/purchases':
        return { section: 'Purchase', title: 'Purchase Invoices' };
      case '/purchases/new':
        return { section: 'Purchase', title: 'New Purchase' };
      case '/payments':
        return { section: 'Payment', title: 'Payments' };
      case '/payments/new':
        return { section: 'Payment', title: 'New Payment' };
      case '/delivery-notes':
        return { section: 'Operations', title: 'Delivery Notes' };
      case '/stock-analysis':
        return { section: 'Inventory', title: 'Stock Analysis' };

      default:
        if (location.pathname.startsWith('/purchases/')) {
          return { section: 'Purchase', title: 'Edit Purchase' };
        }
        return { section: 'Van Sales', title: 'Operations' };
    }
  };
  const breadcrumb = getBreadcrumb();


  return (
     <AppShell
      header={{ height: 60 }}
      navbar={{
        width: { base: 280, sm: effectiveCollapsed ? 68 : 240 },
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      transitionDuration={300}
      transitionTimingFunction="cubic-bezier(0.4, 0, 0.2, 1)"
      padding={{ base: 'xs', sm: 'md', lg: 'lg' }}
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

      <AppShell.Header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <Group h="100%" px={{ base: 'xs', sm: 'md' }} justify="space-between" wrap="nowrap">
          {/* Left: Brand Identity & Breadcrumb */}
          <Group gap="sm" wrap="nowrap">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" color="#334155" />

            {/* Brand Title */}
            <div>
              <Title
                order={3}
                style={{
                  color: '#800020',
                  fontWeight: 800,
                  letterSpacing: '-0.4px',
                  lineHeight: 1.15,
                  fontSize: '1.1rem',
                }}
              >
                {user?.company_name || 'FUTURE GAS'}
              </Title>
              <Text size="10px" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.08em' }}>
                Distribution ERP
              </Text>
            </div>

            {/* Subtle Divider */}
            <Divider orientation="vertical" h={24} color="#e2e8f0" visibleFrom="xs" />

            {/* Breadcrumb Path Tracker */}
            <Group gap={6} wrap="nowrap" visibleFrom="xs">
              <Text size="xs" c="dimmed" fw={500}>
                {breadcrumb.section}
              </Text>
              <Text size="xs" c="#cbd5e1">
                /
              </Text>
              <Text size="xs" fw={600} c="#1e293b">
                {breadcrumb.title}
              </Text>
            </Group>
          </Group>

          {/* Right: Executive User Profile */}
          <Group gap="sm" wrap="nowrap">
            <Menu shadow="md" width={220} position="bottom-end" radius="md">
              <Menu.Target>
                <UnstyledButton
                  p={4}
                  style={{
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    transition: 'background-color 150ms ease',
                    cursor: 'pointer',
                  }}
                >
                  <Avatar
                    color="burgundy"
                    radius="xl"
                    size={34}
                    style={{
                      backgroundColor: '#fdf2f4',
                      color: '#800020',
                      fontWeight: 700,
                      fontSize: 13,
                      border: '1.5px solid #f5c2cb',
                    }}
                  >
                    {user?.username ? user.username.substring(0, 2).toUpperCase() : 'AD'}
                  </Avatar>
                  <Text size="sm" fw={600} c="#1e293b" visibleFrom="xs">
                    {user?.username || 'admin'}
                  </Text>
                  <IconChevronDown size={14} color="#94a3b8" />
                </UnstyledButton>
              </Menu.Target>

              <Menu.Dropdown style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }} p="xs">
                <Box px="xs" py="xs" mb={4} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <Text size="xs" fw={700} c="#0f172a">
                    {user?.username}
                  </Text>
                  <Text size="11px" c="dimmed">
                    {user?.company_name || 'Future Gas Operations'}
                  </Text>
                </Box>
                <Menu.Item
                  component="a"
                  href="http://localhost:8000/api/v1/docs/"
                  target="_blank"
                  leftSection={<IconExternalLink size={16} stroke={1.5} />}
                >
                  API Swagger
                </Menu.Item>
                <Menu.Divider style={{ borderColor: '#f1f5f9' }} />
                <Menu.Item
                  color="red"
                  onClick={handleLogout}
                  leftSection={<IconLogout size={16} stroke={1.5} />}
                >
                  Log Out
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

       <AppShell.Navbar px="xs" pt={6} pb="xs">
        {/* Top Header with Seamless Collapse/Expand Sidebar Icon for Desktop */}
        <AppShell.Section visibleFrom="sm">
          <Box
            mb={6}
            pb={4}
            style={{
              borderBottom: '1px solid #f1f5f9',
              height: 32,
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
              <Text size="11px" fw={700} c="dimmed" tt="uppercase" px={4} style={{ letterSpacing: '0.8px' }}>
                Menu
              </Text>
            </Box>

            <Tooltip label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'} position="right" withArrow>
              <ActionIcon
                variant="subtle"
                color="gray"
                size={28}
                onClick={() => setIsCollapsed(!isCollapsed)}
                style={{
                  borderRadius: '6px',
                  flexShrink: 0,
                  transition: 'background-color 150ms ease',
                }}
              >
                {isCollapsed ? (
                  <IconLayoutSidebarLeftExpand size={17} stroke={1.75} />
                ) : (
                  <IconLayoutSidebarLeftCollapse size={17} stroke={1.75} />
                )}
              </ActionIcon>
            </Tooltip>
          </Box>
        </AppShell.Section>

        {/* Scrollable Navigation Menu */}
        <AppShell.Section grow my={4} style={{ overflow: 'hidden' }}>
          <ScrollArea
            h="100%"
            scrollbarSize={4}
            type="hover"
            offsetScrollbars={false}
            styles={{
              scrollbar: {
                backgroundColor: 'transparent',
                '&:hover': { backgroundColor: 'transparent' },
              },
              thumb: {
                backgroundColor: '#cbd5e1',
                borderRadius: '9999px',
                '&:hover': {
                  backgroundColor: '#800020',
                },
              },
            }}
          >
            {/* Dashboard Link */}
        <Tooltip label="Dashboard" position="right" withArrow disabled={!effectiveCollapsed}>
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
                justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
                padding: effectiveCollapsed ? '0' : '0 12px',
                backgroundColor: location.pathname === '/' ? '#fdf2f4' : 'transparent',
                color: location.pathname === '/' ? '#800020' : '#475569',
                fontWeight: 600,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                transition: 'padding 300ms cubic-bezier(0.4, 0, 0.2, 1), background-color 150ms ease',
              },
              section: {
                marginRight: effectiveCollapsed ? 0 : 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'margin-right 300ms cubic-bezier(0.4, 0, 0.2, 1)',
              },
              body: {
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                opacity: effectiveCollapsed ? 0 : 1,
                maxWidth: effectiveCollapsed ? 0 : 160,
                transition: 'opacity 220ms ease, max-width 300ms cubic-bezier(0.4, 0, 0.2, 1)',
              },
            }}
          />
        </Tooltip>

        {/* Van Operations Group (Accordion in Expanded / Flyout in Collapsed) */}
        {effectiveCollapsed ? (
          <Menu
            position="right-start"
            offset={14}
            withArrow
            shadow="md"
            radius="md"
            trigger="hover"
            openDelay={80}
            closeDelay={200}
            transitionProps={{ transition: 'pop-top-left', duration: 160 }}
          >
            <Menu.Target>
              <Box style={{ width: '100%', display: 'flex', justifyContent: 'center' }} mb={4}>
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
                transition: 'background-color 150ms ease, color 150ms ease',
              },
              section: { marginRight: 12 },
              chevron: {
                transition: 'transform 250ms cubic-bezier(0.4, 0, 0.2, 1)',
              },
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

        {/* Master Group (Accordion in Expanded / Flyout in Collapsed) */}
        {effectiveCollapsed ? (
          <Menu
            position="right-start"
            offset={14}
            withArrow
            shadow="md"
            radius="md"
            trigger="hover"
            openDelay={80}
            closeDelay={200}
            transitionProps={{ transition: 'pop-top-left', duration: 160 }}
          >
            <Menu.Target>
              <Box style={{ width: '100%', display: 'flex', justifyContent: 'center' }} mb={4}>
                <ActionIcon
                  size={40}
                  variant="light"
                  color="burgundy"
                  style={{
                    borderRadius: '6px',
                    backgroundColor: isMasterActive ? '#fdf2f4' : 'transparent',
                    color: isMasterActive ? '#800020' : '#475569',
                    width: '100%',
                    height: 40,
                  }}
                >
                  <IconFolders size={20} stroke={1.75} />
                </ActionIcon>
              </Box>
            </Menu.Target>
            <Menu.Dropdown p="xs" style={{ minWidth: 190, borderColor: '#e2e8f0', backgroundColor: '#ffffff' }}>
              <Menu.Label fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.6px', fontSize: '11px' }}>
                Master
              </Menu.Label>
              {masterItems.map((sub) => {
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
            label="Master"
            leftSection={<IconFolders size={20} stroke={1.75} />}
            opened={masterOpened}
            onChange={setMasterOpened}
            active={isMasterActive}
            color="burgundy"
            variant="light"
            childrenOffset={12}
            mb={4}
            styles={{
              root: {
                borderRadius: '6px',
                height: 40,
                fontWeight: 600,
                backgroundColor: isMasterActive && !masterOpened ? '#fdf2f4' : 'transparent',
                color: isMasterActive ? '#800020' : '#334155',
                transition: 'background-color 150ms ease, color 150ms ease',
              },
              section: { marginRight: 12 },
              chevron: {
                transition: 'transform 250ms cubic-bezier(0.4, 0, 0.2, 1)',
              },
            }}
          >
            {masterItems.map((sub) => {
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

        {/* Purchase Link */}
        <Tooltip label="Purchase" position="right" withArrow disabled={!effectiveCollapsed}>
          <NavLink
            component={Link}
            to="/purchases"
            label="Purchase"
            leftSection={<IconReceipt size={20} stroke={1.75} />}
            active={location.pathname.startsWith('/purchases')}
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
                justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
                padding: effectiveCollapsed ? '0' : '0 12px',
                backgroundColor: location.pathname.startsWith('/purchases') ? '#fdf2f4' : 'transparent',
                color: location.pathname.startsWith('/purchases') ? '#800020' : '#475569',
                fontWeight: 600,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                transition: 'padding 300ms cubic-bezier(0.4, 0, 0.2, 1), background-color 150ms ease',
              },
              section: {
                marginRight: effectiveCollapsed ? 0 : 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'margin-right 300ms cubic-bezier(0.4, 0, 0.2, 1)',
              },
              body: {
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                opacity: effectiveCollapsed ? 0 : 1,
                maxWidth: effectiveCollapsed ? 0 : 160,
                transition: 'opacity 220ms ease, max-width 300ms cubic-bezier(0.4, 0, 0.2, 1)',
              },
            }}
          />
        </Tooltip>
                    {/* Payment NavLink */}
        <Tooltip label="Payment" position="right" withArrow disabled={!effectiveCollapsed}>
          <NavLink
            component={Link}
            to="/payments"
            label="Payment"
            leftSection={<IconCreditCard size={20} stroke={1.75} />}
            active={location.pathname.startsWith('/payments')}
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
                justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
                padding: effectiveCollapsed ? '0' : '0 12px',
                backgroundColor: location.pathname.startsWith('/payments') ? '#fdf2f4' : 'transparent',
                color: location.pathname.startsWith('/payments') ? '#800020' : '#475569',
                fontWeight: 600,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                transition: 'padding 300ms cubic-bezier(0.4, 0, 0.2, 1), background-color 150ms ease',
              },
              section: {
                marginRight: effectiveCollapsed ? 0 : 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'margin-right 300ms cubic-bezier(0.4, 0, 0.2, 1)',
              },
              body: {
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                opacity: effectiveCollapsed ? 0 : 1,
                maxWidth: effectiveCollapsed ? 0 : 160,
                transition: 'opacity 220ms ease, max-width 300ms cubic-bezier(0.4, 0, 0.2, 1)',
              },
            }}
          />
        </Tooltip>

        {/* Delivery Notes Link (Below Payment) */}
        <Tooltip label="Delivery Notes" position="right" withArrow disabled={!effectiveCollapsed}>
          <NavLink
            component={Link}
            to="/delivery-notes"
            label="Delivery Notes"
            leftSection={<IconClipboardList size={20} stroke={1.75} />}
            active={location.pathname === '/delivery-notes'}
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
                justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
                padding: effectiveCollapsed ? '0' : '0 12px',
                backgroundColor: location.pathname === '/delivery-notes' ? '#fdf2f4' : 'transparent',
                color: location.pathname === '/delivery-notes' ? '#800020' : '#475569',
                fontWeight: 600,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                transition: 'padding 300ms cubic-bezier(0.4, 0, 0.2, 1), background-color 150ms ease',
              },
              section: {
                marginRight: effectiveCollapsed ? 0 : 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'margin-right 300ms cubic-bezier(0.4, 0, 0.2, 1)',
              },
              body: {
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                opacity: effectiveCollapsed ? 0 : 1,
                maxWidth: effectiveCollapsed ? 0 : 160,
                transition: 'opacity 220ms ease, max-width 300ms cubic-bezier(0.4, 0, 0.2, 1)',
              },
            }}
          />
        </Tooltip>

        {/* Stock Analysis Link */}
        <Tooltip label="Stock Analysis" position="right" withArrow disabled={!effectiveCollapsed}>
          <NavLink
            component={Link}
            to="/stock-analysis"
            label="Stock Analysis"
            leftSection={<IconChartBar size={20} stroke={1.75} />}
            active={location.pathname === '/stock-analysis'}
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
                justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
                padding: effectiveCollapsed ? '0' : '0 12px',
                backgroundColor: location.pathname === '/stock-analysis' ? '#fdf2f4' : 'transparent',
                color: location.pathname === '/stock-analysis' ? '#800020' : '#475569',
                fontWeight: 600,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                transition: 'padding 300ms cubic-bezier(0.4, 0, 0.2, 1), background-color 150ms ease',
              },
              section: {
                marginRight: effectiveCollapsed ? 0 : 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'margin-right 300ms cubic-bezier(0.4, 0, 0.2, 1)',
              },
              body: {
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                opacity: effectiveCollapsed ? 0 : 1,
                maxWidth: effectiveCollapsed ? 0 : 160,
                transition: 'opacity 220ms ease, max-width 300ms cubic-bezier(0.4, 0, 0.2, 1)',
              },
            }}
          />
        </Tooltip>
          </ScrollArea>
        </AppShell.Section>

        {/* Bottom Settings Icon with Spinning Animation & Logout Popover */}
        <AppShell.Section>
          <Box pt="xs" style={{ borderTop: '1px solid #f1f5f9' }}>
          <Popover
            opened={settingsOpened}
            onChange={setSettingsOpened}
            position={effectiveCollapsed ? 'right-end' : 'top-start'}
            withArrow
            shadow="md"
            radius="md"
            offset={12}
          >
            <Popover.Target>
              <Tooltip label="Settings" position="right" withArrow disabled={!effectiveCollapsed || settingsOpened}>
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
                      justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
                      padding: effectiveCollapsed ? '0' : '0 12px',
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
                      marginRight: effectiveCollapsed ? 0 : 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'margin-right 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                    },
                    body: {
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      opacity: effectiveCollapsed ? 0 : 1,
                      maxWidth: effectiveCollapsed ? 0 : 160,
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
        </AppShell.Section>
      </AppShell.Navbar>


      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
};
