import React, { useState, useMemo } from 'react';
import {
  Title,
  Text,
  Paper,
  SimpleGrid,
  Group,
  Stack,
  Badge,
  Button,
  Table,
  ScrollArea,
  Loader,
  Center,
  Box,
  TextInput,
  CloseButton,
  Grid,
  ActionIcon,
  SegmentedControl,
  Modal,
} from '@mantine/core';
import {
  IconBuildingFactory2,
  IconTruckDelivery,
  IconSearch,
  IconRefresh,
  IconTruck,
  IconArrowUpRight,
  IconArrowLeft,
  IconChevronRight,
  IconRotateClockwise2,
  IconBuildingWarehouse,
  IconCalendar,
} from '@tabler/icons-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../api/client';
import { formatDateDDMMYY } from '../components/DateInputDDMMYY';
interface VanProduct {
  ProductId: number;
  ProductName: string;
  AppProductName?: string;
  Qty: number;
  SalesPrice: number;
}
interface AllocatedVan {
  RouteVehicleDriverId?: number | null;
  VehicleId?: number;
  VehicleNumber: string;
  RouteName: string;
  DriverName: string;
  TotalCylinders: number;
  EstimatedValue: number;
  Products: VanProduct[];
}
interface ProductVanDetail {
  RouteVehicleDriverId: number;
  VehicleNumber: string;
  RouteName: string;
  DriverName: string;
  AllocatedQty?: number;
  DeliveredQty?: number;
  BalanceQty?: number;
  EmptyQty?: number;
  Qty: number;
}
interface ProductStockItem {
  ProductId: number;
  ProductName: string;
  AppProductName?: string;
  ProductCode: string;
  UnitName: string;
  AltUnitName?: string;
  UnitConversion?: number;
  AltQty?: number;
  SalesPrice: number;
  PurchasePrice: number;
  Rate: number;
  GodownQty: number;
  GodownFilledQty?: number;
  GodownEmptyQty?: number;
  Godowns?: Array<{
    GodownId: number;
    GodownName: string;
    GodownCode?: string;
    Location?: string;
    IsCentral?: boolean;
    InwardFilledQty?: number;
    InwardEmptyQty?: number;
    OutwardFilledQty?: number;
    OutwardEmptyQty?: number;
    ReturnFilledQty?: number;
    ReturnEmptyQty?: number;
    DispatchedFilledQty?: number;
    DispatchedEmptyQty?: number;
    SoldFilledQty?: number;
    SoldEmptyQty?: number;
    FilledQty: number;
    EmptyQty: number;
    TotalQty: number;
  }>;
  AllocatedQty: number;
  SoldFilledQty?: number;
  SoldEmptyQty?: number;
  FilledQty?: number;
  EmptyQty?: number;
  TotalStockQty?: number;
  TotalQty: number;
  TotalValue: number;
  AllocationRate: number;
  IsCylinder?: boolean;
  Vans: ProductVanDetail[];
}
interface StockLocationProduct {
  ProductId: number;
  ProductName: string;
  ProductCode: string;
  UnitName: string;
  CategoryName?: string;
  IsCylinder?: boolean;
  InwardFilledQty?: number;
  InwardEmptyQty?: number;
  OutwardFilledQty?: number;
  OutwardEmptyQty?: number;
  ReturnFilledQty?: number;
  ReturnEmptyQty?: number;
  DispatchedFilledQty?: number;
  DispatchedEmptyQty?: number;
  OnVanFilledQty?: number;
  OnVanEmptyQty?: number;
  SoldFilledQty?: number;
  SoldEmptyQty?: number;
  AllocatedQty?: number;
  DeliveredQty?: number;
  BalanceQty?: number;
  EmptyQty?: number;
  Qty: number;
}
interface StockLocation {
  id: string;
  name: string;
  description: string;
  type: 'godown' | 'vehicle';
  driverName?: string;
  routeName?: string;
  quantity: number;
  filledQuantity?: number;
  emptyQuantity?: number;
  allocatedCylinders?: number;
  deliveredCylinders?: number;
  balanceCylinders?: number;
  emptyCylinders?: number;
  otherProductsAllocated?: number;
  otherProductsDelivered?: number;
  otherProductsBalance?: number;
  products: StockLocationProduct[];
}
interface RecentDispatchNote {
  DeliveryNoteId: number;
  DeliveryNoteNo: string;
  DeliveryDate: string;
  VehicleNumber: string;
  RouteName: string;
  DriverName: string;
  TotalCylinders: number;
  Status: string;
}
interface PendingReceiptLine {
  LineId: number;
  ProductId: number | null;
  ProductName: string;
  Quantity: number;
  EmptyReturnedQty: number;
}

interface PendingReceiptNote {
  DeliveryNoteId: number;
  DeliveryNoteNo: string;
  DeliveryDate: string;
  AllocationId: number;
  VehicleNumber: string;
  DriverName: string;
  RouteName: string;
  TotalFull: number;
  TotalEmpties: number;
  Remarks: string;
  Lines: PendingReceiptLine[];
  CreatedTime: string;
}

interface TodayDeliveryItem {
  ProductName: string;
  Qty: number;
  Rate: number;
}

interface TodayDelivery {
  TicketNumber: string;
  AllocationId: number;
  VehicleNumber: string;
  DriverName: string;
  CustomerName: string;
  PaymentMethod: string;
  DeliveredCylinders: number;
  EmptyReturns: number;
  TotalAmount: number;
  Time: string;
  Items: TodayDeliveryItem[];
}

interface StockAnalysisResponse {
  summary: {
    total_system_cylinders: number;
    total_godown_cylinders: number;
    total_godown_filled?: number;
    total_godown_empty?: number;
    total_allocated_cylinders: number;
    total_allocated_filled?: number;
    total_allocated_empty?: number;
    total_system_value: number;
    active_vans_count: number;
    total_registered_vans: number;
    godown_percentage: number;
    allocated_percentage: number;
    today_deliveries_count?: number;
    pending_receipts_count?: number;
    last_sync_time?: string;
  };
  products: ProductStockItem[];
  godowns?: Array<{
    GodownId: number;
    GodownName: string;
    GodownCode?: string;
    Location?: string;
    IsCentral?: boolean;
    RouteVehicleDriverId?: number;
    FilledQty: number;
    EmptyQty: number;
    TotalQty: number;
  }>;
  all_vans?: AllocatedVan[];
  active_vans: AllocatedVan[];
  idle_vans: AllocatedVan[];
  recent_notes: RecentDispatchNote[];
  pending_receipt_notes?: PendingReceiptNote[];
  today_deliveries?: TodayDelivery[];
  last_sync_time?: string;
}
const EMPTY_PRODUCT_STOCK: ProductStockItem[] = [];
export const StockAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const productParam = searchParams.get('product');
  const locationParam = searchParams.get('location');

  const user = useAuthStore((s) => s.user);
  const role = (user?.role || '').toLowerCase();
  const isAdmin = !role || role.includes('admin') || role.includes('manager');
  const userGodownId = user?.godown_id || user?.GodownId;

  // Section-specific search states (compact, non-spoiling inputs)
  const [productSearch, setProductSearch] = useState<string>('');
  const [locationSearch, setLocationSearch] = useState<string>('');
  const [allocationSearch, setAllocationSearch] = useState<string>('');
  const [storedProductSearch, setStoredProductSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'cylinders' | 'other'>('all');

  // Date filter state
  const getTodayStr = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [customModalOpened, setCustomModalOpened] = useState(false);
  const [customDates, setCustomDates] = useState<{ from: string; to: string }>({
    from: getTodayStr(),
    to: getTodayStr(),
  });

  const handlePresetChange = (val: string) => {
    setDatePreset(val as any);
    const today = getTodayStr();

    if (val === 'today') {
      setFromDate(today);
      setToDate(today);
    } else if (val === 'week') {
      const now = new Date();
      const start = new Date();
      start.setDate(now.getDate() - 7);
      const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
      setFromDate(startStr);
      setToDate(today);
    } else if (val === 'month') {
      const d = new Date();
      const monthStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      setFromDate(monthStart);
      setToDate(today);
    } else if (val === 'all') {
      setFromDate('');
      setToDate('');
    }
  };

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<StockAnalysisResponse>({
    queryKey: ['stock-analysis', fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await apiClient.get<StockAnalysisResponse>(`/delivery-notes/stock-analysis/${qs}`);
      return res.data;
    },
    refetchInterval: 10000,
  });

  const renderDateFilter = () => (
    <Group gap="xs" align="center" wrap="nowrap">
      <SegmentedControl
        value={datePreset}
        onChange={(val) => {
          if (val === 'custom') {
            setCustomModalOpened(true);
          } else {
            handlePresetChange(val);
          }
        }}
        color="burgundy"
        radius="xl"
        size="xs"
        transitionDuration={250}
        transitionTimingFunction="cubic-bezier(0.16, 1, 0.3, 1)"
        data={[
          { label: 'All', value: 'all' },
          { label: 'Today', value: 'today' },
          { label: 'This Week', value: 'week' },
          { label: 'This Month', value: 'month' },
          {
            label: (
              <Group gap={4} wrap="nowrap" align="center" style={{ display: 'inline-flex' }}>
                <IconCalendar size={13} />
                <span>Custom</span>
              </Group>
            ),
            value: 'custom',
          },
        ]}
        styles={{
          root: {
            backgroundColor: '#f1f5f9',
            border: '1px solid #e2e8f0',
            padding: 3,
            borderRadius: 9999,
          },
          control: {
            border: 'none',
          },
          indicator: {
            backgroundColor: '#800020',
            borderRadius: 9999,
            boxShadow: 'none',
            border: 'none',
            outline: 'none',
          },
          label: {
            fontSize: 12,
            fontWeight: 500,
            padding: '4px 14px',
            transition: 'color 150ms ease, font-weight 150ms ease',
          },
        }}
      />
      <ActionIcon
        variant="default"
        size="lg"
        radius="xl"
        onClick={() => refetch()}
        loading={isRefetching}
        title="Refresh Stock Data"
        style={{
          borderColor: '#e2e8f0',
          backgroundColor: '#ffffff',
          color: '#800020',
          height: 32,
          width: 32,
        }}
      >
        <IconRefresh size={15} />
      </ActionIcon>

      {/* Custom Date Range Modal */}
      <Modal
        opened={customModalOpened}
        onClose={() => setCustomModalOpened(false)}
        title="Select Custom Date Range"
        centered
        radius="md"
        overlayProps={{ backgroundOpacity: 0.35, blur: 3 }}
      >
        <Stack gap="md">
          <TextInput
            type="date"
            label="From Date"
            value={customDates.from}
            onChange={(e) => setCustomDates((prev) => ({ ...prev, from: e.target.value }))}
          />
          <TextInput
            type="date"
            label="To Date"
            value={customDates.to}
            onChange={(e) => setCustomDates((prev) => ({ ...prev, to: e.target.value }))}
          />
          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={() => setCustomModalOpened(false)}>
              Cancel
            </Button>
            <Button
              style={{ backgroundColor: '#800020' }}
              onClick={() => {
                setFromDate(customDates.from);
                setToDate(customDates.to);
                setDatePreset('custom');
                setCustomModalOpened(false);
              }}
            >
              Apply Filter
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Group>
  );
  const products = data?.products ?? EMPTY_PRODUCT_STOCK;
  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    const list = !q
      ? products
      : products.filter(
          (p) =>
            p.ProductName.toLowerCase().includes(q) ||
            (p.AppProductName && p.AppProductName.toLowerCase().includes(q)) ||
            p.ProductCode.toLowerCase().includes(q)
        );
    return [...list].sort((a: any, b: any) => {
      const aIsCyl = a.IsCylinder !== false && (a.IsCylinder === true || /cylinder|lpg|kg/i.test(a.ProductName || ''));
      const bIsCyl = b.IsCylinder !== false && (b.IsCylinder === true || /cylinder|lpg|kg/i.test(b.ProductName || ''));
      if (aIsCyl && !bIsCyl) return -1;
      if (!aIsCyl && bIsCyl) return 1;
      return (a.ProductName || '').localeCompare(b.ProductName || '');
    });
  }, [products, productSearch]);
  const inventoryLocations = useMemo<StockLocation[]>(() => {
    let godownList = (data?.godowns && data.godowns.length > 0) ? data.godowns : [];
    if (userGodownId && !isAdmin) {
      godownList = godownList.filter((g) => Number(g.GodownId) === Number(userGodownId));
    }
    let godownLocations: StockLocation[] = [];

    if (godownList.length > 0) {
      godownLocations = godownList.map((g) => {
        const gProds: StockLocationProduct[] = products
          .map((product) => {
            const isCyl = product.IsCylinder !== false && (product.IsCylinder === true || /cylinder|lpg|kg/i.test(product.ProductName || ''));
            const matchingG = (product.Godowns || []).find((pg: any) => pg.GodownId === g.GodownId);
            const filled = matchingG ? (matchingG.FilledQty || 0) : 0;
            const empty = matchingG ? (matchingG.EmptyQty || 0) : 0;
            
            // Vans connected to this Godown (for central godown, include all active vans or those matching)
            const vanList = product.Vans || [];
            const onVanFilled = vanList.reduce((sum, v) => sum + (v.BalanceQty ?? v.Qty ?? 0), 0);
            const onVanEmpty = vanList.reduce((sum, v) => sum + (v.EmptyQty ?? 0), 0);
            const dispatchedFilled = matchingG?.DispatchedFilledQty ?? vanList.reduce((sum, v) => sum + (v.AllocatedQty ?? 0), 0);
            const dispatchedEmpty = matchingG?.DispatchedEmptyQty ?? 0;
            const outwardFilled = matchingG?.OutwardFilledQty ?? dispatchedFilled;
            const outwardEmpty = matchingG?.OutwardEmptyQty ?? dispatchedEmpty;
            const returnFilled = matchingG?.ReturnFilledQty ?? 0;
            const returnEmpty = matchingG?.ReturnEmptyQty ?? 0;
            const vanSoldFilled = vanList.reduce((sum, v) => sum + (v.DeliveredQty ?? 0), 0);
            const soldFilled = (product.SoldFilledQty !== undefined && product.SoldFilledQty > 0)
              ? product.SoldFilledQty
              : ((matchingG?.SoldFilledQty || 0) + vanSoldFilled);
            const soldEmpty = (product.SoldEmptyQty !== undefined && product.SoldEmptyQty > 0)
              ? product.SoldEmptyQty
              : (matchingG?.SoldEmptyQty || 0);
            const inwardFilled = matchingG?.InwardFilledQty ?? filled;
            const inwardEmpty = matchingG?.InwardEmptyQty ?? empty;

            if (filled === 0 && empty === 0 && onVanFilled === 0 && onVanEmpty === 0 && dispatchedFilled === 0 && inwardFilled === 0 && outwardFilled === 0 && returnFilled === 0 && returnEmpty === 0) return null;

            return {
              ProductId: product.ProductId,
              ProductName: product.ProductName,
              ProductCode: product.ProductCode,
              UnitName: isCyl ? 'Cyl' : (product.UnitName || 'Nos'),
              InwardFilledQty: inwardFilled,
              InwardEmptyQty: inwardEmpty,
              OutwardFilledQty: outwardFilled,
              OutwardEmptyQty: outwardEmpty,
              ReturnFilledQty: returnFilled,
              ReturnEmptyQty: returnEmpty,
              DispatchedFilledQty: dispatchedFilled,
              DispatchedEmptyQty: dispatchedEmpty,
              OnVanFilledQty: onVanFilled,
              OnVanEmptyQty: onVanEmpty,
              SoldFilledQty: soldFilled,
              SoldEmptyQty: soldEmpty,
              Qty: filled + (isCyl ? empty : 0),
              AllocatedQty: dispatchedFilled,
              DeliveredQty: soldFilled,
              BalanceQty: filled,
              EmptyQty: isCyl ? empty : 0,
              IsCylinder: isCyl,
            };
          })
          .filter(Boolean) as StockLocationProduct[];

        const filledQty = g.FilledQty ?? gProds.reduce((sum, p) => sum + (p.BalanceQty || 0), 0);
        const emptyQty = g.EmptyQty ?? gProds.reduce((sum, p) => sum + (p.EmptyQty || 0), 0);

        return {
          id: `godown-${g.GodownId}`,
          name: g.GodownName || 'Godown',
          description: g.Location ? `${g.Location} Depot` : (g.IsCentral ? 'Main warehouse facility' : 'Secondary warehouse depot'),
          type: 'godown' as const,
          filledQuantity: filledQty,
          emptyQuantity: emptyQty,
          emptyCylinders: emptyQty,
          quantity: filledQty + emptyQty,
          products: gProds,
        };
      });
    } else {
      const godownProducts: StockLocationProduct[] = products
        .filter((product) => {
          const isCyl = product.IsCylinder !== false && (product.IsCylinder === true || /cylinder|lpg|kg/i.test(product.ProductName || ''));
          const emptyInGodown = product.GodownEmptyQty ?? (isCyl && (!product.Vans || product.Vans.every(v => (v.EmptyQty || 0) === 0)) ? (product.EmptyQty || 0) : 0);
          return (product.GodownQty || 0) > 0 || emptyInGodown > 0;
        })
        .map((product) => {
          const isCyl = product.IsCylinder !== false && (product.IsCylinder === true || /cylinder|lpg|kg/i.test(product.ProductName || ''));
          const emptyInGodown = product.GodownEmptyQty ?? (isCyl && (!product.Vans || product.Vans.every(v => (v.EmptyQty || 0) === 0)) ? (product.EmptyQty || 0) : 0);
          const filled = product.GodownQty || 0;
          return {
            ProductId: product.ProductId,
            ProductName: product.ProductName,
            ProductCode: product.ProductCode,
            UnitName: isCyl ? 'Cyl' : (product.UnitName || 'Nos'),
            Qty: filled + (isCyl ? emptyInGodown : 0),
            AllocatedQty: filled,
            DeliveredQty: 0,
            BalanceQty: filled,
            EmptyQty: isCyl ? emptyInGodown : 0,
            IsCylinder: isCyl,
          };
        })
        .sort((a, b) => {
          const aIsCyl = a.IsCylinder !== false;
          const bIsCyl = b.IsCylinder !== false;
          if (aIsCyl && !bIsCyl) return -1;
          if (!aIsCyl && bIsCyl) return 1;
          return (a.ProductName || '').localeCompare(b.ProductName || '');
        });

      const godownFilled = godownProducts.reduce((total, product) => total + (product.BalanceQty || 0), 0);
      const godownEmpty = godownProducts.reduce((total, product) => total + (product.EmptyQty || 0), 0);
      godownLocations = [{
        id: 'godown',
        name: 'Central Godown',
        description: 'Main warehouse facility',
        type: 'godown',
        filledQuantity: godownFilled,
        emptyQuantity: godownEmpty,
        emptyCylinders: godownEmpty,
        quantity: godownFilled + godownEmpty,
        products: godownProducts,
      }];
    }

    const vansSource = (data?.all_vans && data.all_vans.length > 0)
      ? data.all_vans
      : [...(data?.active_vans || []), ...(data?.idle_vans || [])];

    // Ensure uniqueness by RouteVehicleDriverId or VehicleNumber
    const seenKeys = new Set<string>();
    const uniqueVans: any[] = [];
    for (const v of vansSource) {
      const key = String(v.RouteVehicleDriverId || v.VehicleNumber || v.VehicleId);
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueVans.push(v);
      }
    }

    const allVansList: StockLocation[] = uniqueVans.map((van: any) => {
      const vanFilled = (van.BalanceCylinders ?? van.TotalCylinders ?? 0) + (van.OtherProductsBalance ?? 0);
      const vanEmpty = van.EmptyCylinders ?? 0;
      return {
        id: `vehicle-${van.RouteVehicleDriverId || van.VehicleNumber}`,
        name: van.VehicleNumber || 'Delivery Van',
        description: [van.RouteName, van.DriverName].filter(Boolean).join(' - ') || 'Delivery Vehicle',
        type: 'vehicle' as const,
        driverName: van.DriverName || 'Unassigned',
        routeName: van.RouteName || 'Unassigned',
        filledQuantity: vanFilled,
        emptyQuantity: vanEmpty,
        quantity: vanFilled + vanEmpty,
        allocatedCylinders: van.AllocatedCylinders ?? 0,
        deliveredCylinders: van.DeliveredCylinders ?? 0,
        balanceCylinders: van.BalanceCylinders ?? van.TotalCylinders ?? 0,
        emptyCylinders: van.EmptyCylinders ?? 0,
        otherProductsAllocated: van.OtherProductsAllocated ?? 0,
        otherProductsDelivered: van.OtherProductsDelivered ?? 0,
        otherProductsBalance: van.OtherProductsBalance ?? 0,
        products: (van.Products || []).map((p: any) => ({
          ProductId: p.ProductId,
          ProductName: p.ProductName,
          ProductCode: p.ProductCode || '—',
          UnitName: p.IsCylinder ? 'Cyl' : 'Nos',
          CategoryName: p.CategoryName,
          IsCylinder: p.IsCylinder ?? true,
          AllocatedQty: p.AllocatedQty ?? p.Qty,
          DeliveredQty: p.DeliveredQty ?? 0,
          BalanceQty: p.BalanceQty ?? p.Qty,
          EmptyQty: p.EmptyQty ?? 0,
          Qty: (p.BalanceQty ?? p.Qty) + (p.EmptyQty ?? 0),
        })),
      };
    });

    if (userGodownId && !isAdmin) {
      return godownLocations;
    }
    return [...godownLocations, ...allVansList];
  }, [products, data?.godowns, data?.active_vans, data?.idle_vans, data?.all_vans, userGodownId, isAdmin]);

  const filteredLocations = useMemo(() => {
    const q = locationSearch.toLowerCase().trim();
    if (!q) return inventoryLocations;
    return inventoryLocations.filter(
      (location) =>
        location.name.toLowerCase().includes(q) ||
        location.description.toLowerCase().includes(q) ||
        location.products.some(
          (product) =>
            product.ProductName.toLowerCase().includes(q) ||
            product.ProductCode.toLowerCase().includes(q)
        )
    );
  }, [inventoryLocations, locationSearch]);

  const selectedProduct = useMemo(() => {
    if (!productParam) return null;
    return products.find((p) => String(p.ProductId) === productParam) || null;
  }, [productParam, products]);

  const selectedLocation = useMemo(() => {
    if (!locationParam) return null;
    return inventoryLocations.find((l) => l.id === locationParam) || null;
  }, [locationParam, inventoryLocations]);

  const totalProductFilled = useMemo(() => {
    if (userGodownId && !isAdmin) {
      return filteredProducts.reduce((sum, p) => {
        const mg = (p.Godowns || []).find((g: any) => Number(g.GodownId) === Number(userGodownId));
        return sum + (mg ? Number(mg.FilledQty || 0) : Number(p.GodownFilledQty ?? p.GodownQty ?? 0));
      }, 0);
    }
    return filteredProducts.reduce((sum, p) => sum + (Number(p.FilledQty ?? (p.GodownQty + (p.AllocatedQty || 0))) || 0), 0);
  }, [filteredProducts, userGodownId, isAdmin]);

  const totalProductEmpty = useMemo(() => {
    if (userGodownId && !isAdmin) {
      return filteredProducts.reduce((sum, p) => {
        const mg = (p.Godowns || []).find((g: any) => Number(g.GodownId) === Number(userGodownId));
        return sum + (mg ? Number(mg.EmptyQty || 0) : Number(p.GodownEmptyQty ?? p.EmptyQty ?? 0));
      }, 0);
    }
    return filteredProducts.reduce((sum, p) => sum + (Number(p.EmptyQty) || 0), 0);
  }, [filteredProducts, userGodownId, isAdmin]);

  const totalLocationFilled = useMemo(() => {
    return filteredLocations.reduce((sum, l) => sum + (Number(l.filledQuantity) || 0), 0);
  }, [filteredLocations]);

  const totalLocationEmpty = useMemo(() => {
    return filteredLocations.reduce((sum, l) => sum + (Number(l.emptyQuantity) || 0), 0);
  }, [filteredLocations]);

  const summary = data?.summary || {
    total_system_cylinders: 0,
    total_godown_cylinders: 0,
    total_godown_filled: 0,
    total_godown_empty: 0,
    total_allocated_cylinders: 0,
    total_allocated_filled: 0,
    total_allocated_empty: 0,
    total_system_value: 0,
    active_vans_count: 0,
    total_registered_vans: 0,
    godown_percentage: 0,
    allocated_percentage: 0,
  };



  // ==========================================
  // DETAIL SCREEN 1: PRODUCT ALLOCATION BREAKDOWN
  // ==========================================
  if (selectedProduct) {
    const isCyl = selectedProduct.IsCylinder !== false && (selectedProduct.IsCylinder === true || /cylinder|lpg|kg/i.test(selectedProduct.ProductName || ''));
    const godownEmptyForSelected = selectedProduct.GodownEmptyQty ?? (
      isCyl && (!selectedProduct.Vans || selectedProduct.Vans.every((v) => (v.EmptyQty || 0) === 0))
        ? (selectedProduct.EmptyQty || 0)
        : 0
    );

    const godownsForDetail = (selectedProduct.Godowns && selectedProduct.Godowns.length > 0)
      ? (selectedProduct.Godowns || []).filter((g: any) => !userGodownId || isAdmin || Number(g.GodownId) === Number(userGodownId))
      : [];

    const totalGodownFilledDetail = godownsForDetail.length > 0
      ? godownsForDetail.reduce((sum: number, g: any) => sum + (g.FilledQty || 0), 0)
      : (selectedProduct.GodownQty || 0);
    const totalGodownEmptyDetail = godownsForDetail.length > 0
      ? godownsForDetail.reduce((sum: number, g: any) => sum + (g.EmptyQty || 0), 0)
      : godownEmptyForSelected;

    const altUnit = selectedProduct.AltUnitName || 'KG';
    const rateVal = selectedProduct.Rate ?? selectedProduct.PurchasePrice ?? 0;

    const isGodownMatch = (godownsForDetail.length > 0 || (selectedProduct.GodownQty || 0) > 0 || godownEmptyForSelected > 0) && (
      !allocationSearch.trim() ||
      'godown'.includes(allocationSearch.toLowerCase().trim()) ||
      (user?.godown_name && user.godown_name.toLowerCase().includes(allocationSearch.toLowerCase().trim())) ||
      'central godown'.includes(allocationSearch.toLowerCase().trim()) ||
      'main storage godown'.includes(allocationSearch.toLowerCase().trim())
    );

    const filteredVans = (userGodownId && !isAdmin) ? [] : selectedProduct.Vans.filter((van) => {
      const q = allocationSearch.toLowerCase().trim();
      if (!q) return true;
      return (
        van.VehicleNumber.toLowerCase().includes(q) ||
        (van.RouteName && van.RouteName.toLowerCase().includes(q)) ||
        (van.DriverName && van.DriverName.toLowerCase().includes(q))
      );
    });

    const filteredAllocationsCount = (isGodownMatch ? (godownsForDetail.length || 1) : 0) + filteredVans.length;
    const totalFilledAlloc = (isGodownMatch ? totalGodownFilledDetail : 0) + filteredVans.reduce((sum, v) => sum + (v.BalanceQty ?? v.Qty), 0);
    const totalEmptyAlloc = (isGodownMatch ? totalGodownEmptyDetail : 0) + filteredVans.reduce((sum, v) => sum + (v.EmptyQty ?? 0), 0);

    return (
      <Stack gap="lg">
        {/* Navigation & Header */}
        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
          <Group gap="sm" align="center">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              onClick={() => {
                setSearchParams({});
                setAllocationSearch('');
              }}
              title="Back to Stock Analysis"
              style={{ color: '#0f172a' }}
            >
              <IconArrowLeft size={20} />
            </ActionIcon>
            <div>
              <Group gap="xs" align="center">
                <Text size="sm" c="#64748b" ff="monospace" fw={700}>
                  {selectedProduct.ProductCode || '—'}
                </Text>
                <Title order={2} style={{ color: '#800020', fontWeight: 700 }}>
                  {selectedProduct.ProductName}
                </Title>
              </Group>
              <Text size="xs" c="dimmed">
                Detailed cylinder stock and allocation across central warehouse & delivery fleet
              </Text>
            </div>
          </Group>

          {/* Date Filter Bar */}
          {renderDateFilter()}
        </Group>
        {/* Product Metric KPI Cards */}
        <SimpleGrid cols={{ base: 1, sm: isCyl ? 4 : 3 }} spacing="md">
          {isCyl ? (
            <>
              <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
                <Text size="xs" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
                  Filled Cylinders
                </Text>
                <Text fw={700} style={{ color: '#0f172a', fontSize: '24px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }} mt={4}>
                  {totalFilledAlloc}
                </Text>
                <Text size="xs" c="dimmed" mt={4}>
                  Converted weight: <strong style={{ color: '#800020' }}>{totalFilledAlloc * (selectedProduct.UnitConversion || 1)} {altUnit}</strong>
                </Text>
              </Paper>
              <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
                <Text size="xs" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
                  Empty Cylinders
                </Text>
                <Text fw={700} style={{ color: '#0f172a', fontSize: '24px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }} mt={4}>
                  {totalEmptyAlloc}
                </Text>
                <Text size="xs" c="dimmed" mt={4}>
                  Empties awaiting refill
                </Text>
              </Paper>
            </>
          ) : (
            <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
              <Text size="xs" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
                Available Stock
              </Text>
              <Text fw={700} style={{ color: '#0f172a', fontSize: '24px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }} mt={4}>
                {totalFilledAlloc}
              </Text>
              <Text size="xs" c="dimmed" mt={4}>
                Total units on hand
              </Text>
            </Paper>
          )}
          <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
            <Text size="xs" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Purchase Rate & Cost
            </Text>
            <Text fw={700} style={{ color: '#0f172a', fontSize: '24px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }} mt={4}>
              ₹{(selectedProduct.Rate ?? selectedProduct.PurchasePrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              <Text component="span" size="xs" c="dimmed" fw={600} ml={4}>/ {altUnit}</Text>
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Unit conversion: <strong style={{ color: '#800020' }}>{selectedProduct.UnitConversion || 1} {altUnit} / Cyl</strong>
            </Text>
          </Paper>
          <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
            <Text size="xs" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Total Stock Valuation
            </Text>
            <Text fw={700} style={{ color: '#0f172a', fontSize: '24px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }} mt={4}>
              ₹{(totalFilledAlloc * (selectedProduct.UnitConversion || 1) * rateVal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Formula: {totalFilledAlloc * (selectedProduct.UnitConversion || 1)} {altUnit} &times; ₹{(selectedProduct.Rate ?? selectedProduct.PurchasePrice).toFixed(2)}
            </Text>
          </Paper>
        </SimpleGrid>

        {/* Detailed Allocations Table */}
        <Paper
          radius="md"
          withBorder
          style={{
            overflow: 'hidden',
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <Group justify="space-between" align="center" p="md" px="lg" style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#ffffff' }}>
            <div>
              <Group gap="xs" align="center">
                <Text fw={700} style={{ color: '#0f172a', fontSize: 16.5, letterSpacing: '-0.01em' }}>
                  Storage & Distribution Allocation
                </Text>
                <Badge
                  variant="light"
                  color="gray"
                  size="sm"
                  radius="sm"
                  styles={{
                    root: {
                      backgroundColor: '#f1f5f9',
                      color: '#475569',
                      fontWeight: 600,
                      fontSize: 11,
                      height: 22,
                    },
                  }}
                >
                  {filteredAllocationsCount} Locations
                </Badge>
              </Group>
              <Text size="xs" c="#64748b" mt={2}>
                Live stock presence across Central Godown and active delivery vehicles
              </Text>
            </div>
            <Group gap="xs" align="center">
              <TextInput
                placeholder="Search allocations..."
                size="xs"
                radius="md"
                value={allocationSearch}
                onChange={(e) => setAllocationSearch(e.currentTarget.value)}
                leftSection={<IconSearch size={14} stroke={1.5} color="#64748b" />}
                rightSection={allocationSearch ? <CloseButton size="xs" onClick={() => setAllocationSearch('')} /> : null}
                style={{ width: 210 }}
                styles={{
                  input: {
                    height: 34,
                    minHeight: 34,
                    fontSize: 12.5,
                    borderColor: '#e2e8f0',
                    backgroundColor: '#ffffff',
                    '&:focus': { borderColor: '#800020' },
                  },
                }}
              />
            </Group>
          </Group>

          <Table.ScrollContainer minWidth={600}>
            <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
              <Table.Thead style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
                <Table.Tr>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    LOCATION
                  </Table.Th>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    ROUTE / DRIVER
                  </Table.Th>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right', width: 120 }}>
                    FILLED
                  </Table.Th>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right', width: 120 }}>
                    EMPTY
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {isGodownMatch && godownsForDetail.length > 0 && godownsForDetail.map((g: any) => (
                  <Table.Tr key={`godown-${g.GodownId}`} style={{ height: 44 }}>
                    <Table.Td>
                      <Group gap={8}>
                        <IconBuildingFactory2 size={16} color="#800020" />
                        <Text size="sm" fw={700} c="#0f172a">{g.GodownName || 'Godown'}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">{g.Location ? `${g.Location} Depot` : (g.IsCentral ? 'Main Storage Godown' : 'Secondary Depot')}</Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                      {g.FilledQty || 0}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontWeight: 500, fontSize: 13.5, color: isCyl ? '#475569' : '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                      {isCyl ? (g.EmptyQty || 0) : '—'}
                    </Table.Td>
                  </Table.Tr>
                ))}
                {isGodownMatch && godownsForDetail.length === 0 && (
                  <Table.Tr style={{ height: 44 }}>
                    <Table.Td>
                      <Group gap={8}>
                        <IconBuildingFactory2 size={16} color="#800020" />
                        <Text size="sm" fw={700} c="#0f172a">{user?.godown_name || 'Central Godown'}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">Warehouse Storage</Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                      {selectedProduct.GodownQty || 0}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontWeight: 500, fontSize: 13.5, color: isCyl ? '#475569' : '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                      {isCyl ? godownEmptyForSelected : '—'}
                    </Table.Td>
                  </Table.Tr>
                )}
                {filteredVans.map((van) => {
                  const filled = van.BalanceQty ?? van.Qty;
                  const empty = van.EmptyQty ?? 0;
                  return (
                    <Table.Tr key={van.RouteVehicleDriverId} style={{ height: 44 }}>
                      <Table.Td>
                        <Group gap={8}>
                          <IconTruck size={16} color="#800020" />
                          <Text size="sm" fw={700} c="#0f172a">{van.VehicleNumber}</Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="#0f172a" fw={600}>
                          {van.RouteName || '—'}
                        </Text>
                        {van.DriverName && (
                          <Text size="xs" c="dimmed">
                            Driver: {van.DriverName}
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                        {filled}
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right', fontWeight: 500, fontSize: 13.5, color: isCyl ? '#475569' : '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                        {isCyl ? empty : '—'}
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
                {!isGodownMatch && filteredVans.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={4}>
                      <Center p="xl">
                        <Text size="sm" c="dimmed">No stock locations match your search query.</Text>
                      </Center>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
              <Table.Tfoot style={{ backgroundColor: '#ffffff', borderTop: '2px solid #e2e8f0' }}>
                <Table.Tr style={{ height: 44 }}>
                  <Table.Td colSpan={2} style={{ padding: '10px 16px' }}>
                    <Text fw={800} style={{ color: '#800020', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Total
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums', padding: '10px 16px' }}>
                    {totalFilledAlloc}
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums', padding: '10px 16px' }}>
                    {totalEmptyAlloc}
                  </Table.Td>
                </Table.Tr>
              </Table.Tfoot>
            </Table>
          </Table.ScrollContainer>
        </Paper>
      </Stack>
    );
  }

  // ==========================================
  // DETAIL SCREEN 2: LOCATION CYLINDER AVAILABILITY
  // ==========================================
  if (selectedLocation) {
    const isVehicle = selectedLocation.type === 'vehicle';
    const filteredLocationProducts = selectedLocation.products.filter((p) => {
      const q = storedProductSearch.toLowerCase().trim();
      if (!q) return true;
      return (
        p.ProductName.toLowerCase().includes(q) ||
        (p.ProductCode && p.ProductCode.toLowerCase().includes(q))
      );
    });

    // Separate Cylinders from Other Products
    const cylProducts = filteredLocationProducts.filter((p) => p.IsCylinder !== false);
    const otherProducts = filteredLocationProducts.filter((p) => p.IsCylinder === false);

    const rawDisplayed =
      categoryFilter === 'cylinders'
        ? cylProducts
        : categoryFilter === 'other'
        ? otherProducts
        : filteredLocationProducts;

    const displayedProducts = [...rawDisplayed].sort((a, b) => {
      const aIsCyl = a.IsCylinder !== false;
      const bIsCyl = b.IsCylinder !== false;
      if (aIsCyl && !bIsCyl) return -1;
      if (!aIsCyl && bIsCyl) return 1;
      return (a.ProductName || '').localeCompare(b.ProductName || '');
    });

    const cylBalTotal = cylProducts.reduce((sum, p) => sum + (p.BalanceQty ?? p.Qty), 0);
    const otherBalTotal = otherProducts.reduce((sum, p) => sum + (p.BalanceQty ?? p.Qty), 0);

    const totalAllocated = displayedProducts.reduce((sum, p) => sum + (p.AllocatedQty ?? p.Qty), 0);
    const totalDelivered = displayedProducts.reduce((sum, p) => sum + (p.DeliveredQty ?? 0), 0);
    const totalBalance = displayedProducts.reduce((sum, p) => sum + (p.BalanceQty ?? p.Qty), 0);
    const totalEmpty = displayedProducts.reduce((sum, p) => sum + (p.EmptyQty ?? 0), 0);

    const godownTotals = {
      inwardFilled: displayedProducts.reduce((sum, p) => sum + (p.InwardFilledQty ?? p.BalanceQty ?? 0), 0),
      inwardEmpty: displayedProducts.reduce((sum, p) => sum + (p.InwardEmptyQty ?? p.EmptyQty ?? 0), 0),
      outwardFilled: displayedProducts.reduce((sum, p) => sum + (p.OutwardFilledQty ?? p.DispatchedFilledQty ?? 0), 0),
      outwardEmpty: displayedProducts.reduce((sum, p) => sum + (p.OutwardEmptyQty ?? p.DispatchedEmptyQty ?? 0), 0),
      returnFilled: displayedProducts.reduce((sum, p) => sum + (p.ReturnFilledQty ?? 0), 0),
      returnEmpty: displayedProducts.reduce((sum, p) => sum + (p.ReturnEmptyQty ?? 0), 0),
      dispatchedFilled: displayedProducts.reduce((sum, p) => sum + (p.DispatchedFilledQty ?? 0), 0),
      dispatchedEmpty: displayedProducts.reduce((sum, p) => sum + (p.DispatchedEmptyQty ?? 0), 0),
      onVanFilled: displayedProducts.reduce((sum, p) => sum + (p.OnVanFilledQty ?? 0), 0),
      onVanEmpty: displayedProducts.reduce((sum, p) => sum + (p.OnVanEmptyQty ?? 0), 0),
      soldFilled: displayedProducts.reduce((sum, p) => sum + (p.SoldFilledQty ?? 0), 0),
      soldEmpty: displayedProducts.reduce((sum, p) => sum + (p.SoldEmptyQty ?? 0), 0),
      godownFilled: displayedProducts.reduce((sum, p) => sum + (p.BalanceQty ?? 0), 0),
      godownEmpty: displayedProducts.reduce((sum, p) => sum + (p.EmptyQty ?? 0), 0),
    };

    return (
      <Stack gap="lg">
        {/* Navigation & Header */}
        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
          <Group gap="sm" align="center">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              onClick={() => {
                setSearchParams({});
                setStoredProductSearch('');
                setCategoryFilter('all');
              }}
              title="Back to Stock Analysis"
              style={{ color: '#0f172a' }}
            >
              <IconArrowLeft size={20} />
            </ActionIcon>
            <div>
              <Group gap="xs" align="center">
                {isVehicle ? (
                  <IconTruck size={22} color="#800020" />
                ) : (
                  <IconBuildingFactory2 size={22} color="#800020" />
                )}
                <Title order={2} style={{ color: '#800020', fontWeight: 700 }}>
                  {selectedLocation.name}
                </Title>
                <Badge
                  size="sm"
                  variant="outline"
                  styles={{
                    root: {
                      borderColor: '#f5c2cb',
                      backgroundColor: '#ffffff',
                      color: '#800020',
                      fontWeight: 700,
                    },
                  }}
                >
                  {isVehicle ? 'Van Stock' : 'Godown'}
                </Badge>
              </Group>
              <Text size="xs" c="dimmed">
                {selectedLocation.description || 'Cylinder availability and stored product inventory breakdown'}
              </Text>
            </div>
          </Group>

          {/* Date Filter Bar */}
          {renderDateFilter()}
        </Group>

        {/* Location Summary Cards */}
        {isVehicle ? (
          <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="sm">
            <Paper p="sm" px="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
              <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 10.5 }}>
                Allocated Cylinders
              </Text>
              <Text fw={800} style={{ color: '#0f172a', fontSize: '22px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }} mt={2}>
                {selectedLocation.allocatedCylinders ?? selectedLocation.quantity}
              </Text>
              <Text size="xs" c="dimmed" mt={2} style={{ fontSize: 11 }}>
                Morning loaded stock
              </Text>
            </Paper>

            <Paper p="sm" px="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
              <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 10.5 }}>
                Delivered Cylinders
              </Text>
              <Text fw={800} style={{ color: '#0f172a', fontSize: '22px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }} mt={2}>
                {selectedLocation.deliveredCylinders ?? 0}
              </Text>
              <Text size="xs" c="dimmed" mt={2} style={{ fontSize: 11 }}>
                Delivered on route today
              </Text>
            </Paper>

            <Paper p="sm" px="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
              <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 10.5 }}>
                Balance Cylinders
              </Text>
              <Text fw={800} style={{ color: '#0f172a', fontSize: '22px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }} mt={2}>
                {selectedLocation.balanceCylinders ?? selectedLocation.quantity}
              </Text>
              <Text size="xs" c="dimmed" mt={2} style={{ fontSize: 11 }}>
                Full cylinders on van
              </Text>
            </Paper>

            <Paper p="sm" px="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
              <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 10.5 }}>
                Empty Cylinders
              </Text>
              <Text fw={800} style={{ color: '#0f172a', fontSize: '22px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }} mt={2}>
                {selectedLocation.emptyCylinders ?? selectedLocation.emptyQuantity ?? 0}
              </Text>
              <Text size="xs" c="dimmed" mt={2} style={{ fontSize: 11 }}>
                Empties collected
              </Text>
            </Paper>

            <Paper p="sm" px="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
              <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 10.5 }}>
                Other Products
              </Text>
              <Text fw={800} style={{ color: '#0f172a', fontSize: '22px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }} mt={2}>
                {selectedLocation.otherProductsBalance ?? selectedLocation.otherProductsAllocated ?? 0}
              </Text>
              <Text size="xs" c="dimmed" mt={2} style={{ fontSize: 11 }}>
                Stoves / Burners onboard
              </Text>
            </Paper>
          </SimpleGrid>
        ) : (
          <SimpleGrid cols={{ base: 2, sm: 2, md: 4 }} spacing="sm">
            <Paper p="sm" px="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
              <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 10.5 }}>
                Filled Cylinders
              </Text>
              <Text fw={800} style={{ color: '#0f172a', fontSize: '22px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }} mt={2}>
                {cylBalTotal}
              </Text>
              <Text size="xs" c="dimmed" mt={2} style={{ fontSize: 11 }}>
                Full cylinders ready for dispatch
              </Text>
            </Paper>

            <Paper p="sm" px="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
              <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 10.5 }}>
                Empty Cylinders
              </Text>
              <Text fw={800} style={{ color: '#0f172a', fontSize: '22px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }} mt={2}>
                {selectedLocation.emptyCylinders ?? selectedLocation.emptyQuantity ?? 0}
              </Text>
              <Text size="xs" c="dimmed" mt={2} style={{ fontSize: 11 }}>
                Empties awaiting refill
              </Text>
            </Paper>

            <Paper p="sm" px="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
              <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 10.5 }}>
                Other Products
              </Text>
              <Text fw={800} style={{ color: '#0f172a', fontSize: '22px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }} mt={2}>
                {otherBalTotal}
              </Text>
              <Text size="xs" c="dimmed" mt={2} style={{ fontSize: 11 }}>
                Stoves / Burners in warehouse
              </Text>
            </Paper>

            <Paper p="sm" px="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
              <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 10.5 }}>
                Facility Status
              </Text>
              <Text fw={800} style={{ color: '#0f172a', fontSize: '20px', letterSpacing: '-0.02em' }} mt={2}>
                Primary Warehouse
              </Text>
              <Text size="xs" c="dimmed" mt={2} style={{ fontSize: 11 }}>
                Central storage facility
              </Text>
            </Paper>
          </SimpleGrid>
        )}

        {/* Stored Products Table */}
        <Paper
          radius="md"
          withBorder
          style={{
            overflow: 'hidden',
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <Group justify="space-between" align="center" p="md" px="lg" style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#ffffff' }}>
            <div>
              <Group gap="xs" align="center">
                <Text fw={700} style={{ color: '#0f172a', fontSize: 16.5, letterSpacing: '-0.01em' }}>
                  {isVehicle ? 'Onboard Van Stock Breakdown' : 'Stored Warehouse Stock Breakdown'}
                </Text>
                <Badge
                  variant="light"
                  color="gray"
                  size="sm"
                  radius="sm"
                  styles={{
                    root: {
                      backgroundColor: '#f1f5f9',
                      color: '#475569',
                      fontWeight: 600,
                      fontSize: 11,
                      height: 22,
                    },
                  }}
                >
                  {displayedProducts.length} Items
                </Badge>
              </Group>
              <Text size="xs" c="#64748b" mt={2}>
                {isVehicle
                  ? 'Live morning load, deliveries, balance and empty returns for this route'
                  : 'Breakdown of cylinders by product stored at this location'}
              </Text>
              <Group gap={6} align="center" mt={4}>
                <Badge
                  variant="outline"
                  size="xs"
                  radius="md"
                  color="burgundy"
                  leftSection={<IconCalendar size={12} />}
                  styles={{
                    root: {
                      textTransform: 'none',
                      fontWeight: 600,
                      borderColor: '#f5c2cb',
                      backgroundColor: '#fff5f7',
                      color: '#800020',
                      height: 22,
                    },
                  }}
                >
                  {datePreset === 'all'
                    ? 'All Time Movement History'
                    : datePreset === 'today'
                    ? `Date: Today (${formatDateDDMMYY(fromDate)})`
                    : datePreset === 'week'
                    ? `Date: This Week (${formatDateDDMMYY(fromDate)} — ${formatDateDDMMYY(toDate)})`
                    : datePreset === 'month'
                    ? `Date: This Month (${formatDateDDMMYY(fromDate)} — ${formatDateDDMMYY(toDate)})`
                    : `Date Range: ${fromDate ? formatDateDDMMYY(fromDate) : 'Start'} — ${toDate ? formatDateDDMMYY(toDate) : 'Today'}`}
                </Badge>
              </Group>
            </div>
            <Group gap="sm" align="center" wrap="wrap">
              <SegmentedControl
                value={categoryFilter}
                onChange={(val) => setCategoryFilter(val as any)}
                color="burgundy"
                radius="xl"
                size="xs"
                transitionDuration={250}
                transitionTimingFunction="cubic-bezier(0.16, 1, 0.3, 1)"
                data={[
                  {
                    label: `All (${filteredLocationProducts.length})`,
                    value: 'all',
                  },
                  {
                    label: `Cylinders (${cylProducts.length})`,
                    value: 'cylinders',
                  },
                  {
                    label: `Other (${otherProducts.length})`,
                    value: 'other',
                  },
                ]}
                styles={{
                  root: {
                    backgroundColor: '#f1f5f9',
                    padding: 3,
                    borderRadius: 9999,
                    border: '1px solid #e2e8f0',
                  },
                  indicator: {
                    backgroundColor: '#800020',
                    boxShadow: '0 1px 3px rgba(128, 0, 32, 0.25)',
                    borderRadius: 9999,
                  },
                  label: {
                    padding: '4px 12px',
                  },
                }}
              />
              <TextInput
                placeholder={isVehicle ? 'Search onboard products...' : 'Search warehouse products...'}
                size="xs"
                radius="md"
                value={storedProductSearch}
                onChange={(e) => setStoredProductSearch(e.currentTarget.value)}
                leftSection={<IconSearch size={14} stroke={1.5} color="#64748b" />}
                rightSection={storedProductSearch ? <CloseButton size="xs" onClick={() => setStoredProductSearch('')} /> : null}
                style={{ width: 210 }}
                styles={{
                  input: {
                    height: 34,
                    minHeight: 34,
                    fontSize: 12.5,
                    borderColor: '#e2e8f0',
                    backgroundColor: '#ffffff',
                    '&:focus': { borderColor: '#800020' },
                  },
                }}
              />
            </Group>
          </Group>

          <Table.ScrollContainer minWidth={680}>
            <Table highlightOnHover verticalSpacing="xs" horizontalSpacing="xs">
              <Table.Thead style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
                {isVehicle ? (
                  <Table.Tr>
                    <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px', width: 90 }}>
                      CODE
                    </Table.Th>
                    <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      PRODUCT
                    </Table.Th>
                    <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right', width: 110 }}>
                      ALLOCATED
                    </Table.Th>
                    <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right', width: 110 }}>
                      DELIVERED
                    </Table.Th>
                    <Table.Th style={{ color: '#0f172a', fontWeight: 700, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right', width: 130 }}>
                      BALANCE (FULL)
                    </Table.Th>
                    <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right', width: 130 }}>
                      EMPTY RETURNED
                    </Table.Th>
                  </Table.Tr>
                ) : (
                  <>
                    <Table.Tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <Table.Th rowSpan={2} style={{ color: '#475569', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', width: 60, verticalAlign: 'middle', padding: '6px 8px' }}>
                        CODE
                      </Table.Th>
                      <Table.Th rowSpan={2} style={{ color: '#475569', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', minWidth: 140, verticalAlign: 'middle', padding: '6px 8px' }}>
                        PRODUCT
                      </Table.Th>
                      <Table.Th rowSpan={2} style={{ color: '#334155', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', textAlign: 'center', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', verticalAlign: 'middle', padding: '6px 8px', width: 80 }}>
                        INWARD
                        <Text size="9px" c="dimmed" fw={600} tt="none" style={{ display: 'block' }}>(Purchases)</Text>
                      </Table.Th>
                      <Table.Th colSpan={2} style={{ color: '#334155', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', textAlign: 'center', borderRight: '1px solid #e2e8f0', padding: '6px 4px' }}>
                        OUTWARD
                      </Table.Th>
                      <Table.Th colSpan={2} style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', textAlign: 'center', borderRight: '1px solid #e2e8f0', padding: '6px 4px' }}>
                        VAN RETURN
                      </Table.Th>
                      <Table.Th colSpan={2} style={{ color: '#0f172a', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', textAlign: 'center', padding: '6px 4px' }}>
                        CLOSING STOCK
                      </Table.Th>
                    </Table.Tr>
                    <Table.Tr>
                      <Table.Th style={{ color: '#64748b', fontWeight: 600, fontSize: 10, textAlign: 'right', width: 60, padding: '4px 8px' }}>FULL</Table.Th>
                      <Table.Th style={{ color: '#64748b', fontWeight: 600, fontSize: 10, textAlign: 'right', width: 60, borderRight: '1px solid #e2e8f0', padding: '4px 8px' }}>EMPTY</Table.Th>
                      <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 10, textAlign: 'right', width: 60, padding: '4px 8px' }}>FULL</Table.Th>
                      <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 10, textAlign: 'right', width: 60, borderRight: '1px solid #e2e8f0', padding: '4px 8px' }}>EMPTY</Table.Th>
                      <Table.Th style={{ color: '#0f172a', fontWeight: 700, fontSize: 10, textAlign: 'right', width: 65, padding: '4px 8px' }}>FULL</Table.Th>
                      <Table.Th style={{ color: '#0f172a', fontWeight: 700, fontSize: 10, textAlign: 'right', width: 65, padding: '4px 8px' }}>EMPTY</Table.Th>
                    </Table.Tr>
                  </>
                )}
              </Table.Thead>

              <Table.Tbody>
                {isVehicle ? (
                  <>
                    {displayedProducts.map((p) => {
                      const isCyl = p.IsCylinder !== false;
                      return (
                        <Table.Tr key={p.ProductId}>
                          <Table.Td>
                            <Text style={{ fontSize: 12.5 }} c="#64748b" ff="monospace" fw={700}>
                              {p.ProductCode || '—'}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Group gap={8} wrap="nowrap" align="center">
                              <Text fw={700} style={{ color: '#0f172a', fontSize: 13 }}>
                                {p.ProductName}
                              </Text>

                            </Group>
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13.5, color: '#334155', fontVariantNumeric: 'tabular-nums' }}>
                            {p.AllocatedQty ?? p.Qty}
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13.5, color: '#334155', fontVariantNumeric: 'tabular-nums' }}>
                            {p.DeliveredQty ?? 0}
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                            {p.BalanceQty ?? p.Qty}
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: 13.5, color: isCyl ? '#334155' : '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                            {isCyl ? (p.EmptyQty ?? 0) : '—'}
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </>
                ) : (
                  /* Godown Table Body */
                  <>
                    {displayedProducts.map((p) => {
                      const isCyl = p.IsCylinder !== false;
                      const inFilled = p.InwardFilledQty ?? p.BalanceQty ?? 0;
                      const outFilled = p.OutwardFilledQty ?? p.DispatchedFilledQty ?? 0;
                      const outEmpty = p.OutwardEmptyQty ?? p.DispatchedEmptyQty ?? 0;
                      const retFilled = p.ReturnFilledQty ?? 0;
                      const retEmpty = p.ReturnEmptyQty ?? 0;
                      const floorFilled = p.BalanceQty ?? p.Qty ?? 0;
                      const floorEmpty = p.EmptyQty ?? 0;

                      return (
                        <Table.Tr key={p.ProductId} style={{ height: 38 }}>
                          <Table.Td style={{ padding: '6px 8px' }}>
                            <Text style={{ fontSize: 12 }} c="#64748b" ff="monospace" fw={700}>
                              {p.ProductCode || '—'}
                            </Text>
                          </Table.Td>
                          <Table.Td style={{ padding: '6px 8px' }}>
                            <Group gap={8} wrap="nowrap" align="center">
                              <Text fw={600} style={{ color: '#0f172a', fontSize: 12.5 }}>
                                {p.ProductName}
                              </Text>
                            </Group>
                          </Table.Td>
                          {/* INWARD (FULL) */}
                          <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 12.5, color: '#334155', fontVariantNumeric: 'tabular-nums', borderLeft: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', padding: '6px 8px' }}>
                            {inFilled}
                          </Table.Td>
                          {/* OUTWARD */}
                          <Table.Td style={{ textAlign: 'right', fontWeight: 500, fontSize: 12.5, color: '#334155', fontVariantNumeric: 'tabular-nums', padding: '6px 8px' }}>
                            {outFilled}
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right', fontWeight: 500, fontSize: 12.5, color: isCyl ? '#334155' : '#94a3b8', fontVariantNumeric: 'tabular-nums', borderRight: '1px solid #f1f5f9', padding: '6px 8px' }}>
                            {isCyl ? outEmpty : '—'}
                          </Table.Td>
                          {/* VAN RETURN */}
                          <Table.Td style={{ textAlign: 'right', fontWeight: 500, fontSize: 12.5, color: '#800020', fontVariantNumeric: 'tabular-nums', padding: '6px 8px' }}>
                            {retFilled}
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right', fontWeight: 500, fontSize: 12.5, color: isCyl ? '#800020' : '#94a3b8', fontVariantNumeric: 'tabular-nums', borderRight: '1px solid #f1f5f9', padding: '6px 8px' }}>
                            {isCyl ? retEmpty : '—'}
                          </Table.Td>
                          {/* CLOSING STOCK (FLOOR) */}
                          <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: 12.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums', padding: '6px 8px' }}>
                            {floorFilled}
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: 12.5, color: isCyl ? '#0f172a' : '#94a3b8', fontVariantNumeric: 'tabular-nums', padding: '6px 8px' }}>
                            {isCyl ? floorEmpty : '—'}
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </>
                )}

                {displayedProducts.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={isVehicle ? 6 : 9}>
                      <Center p="xl">
                        <Text size="sm" c="dimmed">No products found matching query.</Text>
                      </Center>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>

              <Table.Tfoot style={{ backgroundColor: '#ffffff', borderTop: '2px solid #e2e8f0' }}>
                {isVehicle ? (
                  <Table.Tr>
                    <Table.Td colSpan={2} style={{ padding: '10px 16px' }}>
                      <Text fw={800} style={{ color: '#800020', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Total
                      </Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums', padding: '10px 16px' }}>
                      {totalAllocated}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums', padding: '10px 16px' }}>
                      {totalDelivered}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 15, color: '#0f172a', fontVariantNumeric: 'tabular-nums', padding: '10px 16px' }}>
                      {totalBalance}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums', padding: '10px 16px' }}>
                      {totalEmpty}
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  <Table.Tr>
                    <Table.Td colSpan={2} style={{ padding: '8px 8px' }}>
                      <Text fw={700} style={{ color: '#0f172a', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Total
                      </Text>
                    </Table.Td>
                    {/* INWARD (FULL) */}
                    <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: 12.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', padding: '8px 8px' }}>
                      {godownTotals.inwardFilled}
                    </Table.Td>
                    {/* OUTWARD */}
                    <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: 12.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums', padding: '8px 8px' }}>
                      {godownTotals.outwardFilled}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: 12.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums', borderRight: '1px solid #e2e8f0', padding: '8px 8px' }}>
                      {godownTotals.outwardEmpty}
                    </Table.Td>
                    {/* VAN RETURN */}
                    <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: 12.5, color: '#800020', fontVariantNumeric: 'tabular-nums', padding: '8px 8px' }}>
                      {godownTotals.returnFilled}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: 12.5, color: '#800020', fontVariantNumeric: 'tabular-nums', borderRight: '1px solid #e2e8f0', padding: '8px 8px' }}>
                      {godownTotals.returnEmpty}
                    </Table.Td>
                    {/* CLOSING STOCK */}
                    <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 13, color: '#0f172a', fontVariantNumeric: 'tabular-nums', padding: '8px 8px' }}>
                      {godownTotals.godownFilled}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 13, color: '#0f172a', fontVariantNumeric: 'tabular-nums', padding: '8px 8px' }}>
                      {godownTotals.godownEmpty}
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tfoot>
            </Table>
          </Table.ScrollContainer>
        </Paper>
      </Stack>
    );
  }
  // ==========================================
  // MAIN VIEW: SIDE-BY-SIDE DUAL TABLES
  // ==========================================
  return (
    <Stack gap="lg">
      {/* 1. Page Header */}
      <Group justify="space-between" align="center" wrap="wrap" gap="md">
        <div>
          <Button
            variant="subtle"
            color="gray"
            size="xs"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate('/')}
            mb={4}
            styles={{ root: { paddingLeft: 0, paddingRight: 8, color: '#475569' } }}
          >
            Back to Dashboard
          </Button>
          <Title order={2} style={{ color: '#800020', fontWeight: 700 }}>
            Stock Analysis {user?.godown_name && !isAdmin ? `— ${user.godown_name}` : ''}
          </Title>
          <Text size="sm" c="dimmed">
            {user?.godown_name && !isAdmin ? `Live stock and inventory breakdown for ${user.godown_name}` : ''}
          </Text>
        </div>
        {/* Right Actions: Date Filter, Live Sync & Refresh */}
        <Group gap="sm" align="center" wrap="wrap" style={{ flexGrow: 1, justifyContent: 'flex-end' }}>
          {renderDateFilter()}
          <Badge
            variant="outline"
            size="md"
            radius="xl"
            styles={{
              root: {
                borderColor: '#e2e8f0',
                backgroundColor: '#ffffff',
                color: '#334155',
                fontWeight: 600,
                height: 32,
                padding: '0 12px',
                textTransform: 'none',
              },
            }}
          >
            <Group gap={6} align="center">
              <Box
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  boxShadow: '0 0 6px rgba(16, 185, 129, 0.6)',
                }}
              />
              <Text size="xs" fw={600} c="#0f172a">
                Last Sync: {data?.last_sync_time || 'Just now'}
              </Text>
            </Group>
          </Badge>
          <Button
            variant="default"
            size="sm"
            leftSection={<IconRefresh size={15} className={isRefetching ? 'animate-spin' : ''} />}
            onClick={() => refetch()}
            loading={isRefetching}
            style={{ borderColor: '#e2e8f0', color: '#800020', fontWeight: 600 }}
          >
            Refresh
          </Button>
        </Group>
      </Group>
      {/* 2. Top Metric KPI Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        {/* Card 1: Central Godown Stock / Filled Stock */}
        <Paper
          p="md"
          radius="md"
          withBorder
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            transition: 'all 180ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 20px -4px rgba(0, 0, 0, 0.06)';
            e.currentTarget.style.borderColor = '#cbd5e1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
            e.currentTarget.style.borderColor = '#e2e8f0';
          }}
        >
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              {userGodownId && !isAdmin ? 'Filled Stock Available' : (user?.godown_name ? `${user.godown_name} Stock` : 'Central Godown Stock')}
            </Text>
            <IconBuildingFactory2 size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#0f172a', fontSize: '24px', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
            {(summary.total_godown_filled || 0).toLocaleString()}
          </Text>
          <Group justify="space-between" align="center" mt="xs" wrap="nowrap">
            <Text size="xs" c="dimmed" truncate style={{ whiteSpace: 'nowrap' }}>
              {userGodownId && !isAdmin ? 'Full cylinders ready for distribution' : `${summary.godown_percentage}% ready for loading`}
            </Text>
            <IconArrowUpRight size={15} color="#800020" style={{ flexShrink: 0 }} />
          </Group>
        </Paper>
        {/* Card 3: Allocated to Van Fleet / Empty Cylinders */}
        <Paper
          p="md"
          radius="md"
          withBorder
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            transition: 'all 180ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 20px -4px rgba(0, 0, 0, 0.06)';
            e.currentTarget.style.borderColor = '#cbd5e1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
            e.currentTarget.style.borderColor = '#e2e8f0';
          }}
        >
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              {userGodownId && !isAdmin ? 'Empty Cylinders in Depot' : 'Allocated to Van'}
            </Text>
            {userGodownId && !isAdmin ? (
              <IconRotateClockwise2 size={20} color="#800020" stroke={1.75} />
            ) : (
              <IconTruckDelivery size={20} color="#800020" stroke={1.75} />
            )}
          </Group>
          <Text fw={700} style={{ color: '#0f172a', fontSize: '24px', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
            {((userGodownId && !isAdmin ? summary.total_godown_empty : summary.total_allocated_cylinders) || 0).toLocaleString()}
          </Text>
          <Group justify="space-between" align="center" mt="xs" wrap="nowrap">
            <Text size="xs" c="dimmed" truncate style={{ whiteSpace: 'nowrap' }}>
              {userGodownId && !isAdmin ? 'Returned empty cylinders stored' : `${summary.allocated_percentage}% onboard active vans`}
            </Text>
            <IconArrowUpRight size={15} color="#800020" style={{ flexShrink: 0 }} />
          </Group>
        </Paper>
        {/* Card 4: Active Delivery Vans / Depot Status */}
        <Paper
          p="md"
          radius="md"
          withBorder
          onClick={() => {
            if (isAdmin) navigate('/allocations');
          }}
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
            cursor: isAdmin ? 'pointer' : 'default',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            transition: 'all 180ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onMouseEnter={(e) => {
            if (isAdmin) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 20px -4px rgba(0, 0, 0, 0.06)';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }
          }}
          onMouseLeave={(e) => {
            if (isAdmin) {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }
          }}
        >
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              {userGodownId && !isAdmin ? 'Depot Status' : 'Active Delivery Vans'}
            </Text>
            {userGodownId && !isAdmin ? (
              <IconBuildingWarehouse size={20} color="#800020" stroke={1.75} />
            ) : (
              <IconTruck size={20} color="#800020" stroke={1.75} />
            )}
          </Group>
          {userGodownId && !isAdmin ? (
            <Text fw={700} style={{ color: '#0f172a', fontSize: '24px', letterSpacing: '-0.02em' }}>
              {filteredProducts.length}{' '}
              <Text component="span" size="sm" c="dimmed" fw={600}>
                Active Products
              </Text>
            </Text>
          ) : (
            <Text fw={700} style={{ color: '#0f172a', fontSize: '24px', letterSpacing: '-0.02em' }}>
              {summary.active_vans_count}{' '}
              <Text component="span" size="sm" c="dimmed" fw={600}>
                Vans &bull; {summary.total_registered_vans} Total
              </Text>
            </Text>
          )}
          <Group justify="space-between" align="center" mt="xs" wrap="nowrap">
            <Text size="xs" c="dimmed" truncate style={{ whiteSpace: 'nowrap' }}>
              {userGodownId && !isAdmin ? (user?.godown_name || 'Active Warehouse Depot') : 'Holding active route stock'}
            </Text>
            {isAdmin && <IconArrowUpRight size={15} color="#800020" style={{ flexShrink: 0 }} />}
          </Group>
        </Paper>
      </SimpleGrid>
      {/* 3. Side-by-side Tables: Inventory by Product & Inventory by Location */}
      <Grid gap="md" align="stretch">
        {/* Table 1: Inventory by Product */}
        <Grid.Col span={{ base: 12, lg: 6 }}>
          <Paper
            radius="md"
            withBorder
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              backgroundColor: '#ffffff',
              borderColor: '#e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <Group justify="space-between" align="center" p="sm" px="md" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <Text fw={700} style={{ color: '#800020', fontSize: 16 }}>
                  Inventory by Product
                </Text>
              </div>
              <Group gap="xs" align="center">
                <TextInput
                  placeholder="Search products..."
                  size="xs"
                  radius="md"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.currentTarget.value)}
                  leftSection={<IconSearch size={14} stroke={1.5} color="#800020" />}
                  rightSection={productSearch ? <CloseButton size="xs" onClick={() => setProductSearch('')} /> : null}
                  style={{ width: 175 }}
                  styles={{
                    input: {
                      height: 32,
                      minHeight: 32,
                      fontSize: 12,
                      borderColor: '#e2e8f0',
                      backgroundColor: '#ffffff',
                      '&:focus': { borderColor: '#800020' },
                    },
                  }}
                />
                <Badge
                  variant="outline"
                  color="burgundy"
                  size="sm"
                  radius="xl"
                  styles={{
                    root: {
                      borderColor: '#800020',
                      color: '#800020',
                      backgroundColor: '#ffffff',
                      fontWeight: 600,
                      letterSpacing: '0.4px',
                      padding: '0 8px',
                      height: 22,
                    },
                  }}
                >
                  {filteredProducts.length} Products
                </Badge>
              </Group>
            </Group>
            {isLoading ? (
              <Center p="xl" style={{ flex: 1 }}>
                <Loader color="burgundy" />
              </Center>
            ) : filteredProducts.length === 0 ? (
              <Center p="xl" style={{ flex: 1 }}>
                <Text c="dimmed" size="sm">
                  No products found matching query.
                </Text>
              </Center>
            ) : (
              <Box style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <ScrollArea
                  h={265}
                  scrollbars="y"
                  scrollbarSize={6}
                  type="hover"
                  styles={{
                    thumb: { backgroundColor: '#800020', borderRadius: 9999 },
                    scrollbar: { backgroundColor: 'transparent' },
                  }}
                >
                  <Table highlightOnHover verticalSpacing="xs" horizontalSpacing="md" stickyHeader style={{ tableLayout: 'fixed', width: '100%' }}>
                    <colgroup>
                      <col style={{ width: 75 }} />
                      <col />
                      <col style={{ width: 95 }} />
                      <col style={{ width: 95 }} />
                    </colgroup>
                    <Table.Thead style={{ backgroundColor: '#ffffff', zIndex: 2, borderBottom: '1px solid #e2e8f0' }}>
                      <Table.Tr>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                          CODE
                        </Table.Th>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                          PRODUCT
                        </Table.Th>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right' }}>
                          FILLED
                        </Table.Th>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right', paddingRight: 20 }}>
                          EMPTY
                        </Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {filteredProducts.map((product) => {
                        const isCyl = product.IsCylinder !== false;
                        const mg = userGodownId && !isAdmin ? (product.Godowns || []).find((g: any) => Number(g.GodownId) === Number(userGodownId)) : null;
                        const filled = mg ? Number(mg.FilledQty || 0) : (product.GodownFilledQty ?? product.FilledQty ?? (product.GodownQty + (product.AllocatedQty || 0)));
                        const empty = mg ? Number(mg.EmptyQty || 0) : (product.GodownEmptyQty ?? product.EmptyQty ?? 0);
                        return (
                          <Table.Tr
                            key={product.ProductId}
                            role="button"
                            tabIndex={0}
                            onClick={() => setSearchParams({ product: String(product.ProductId) })}
                            style={{
                              cursor: 'pointer',
                              height: 42,
                              transition: 'background-color 150ms ease',
                            }}
                          >
                            <Table.Td>
                              <Text style={{ fontSize: 12.5 }} c="#64748b" ff="monospace" fw={700}>
                                {product.ProductCode || '—'}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Group gap={6} wrap="nowrap">
                                <IconChevronRight size={14} color="#800020" style={{ flexShrink: 0 }} />
                                <Text style={{ fontSize: 13.5 }} fw={700} c="#0f172a" lineClamp={1}>
                                  {product.ProductName}
                                </Text>
                              </Group>
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                              {filled}
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'right', fontWeight: 500, fontSize: 13.5, color: isCyl ? '#475569' : '#94a3b8', fontVariantNumeric: 'tabular-nums', paddingRight: 20 }}>
                              {isCyl ? empty : '—'}
                            </Table.Td>
                          </Table.Tr>
                        );
                      })}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>

                {/* Permanent Total Footer locked cleanly outside ScrollArea */}
                <Box style={{ borderTop: '2px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                  <Table verticalSpacing="xs" horizontalSpacing="md" style={{ tableLayout: 'fixed', width: '100%' }}>
                    <colgroup>
                      <col style={{ width: 75 }} />
                      <col />
                      <col style={{ width: 95 }} />
                      <col style={{ width: 95 }} />
                    </colgroup>
                    <Table.Tbody>
                      <Table.Tr style={{ height: 42 }}>
                        <Table.Td colSpan={2} style={{ fontWeight: 800, color: '#800020', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Total
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: 13.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                          {totalProductFilled}
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13.5, color: '#475569', fontVariantNumeric: 'tabular-nums', paddingRight: 20 }}>
                          {totalProductEmpty}
                        </Table.Td>
                      </Table.Tr>
                    </Table.Tbody>
                  </Table>
                </Box>
              </Box>
            )}
          </Paper>
        </Grid.Col>

        {/* Table 2: Inventory by Location */}
        <Grid.Col span={{ base: 12, lg: 6 }}>
          <Paper
            radius="md"
            withBorder
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              backgroundColor: '#ffffff',
              borderColor: '#e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <Group justify="space-between" align="center" p="sm" px="md" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <Text fw={700} style={{ color: '#800020', fontSize: 16 }}>
                  Inventory by Location
                </Text>
              </div>
              <Group gap="xs" align="center">
                <TextInput
                  placeholder="Search locations..."
                  size="xs"
                  radius="md"
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.currentTarget.value)}
                  leftSection={<IconSearch size={14} stroke={1.5} color="#800020" />}
                  rightSection={locationSearch ? <CloseButton size="xs" onClick={() => setLocationSearch('')} /> : null}
                  style={{ width: 175 }}
                  styles={{
                    input: {
                      height: 32,
                      minHeight: 32,
                      fontSize: 12,
                      borderColor: '#e2e8f0',
                      backgroundColor: '#ffffff',
                      '&:focus': { borderColor: '#800020' },
                    },
                  }}
                />
                <Badge
                  variant="outline"
                  color="burgundy"
                  size="sm"
                  radius="xl"
                  styles={{
                    root: {
                      borderColor: '#800020',
                      color: '#800020',
                      backgroundColor: '#ffffff',
                      fontWeight: 600,
                      letterSpacing: '0.4px',
                      padding: '0 8px',
                      height: 22,
                    },
                  }}
                >
                  {filteredLocations.length} Locations
                </Badge>
              </Group>
            </Group>
            {isLoading ? (
              <Center p="xl" style={{ flex: 1 }}>
                <Loader color="burgundy" />
              </Center>
            ) : filteredLocations.length === 0 ? (
              <Center p="xl" style={{ flex: 1 }}>
                <Text c="dimmed" size="sm">
                  No stock locations found matching query.
                </Text>
              </Center>
            ) : (
              <Box style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <ScrollArea
                  h={265}
                  scrollbars="y"
                  scrollbarSize={6}
                  type="hover"
                  styles={{
                    thumb: { backgroundColor: '#800020', borderRadius: 9999 },
                    scrollbar: { backgroundColor: 'transparent' },
                  }}
                >
                  <Table highlightOnHover verticalSpacing="xs" horizontalSpacing="md" stickyHeader style={{ tableLayout: 'fixed', width: '100%' }}>
                    <colgroup>
                      <col />
                      <col style={{ width: 105 }} />
                      <col style={{ width: 105 }} />
                    </colgroup>
                    <Table.Thead style={{ backgroundColor: '#ffffff', zIndex: 2, borderBottom: '1px solid #e2e8f0' }}>
                      <Table.Tr>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                          LOCATION
                        </Table.Th>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right' }}>
                          FILLED
                        </Table.Th>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right', paddingRight: 20 }}>
                          EMPTY
                        </Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {filteredLocations.map((location) => (
                        <Table.Tr
                          key={location.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSearchParams({ location: location.id })}
                          style={{
                            cursor: 'pointer',
                            height: 42,
                            transition: 'background-color 150ms ease',
                          }}
                        >
                          <Table.Td>
                            <Group gap={6} wrap="nowrap">
                              <IconChevronRight size={14} color="#800020" style={{ flexShrink: 0 }} />
                              {location.type === 'godown' ? (
                                <IconBuildingFactory2 size={15} color="#800020" style={{ flexShrink: 0 }} />
                              ) : (
                                <IconTruck size={15} color="#800020" style={{ flexShrink: 0 }} />
                              )}
                              <Text style={{ fontSize: 13.5 }} fw={700} c="#0f172a" lineClamp={1}>
                                {location.name}
                              </Text>
                            </Group>
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                            {location.filledQuantity ?? location.quantity}
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right', fontWeight: 500, fontSize: 13.5, color: '#475569', fontVariantNumeric: 'tabular-nums', paddingRight: 20 }}>
                            {location.emptyQuantity ?? 0}
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>

                {/* Permanent Total Footer locked cleanly outside ScrollArea */}
                <Box style={{ borderTop: '2px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                  <Table verticalSpacing="xs" horizontalSpacing="md" style={{ tableLayout: 'fixed', width: '100%' }}>
                    <colgroup>
                      <col />
                      <col style={{ width: 105 }} />
                      <col style={{ width: 105 }} />
                    </colgroup>
                    <Table.Tbody>
                      <Table.Tr style={{ height: 42 }}>
                        <Table.Td style={{ fontWeight: 800, color: '#800020', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Total
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: 13.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                          {totalLocationFilled}
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13.5, color: '#475569', fontVariantNumeric: 'tabular-nums', paddingRight: 20 }}>
                          {totalLocationEmpty}
                        </Table.Td>
                      </Table.Tr>
                    </Table.Tbody>
                  </Table>
                </Box>
              </Box>
            )}
          </Paper>
        </Grid.Col>
      </Grid>
    </Stack>
  );
};
export default StockAnalysisPage;