import React, { useState, useMemo } from 'react';
import {
  Title,
  Paper,
  TextInput,
  Button,
  Group,
  Stack,
  Center,
  Text,
  Table,
  Badge,
  ActionIcon,
  Tooltip,
  SimpleGrid,
  Select,
  NumberInput,
  Switch,
  Collapse,
  Transition,
  CloseButton,
  Box,
  Loader,
  Divider,
} from '@mantine/core';
import {
  IconSearch,
  IconBook2,
  IconPencil,
  IconTrash,
} from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { notifications } from '@mantine/notifications';
import { apiClient } from '../api/client';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';

interface GroupItem {
  GroupId: number;
  GroupName: string;
  parent_group_name?: string;
  Nature: 'Asset' | 'Liability' | 'Income' | 'Expense';
}

interface StateItem {
  StateId: number;
  StateName: string;
  GSTStateCode: string;
}

export interface LedgerItem {
  LedgerId: number;
  LedgerName: string;
  Group: number;
  group_name?: string;
  group_nature?: string;
  OpeningBalance: number;
  OpeningBalanceType: 'DR' | 'CR';
  DebitBalance: number;
  CreditBalance: number;
  CurrentBalance: number;
  AddressLine1?: string;
  AddressLine2?: string;
  AddressLine3?: string;
  City?: string;
  StateId?: number;
  Pincode?: string;
  PhoneNumber?: string;
  MobileNumber?: string;
  Email?: string;
  GSTRegistrationType?: string;
  GSTIN?: string;
  PAN?: string;
  IsBillWise: boolean;
  CreditPeriodDays: number;
  CreditLimit: number;
  BankName?: string;
  BankAccountNumber?: string;
  IFSCCode?: string;
  BankBranch?: string;
  EmptyStockLimit: number;
  IsActive: boolean;
  IsSystem: boolean;
  Narration?: string;
  delete_block_reason?: string;
}

interface LedgerFormValues {
  LedgerName: string;
  Group: string;
  OpeningBalance: number | string;
  OpeningBalanceType: 'DR' | 'CR' | '';
  DebitBalance: number | string;
  CreditBalance: number | string;
  CurrentBalance: number | string;
  AddressLine1: string;
  AddressLine2: string;
  AddressLine3: string;
  City: string;
  StateId: string | null;
  Pincode: string;
  PhoneNumber: string;
  MobileNumber: string;
  Email: string;
  GSTRegistrationType: string;
  GSTIN: string;
  PAN: string;
  IsBillWise: boolean;
  CreditPeriodDays: number | string;
  CreditLimit: number | string;
  BankName: string;
  BankAccountNumber: string;
  IFSCCode: string;
  BankBranch: string;
  EmptyStockLimit: number | string;
  IsActive: boolean;
  Narration: string;
}

const defaultLedgerValues: LedgerFormValues = {
  LedgerName: '',
  Group: '',
  OpeningBalance: '',
  OpeningBalanceType: '',
  DebitBalance: '',
  CreditBalance: '',
  CurrentBalance: '',
  AddressLine1: '',
  AddressLine2: '',
  AddressLine3: '',
  City: '',
  StateId: null,
  Pincode: '',
  PhoneNumber: '',
  MobileNumber: '',
  Email: '',
  GSTRegistrationType: '',
  GSTIN: '',
  PAN: '',
  IsBillWise: true,
  CreditPeriodDays: '',
  CreditLimit: '',
  BankName: '',
  BankAccountNumber: '',
  IFSCCode: '',
  BankBranch: '',
  EmptyStockLimit: '',
  IsActive: true,
  Narration: '',
};

export const AccountsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string | null>(null);
  const [formOpened, setFormOpened] = useState(false);
  const [editingLedger, setEditingLedger] = useState<LedgerItem | null>(null);
  const [ledgerToDelete, setLedgerToDelete] = useState<LedgerItem | null>(null);

  // 1. Fetch Ledgers
  const { data: ledgers = [], isLoading: isLoadingLedgers } = useQuery<LedgerItem[]>({
    queryKey: ['ledgers'],
    queryFn: async () => {
      const res = await apiClient.get('/ledgers/');
      return Array.isArray(res.data) ? res.data : (res.data.results || []);
    },
  });

  // 2. Fetch Groups for dropdown
  const { data: groups = [] } = useQuery<GroupItem[]>({
    queryKey: ['groups'],
    queryFn: async () => {
      const res = await apiClient.get('/groups/');
      return Array.isArray(res.data) ? res.data : (res.data.results || []);
    },
  });

  // 3. Fetch States for dropdown
  const { data: states = [] } = useQuery<StateItem[]>({
    queryKey: ['states'],
    queryFn: async () => {
      const res = await apiClient.get('/states/');
      return Array.isArray(res.data) ? res.data : (res.data.results || []);
    },
  });

  // Form management
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LedgerFormValues>({
    defaultValues: defaultLedgerValues,
  });

  // Save / Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: LedgerFormValues) => {
      const payload: any = {
        LedgerName: data.LedgerName.trim(),
        Group: parseInt(data.Group, 10),
        OpeningBalance: data.OpeningBalance !== '' ? Number(data.OpeningBalance) : 0,
        OpeningBalanceType: data.OpeningBalanceType || 'DR',
        DebitBalance: data.DebitBalance !== '' && data.DebitBalance !== null ? Number(data.DebitBalance) : 0,
        CreditBalance: data.CreditBalance !== '' && data.CreditBalance !== null ? Number(data.CreditBalance) : 0,
        CurrentBalance: data.CurrentBalance !== '' && data.CurrentBalance !== null ? Number(data.CurrentBalance) : 0,
        AddressLine1: data.AddressLine1.trim() || null,
        AddressLine2: data.AddressLine2.trim() || null,
        AddressLine3: data.AddressLine3.trim() || null,
        City: data.City.trim() || null,
        StateId: data.StateId ? parseInt(data.StateId, 10) : null,
        Pincode: data.Pincode.trim() || null,
        PhoneNumber: data.PhoneNumber.trim() || null,
        MobileNumber: data.MobileNumber.trim() || null,
        Email: data.Email.trim() || null,
        GSTRegistrationType: data.GSTRegistrationType || 'Unregistered',
        GSTIN: data.GSTIN.trim().toUpperCase() || null,
        PAN: data.PAN.trim().toUpperCase() || null,
        IsBillWise: Boolean(data.IsBillWise),
        CreditPeriodDays: data.CreditPeriodDays !== '' ? Number(data.CreditPeriodDays) : 0,
        CreditLimit: data.CreditLimit !== '' ? Number(data.CreditLimit) : 0,
        BankName: data.BankName.trim() || null,
        BankAccountNumber: data.BankAccountNumber.trim() || null,
        IFSCCode: data.IFSCCode.trim().toUpperCase() || null,
        BankBranch: data.BankBranch.trim() || null,
        EmptyStockLimit: data.EmptyStockLimit !== '' ? Number(data.EmptyStockLimit) : 0,
        IsActive: data.IsActive,
        Narration: data.Narration.trim() || null,
      };

      if (editingLedger) {
        return apiClient.put(`/ledgers/${editingLedger.LedgerId}/`, payload);
      } else {
        return apiClient.post('/ledgers/', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ledgers'] });
      notifications.show({
        title: 'Success',
        message: editingLedger ? 'Ledger updated successfully.' : 'Ledger created successfully.',
        color: 'teal',
      });
      handleCloseForm();
    },
    onError: (err: any) => {
      const detail =
        err.response?.data?.detail ||
        Object.values(err.response?.data || {})
          .flat()
          .join(', ') ||
        'Failed to save ledger.';
      notifications.show({
        title: 'Error',
        message: String(detail),
        color: 'red',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (ledgerId: number) => {
      await apiClient.delete(`/ledgers/${ledgerId}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ledgers'] });
      notifications.show({
        title: 'Deleted',
        message: 'Ledger deleted successfully.',
        color: 'teal',
      });
      setLedgerToDelete(null);
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail || 'Failed to delete ledger.';
      notifications.show({
        title: 'Error',
        message: String(detail),
        color: 'red',
      });
      setLedgerToDelete(null);
    },
  });

  const onSubmit = (data: LedgerFormValues) => {
    saveMutation.mutate(data);
  };

  const handleCloseForm = () => {
    setFormOpened(false);
    setEditingLedger(null);
    reset(defaultLedgerValues);
  };

  const handleAddNew = () => {
    if (formOpened && !editingLedger) {
      handleCloseForm();
      return;
    }
    setEditingLedger(null);
    reset(defaultLedgerValues);
    setFormOpened(true);
  };

  const handleEdit = (ledger: LedgerItem) => {
    setEditingLedger(ledger);
    reset({
      LedgerName: ledger.LedgerName,
      Group: String(ledger.Group),
      OpeningBalance: Number(ledger.OpeningBalance) !== 0 ? Number(ledger.OpeningBalance) : '',
      OpeningBalanceType: ledger.OpeningBalanceType || 'DR',
      DebitBalance: Number(ledger.DebitBalance) !== 0 ? Number(ledger.DebitBalance) : '',
      CreditBalance: Number(ledger.CreditBalance) !== 0 ? Number(ledger.CreditBalance) : '',
      CurrentBalance: Number(ledger.CurrentBalance) !== 0 ? Number(ledger.CurrentBalance) : '',
      AddressLine1: ledger.AddressLine1 || '',
      AddressLine2: ledger.AddressLine2 || '',
      AddressLine3: ledger.AddressLine3 || '',
      City: ledger.City || '',
      StateId: ledger.StateId ? String(ledger.StateId) : null,
      Pincode: ledger.Pincode || '',
      PhoneNumber: ledger.PhoneNumber || '',
      MobileNumber: ledger.MobileNumber || '',
      Email: ledger.Email || '',
      GSTRegistrationType: ledger.GSTRegistrationType || '',
      GSTIN: ledger.GSTIN || '',
      PAN: ledger.PAN || '',
      IsBillWise: ledger.IsBillWise,
      CreditPeriodDays: Number(ledger.CreditPeriodDays) !== 0 ? Number(ledger.CreditPeriodDays) : '',
      CreditLimit: Number(ledger.CreditLimit) !== 0 ? Number(ledger.CreditLimit) : '',
      BankName: ledger.BankName || '',
      BankAccountNumber: ledger.BankAccountNumber || '',
      IFSCCode: ledger.IFSCCode || '',
      BankBranch: ledger.BankBranch || '',
      EmptyStockLimit: Number(ledger.EmptyStockLimit) !== 0 ? Number(ledger.EmptyStockLimit) : '',
      IsActive: ledger.IsActive,
      Narration: ledger.Narration || '',
    });
    setFormOpened(true);
  };

  // Filtered ledgers
  const filteredLedgers = useMemo(() => {
    return ledgers.filter((l) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        l.LedgerName.toLowerCase().includes(q) ||
        (l.group_name && l.group_name.toLowerCase().includes(q)) ||
        (l.MobileNumber && l.MobileNumber.toLowerCase().includes(q)) ||
        (l.GSTIN && l.GSTIN.toLowerCase().includes(q));

      const matchesGroup = selectedGroupFilter
        ? String(l.Group) === selectedGroupFilter
        : true;

      return matchesSearch && matchesGroup;
    });
  }, [ledgers, searchQuery, selectedGroupFilter]);

  const groupOptions = useMemo(() => {
    return groups.map((g) => ({
      value: String(g.GroupId),
      label: `${g.GroupName} (${g.Nature})`,
    }));
  }, [groups]);

  const stateOptions = useMemo(() => {
    return states.map((s) => ({
      value: String(s.StateId),
      label: `${s.StateName} (${s.GSTStateCode})`,
    }));
  }, [states]);

  return (
    <Stack gap="lg">
      {/* Page Header matching Products Page */}
      <Group justify="space-between" align="center" wrap="wrap" gap="md">
        <div>
          <Title order={2} style={{ color: '#800020', fontWeight: 700 }}>
            Accounts
          </Title>
          <Text size="sm" c="dimmed">
            Manage customer, supplier, bank, and expense ledgers.
          </Text>
        </div>

        {/* Right Actions: Group Filter + Search Bar + Add Button */}
        <Group gap="sm" align="center" wrap="wrap">
          <Transition mounted={!formOpened} transition="fade" duration={200}>
            {(groupFilterStyles) => (
              <Box style={{ ...groupFilterStyles, width: 220 }}>
                <Select
                  placeholder="All Account Groups"
                  data={groupOptions}
                  value={selectedGroupFilter}
                  onChange={(val) => setSelectedGroupFilter(val)}
                  clearable
                  searchable
                  size="sm"
                  radius="md"
                />
              </Box>
            )}
          </Transition>

          <Transition mounted={!formOpened} transition="fade" duration={200}>
            {(searchStyles) => (
              <Box style={{ ...searchStyles, width: 240 }}>
                <TextInput
                  placeholder="Search accounts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.currentTarget.value)}
                  leftSection={<IconSearch size={16} stroke={1.5} color="#800020" />}
                  rightSection={
                    searchQuery ? (
                      <CloseButton size="sm" aria-label="Clear search" onClick={() => setSearchQuery('')} />
                    ) : null
                  }
                  radius="md"
                  size="sm"
                />
              </Box>
            )}
          </Transition>

          <Transition mounted={!formOpened} transition="fade" duration={200}>
            {(btnStyles) => (
              <Button color="burgundy" radius={10} onClick={handleAddNew} style={btnStyles}>
                + Add Ledger
              </Button>
            )}
          </Transition>
        </Group>
      </Group>


      {/* Main Container */}
      <Box>
        {/* Slide-Down Form Panel */}
        <Collapse expanded={formOpened} transitionDuration={250} transitionTimingFunction="ease">
          <Paper
            p="lg"
            radius="sm"
            withBorder
            style={{
              backgroundColor: '#ffffff',
              borderColor: '#f5c2cb',
              borderLeft: '4px solid #800020',
              marginBottom: 20,
            }}
          >
            <Group justify="space-between" align="flex-start" mb="md">
              <div>
                <Text fw={700} style={{ color: '#800020' }}>
                  {editingLedger ? `Edit Ledger: ${editingLedger.LedgerName}` : 'Create New Account Ledger'}
                </Text>
                <Text size="xs" c="dimmed">
                  {editingLedger
                    ? 'Update ledger classification, opening balance, credit control, and tax credentials.'
                    : 'Configure account group, opening balance, credit terms, cylinder limits, and GST profile.'}
                </Text>
              </div>
              <CloseButton size="md" onClick={handleCloseForm} />
            </Group>

            <form onSubmit={handleSubmit(onSubmit)}>
              <Stack gap="md">
                {/* Section 1: Account Classification & Balances (First 2 rows) */}
                <Divider
                  label={
                    <Text size="xs" fw={700} style={{ color: '#800020', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                      Account Classification & Balances
                    </Text>
                  }
                  labelPosition="left"
                  color="#e2e8f0"
                />

                {/* Row 1: Primary Account Info */}
                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                  <TextInput
                    label="Ledger Name"
                    placeholder="e.g.State Bank of India, Office Rent"
                    required
                    {...register('LedgerName', { required: 'Ledger name is required' })}
                    error={errors.LedgerName?.message}
                  />
                  <Controller
                    name="Group"
                    control={control}
                    rules={{ required: 'Account group is required' }}
                    render={({ field }) => (
                      <Select
                        label="Account Group"
                        placeholder="Select Account Group"
                        required
                        data={groupOptions}
                        value={field.value ? String(field.value) : null}
                        onChange={(val) => field.onChange(val || '')}
                        searchable
                        clearable
                        nothingFoundMessage="No groups found"
                        error={errors.Group?.message}
                      />
                    )}
                  />

                  

                  <Controller
                    name="OpeningBalanceType"
                    control={control}
                    render={({ field }) => (
                      <Select
                        label="Balance Type"
                        placeholder="Select Balance Type"
                        data={[
                          { value: 'DR', label: 'Debit (DR)' },
                          { value: 'CR', label: 'Credit (CR)' },
                        ]}
                        value={field.value || null}
                        onChange={(val) => field.onChange(val || '')}
                        clearable
                      />
                    )}
                  />
                </SimpleGrid>

                {/* Row 2: Financial Balances */}
                <SimpleGrid cols={{ base: 1, sm: 4 }} spacing="md">
                  <Controller
                    name="OpeningBalance"
                    control={control}
                    render={({ field }) => (
                      <NumberInput
                        label="Opening Balance"
                        placeholder="0.00"
                        min={0}
                        decimalScale={2}
                        prefix="₹ "
                        hideControls
                        value={field.value === '' || field.value === null || field.value === undefined ? '' : field.value}
                        onChange={(val) => field.onChange(val === '' ? '' : val)}
                      />
                    )}
                  />

                  <Controller
                    name="DebitBalance"
                    control={control}
                    render={({ field }) => (
                      <NumberInput
                        label="Debit Balance"
                        placeholder="0.00"
                        min={0}
                        decimalScale={2}
                        prefix="₹ "
                        hideControls
                        value={field.value === '' || field.value === null || field.value === undefined ? '' : field.value}
                        onChange={(val) => field.onChange(val === '' ? '' : val)}
                      />
                    )}
                  />

                  <Controller
                    name="CreditBalance"
                    control={control}
                    render={({ field }) => (
                      <NumberInput
                        label="Credit Balance"
                        placeholder="0.00"
                        min={0}
                        decimalScale={2}
                        prefix="₹ "
                        hideControls
                        value={field.value === '' || field.value === null || field.value === undefined ? '' : field.value}
                        onChange={(val) => field.onChange(val === '' ? '' : val)}
                      />
                    )}
                  />

                  <Controller
                    name="CurrentBalance"
                    control={control}
                    render={({ field }) => (
                      <NumberInput
                        label="Current Balance"
                        placeholder="0.00"
                        decimalScale={2}
                        prefix="₹ "
                        hideControls
                        value={field.value === '' || field.value === null || field.value === undefined ? '' : field.value}
                        onChange={(val) => field.onChange(val === '' ? '' : val)}
                      />
                    )}
                  />
                </SimpleGrid>

                {/* Section 2: Credit, Statutory & Contact Details (Middle rows) */}
                <Divider
                  label={
                    <Text size="xs" fw={700} style={{ color: '#800020', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                      Credit, Compliance & Address Details
                    </Text>
                  }
                  labelPosition="left"
                  color="#e2e8f0"
                  mt="xs"
                />

                {/* Row 3: Credit Terms & Stock Limit */}
                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                  <Controller
                    name="CreditPeriodDays"
                    control={control}
                    render={({ field }) => (
                      <NumberInput
                        label="Credit Period"
                        placeholder="0"
                        min={0}
                        hideControls
                        value={field.value === '' || field.value === null || field.value === undefined ? '' : field.value}
                        onChange={(val) => field.onChange(val === '' ? '' : val)}
                      />
                    )}
                  />

                  <Controller
                    name="CreditLimit"
                    control={control}
                    render={({ field }) => (
                      <NumberInput
                        label="Credit Limit"
                        placeholder="0.00"
                        min={0}
                        decimalScale={2}
                        prefix="₹ "
                        hideControls
                        value={field.value === '' || field.value === null || field.value === undefined ? '' : field.value}
                        onChange={(val) => field.onChange(val === '' ? '' : val)}
                      />
                    )}
                  />

                  <Controller
                    name="EmptyStockLimit"
                    control={control}
                    render={({ field }) => (
                      <NumberInput
                        label="Empty Stock Limit"
                        placeholder="0"
                        min={0}
                        hideControls
                        value={field.value === '' || field.value === null || field.value === undefined ? '' : field.value}
                        onChange={(val) => field.onChange(val === '' ? '' : val)}
                      />
                    )}
                  />
                </SimpleGrid>

                {/* Row 3: Tax Compliance (GST & PAN) */}
                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                  <Controller
                    name="GSTRegistrationType"
                    control={control}
                    render={({ field }) => (
                      <Select
                        label="GST Registration Type"
                        placeholder="Select Type"
                        data={[
                          { value: 'Unregistered', label: 'Unregistered / Consumer' },
                          { value: 'Regular', label: 'Regular Taxpayer' },
                          { value: 'Composition', label: 'Composition Scheme' },
                        ]}
                        value={field.value || null}
                        onChange={(val) => field.onChange(val || '')}
                        clearable
                      />
                    )}
                  />

                  <TextInput
                    label="GSTIN (15 Digits)"
                    placeholder="e.g. 32AAAAA0000A1Z5"
                    maxLength={15}
                    {...register('GSTIN')}
                  />

                  <TextInput
                    label="PAN Number (10 Digits)"
                    placeholder="e.g. ABCDE1234F"
                    maxLength={10}
                    {...register('PAN')}
                  />
                </SimpleGrid>

                {/* Row 4: Contact & Communication */}
                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                  <TextInput
                    label="Mobile Number"
                    placeholder="10-digit mobile number"
                    {...register('MobileNumber')}
                  />

                  <TextInput
                    label="Phone Number"
                    placeholder="Landline / Alt phone"
                    {...register('PhoneNumber')}
                  />

                  <TextInput
                    label="Email Address"
                    placeholder="e.g. accounts@client.com"
                    {...register('Email')}
                  />
                </SimpleGrid>

                {/* Row 6: Street Address */}
                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                  <TextInput
                    label="Address Line 1"
                    placeholder="Premises, Street, Building"
                    {...register('AddressLine1')}
                  />

                  <TextInput
                    label="Address Line 2"
                    placeholder="Area, Landmark"
                    {...register('AddressLine2')}
                  />

                  <TextInput
                    label="Address Line 3"
                    placeholder="Locality, Sector / Floor"
                    {...register('AddressLine3')}
                  />
                </SimpleGrid>

                {/* Row 7: City / Town, State & Pincode */}
                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                  <TextInput
                    label="City / Town"
                    placeholder="e.g. Cochin"
                    {...register('City')}
                  />

                  <Controller
                    name="StateId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        label="State (Place of Supply)"
                        placeholder="Select State"
                        data={stateOptions}
                        value={field.value ? String(field.value) : null}
                        onChange={(val) => field.onChange(val || null)}
                        searchable
                        clearable
                        nothingFoundMessage="No states found"
                      />
                    )}
                  />

                  <TextInput
                    label="Pincode"
                    placeholder="e.g. 682001"
                    maxLength={10}
                    {...register('Pincode')}
                  />
                </SimpleGrid>

                {/* Section 3: Banking & Remarks (Last 2 rows) */}
                <Divider
                  label={
                    <Text size="xs" fw={700} style={{ color: '#800020', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                      Banking Details & Remarks
                    </Text>
                  }
                  labelPosition="left"
                  color="#e2e8f0"
                  mt="xs"
                />

                {/* Row 8: Banking Details (Optional) */}
                <SimpleGrid cols={{ base: 1, sm: 4 }} spacing="md">
                  <TextInput
                    label="Bank Name"
                    placeholder="e.g. State Bank of India"
                    {...register('BankName')}
                  />

                  <TextInput
                    label="Account Number"
                    placeholder="A/c number"
                    {...register('BankAccountNumber')}
                  />

                  <TextInput
                    label="IFSC Code"
                    placeholder="e.g. SBIN0001234"
                    maxLength={11}
                    {...register('IFSCCode')}
                  />

                  <TextInput
                    label="Branch Name"
                    placeholder="Branch location"
                    {...register('BankBranch')}
                  />
                </SimpleGrid>

                {/* Row 7: Narration / Remarks */}
                <TextInput
                  label="Narration / Remarks (Optional)"
                  placeholder="Additional remarks or ledger notes..."
                  {...register('Narration')}
                />

                {/* Row 8: Status Switches on Left, Action Buttons on Right */}
                <Group justify="space-between" align="center" wrap="wrap" gap="md" mt="xs">
                  <Group gap="sm" wrap="wrap">
                    <Controller
                      name="IsActive"
                      control={control}
                      render={({ field }) => (
                        <Paper p="xs" px="sm" radius="sm" withBorder style={{ backgroundColor: '#fcfcfc', borderColor: '#e2e8f0' }}>
                          <Switch
                            label={field.value ? 'Ledger Status: Active' : 'Ledger Status: Inactive'}
                            description={field.value ? 'Available in transactions & billing' : 'Disabled from account selection'}
                            checked={field.value}
                            onChange={(e) => field.onChange(e.currentTarget.checked)}
                            color="burgundy"
                            size="sm"
                          />
                        </Paper>
                      )}
                    />

                    <Controller
                      name="IsBillWise"
                      control={control}
                      render={({ field }) => (
                        <Paper p="xs" px="sm" radius="sm" withBorder style={{ backgroundColor: '#fcfcfc', borderColor: '#e2e8f0' }}>
                          <Switch
                            label={field.value ? 'Bill-Wise: Enabled' : 'Bill-Wise: Disabled'}
                            description={field.value ? 'Track individual invoice aging & balances' : 'Cumulative running balance'}
                            checked={field.value}
                            onChange={(e) => field.onChange(e.currentTarget.checked)}
                            color="burgundy"
                            size="sm"
                          />
                        </Paper>
                      )}
                    />
                  </Group>

                  <Group gap="sm">
                    <Button variant="default" onClick={handleCloseForm}>
                      Cancel
                    </Button>
                    <Button type="submit" color="burgundy" loading={isSubmitting || saveMutation.isPending}>
                      {editingLedger ? 'Save Changes' : 'Create Ledger'}
                    </Button>
                  </Group>
                </Group>
              </Stack>
            </form>
          </Paper>
        </Collapse>

        {/* Ledgers Table & Filter Tabs */}
        <Transition mounted={!formOpened} transition="fade" duration={250} timingFunction="ease">
          {(styles) => (
            <Paper
              radius="sm"
              withBorder
              style={{
                ...styles,
                backgroundColor: '#ffffff',
                borderColor: '#e2e8f0',
                overflow: 'hidden',
              }}
            >
              {/* Category Filter Tabs */}

              {isLoadingLedgers ? (
                <Center p="xl" style={{ minHeight: 250 }}>
                  <Loader color="burgundy" size="md" />
                </Center>
              ) : filteredLedgers.length === 0 ? (
                <Center p="xl" style={{ minHeight: 250 }}>
                  <Stack align="center" gap="xs">
                    <IconBook2 size={38} color="#800020" stroke={1.5} />
                    <Text fw={600} size="sm" c="dimmed">
                      {searchQuery || selectedGroupFilter
                        ? 'No accounts matching your search filter.'
                        : 'No accounts added yet. Click "+ Add Ledger" to create your first ledger.'}
                    </Text>
                    {!searchQuery && !selectedGroupFilter && (
                      <Button color="burgundy" size="xs" radius={8} onClick={handleAddNew}>
                        + Add First Ledger
                      </Button>
                    )}
                  </Stack>
                </Center>
              ) : (
                <Table.ScrollContainer minWidth={1260}>
                  <Table verticalSpacing="md" horizontalSpacing="md" highlightOnHover>
                    <Table.Thead style={{ backgroundColor: '#fcfcfc', borderBottom: '1px solid #e2e8f0' }}>
                      <Table.Tr>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, minWidth: 200 }}>Ledger Name</Table.Th>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, minWidth: 150 }}>Group</Table.Th>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, minWidth: 100, textAlign: 'center' }}>Nature</Table.Th>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, minWidth: 120 }}>Contact</Table.Th>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, minWidth: 130 }}>GSTIN</Table.Th>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, minWidth: 130, textAlign: 'right' }}>Opening Balance</Table.Th>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, minWidth: 110, textAlign: 'right' }}>Debit</Table.Th>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, minWidth: 110, textAlign: 'right' }}>Credit</Table.Th>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, minWidth: 130, textAlign: 'right' }}>Current Balance</Table.Th>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, minWidth: 90, textAlign: 'center' }}>Status</Table.Th>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, minWidth: 80, textAlign: 'right' }}>Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>

                    <Table.Tbody>
                      {filteredLedgers.map((ledger) => {
                        const isBlockDelete = Boolean(ledger.delete_block_reason);
                        const currVal = Number(ledger.CurrentBalance || 0);
                        const isZero = currVal === 0;
                        const isDr = currVal >= 0;

                        return (
                          <Table.Tr key={ledger.LedgerId}>
                            {/* Ledger Name */}
                            <Table.Td style={{ minWidth: 200 }}>
                              <Group gap="xs" wrap="nowrap">
                                <IconBook2 size={16} color="#800020" stroke={1.75} style={{ flexShrink: 0 }} />
                                <div>
                                  <Text fw={600} size="sm" c="#1e293b" style={{ whiteSpace: 'nowrap' }}>
                                    {ledger.LedgerName}
                                  </Text>
                                  {ledger.IsSystem && (
                                    <Badge
                                      size="xs"
                                      variant="outline"
                                      style={{
                                        borderColor: '#e2e8f0',
                                        color: '#64748b',
                                        backgroundColor: '#f8fafc',
                                        fontWeight: 600,
                                        fontSize: 10,
                                        marginTop: 2,
                                      }}
                                    >
                                      System
                                    </Badge>
                                  )}
                                </div>
                              </Group>
                            </Table.Td>

                            {/* Group */}
                            <Table.Td style={{ minWidth: 150 }}>
                              <Text size="sm" fw={500} c="#334155" style={{ whiteSpace: 'nowrap' }}>
                                {ledger.group_name || '—'}
                              </Text>
                            </Table.Td>

                            {/* Nature - Refined Slate Badge */}
                            <Table.Td style={{ minWidth: 100, textAlign: 'center' }}>
                              <Badge
                                size="xs"
                                variant="outline"
                                style={{
                                  borderColor: '#cbd5e1',
                                  color: '#475569',
                                  backgroundColor: '#f8fafc',
                                  fontWeight: 600,
                                  textTransform: 'uppercase',
                                }}
                              >
                                {ledger.group_nature || '—'}
                              </Badge>
                            </Table.Td>

                            {/* Contact */}
                            <Table.Td style={{ minWidth: 120 }}>
                              <Text size="xs" fw={500} c="#475569">
                                {ledger.MobileNumber || ledger.PhoneNumber || '—'}
                              </Text>
                              {ledger.City && (
                                <Text size="xs" c="dimmed">
                                  {ledger.City}
                                </Text>
                              )}
                            </Table.Td>

                            {/* GSTIN */}
                            <Table.Td style={{ minWidth: 130 }}>
                              <Text size="xs" ff="monospace" fw={600} c={ledger.GSTIN ? '#0f172a' : 'dimmed'}>
                                {ledger.GSTIN || '—'}
                              </Text>
                            </Table.Td>

                            {/* Opening Balance */}
                            <Table.Td style={{ minWidth: 130, textAlign: 'right' }}>
                              <Text size="sm" fw={600} c="#334155" style={{ whiteSpace: 'nowrap' }}>
                                ₹{Math.abs(Number(ledger.OpeningBalance || 0)).toLocaleString('en-IN', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}{' '}
                                <Text component="span" size="xs" c="dimmed">
                                  {ledger.OpeningBalanceType || 'DR'}
                                </Text>
                              </Text>
                            </Table.Td>

                            {/* Debit Balance */}
                            <Table.Td style={{ minWidth: 110, textAlign: 'right' }}>
                              <Text size="sm" fw={500} c="#334155" style={{ whiteSpace: 'nowrap' }}>
                                {Number(ledger.DebitBalance || 0) !== 0
                                  ? `₹${Number(ledger.DebitBalance).toLocaleString('en-IN', {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}`
                                  : '—'}
                              </Text>
                            </Table.Td>

                            {/* Credit Balance */}
                            <Table.Td style={{ minWidth: 110, textAlign: 'right' }}>
                              <Text size="sm" fw={500} c="#334155" style={{ whiteSpace: 'nowrap' }}>
                                {Number(ledger.CreditBalance || 0) !== 0
                                  ? `₹${Number(ledger.CreditBalance).toLocaleString('en-IN', {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}`
                                  : '—'}
                              </Text>
                            </Table.Td>

                            {/* Current Balance */}
                            <Table.Td style={{ minWidth: 130, textAlign: 'right' }}>
                              <Text size="sm" fw={700} c={isZero ? '#64748b' : isDr ? '#1e293b' : '#b91c1c'} style={{ whiteSpace: 'nowrap' }}>
                                ₹{Math.abs(currVal).toLocaleString('en-IN', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}{' '}
                                {!isZero && (
                                  <Text component="span" size="xs" c={isDr ? '#0284c7' : '#dc2626'} fw={600}>
                                    {isDr ? 'Dr' : 'Cr'}
                                  </Text>
                                )}
                              </Text>
                            </Table.Td>

                            {/* Status */}
                            <Table.Td style={{ minWidth: 90, textAlign: 'center' }}>
                              <Badge
                                size="sm"
                                variant="outline"
                                style={{
                                  borderColor: ledger.IsActive ? '#cbd5e1' : '#fca5a5',
                                  color: ledger.IsActive ? '#334155' : '#dc2626',
                                  backgroundColor: ledger.IsActive ? '#f8fafc' : '#fff5f5',
                                  fontWeight: 500,
                                }}
                              >
                                {ledger.IsActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </Table.Td>

                            {/* Actions */}
                            <Table.Td style={{ textAlign: 'right' }}>
                              <Group gap={4} justify="flex-end" wrap="nowrap">
                                <ActionIcon
                                  variant="subtle"
                                  color="gray"
                                  size="sm"
                                  onClick={() => handleEdit(ledger)}
                                  title="Edit ledger"
                                >
                                  <IconPencil size={15} />
                                </ActionIcon>

                                <Tooltip
                                  label={ledger.delete_block_reason || 'Delete ledger'}
                                  disabled={!isBlockDelete}
                                  withArrow
                                  color="dark"
                                >
                                  <Box component="span">
                                    <ActionIcon
                                      variant="subtle"
                                      color="burgundy"
                                      size="sm"
                                      disabled={isBlockDelete}
                                      onClick={() => setLedgerToDelete(ledger)}
                                      title="Delete ledger"
                                      style={{ color: isBlockDelete ? undefined : '#800020' }}
                                    >
                                      <IconTrash size={15} />
                                    </ActionIcon>
                                  </Box>
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
          )}
        </Transition>
      </Box>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        opened={Boolean(ledgerToDelete)}
        onClose={() => setLedgerToDelete(null)}
        onConfirm={() => {
          if (ledgerToDelete) {
            deleteMutation.mutate(ledgerToDelete.LedgerId);
          }
        }}
        title="Delete Ledger Account"
        description={`Are you sure you want to delete "${ledgerToDelete?.LedgerName}"? This action cannot be undone.`}
        loading={deleteMutation.isPending}
      />
    </Stack>
  );
};
