import React, { useMemo } from 'react';
import {
  Title,
  Text,
  Paper,
  SimpleGrid,
  Group,
  Stack,
  Button,
  Table,
  Badge,
  ActionIcon,
  Tooltip,
  Box,
} from '@mantine/core';
import {
  IconPlus,
  IconPencil,
  IconTrash,
  IconPackages,
  IconShoppingBag,
  IconFlame,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { apiClient } from '../api/client';

export const ConnectionPackagesPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // 1. Fetch Packages
  const { data: packages = [], isLoading } = useQuery<any[]>({
    queryKey: ['connection-packages'],
    queryFn: async () => {
      const res = await apiClient.get('/connection-packages/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  // 2. Fetch Sales for Sold Packages Count
  const { data: sales = [] } = useQuery<any[]>({
    queryKey: ['sales'],
    queryFn: async () => {
      const res = await apiClient.get('/sales/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  // Mutation: Delete Package
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/connection-packages/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connection-packages'] });
      notifications.show({
        title: 'Package Removed',
        message: 'Connection package was deleted successfully.',
        color: 'gray',
      });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Error Deleting Package',
        message: err.response?.data?.detail || err.message || 'Could not delete package.',
        color: 'red',
      });
    },
  });

  // KPI Metrics
  const totalPackagesCount = packages.length;
  const soldPackagesCount = useMemo(() => {
    return sales.filter(
      (s: any) =>
        s.Status !== 'CANCELLED' &&
        (s.Notes?.toLowerCase().includes('package') ||
          s.Notes?.toLowerCase().includes('connection') ||
          (s.lines && s.lines.some((ln: any) => ln.product_name?.toLowerCase().includes('connection'))))
    ).length;
  }, [sales]);

  return (
    <Stack gap="lg" style={{ width: '100%' }}>
      {/* ── Top Header ── */}
      <Box pt={4} pb={2}>
        <Group justify="space-between" align="center" wrap="wrap">
          <div>
            <Title order={2} style={{ color: '#800020', fontWeight: 800, fontSize: 24, letterSpacing: '-0.02em' }}>
              Connection Packages
            </Title>
            <Text size="xs" c="dimmed" mt={2}>
              New cylinder connection packages, accessory bundles &amp; fitting fee tariffs
            </Text>
          </div>

          <Button
            leftSection={<IconPlus size={18} />}
            style={{ backgroundColor: '#800020', fontWeight: 600 }}
            onClick={() => navigate('/connection-packages/new')}
          >
            New Package
          </Button>
        </Group>
      </Box>

      {/* ── Summary KPI Cards (Total Packages & Sold Packages) ── */}
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
              Total Packages
            </Text>
            <IconPackages size={22} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#0f172a', fontSize: 28, fontVariantNumeric: 'tabular-nums' }}>
            {totalPackagesCount}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            Available connection bundle packages
          </Text>
        </Paper>

        <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
              Sold Packages
            </Text>
            <IconShoppingBag size={22} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#800020', fontSize: 28, fontVariantNumeric: 'tabular-nums' }}>
            {soldPackagesCount}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            Total package connections issued &amp; delivered
          </Text>
        </Paper>
      </SimpleGrid>

      {/* ── Connection Packages Table / Empty State ── */}
      <Paper radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', overflow: 'hidden' }}>
        {isLoading ? (
          <Box p="xl" style={{ textAlign: 'center' }}>
            <Text size="sm" c="dimmed">
              Loading connection packages...
            </Text>
          </Box>
        ) : packages.length === 0 ? (
          <Box p={48} style={{ textAlign: 'center' }}>
            <Text size="sm" fw={600} c="dimmed">
              No connection packages found.
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Click "New Package" to bundle cylinders, accessories, and fitting fees together.
            </Text>
          </Box>
        ) : (
          <Table.ScrollContainer minWidth={800}>
            <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
              <Table.Thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <Table.Tr>
                  <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px' }}>
                    PACKAGE NAME
                  </Table.Th>
                  <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px' }}>
                    CYLINDER INCLUDED
                  </Table.Th>
                  <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px' }}>
                    ACCESSORIES &amp; ITEMS
                  </Table.Th>
                  <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textAlign: 'right' }}>
                    LABOR / FITTING
                  </Table.Th>
                  <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textAlign: 'right' }}>
                    TOTAL PRICE
                  </Table.Th>
                  <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textAlign: 'center' }}>
                    STATUS
                  </Table.Th>
                  <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textAlign: 'center', width: 90 }}>
                    ACTIONS
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {packages.map((pkg: any) => {
                  const itemsCount = (pkg.items || []).length;
                  return (
                    <Table.Tr key={pkg.PackageId}>
                      <Table.Td>
                        <Text fw={700} size="sm" style={{ color: '#0f172a' }}>
                          {pkg.PackageName}
                        </Text>
                        {pkg.Description && (
                          <Text size="xs" c="dimmed" truncate style={{ maxWidth: 260 }}>
                            {pkg.Description}
                          </Text>
                        )}
                      </Table.Td>

                      <Table.Td>
                        {pkg.cylinder_name ? (
                          <Group gap={6} align="center" wrap="nowrap">
                            <IconFlame size={15} color="#800020" style={{ flexShrink: 0 }} />
                            <div>
                              <Text size="xs" fw={600} style={{ color: '#0f172a' }}>
                                {pkg.cylinder_name} &times; {Number(pkg.CylinderQty || 1)}
                              </Text>
                              <Text size="10px" c="dimmed">
                                Deposit: ₹{Number(pkg.CylinderRate || 0).toFixed(2)}
                              </Text>
                            </div>
                          </Group>
                        ) : (
                          <Text size="xs" c="dimmed">
                            None
                          </Text>
                        )}
                      </Table.Td>

                      <Table.Td>
                        {itemsCount > 0 ? (
                          <Group gap={6} wrap="wrap">
                            {(pkg.items || []).slice(0, 3).map((it: any, idx: number) => {
                              const qtyVal = parseFloat(String(it.Quantity || 1));
                              return (
                                <Badge
                                  key={idx}
                                  size="sm"
                                  radius="md"
                                  variant="light"
                                  styles={{
                                    root: {
                                      backgroundColor: '#fdf2f4',
                                      color: '#800020',
                                      border: '1px solid #fecdd3',
                                      fontWeight: 600,
                                      fontSize: 11.5,
                                      textTransform: 'none',
                                      height: 22,
                                      padding: '0 8px',
                                    },
                                  }}
                                >
                                  {it.product_name || `Product #${it.Product}`} &times; {qtyVal}
                                </Badge>
                              );
                            })}
                            {itemsCount > 3 && (
                              <Badge size="xs" variant="light" color="burgundy" radius="md">
                                +{itemsCount - 3} more
                              </Badge>
                            )}
                          </Group>
                        ) : (
                          <Text size="xs" c="dimmed">
                            No accessories
                          </Text>
                        )}
                      </Table.Td>

                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="sm" fw={600} style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                          ₹{Number(pkg.LaborCharge || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                        <Text size="10px" c="dimmed">
                          {pkg.LaborDescription || 'Fitting Charge'}
                        </Text>
                      </Table.Td>

                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="sm" fw={800} style={{ color: '#800020', fontVariantNumeric: 'tabular-nums' }}>
                          ₹{Number(pkg.TotalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                      </Table.Td>

                      <Table.Td style={{ textAlign: 'center' }}>
                        <Badge
                          size="xs"
                          variant="light"
                          color={pkg.IsActive !== false ? 'burgundy' : 'gray'}
                          style={{
                            fontWeight: 700,
                            backgroundColor: pkg.IsActive !== false ? '#fdf2f4' : undefined,
                            color: pkg.IsActive !== false ? '#800020' : undefined,
                          }}
                        >
                          {pkg.IsActive !== false ? 'ACTIVE' : 'INACTIVE'}
                        </Badge>
                      </Table.Td>

                      <Table.Td style={{ textAlign: 'center' }}>
                        <Group gap={6} justify="center" wrap="nowrap">
                          <Tooltip label="Edit Package" withArrow position="top" color="dark">
                            <ActionIcon
                              variant="subtle"
                              color="burgundy"
                              size="sm"
                              title="Edit"
                              onClick={() => navigate(`/connection-packages/${pkg.PackageId}/edit`)}
                            >
                              <IconPencil size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Delete Package" withArrow position="top" color="dark">
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              size="sm"
                              title="Delete"
                              onClick={() => {
                                if (window.confirm(`Delete package "${pkg.PackageName}"?`)) {
                                  deleteMutation.mutate(pkg.PackageId);
                                }
                              }}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Paper>
    </Stack>
  );
};

export default ConnectionPackagesPage;
