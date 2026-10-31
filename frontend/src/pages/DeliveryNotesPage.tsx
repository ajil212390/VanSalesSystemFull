import React, { useState, useMemo } from 'react';
import {
  Title,
  Paper,
  TextInput,
  Select,
  NumberInput,
  Button,
  Group,
  Stack,
  Table,
  Badge,
  Loader,
  Center,
  Text,
  SimpleGrid,
  ActionIcon,
  Box,
  Tooltip,
  CloseButton,
  Divider,
} from '@mantine/core';
import {
  IconClipboardList,
  IconPlus,
  IconPencil,
  IconTrash,
  IconSearch,
  IconPackage,
  IconBuildingWarehouse,
} from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { apiClient } from '../api/client';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';

interface DeliveryNoteLineItem {
  ProductId: number;
  ProductName: string;
  UnitId: number;
  UnitName: string;
  Quantity: number;
  Rate: number;
  AvailableGodownQty?: number;
}

interface DeliveryNote {
  DeliveryNoteId: number;
  DeliveryNoteNo: string;
  DeliveryDate: string;
  RouteVehicleDriver: number;
  route_name: string;
  vehicle_number: string;
  driver_name: string;
  Remarks: string;
  Status: string;
  total_cylinders: number;
  lines: Array<{
    DeliveryNoteLineId: number;
    Product: number;
    product_name: string;
    product_code: string;
    Unit: number;
    unit_name: string;
    Quantity: number;
    Rate: number;
    Amount: number;
  }>;
}

export const DeliveryNotesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [formOpened, setFormOpened] = useState(false);
  const [editingNote, setEditingNote] = useState<DeliveryNote | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; no: string } | null>(null);

  // Form State for Delivery Note
  const [selectedAllocation, setSelectedAllocation] = useState<string | null>(null);
  const [deliveryDate, setDeliveryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');
  const [loadingLines, setLoadingLines] = useState<DeliveryNoteLineItem[]>([]);

  // 1. Fetch Van Stock Loads
  const { data: deliveryNotes = [], isLoading } = useQuery<DeliveryNote[]>({
    queryKey: ['delivery-notes'],
    queryFn: async () => {
      const res = await apiClient.get('/delivery-notes/');
      return Array.isArray(res.data) ? res.data : (res.data?.results || []);
    },
  });

  // 2. Fetch Active Van Allocations (Route + Vehicle + Driver)
  const { data: allocations = [] } = useQuery<any[]>({
    queryKey: ['allocations'],
    queryFn: async () => {
      const res = await apiClient.get('/allocations/');
      const list = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      // Filter out Godown Stock (ID: 1) from van options
      return list.filter((a: any) => a.RouteVehicleDriverId !== 1 && a.IsActive);
    },
  });

  // 3. Fetch Live Available Stock in Godown
  const { data: godownStock = [], refetch: refetchGodownStock } = useQuery<any[]>({
    queryKey: ['godown-stock'],
    queryFn: async () => {
      const res = await apiClient.get('/delivery-notes/godown-stock/');
      return res.data || [];
    },
  });

  const allocationOptions = useMemo(() => {
    return allocations.map((a: any) => ({
      value: String(a.RouteVehicleDriverId),
      label: `${a.VehicleNumber} • ${a.DriverName} (${a.RouteName})`,
    }));
  }, [allocations]);

  // Open / Close / Edit Form Handlers
  const handleOpenForm = () => {
    setEditingNote(null);
    setSelectedAllocation(null);
    setDeliveryDate(new Date().toISOString().split('T')[0]);
    setRemarks('');
    setLoadingLines([
      { ProductId: 0, ProductName: '', UnitId: 0, UnitName: '', Quantity: 0, Rate: 0 },
    ]);
    refetchGodownStock();
    setFormOpened(true);
  };

  const handleEdit = (dn: DeliveryNote) => {
    setEditingNote(dn);
    setSelectedAllocation(String(dn.RouteVehicleDriver));
    setDeliveryDate(dn.DeliveryDate);
    setRemarks(dn.Remarks || '');
    setLoadingLines(
      dn.lines && dn.lines.length > 0
        ? dn.lines.map((l) => {
            const stockItem = godownStock.find((g: any) => g.ProductId === l.Product);
            const currentGodown = stockItem ? Number(stockItem.AvailableGodownQty) : 0;
            const alreadyLoadedOnThisNote = Number(l.Quantity) || 0;
            return {
              ProductId: l.Product,
              ProductName: l.product_name,
              UnitId: l.Unit,
              UnitName: l.unit_name,
              Quantity: Number(l.Quantity),
              Rate: Number(l.Rate),
              AvailableGodownQty: currentGodown + alreadyLoadedOnThisNote,
            };
          })
        : [{ ProductId: 0, ProductName: '', UnitId: 0, UnitName: '', Quantity: 0, Rate: 0 }]
    );
    refetchGodownStock();
    setFormOpened(true);
  };

  const handleDateChange = (newDate: string) => {
    setDeliveryDate(newDate);
  };

  const handleCloseForm = () => {
    setEditingNote(null);
    setSelectedAllocation(null);
    setRemarks('');
    setLoadingLines([
      { ProductId: 0, ProductName: '', UnitId: 0, UnitName: '', Quantity: 0, Rate: 0 },
    ]);
    setFormOpened(false);
  };

  const handleAddLine = () => {
    setLoadingLines((prev) => [
      ...prev,
      { ProductId: 0, ProductName: '', UnitId: 0, UnitName: '', Quantity: 0, Rate: 0 },
    ]);
  };

  const handleRemoveLine = (idx: number) => {
    setLoadingLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleProductChange = (idx: number, productIdStr: string | null) => {
    if (!productIdStr) return;
    const pId = Number(productIdStr);
    const product = godownStock.find((p: any) => p.ProductId === pId);
    if (!product) return;

    // If editingNote is active and this product was loaded originally, consider it in the available godown pool
    const origLine = editingNote?.lines?.find((l) => l.Product === pId);
    const origQty = origLine ? Number(origLine.Quantity) : 0;
    const effectiveAvail = Number(product.AvailableGodownQty) + origQty;

    setLoadingLines((prev) => {
      const updated = [...prev];
      updated[idx] = {
        ProductId: product.ProductId,
        ProductName: product.ProductName,
        UnitId: product.UnitId,
        UnitName: product.UnitName,
        Quantity: origQty > 0 ? origQty : 0,
        Rate: Number(product.PurchasePrice) || 0,
        AvailableGodownQty: effectiveAvail,
      };
      return updated;
    });
  };

  const handleQtyChange = (idx: number, val: number) => {
    setLoadingLines((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], Quantity: val };
      return updated;
    });
  };

  // Create or Update Delivery Note Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAllocation) throw new Error('Please select a location / allocation.');
      const validLines = loadingLines.filter((l) => l.ProductId > 0 && l.Quantity > 0);
      if (validLines.length === 0) throw new Error('Please add at least one cylinder/product with quantity > 0.');

      const payload = {
        RouteVehicleDriver: Number(selectedAllocation),
        DeliveryDate: deliveryDate,
        Remarks: remarks,
        lines: validLines.map((l) => ({
          ProductId: l.ProductId,
          UnitId: l.UnitId,
          Quantity: l.Quantity,
          Rate: l.Rate,
        })),
      };

      if (editingNote) {
        const res = await apiClient.put(`/delivery-notes/${editingNote.DeliveryNoteId}/`, payload);
        return res.data;
      }
      const res = await apiClient.post('/delivery-notes/', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['delivery-notes'] });
      queryClient.invalidateQueries({ queryKey: ['godown-stock'] });
      notifications.show({
        title: editingNote ? 'Delivery Note Updated' : 'Delivery Note Created',
        message: editingNote
          ? `Successfully updated note (${data.DeliveryNoteNo}) and adjusted stock.`
          : `Successfully loaded cylinders onto van (${data.DeliveryNoteNo})! Stock transferred from Godown to Van.`,
        color: 'burgundy',
      });
      setEditingNote(null);
      setSelectedAllocation(null);
      setRemarks('');
      setLoadingLines([
        { ProductId: 0, ProductName: '', UnitId: 0, UnitName: '', Quantity: 0, Rate: 0 },
      ]);
      setFormOpened(false);
    },
    onError: (err: any) => {
      notifications.show({
        title: editingNote ? 'Update Failed' : 'Loading Failed',
        message: err.response?.data?.detail || err.message || 'Error saving delivery note.',
        color: 'red',
      });
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/delivery-notes/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-notes'] });
      notifications.show({
        title: 'Deleted',
        message: 'Van stock load deleted and cylinders reversed back to godown.',
        color: 'burgundy',
      });
      setDeleteTarget(null);
    },
  });

  const filteredNotes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return deliveryNotes;
    return deliveryNotes.filter(
      (dn) =>
        dn.DeliveryNoteNo.toLowerCase().includes(q) ||
        (dn.vehicle_number && dn.vehicle_number.toLowerCase().includes(q)) ||
        (dn.driver_name && dn.driver_name.toLowerCase().includes(q)) ||
        (dn.route_name && dn.route_name.toLowerCase().includes(q))
    );
  }, [deliveryNotes, searchQuery]);

  const totalLoadedCylinders = useMemo(() => {
    return deliveryNotes.reduce((acc, dn) => acc + (dn.total_cylinders || 0), 0);
  }, [deliveryNotes]);

  const currentLoadingTotal = useMemo(() => {
    return loadingLines.reduce((acc, l) => acc + (Number(l.Quantity) || 0), 0);
  }, [loadingLines]);

  return (
    <Stack gap="md">
      {/* Page Header */}
      <Group justify="space-between" align="center" wrap="wrap" gap="md">
        <div>
          <Title order={2} style={{ color: '#800020', fontWeight: 700 }}>
            Delivery Notes
          </Title>
          <Text size="sm" c="dimmed">
            Load full cylinders from Central Godown into selected location
          </Text>
        </div>

        {/* Right Actions: Search + Load Van Button (only visible when form is closed) */}
        {!formOpened && (
          <Group gap="sm" align="center" wrap="wrap" style={{ flexGrow: 1, justifyContent: 'flex-end' }}>
            <Box style={{ width: 280, minWidth: 180, flexGrow: 1, maxWidth: 360 }}>
              <TextInput
                placeholder="Search van stock loads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.currentTarget.value)}
                leftSection={<IconSearch size={16} stroke={1.5} color="#800020" />}
                rightSection={
                  searchQuery ? (
                    <CloseButton size="sm" aria-label="Clear search" onClick={() => setSearchQuery('')} />
                  ) : null
                }
                radius={10}
                size="sm"
              />
            </Box>

            <Button
              color="burgundy"
              radius={10}
              onClick={handleOpenForm}
              leftSection={<IconPlus size={16} />}
            >
              Load Van Stock
            </Button>
          </Group>
        )}
      </Group>

      {/* Seamless Top Slide-Down Loading Form */}
      {formOpened && (
        <Paper
          p="lg"
          radius="md"
          withBorder
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
            borderLeft: '5px solid #800020',
            boxShadow: '0 4px 16px rgba(128, 0, 32, 0.06)',
          }}
        >
          <Group justify="space-between" align="flex-start" mb="md">
            <div>
              <Text fw={700} style={{ color: '#800020', fontSize: 16 }}>
                {editingNote ? `Edit Delivery Note: ${editingNote.DeliveryNoteNo}` : 'New Delivery Note'}
              </Text>
              <Text size="xs" c="dimmed">
                {editingNote
                  ? 'Modify allocation, date, or loaded cylinder quantities.'
                  : 'Select the location and allocate cylinder quantities from Central Godown.'}
              </Text>
            </div>
            <CloseButton size="md" onClick={handleCloseForm} />
          </Group>

          <Stack gap="md">
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
              <Select
                label="Select location"
                placeholder="Pick Vehicle • Driver (Route)"
                data={allocationOptions}
                value={selectedAllocation}
                onChange={setSelectedAllocation}
                searchable
                clearable
                required
              />
              <TextInput
                label="Loading Date"
                type="date"
                value={deliveryDate}
                onChange={(e) => handleDateChange(e.currentTarget.value)}
                required
              />
              <TextInput
                label="Remarks"
                placeholder="e.g. Morning 7:00 AM shift delivery load"
                value={remarks}
                onChange={(e) => setRemarks(e.currentTarget.value)}
              />
            </SimpleGrid>

            <Divider
              label={
                <Group gap={8}>
                  <Text size="xs" fw={700} style={{ color: '#800020' }}>
                    Items to Load from Godown
                  </Text>
                  {currentLoadingTotal > 0 && (
                    <Badge
                      size="xs"
                      style={{ backgroundColor: '#800020', color: '#ffffff', fontWeight: 700 }}
                    >
                      {currentLoadingTotal}
                    </Badge>
                  )}
                </Group>
              }
              labelPosition="left"
            />

            {/* Cylinders Loading Grid */}
            <Stack gap="xs">
              {loadingLines.map((line, idx) => (
                <Group key={idx} align="flex-end" wrap="nowrap" gap="sm">
                  <Box style={{ flex: 3 }}>
                    <Select
                      label={idx === 0 ? 'Product' : undefined}
                      placeholder="Choose Product"
                      data={godownStock.map((p: any) => ({
                        value: String(p.ProductId),
                        label: p.ProductName,
                      }))}
                      value={line.ProductId > 0 ? String(line.ProductId) : null}
                      onChange={(val) => handleProductChange(idx, val)}
                      searchable
                      renderOption={({ option }) => {
                        const p = godownStock.find((item: any) => String(item.ProductId) === option.value);
                        const origLine = editingNote?.lines?.find((l) => l.Product === p?.ProductId);
                        const origQty = origLine ? Number(origLine.Quantity) : 0;
                        const stock = p ? Number(p.AvailableGodownQty) + origQty : 0;
                        return (
                          <Group justify="space-between" wrap="nowrap" style={{ width: '100%' }}>
                            <Text size="sm">{option.label}</Text>
                            <Group gap={4} wrap="nowrap">
                              <Text size="xs" c="dimmed">In Stock:</Text>
                              <Text size="xs" fw={700} c="#800020">{stock}</Text>
                            </Group>
                          </Group>
                        );
                      }}
                      rightSection={
                        line.ProductId > 0 && line.AvailableGodownQty !== undefined ? (
                          <Group gap={4} mr="xs" wrap="nowrap">
                            <Text size="xs" c="dimmed">In Stock:</Text>
                            <Text size="xs" fw={700} c="#800020">
                              {line.AvailableGodownQty}
                            </Text>
                          </Group>
                        ) : null
                      }
                      rightSectionWidth={line.ProductId > 0 ? 130 : undefined}
                      rightSectionPointerEvents="none"
                    />
                  </Box>
                  <Box style={{ width: 140 }}>
                    <NumberInput
                      label={idx === 0 ? 'Load Qty' : undefined}
                      placeholder="Qty"
                      min={0}
                      max={line.AvailableGodownQty !== undefined ? line.AvailableGodownQty : undefined}
                      value={line.Quantity || ''}
                      onChange={(val) => handleQtyChange(idx, Number(val) || 0)}
                    />
                  </Box>
                  <Group gap={6} align="flex-end" wrap="nowrap">
                    <Tooltip label="Add another product" withArrow>
                      <ActionIcon
                        color="burgundy"
                        radius={8}
                        size={36}
                        onClick={handleAddLine}
                      >
                        <IconPlus size={18} />
                      </ActionIcon>
                    </Tooltip>

                    {loadingLines.length > 1 ? (
                      <Tooltip label="Remove product" withArrow>
                        <ActionIcon
                          color="red"
                          variant="subtle"
                          radius={8}
                          size={36}
                          onClick={() => handleRemoveLine(idx)}
                        >
                          <IconTrash size={18} />
                        </ActionIcon>
                      </Tooltip>
                    ) : (
                      <Box style={{ width: 36 }} />
                    )}
                  </Group>
                </Group>
              ))}
            </Stack>

            <Group justify="flex-end" mt="md" gap="sm">
              <Button variant="default" onClick={handleCloseForm} radius={10}>
                Cancel
              </Button>
              <Button
                color="burgundy"
                onClick={() => saveMutation.mutate()}
                loading={saveMutation.isPending}
                radius={10}
              >
                {editingNote ? 'Save Changes' : 'Confirm Loading & Transfer Stock'}
              </Button>
            </Group>
          </Stack>
        </Paper>
      )}

      {/* Below Data: Summary Cards & Table (hidden when form is open, only the form shows) */}
      {!formOpened && (
        <>
          {/* Summary Cards */}
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            {/* Card 1: Total Van Loads */}
            <Paper
              p="md"
              radius="md"
              withBorder
              style={{
                backgroundColor: '#ffffff',
                borderColor: '#e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Stack gap={2}>
                  <Text size="xs" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.5px', fontSize: 11 }}>
                    Total Delivery Notes
                  </Text>
                  <Text fw={700} style={{ color: '#0f172a', fontSize: 24, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                    {deliveryNotes.length}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Completed delivery notes
                  </Text>
                </Stack>
                <IconClipboardList size={26} color="#800020" stroke={1.5} />
              </Group>
            </Paper>

            {/* Card 2: Total Cylinders Loaded */}
            <Paper
              p="md"
              radius="md"
              withBorder
              style={{
                backgroundColor: '#ffffff',
                borderColor: '#e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Stack gap={2}>
                  <Text size="xs" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.5px', fontSize: 11 }}>
                    Total Stocks Loaded
                  </Text>
                  <Text fw={700} style={{ color: '#0f172a', fontSize: 24, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                    {Number(totalLoadedCylinders)}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Full cylinders dispatched
                  </Text>
                </Stack>
                <IconPackage size={26} color="#800020" stroke={1.5} />
              </Group>
            </Paper>

            {/* Card 3: Active Van Routes */}
            <Paper
              p="md"
              radius="md"
              withBorder
              style={{
                backgroundColor: '#ffffff',
                borderColor: '#e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Stack gap={2}>
                  <Text size="xs" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.5px', fontSize: 11 }}>
                    Active Van Routes
                  </Text>
                  <Text fw={700} style={{ color: '#0f172a', fontSize: 24, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                    {allocations.length}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Vehicles ready on routes
                  </Text>
                </Stack>
                <IconBuildingWarehouse size={26} color="#800020" stroke={1.5} />
              </Group>
            </Paper>
          </SimpleGrid>

          {/* Table */}
          <Paper radius="md" withBorder style={{ overflow: 'hidden', backgroundColor: '#ffffff', borderColor: '#e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            {isLoading ? (
              <Center p="xl"><Loader color="burgundy" /></Center>
            ) : filteredNotes.length === 0 ? (
              <Center p="xl">
                <Text c="dimmed" size="sm">No delivery notes found. Click "Load Van Stock" to create one.</Text>
              </Center>
            ) : (
              <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>DN NO</Table.Th>
                    <Table.Th>DATE</Table.Th>
                    <Table.Th>ROUTE</Table.Th>
                    <Table.Th>VEHICLE</Table.Th>
                    <Table.Th>DRIVER</Table.Th>
                    <Table.Th style={{ textAlign: 'center' }}>TOTAL STOCKS</Table.Th>
                    <Table.Th>REMARKS</Table.Th>
                    <Table.Th style={{ textAlign: 'center', whiteSpace: 'nowrap', minWidth: 100 }}>STATUS</Table.Th>
                    <Table.Th style={{ textAlign: 'center', whiteSpace: 'nowrap', minWidth: 90 }}>ACTIONS</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredNotes.map((dn) => (
                    <Table.Tr key={dn.DeliveryNoteId}>
                      <Table.Td fw={700} style={{ color: '#800020', fontSize: 13 }}>
                        {dn.DeliveryNoteNo}
                      </Table.Td>
                      <Table.Td style={{ fontSize: 13, color: '#334155' }}>
                        {dn.DeliveryDate}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={600} c="#0f172a">{dn.route_name || '-'}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={600} c="#0f172a">{dn.vehicle_number || '-'}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="#334155">{dn.driver_name || '-'}</Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center', fontWeight: 800, fontSize: 14, color: '#800020' }}>
                        {Number(dn.total_cylinders)}
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" c="dimmed" truncate style={{ maxWidth: 180 }}>
                          {dn.Remarks || '-'}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <Badge
                          variant="outline"
                          color="burgundy"
                          size="sm"
                          radius="sm"
                          styles={{
                            root: {
                              borderColor: '#800020',
                              color: '#800020',
                              fontWeight: 600,
                              letterSpacing: '0.4px',
                              padding: '0 8px',
                              overflow: 'visible',
                            },
                            label: {
                              overflow: 'visible',
                              textOverflow: 'clip',
                              whiteSpace: 'nowrap',
                            },
                          }}
                        >
                          {dn.Status}
                        </Badge>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>
                        <Group gap={4} justify="center" wrap="nowrap">
                          <Tooltip label="Edit Delivery Note" withArrow>
                            <ActionIcon
                              color="burgundy"
                              variant="subtle"
                              onClick={() => handleEdit(dn)}
                            >
                              <IconPencil size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Delete & Reverse Stock" withArrow>
                            <ActionIcon
                              color="red"
                              variant="subtle"
                              onClick={() => setDeleteTarget({ id: dn.DeliveryNoteId, no: dn.DeliveryNoteNo })}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Paper>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          opened={true}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          title="Delete Van Load"
          itemName={deleteTarget.no}
          loading={deleteMutation.isPending}
        />
      )}
    </Stack>
  );
};
