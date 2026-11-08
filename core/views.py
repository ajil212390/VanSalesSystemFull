import re
from datetime import date, datetime
from decimal import Decimal, ROUND_HALF_UP
from django.db import transaction
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.decorators import action
from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import AnonRateThrottle
from drf_spectacular.utils import extend_schema
from django.db.models import Sum, F, Q


def safe_parse_date(val):
    if not val:
        return None
    if isinstance(val, (date, datetime)):
        return val if isinstance(val, date) else val.date()
    val_str = str(val).strip()
    if not val_str:
        return None
    # 1. Try ISO YYYY-MM-DD
    if re.match(r'^\d{4}-\d{1,2}-\d{1,2}$', val_str):
        try:
            return datetime.strptime(val_str, '%Y-%m-%d').date()
        except ValueError:
            pass
    # 2. Try common international and Indian date formats
    for fmt in ('%d/%m/%Y', '%d-%m-%Y', '%d.%m.%Y', '%m/%d/%Y', '%Y/%m/%d', '%d/%m/%y', '%d-%m-%y'):
        try:
            return datetime.strptime(val_str, fmt).date()
        except ValueError:
            pass
    return None


from core.models import (
    State, UserRole, Company, Driver, Route, Vehicle, RouteVehicleDriver,
    User, Category, Unit, Product, Group, Ledger, ProductPriceAudit,
    Purchase, PurchaseLine, Sales, SalesLine, StockMovement, Voucher, VoucherLine,
    Payment, PaymentLine, BillwiseAllocation, LedgerLine, RouteExpense,
    DeliveryNote, DeliveryNoteLine
)


from core.serializers import (
    LoginSerializer, RegisterSerializer, UserMeSerializer,
    CompanySerializer, StateSerializer, UserRoleSerializer,
    DriverSerializer, RouteSerializer, VehicleSerializer, RouteVehicleDriverSerializer,
    UserManagementSerializer, CategorySerializer, UnitSerializer, ProductSerializer,
    GroupSerializer, LedgerSerializer, ProductPriceAuditSerializer,
    PurchaseSerializer, PurchaseLineSerializer, PaymentSerializer, PaymentLineSerializer, BillwiseAllocationSerializer,
    LedgerLineSerializer
)

from core.permissions import HasModulePermission, MODULE_COMPANY


def sync_ledger_balances(*ledger_ids):
    """
    Recalculates DebitBalance, CreditBalance, and CurrentBalance for the given ledger IDs
    directly from actual non-cancelled VoucherLines + OpeningBalance.
    If no ledger_ids provided, recalculates for ALL ledgers.
    Guarantees balances never drift, go negative unexpectedly, or corrupt on voucher deletion.
    """
    ids = [lid for lid in ledger_ids if lid]
    if ids:
        ledgers = Ledger.objects.filter(LedgerId__in=ids)
    else:
        ledgers = Ledger.objects.all()

    for l in ledgers:
        v_agg = VoucherLine.objects.filter(Ledger=l, Voucher__IsCancelled=False).aggregate(
            tot_dr=Sum('DebitAmount'),
            tot_cr=Sum('CreditAmount')
        )
        tot_dr = v_agg['tot_dr'] or Decimal('0.00')
        tot_cr = v_agg['tot_cr'] or Decimal('0.00')
        op = l.OpeningBalance or Decimal('0.00')
        op_net = op if (l.OpeningBalanceType or 'DR').upper() == 'DR' else -op
        curr = op_net + tot_dr - tot_cr

        Ledger.objects.filter(LedgerId=l.LedgerId).update(
            DebitBalance=tot_dr,
            CreditBalance=tot_cr,
            CurrentBalance=curr
        )


class AuthAnonThrottle(AnonRateThrottle):
    rate = '20/min'


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthAnonThrottle]

    @extend_schema(request=LoginSerializer, responses={200: LoginSerializer})
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthAnonThrottle]

    @extend_schema(request=RegisterSerializer, responses={201: LoginSerializer})
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.save()
        return Response(data, status=status.HTTP_201_CREATED)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: UserMeSerializer})
    def get(self, request):
        serializer = UserMeSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CompanyProfileView(APIView):
    permission_classes = [IsAuthenticated, HasModulePermission]
    required_module = MODULE_COMPANY

    @extend_schema(responses={200: CompanySerializer})
    def get(self, request):
        company = request.user.company
        if not company:
            return Response({"non_field_errors": ["No company associated with current user."]}, status=status.HTTP_404_NOT_FOUND)
        serializer = CompanySerializer(company)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(request=CompanySerializer, responses={200: CompanySerializer})
    def patch(self, request):
        role_name = getattr(request.user.UserRole, 'RoleName', '')
        if role_name not in ('Administrator', 'Manager'):
            return Response(
                {"non_field_errors": ["Only Administrator and Manager can update company details."]},
                status=status.HTTP_403_FORBIDDEN
            )

        company = request.user.company
        if not company:
            return Response({"non_field_errors": ["No company found."]}, status=status.HTTP_404_NOT_FOUND)

        serializer = CompanySerializer(company, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


class StateListView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(responses={200: StateSerializer(many=True)})
    def get(self, request):
        states = State.objects.filter(IsActive=True).order_by('StateName')
        serializer = StateSerializer(states, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class RoleListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: UserRoleSerializer(many=True)})
    def get(self, request):
        roles = UserRole.objects.filter(IsActive=True).order_by('UserRoleId')
        serializer = UserRoleSerializer(roles, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
class DriverViewSet(viewsets.ModelViewSet):
    """
    CRUD API for Drivers scoped to the logged-in user's company.
    """
    serializer_class = DriverSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Driver.objects.filter(CompanyId=self.request.user.CompanyId).order_by('-DriverId')

    def perform_create(self, serializer):
        serializer.save(CompanyId=self.request.user.CompanyId)

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except Exception:
            return Response(
                {"detail": "Cannot delete this driver because it is linked to routes, allocations, or user accounts."},
                status=status.HTTP_400_BAD_REQUEST
            )


class VehicleViewSet(viewsets.ModelViewSet):
    """
    CRUD API for Vehicles scoped to the logged-in user's company.
    """
    serializer_class = VehicleSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Vehicle.objects.filter(CompanyId=self.request.user.CompanyId).order_by('-VehicleId')

    def perform_create(self, serializer):
        serializer.save(CompanyId=self.request.user.CompanyId)

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except Exception:
            return Response(
                {"detail": "Cannot delete this vehicle because it is assigned to active allocations."},
                status=status.HTTP_400_BAD_REQUEST
            )


class RouteViewSet(viewsets.ModelViewSet):
    """
    CRUD API for Routes scoped to the logged-in user's company.
    """
    serializer_class = RouteSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Route.objects.filter(CompanyId=self.request.user.CompanyId).order_by('-RouteId')

    def perform_create(self, serializer):
        serializer.save(CompanyId=self.request.user.CompanyId)

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except Exception:
            return Response(
                {"detail": "Cannot delete this route because it is assigned to active allocations."},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'], url_path='van-management')
    def van_management(self, request):
        """
        Returns a live summary of all routes with their associated van, driver, stock,
        deliveries, and collection data — derived directly from Sales, SalesLine,
        DeliveryNote, and StockMovement records. No dependency on deleted EndRoute tables.
        """
        company_id = getattr(request.user, 'CompanyId', 1) or 1
        today = date.today()

        routes_qs = (
            Route.objects
            .filter(CompanyId=company_id, IsActive=True)
            .exclude(RouteName__icontains='godown')
            .exclude(RouteId=1)
            .order_by('RouteName')
        )

        result = []
        total_route_count = routes_qs.count()

        for route in routes_qs:
            # Find the most recent active allocation for this route
            alloc = (
                RouteVehicleDriver.objects
                .filter(CompanyId=company_id, Route=route, IsActive=True)
                .select_related('Vehicle', 'Driver')
                .order_by('-RouteVehicleDriverId')
                .first()
            )

            vehicle_number = alloc.Vehicle.VehicleNumber if alloc and alloc.Vehicle else None
            driver_name = alloc.Driver.DriverName if alloc and alloc.Driver else None
            allocation_id = alloc.RouteVehicleDriverId if alloc else None

            # Check for the latest delivery note for this allocation
            latest_dn = None
            if allocation_id:
                latest_dn = DeliveryNote.objects.filter(
                    CompanyId=company_id,
                    RouteVehicleDriver_id=allocation_id,
                    Status='LOADED'
                ).order_by('-DeliveryNoteId').first()

            if not latest_dn:
                # No active loaded delivery note. Shift is settled or vehicle is idle.
                # Reset all operational counters to zero until a new delivery note is allocated!
                result.append({
                    'route_id': route.RouteId,
                    'route_name': route.RouteName,
                    'allocation_id': allocation_id,
                    'vehicle_number': vehicle_number or 'Not Assigned',
                    'driver_name': driver_name or 'Not Assigned',
                    'vehicle': {
                        'vehicle_number': vehicle_number or 'Not Assigned',
                    },
                    'driver': {
                        'name': driver_name or 'Not Assigned',
                    },
                    'status': 'idle',
                    'stock': {
                        'filled_quantity': 0.0,
                        'empty_quantity': 0.0,
                        'delivered_quantity': 0.0,
                        'return_quantity': 0.0,
                    },
                    'collection': {
                        'total_collection': 0.0,
                        'cash_collection': 0.0,
                        'bank_collection': 0.0,
                    },
                    'expense': {
                        'total_expense': 0.0,
                        'cash_expense': 0.0,
                        'bank_expense': 0.0,
                        'net_collection': 0.0,
                    },
                    'sales_count': 0,
                    'is_live': False,
                    'as_of': today.isoformat(),
                })
                continue

            # --- ACTIVE LOADED SHIFT ---
            # Stock from van_stock logic (use StockMovement for the current active DN)
            filled_qty = 0.0
            empty_qty = 0.0

            first_dn_sm = StockMovement.objects.filter(
                RouteVehicleDriverId=allocation_id,
                ReferenceId=latest_dn.DeliveryNoteId,
                TransactionType='DELIVERY_NOTE'
            ).order_by('StockMovementId').first()

            base_movs = StockMovement.objects.filter(
                CompanyId=company_id,
                RouteVehicleDriverId=allocation_id
            )
            if first_dn_sm:
                base_movs = base_movs.filter(StockMovementId__gte=first_dn_sm.StockMovementId)

            dn_in = base_movs.filter(TransactionType='DELIVERY_NOTE').aggregate(s=Sum('InQty'))['s'] or Decimal('0')
            sale_out = base_movs.filter(TransactionType='VAN_SALE').aggregate(s=Sum('OutQty'))['s'] or Decimal('0')
            unload_full = base_movs.filter(TransactionType='VAN_UNLOAD_FULL').aggregate(s=Sum('OutQty'))['s'] or Decimal('0')
            filled_qty = float(max(Decimal('0'), dn_in - sale_out - unload_full))

            empty_in = base_movs.filter(TransactionType='VAN_EMPTY_RETURN').aggregate(s=Sum('InQty'))['s'] or Decimal('0')
            empty_out = base_movs.filter(TransactionType='VAN_UNLOAD_EMPTY').aggregate(s=Sum('OutQty'))['s'] or Decimal('0')
            empty_qty = float(max(Decimal('0'), empty_in - empty_out))

            # Sales data strictly for THIS active delivery note shift (starts from zero upon allocation)
            shift_sales_qs = Sales.objects.filter(
                CompanyId=company_id,
                RouteVehicleDriver_id=allocation_id,
                CreatedAt__gte=latest_dn.CreatedAt
            ).exclude(Status='CANCELLED')

            delivered_qty = float(
                shift_sales_qs.aggregate(s=Sum('TotalDeliveredQty'))['s'] or 0
            )
            return_qty = float(
                shift_sales_qs.aggregate(s=Sum('TotalEmptyQty'))['s'] or 0
            )

            cash_collection = float(
                shift_sales_qs.filter(PaymentMethod__iexact='Cash')
                .aggregate(s=Sum('PaidAmount'))['s'] or 0
            )
            bank_collection = float(
                shift_sales_qs.filter(
                    Q(PaymentMethod__in=['Bank', 'UPI', 'Online', 'Card', 'Digital', 'CHEQUE', 'Cheque'])
                    | Q(PaymentMethod__iexact='bank')
                    | Q(PaymentMethod__iexact='upi')
                )
                .aggregate(s=Sum('PaidAmount'))['s'] or 0
            )
            total_collection = float(
                shift_sales_qs.aggregate(s=Sum('PaidAmount'))['s'] or (cash_collection + bank_collection)
            )

            # Expenses strictly for THIS active delivery note shift
            shift_exp_qs = RouteExpense.objects.filter(
                CompanyId=company_id,
                RouteVehicleDriver_id=allocation_id,
                CreatedAt__gte=latest_dn.CreatedAt
            )

            total_exp = float(shift_exp_qs.aggregate(s=Sum('Amount'))['s'] or 0)
            cash_exp = float(shift_exp_qs.filter(PaymentMode='Cash').aggregate(s=Sum('Amount'))['s'] or 0)
            bank_exp = float(shift_exp_qs.filter(PaymentMode__in=['Bank', 'UPI', 'Online']).aggregate(s=Sum('Amount'))['s'] or 0)

            # Direct Payment entries under Travelling Expense for this active shift
            linked_pmt_ids = set(shift_exp_qs.exclude(Payment__isnull=True).values_list('Payment_id', flat=True))
            travel_pmts = Payment.objects.filter(
                Q(PartyLedger__LedgerName__icontains='travel')
                | Q(PartyLedger_id=31)
                | Q(PartyLedger__LedgerName__icontains='trip')
                | Q(PartyLedger__LedgerName__icontains='fuel'),
                CreatedAt__gte=latest_dn.CreatedAt
            ).exclude(PaymentId__in=linked_pmt_ids)

            active_alloc_route_ids = set(
                RouteVehicleDriver.objects.filter(CompanyId=company_id, IsActive=True)
                .values_list('Route_id', flat=True)
            )

            for p in travel_pmts.prefetch_related('lines'):
                narr = (p.Narration or '').lower()
                other_route = any(
                    r.RouteId != route.RouteId and r.RouteName.lower() in narr
                    for r in routes_qs
                )
                if other_route:
                    continue

                matched = (
                    route.RouteName.lower() in narr
                    or (vehicle_number and vehicle_number != 'Not Assigned' and vehicle_number.lower() in narr)
                    or (driver_name and driver_name != 'Not Assigned' and driver_name.lower() in narr)
                    or (len(active_alloc_route_ids) <= 1 and route.RouteId in active_alloc_route_ids)
                )

                if matched:
                    p_amt = float(p.Amount or 0)
                    total_exp += p_amt
                    first_line = p.lines.first()
                    p_mode = first_line.PaymentMode if first_line else 'Cash'
                    if p_mode.lower() == 'cash':
                        cash_exp += p_amt
                    else:
                        bank_exp += p_amt

            route_status = 'live' if (allocation_id and filled_qty > 0) else 'live'

            result.append({
                'route_id': route.RouteId,
                'route_name': route.RouteName,
                'allocation_id': allocation_id,
                'vehicle_number': vehicle_number or 'Not Assigned',
                'driver_name': driver_name or 'Not Assigned',
                'vehicle': {
                    'vehicle_number': vehicle_number or 'Not Assigned',
                },
                'driver': {
                    'name': driver_name or 'Not Assigned',
                },
                'status': route_status,
                'stock': {
                    'filled_quantity': filled_qty,
                    'empty_quantity': empty_qty,
                    'delivered_quantity': delivered_qty,
                    'return_quantity': return_qty,
                },
                'collection': {
                    'total_collection': total_collection,
                    'cash_collection': cash_collection,
                    'bank_collection': bank_collection,
                },
                'expense': {
                    'total_expense': total_exp,
                    'cash_expense': cash_exp,
                    'bank_expense': bank_exp,
                    'net_collection': total_collection - total_exp,
                },
            })

        return Response({
            'total_route_count': total_route_count,
            'routes': result,
            'as_of': today.isoformat(),
        })

    @action(detail=True, methods=['get'], url_path='live-details')
    def live_details(self, request, pk=None):
        """
        Returns live route-wise operational details for a specific route:
        vehicle, driver, stock (filled/empty/delivered/returned), and collection breakdown.
        """
        company_id = getattr(request.user, 'CompanyId', 1) or 1
        today = date.today()

        route = self.get_object()

        alloc = (
            RouteVehicleDriver.objects
            .filter(CompanyId=company_id, Route=route, IsActive=True)
            .select_related('Vehicle', 'Driver')
            .order_by('-RouteVehicleDriverId')
            .first()
        )

        vehicle_number = alloc.Vehicle.VehicleNumber if alloc and alloc.Vehicle else None
        driver_name = alloc.Driver.DriverName if alloc and alloc.Driver else None
        allocation_id = alloc.RouteVehicleDriverId if alloc else None

        # Check for active LOADED Delivery Note
        latest_dn = None
        if allocation_id:
            latest_dn = DeliveryNote.objects.filter(
                CompanyId=company_id,
                RouteVehicleDriver_id=allocation_id,
                Status='LOADED'
            ).order_by('-DeliveryNoteId').first()

        if not latest_dn:
            # Shift is ended, approved, or not loaded yet.
            # Reset all operational counters and lists to 0 until a new delivery note is allocated!
            return Response({
                'route_id': route.RouteId,
                'route_name': route.RouteName,
                'allocation_id': allocation_id,
                'vehicle': {
                    'vehicle_number': vehicle_number or 'Not Assigned',
                },
                'driver': {
                    'name': driver_name or 'Not Assigned',
                },
                'status': 'idle',
                'stock': {
                    'allocated_quantity': 0.0,
                    'filled_quantity': 0.0,
                    'empty_quantity': 0.0,
                    'delivered_quantity': 0.0,
                    'return_quantity': 0.0,
                    'allocated_cylinders': 0.0,
                    'delivered_cylinders': 0.0,
                    'balance_van_stock': 0.0,
                    'empty_cylinders': 0.0,
                    'other_products': 0.0,
                },
                'products': [],
                'collection': {
                    'total_collection': 0.0,
                    'cash_collection': 0.0,
                    'bank_collection': 0.0,
                },
                'expense': {
                    'total_expense': 0.0,
                    'cash_expense': 0.0,
                    'bank_expense': 0.0,
                    'net_collection': 0.0,
                    'net_cash': 0.0,
                    'net_bank': 0.0,
                    'recent_expenses': [],
                },
                'sales_count': 0,
                'recent_sales': [],
                'as_of': today.isoformat(),
            })

        # --- ACTIVE LOADED SHIFT ---
        # Stock calculations from StockMovement starting from this Delivery Note
        first_dn_sm = StockMovement.objects.filter(
            RouteVehicleDriverId=allocation_id,
            ReferenceId=latest_dn.DeliveryNoteId,
            TransactionType='DELIVERY_NOTE'
        ).order_by('StockMovementId').first()

        base_movs = StockMovement.objects.filter(
            CompanyId=company_id,
            RouteVehicleDriverId=allocation_id
        )
        if first_dn_sm:
            base_movs = base_movs.filter(StockMovementId__gte=first_dn_sm.StockMovementId)

        dn_in = base_movs.filter(TransactionType='DELIVERY_NOTE').aggregate(s=Sum('InQty'))['s'] or Decimal('0')
        sale_out = base_movs.filter(TransactionType='VAN_SALE').aggregate(s=Sum('OutQty'))['s'] or Decimal('0')
        unload_full = base_movs.filter(TransactionType='VAN_UNLOAD_FULL').aggregate(s=Sum('OutQty'))['s'] or Decimal('0')
        filled_qty = float(max(Decimal('0'), dn_in - sale_out - unload_full))
        allocated_qty = float(dn_in)

        empty_in = base_movs.filter(TransactionType='VAN_EMPTY_RETURN').aggregate(s=Sum('InQty'))['s'] or Decimal('0')
        empty_out = base_movs.filter(TransactionType='VAN_UNLOAD_EMPTY').aggregate(s=Sum('OutQty'))['s'] or Decimal('0')
        empty_qty = float(max(Decimal('0'), empty_in - empty_out))

        # Sales data strictly for THIS active delivery note shift (starts from zero upon allocation)
        shift_sales_qs = Sales.objects.filter(
            CompanyId=company_id,
            RouteVehicleDriver_id=allocation_id,
            CreatedAt__gte=latest_dn.CreatedAt
        ).exclude(Status='CANCELLED')

        delivered_qty = float(shift_sales_qs.aggregate(s=Sum('TotalDeliveredQty'))['s'] or 0)
        return_qty = float(shift_sales_qs.aggregate(s=Sum('TotalEmptyQty'))['s'] or 0)
        total_sales_count = shift_sales_qs.count()

        cash_collection = float(
            shift_sales_qs.filter(PaymentMethod__iexact='Cash').aggregate(s=Sum('PaidAmount'))['s'] or 0
        )
        bank_collection = float(
            shift_sales_qs.filter(
                Q(PaymentMethod__in=['Bank', 'UPI', 'Online', 'Card', 'Digital', 'CHEQUE', 'Cheque'])
                | Q(PaymentMethod__iexact='bank')
                | Q(PaymentMethod__iexact='upi')
            ).aggregate(s=Sum('PaidAmount'))['s'] or 0
        )
        total_collection = float(
            shift_sales_qs.aggregate(s=Sum('PaidAmount'))['s'] or (cash_collection + bank_collection)
        )

        # Expenses strictly for THIS active delivery note shift
        shift_exp_qs = RouteExpense.objects.filter(
            CompanyId=company_id,
            RouteVehicleDriver_id=allocation_id,
            CreatedAt__gte=latest_dn.CreatedAt
        )

        total_expense = float(shift_exp_qs.aggregate(s=Sum('Amount'))['s'] or 0)
        cash_expense = float(shift_exp_qs.filter(PaymentMode='Cash').aggregate(s=Sum('Amount'))['s'] or 0)
        bank_expense = float(shift_exp_qs.filter(PaymentMode__in=['Bank', 'UPI', 'Online']).aggregate(s=Sum('Amount'))['s'] or 0)

        recent_expenses = []
        for exp in shift_exp_qs.order_by('-CreatedAt', '-ExpenseId')[:30]:
            recent_expenses.append({
                'expense_id': exp.ExpenseId,
                'category': exp.Category,
                'amount': float(exp.Amount or 0),
                'payment_mode': exp.PaymentMode or 'Cash',
                'notes': exp.Notes or '',
                'time': exp.CreatedAt.strftime('%I:%M %p') if exp.CreatedAt else '',
                'created_at': exp.CreatedAt.isoformat() if exp.CreatedAt else '',
            })

        # Also check for direct Payment entries under Travelling Expense for this active shift
        linked_pmt_ids = set(shift_exp_qs.exclude(Payment__isnull=True).values_list('Payment_id', flat=True))
        travel_pmts = Payment.objects.filter(
            Q(PartyLedger__LedgerName__icontains='travel')
            | Q(PartyLedger_id=31)
            | Q(PartyLedger__LedgerName__icontains='trip')
            | Q(PartyLedger__LedgerName__icontains='fuel'),
            CreatedAt__gte=latest_dn.CreatedAt
        ).exclude(PaymentId__in=linked_pmt_ids)

        all_routes = list(Route.objects.filter(CompanyId=company_id, IsActive=True))
        active_alloc_route_ids = set(
            RouteVehicleDriver.objects.filter(CompanyId=company_id, IsActive=True)
            .values_list('Route_id', flat=True)
        )

        for p in travel_pmts.prefetch_related('lines').order_by('-PaymentId'):
            narr = (p.Narration or '').lower()
            other_route = any(
                r.RouteId != route.RouteId and r.RouteName.lower() in narr
                for r in all_routes
            )
            if other_route:
                continue

            matched = (
                route.RouteName.lower() in narr
                or (vehicle_number and vehicle_number != 'Not Assigned' and vehicle_number.lower() in narr)
                or (driver_name and driver_name != 'Not Assigned' and driver_name.lower() in narr)
                or (len(active_alloc_route_ids) <= 1 and route.RouteId in active_alloc_route_ids)
            )

            if matched:
                p_amt = float(p.Amount or 0)
                total_expense += p_amt
                first_line = p.lines.first()
                p_mode = first_line.PaymentMode if first_line else 'Cash'
                if p_mode.lower() == 'cash':
                    cash_expense += p_amt
                else:
                    bank_expense += p_amt
                recent_expenses.append({
                    'expense_id': f"PMT-{p.PaymentId}",
                    'category': p.PartyLedger.LedgerName if p.PartyLedger else 'Travelling Expense',
                    'amount': p_amt,
                    'payment_mode': p_mode,
                    'notes': p.Narration or f"Payment #{p.PaymentId}",
                    'time': p.CreatedAt.strftime('%I:%M %p') if p.CreatedAt else '',
                    'created_at': p.CreatedAt.isoformat() if p.CreatedAt else '',
                })

        net_collection = total_collection - total_expense
        net_cash = cash_collection - cash_expense
        net_bank = bank_collection - bank_expense

        # Recent live sales feed (last 20 deliveries on this active shift)
        recent_sales = []
        for s in shift_sales_qs.select_related('CustomerLedger').prefetch_related('lines__Product').order_by('-SalesId')[:20]:
            line_items = []
            for ln in s.lines.all():
                line_items.append({
                    'product_name': ln.ProductName or (ln.Product.ProductName if ln.Product else ''),
                    'quantity': float(ln.Quantity or 0),
                    'empty_quantity': float(ln.EmptyQuantity or 0),
                    'rate': float(ln.SalesPrice or 0),
                    'total': float(ln.Total or 0),
                })
            bill_no = s.InvoiceNo or s.SalesNo or f"#{s.SalesId}"
            cust_name = s.CustomerLedger.LedgerName if s.CustomerLedger else 'Walk-in Customer'
            time_str = s.CreatedAt.strftime('%I:%M %p') if s.CreatedAt else ''
            recent_sales.append({
                'sales_id': s.SalesId,
                'sale_id': s.SalesId,
                'sales_no': s.SalesNo or bill_no,
                'invoice_no': s.InvoiceNo or bill_no,
                'bill_number': bill_no,
                'customer': cust_name,
                'customer_name': cust_name,
                'payment_method': s.PaymentMethod or 'Cash',
                'payment_mode': s.PaymentMethod or 'Cash',
                'grand_total': float(s.GrandTotal or 0),
                'paid_amount': float(s.PaidAmount if s.PaidAmount is not None else (s.GrandTotal or 0)),
                'amount': float(s.PaidAmount if s.PaidAmount is not None else (s.GrandTotal or 0)),
                'delivered_qty': float(s.TotalDeliveredQty or 0),
                'empty_qty': float(s.TotalEmptyQty or 0),
                'empty_returned': float(s.TotalEmptyQty or 0),
                'time': time_str,
                'created_at': s.CreatedAt.isoformat() if s.CreatedAt else '',
                'status': s.Status,
                'lines': line_items,
            })

        # Product breakdown for this shift
        product_breakdown = []
        alloc_cyls = Decimal('0.00')
        deliv_cyls = Decimal('0.00')
        bal_cyls = Decimal('0.00')
        empty_cyls = Decimal('0.00')
        other_products_bal = Decimal('0.00')

        p_ids = set(base_movs.values_list('Product_id', flat=True))
        dn_p_ids = set(DeliveryNoteLine.objects.filter(DeliveryNote=latest_dn).values_list('Product_id', flat=True))
        all_shift_p_ids = [pid for pid in p_ids.union(dn_p_ids) if pid is not None]

        products_qs = Product.objects.filter(ProductId__in=all_shift_p_ids).select_related('Category', 'Unit')
        for prod in products_qs:
            is_cyl = getattr(prod, 'IsCylinder', True)
            if is_cyl is None:
                is_cyl = True

            p_dn_in = base_movs.filter(Product=prod, TransactionType='DELIVERY_NOTE').aggregate(s=Sum('InQty'))['s'] or Decimal('0')
            p_sale_out = base_movs.filter(Product=prod, TransactionType='VAN_SALE').aggregate(s=Sum('OutQty'))['s'] or Decimal('0')
            p_unload = base_movs.filter(Product=prod, TransactionType='VAN_UNLOAD_FULL').aggregate(s=Sum('OutQty'))['s'] or Decimal('0')
            p_bal = max(Decimal('0'), p_dn_in - p_sale_out - p_unload)

            p_empty_in = base_movs.filter(Product=prod, TransactionType='VAN_EMPTY_RETURN').aggregate(s=Sum('InQty'))['s'] or Decimal('0')
            p_empty_out = base_movs.filter(Product=prod, TransactionType='VAN_UNLOAD_EMPTY').aggregate(s=Sum('OutQty'))['s'] or Decimal('0')
            p_empty_bal = max(Decimal('0'), p_empty_in - p_empty_out) if is_cyl else Decimal('0')

            if is_cyl:
                alloc_cyls += p_dn_in
                deliv_cyls += p_sale_out
                bal_cyls += p_bal
                empty_cyls += p_empty_bal
            else:
                other_products_bal += p_bal

            product_breakdown.append({
                'ProductId': prod.ProductId,
                'ProductName': prod.ProductName,
                'ProductCode': prod.ProductCode or '—',
                'CategoryName': prod.Category.CategoryName if prod.Category else 'General',
                'IsCylinder': is_cyl,
                'AllocatedQty': float(p_dn_in),
                'DeliveredQty': float(p_sale_out),
                'BalanceQty': float(p_bal),
                'EmptyQty': float(p_empty_bal),
                'Qty': float(p_bal) + float(p_empty_bal),
            })

        product_breakdown.sort(key=lambda x: (not x['IsCylinder'], x['ProductName']))

        is_active = True

        return Response({
            'route_id': route.RouteId,
            'route_name': route.RouteName,
            'allocation_id': allocation_id,
            'vehicle': {
                'vehicle_number': vehicle_number or 'Not Assigned',
            },
            'driver': {
                'name': driver_name or 'Not Assigned',
            },
            'status': 'live' if is_active else 'idle',
            'stock': {
                'allocated_quantity': allocated_qty,
                'filled_quantity': filled_qty,
                'empty_quantity': empty_qty,
                'delivered_quantity': delivered_qty,
                'return_quantity': return_qty,
                'allocated_cylinders': float(alloc_cyls),
                'delivered_cylinders': float(deliv_cyls),
                'balance_van_stock': float(bal_cyls),
                'empty_cylinders': float(empty_cyls),
                'other_products': float(other_products_bal),
            },
            'products': product_breakdown,
            'collection': {
                'total_collection': total_collection,
                'cash_collection': cash_collection,
                'bank_collection': bank_collection,
            },
            'expense': {
                'total_expense': total_expense,
                'cash_expense': cash_expense,
                'bank_expense': bank_expense,
                'net_collection': net_collection,
                'net_cash': net_cash,
                'net_bank': net_bank,
                'recent_expenses': recent_expenses,
            },
            'sales_count': total_sales_count,
            'recent_sales': recent_sales,
            'as_of': today.isoformat(),
        })

    @action(detail=True, methods=['post'], url_path='add-expense')
    def add_expense(self, request, pk=None):
        """
        Record a trip expense (e.g. Fuel, Toll, Food, Maintenance) for the route / van.
        Automatically records a double-entry Payment and Voucher debiting the Travelling Expense
        ledger (LedgerId=31) and crediting Cash/Bank accounts.
        """
        route = self.get_object()
        company_id = getattr(request.user, 'CompanyId', 1) or 1

        alloc = (
            RouteVehicleDriver.objects
            .filter(CompanyId=company_id, Route=route, IsActive=True)
            .select_related('Vehicle', 'Driver')
            .order_by('-RouteVehicleDriverId')
            .first()
        )

        category = request.data.get('category', '').strip() or 'Other'
        try:
            amount = Decimal(str(request.data.get('amount', 0)))
        except Exception:
            return Response({'detail': 'Invalid expense amount.'}, status=status.HTTP_400_BAD_REQUEST)

        if amount <= 0:
            return Response({'detail': 'Amount must be greater than zero.'}, status=status.HTTP_400_BAD_REQUEST)

        payment_mode = request.data.get('payment_mode', 'Cash').strip() or 'Cash'
        notes = request.data.get('notes', '').strip()

        with transaction.atomic():
            # DO NOT post Payment or Voucher here! Only create RouteExpense.
            # Financial accounting vouchers are posted only upon End-Shift settlement approval.
            expense = RouteExpense.objects.create(
                CompanyId=company_id,
                Route=route,
                RouteVehicleDriver=alloc,
                Driver=alloc.Driver if alloc else None,
                Vehicle=alloc.Vehicle if alloc else None,
                Payment=None,
                ExpenseDate=date.today(),
                Category=category,
                Amount=amount,
                PaymentMode=payment_mode,
                Notes=notes,
            )

        return Response({
            'status': 'success',
            'expense_id': expense.ExpenseId,
            'category': expense.Category,
            'amount': float(expense.Amount),
            'payment_mode': expense.PaymentMode,
            'notes': expense.Notes,
            'time': expense.CreatedAt.strftime('%I:%M %p') if expense.CreatedAt else '',
            'ledger': 'Travelling Expense',
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path='delete-expense/(?P<expense_id>[^/.]+)')
    def delete_expense(self, request, pk=None, expense_id=None):
        """
        Delete a trip expense and reverse its double-entry ledger voucher.
        """
        route = self.get_object()
        company_id = getattr(request.user, 'CompanyId', 1) or 1
        with transaction.atomic():
            if str(expense_id).startswith('PMT-'):
                pmt_id = str(expense_id).replace('PMT-', '')
                try:
                    pmt = Payment.objects.get(PaymentId=pmt_id)
                    affected_ledgers = set()
                    if pmt.PartyLedger:
                        affected_ledgers.add(pmt.PartyLedger.LedgerId)
                    for pl in pmt.lines.all():
                        if pl.Ledger:
                            affected_ledgers.add(pl.Ledger.LedgerId)
                    vouchers = Voucher.objects.filter(ReferenceTable='Payment', ReferenceId=pmt.PaymentId)
                    for v in vouchers:
                        v.lines.all().delete()
                    vouchers.delete()
                    pmt.lines.all().delete()
                    pmt.delete()
                    if affected_ledgers:
                        sync_ledger_balances(*affected_ledgers)
                    return Response({'status': 'deleted'})
                except Payment.DoesNotExist:
                    return Response({'detail': 'Payment not found.'}, status=status.HTTP_404_NOT_FOUND)

            try:
                exp = RouteExpense.objects.get(ExpenseId=expense_id, CompanyId=company_id, Route=route)
                if exp.Payment:
                    pmt = exp.Payment
                    affected_ledgers = set()
                    if pmt.PartyLedger:
                        affected_ledgers.add(pmt.PartyLedger.LedgerId)
                    for pl in pmt.lines.all():
                        if pl.Ledger:
                            affected_ledgers.add(pl.Ledger.LedgerId)
                    vouchers = Voucher.objects.filter(ReferenceTable='Payment', ReferenceId=pmt.PaymentId)
                    for v in vouchers:
                        v.lines.all().delete()
                    vouchers.delete()
                    pmt.lines.all().delete()
                    pmt.delete()
                    if affected_ledgers:
                        sync_ledger_balances(*affected_ledgers)
                exp.delete()
                return Response({'status': 'deleted'})
            except RouteExpense.DoesNotExist:
                return Response({'detail': 'Expense not found.'}, status=status.HTTP_404_NOT_FOUND)


class RouteVehicleDriverViewSet(viewsets.ModelViewSet):
    """
    CRUD API for Route-Vehicle-Driver Allocations scoped to the logged-in user's company.
    """
    serializer_class = RouteVehicleDriverSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = (
            RouteVehicleDriver.objects
            .filter(CompanyId=self.request.user.CompanyId)
            .select_related('Route', 'Vehicle', 'Driver')
            .order_by('-RouteVehicleDriverId')
        )
        driver_id = self.request.query_params.get('DriverId') or self.request.query_params.get('driver_id')
        if driver_id == 'me':
            driver_id = getattr(self.request.user, 'DriverId', None)
        if driver_id:
            qs = qs.filter(Driver_id=driver_id)
        is_active = self.request.query_params.get('IsActive') or self.request.query_params.get('is_active')
        if is_active is not None:
            qs = qs.filter(IsActive=(is_active.lower() == 'true'))
        return qs


    @action(detail=False, methods=['get'])
    def current(self, request):
        """
        Returns the active route-vehicle allocation for the requesting driver/user.
        """
        driver_id = request.query_params.get('DriverId') or request.query_params.get('driver_id')
        if not driver_id or driver_id == 'me':
            driver_id = getattr(request.user, 'DriverId', None)
            if not driver_id:
                matched = Driver.objects.filter(CompanyId=request.user.CompanyId, DriverName__iexact=request.user.Username).first()
                if matched:
                    driver_id = matched.DriverId

        qs = (
            RouteVehicleDriver.objects
            .filter(CompanyId=request.user.CompanyId)
            .select_related('Route', 'Vehicle', 'Driver')
            .order_by('-RouteVehicleDriverId')
        )
        if driver_id:
            qs = qs.filter(Driver_id=driver_id)

        alloc = qs.filter(IsActive=True).first() or qs.first()
        if alloc:
            return Response(self.get_serializer(alloc).data)
        return Response(None, status=status.HTTP_200_OK)

    def perform_create(self, serializer):
        serializer.save(CompanyId=self.request.user.CompanyId)

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except Exception:
            return Response(
                {"detail": "Cannot delete this allocation record."},
                status=status.HTTP_400_BAD_REQUEST
            )


class UserViewSet(viewsets.ModelViewSet):
    """
    CRUD API for Staff Users scoped to the logged-in user's company.
    Restricted to Administrator and Manager roles.
    """
    serializer_class = UserManagementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        role_name = getattr(self.request.user.UserRole, 'RoleName', '')
        if role_name not in ('Administrator', 'Manager'):
            return User.objects.none()
        return (
            User.objects
            .filter(CompanyId=self.request.user.CompanyId)
            .select_related('UserRole')
            .order_by('-UserId')
        )

    def create(self, request, *args, **kwargs):
        role_name = getattr(request.user.UserRole, 'RoleName', '')
        if role_name not in ('Administrator', 'Manager'):
            return Response(
                {"detail": "Only Administrator and Manager can create staff users."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.UserId == request.user.UserId:
            return Response(
                {"detail": "You cannot delete your own user account."},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            return super().destroy(request, *args, **kwargs)
        except Exception:
            return Response(
                {"detail": "Cannot delete this user because it is referenced by other records."},
                status=status.HTTP_400_BAD_REQUEST
            )


class CategoryViewSet(viewsets.ModelViewSet):
    """
    CRUD API for Categories scoped to the logged-in user's company.
    """
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return (
            Category.objects
            .filter(CompanyId=self.request.user.CompanyId)
            .select_related('ParentCategory')
            .order_by('CategoryName')
        )

    def perform_create(self, serializer):
        serializer.save(CompanyId=self.request.user.CompanyId)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        block_reason = serializer.get_delete_block_reason(instance)
        if block_reason:
            return Response({"detail": block_reason}, status=status.HTTP_400_BAD_REQUEST)
        try:
            return super().destroy(request, *args, **kwargs)
        except Exception:
            return Response(
                {"detail": "Cannot delete this category because it is referenced by other records."},
                status=status.HTTP_400_BAD_REQUEST
            )


class UnitViewSet(viewsets.ModelViewSet):
    """
    CRUD API for Measurement Units scoped to company or system.
    """
    serializer_class = UnitSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return (
            Unit.objects
            .filter(CompanyId__in=[0, self.request.user.CompanyId])
            .order_by('UnitName')
        )

    def perform_create(self, serializer):
        serializer.save(CompanyId=self.request.user.CompanyId)


class ProductViewSet(viewsets.ModelViewSet):
    """
    CRUD API for Products scoped to the logged-in user's company.
    """
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return (
            Product.objects
            .filter(CompanyId=self.request.user.CompanyId)
            .select_related('Category', 'Unit', 'AltUnit')
            .order_by('ProductName')
        )

    def perform_create(self, serializer):
        serializer.save(CompanyId=self.request.user.CompanyId)

    def perform_update(self, serializer):
        instance = serializer.instance
        old_sales_price = instance.SalesPrice
        updated_instance = serializer.save()
        new_sales_price = updated_instance.SalesPrice

        if old_sales_price != new_sales_price:
            user = self.request.user if (self.request.user and self.request.user.is_authenticated) else None
            role_id = getattr(user, 'UserRole_id', None) if user else None
            company_id = getattr(user, 'CompanyId', 0) if user else 0

            ProductPriceAudit.objects.create(
                Product=updated_instance,
                ProductName=updated_instance.ProductName,
                OldSalesPrice=old_sales_price,
                NewSalesPrice=new_sales_price,
                User=user,
                Role_id=role_id,
                CompanyId=company_id
            )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        block_reason = serializer.get_delete_block_reason(instance)
        if block_reason:
            return Response({"detail": block_reason}, status=status.HTTP_400_BAD_REQUEST)
        try:
            return super().destroy(request, *args, **kwargs)
        except Exception:
            return Response(
                {"detail": "Cannot delete this product because it is referenced by other transactions."},
                status=status.HTTP_400_BAD_REQUEST
            )


class ProductPriceAuditViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Audit log endpoint to view product price change history.
    """
    serializer_class = ProductPriceAuditSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = (
            ProductPriceAudit.objects
            .filter(CompanyId=self.request.user.CompanyId)
            .select_related('Product', 'User', 'Role')
            .order_by('-CreatedTimestamp')
        )
        product_id = self.request.query_params.get('product_id')
        if product_id:
            qs = qs.filter(Product_id=product_id)
        return qs


class GroupViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only list of chart of accounts groups (e.g. Sundry Debtors, Bank Accounts, etc.)
    """
    serializer_class = GroupSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        company_id = self.request.user.CompanyId
        from django.db.models import Q
        return Group.objects.filter(Q(CompanyId=company_id) | Q(CompanyId=0)).select_related('ParentGroup').order_by('SortOrder', 'GroupName')


class LedgerViewSet(viewsets.ModelViewSet):
    """
    CRUD API for Ledgers scoped to the active company.
    """
    serializer_class = LedgerSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_permissions(self):
        if self.action in ['customers', 'suppliers', 'list'] and (
            self.request.query_params.get('AccountType', '').upper() in ('CUSTOMER', 'DEBTOR', 'SUNDRY_DEBTOR')
            or self.request.query_params.get('is_customer')
            or self.action in ['customers', 'suppliers']
        ):
            return [AllowAny()]
        return super().get_permissions()

    def get_queryset(self):
        user = getattr(self.request, 'user', None)
        company_id = getattr(user, 'CompanyId', 1) or 1

        qs = (
            Ledger.objects
            .filter(CompanyId=company_id)
            .select_related('Group')
            .order_by('LedgerName')
        )

        # Optional group filter
        group_id = self.request.query_params.get('group')
        if group_id:
            qs = qs.filter(Group_id=group_id)

        # Optional nature filter (Asset, Liability, Income, Expense)
        nature = self.request.query_params.get('nature')
        if nature:
            qs = qs.filter(Group__Nature=nature)

        # Optional customer / debtor filter (for Mobile Driver App & Sundry Debtors)
        acc_type = self.request.query_params.get('AccountType') or self.request.query_params.get('account_type')
        is_customer = self.request.query_params.get('is_customer')
        if is_customer or (acc_type and acc_type.upper() in ('CUSTOMER', 'DEBTOR', 'SUNDRY_DEBTOR')):
            qs = qs.filter(Q(Group__GroupName__icontains='debtor') | Q(Group__GroupName__icontains='customer'))

        # Optional supplier / creditor filter (Strictly excluding Sundry Debtors)
        is_supplier = self.request.query_params.get('is_supplier')
        if is_supplier or (acc_type and acc_type.upper() in ('SUPPLIER', 'CREDITOR', 'SUNDRY_CREDITOR')):
            qs = qs.filter(
                Q(Group_id__in=[16, 17, 24, 25]) |
                Q(Group__GroupName__icontains='creditor') |
                Q(Group__GroupName__icontains='cash') |
                Q(Group__GroupName__icontains='bank')
            ).exclude(Q(Group_id=21) | Q(Group__GroupName__icontains='debtor') | Q(Group__GroupName__icontains='customer'))

        return qs


    @action(detail=False, methods=['get'], url_path='suppliers', permission_classes=[AllowAny])
    def suppliers(self, request):
        """
        Specialized endpoint returning Sundry Creditors, Bank, and Cash accounts for purchases.
        Strictly excludes Sundry Debtors (Customers).
        """
        user = getattr(request, 'user', None)
        company_id = getattr(user, 'CompanyId', 1) or 1
        allowed_groups = [16, 17, 24, 25]
        supplier_ledgers = (
            Ledger.objects.filter(CompanyId=company_id)
            .filter(
                Q(Group_id__in=allowed_groups) |
                Q(Group__GroupName__icontains='creditor') |
                Q(Group__GroupName__icontains='cash') |
                Q(Group__GroupName__icontains='bank')
            )
            .exclude(Q(Group_id=21) | Q(Group__GroupName__icontains='debtor') | Q(Group__GroupName__icontains='customer'))
            .select_related('Group')
            .order_by('LedgerName')
        )
        data = []
        for l in supplier_ledgers:
            data.append({
                'LedgerId': l.LedgerId,
                'LedgerName': l.LedgerName,
                'Group': l.Group_id,
                'group_id': l.Group_id,
                'GroupName': l.Group.GroupName if l.Group else 'Sundry Creditors',
                'group_name': l.Group.GroupName if l.Group else 'Sundry Creditors',
                'GSTIN': getattr(l, 'GSTIN', '') or '',
                'StateId': getattr(l, 'StateId', None),
                'MobileNumber': getattr(l, 'MobileNumber', '') or '',
                'PhoneNumber': getattr(l, 'PhoneNumber', '') or '',
                'AddressLine1': getattr(l, 'AddressLine1', '') or '',
                'City': getattr(l, 'City', '') or '',
                'Pincode': getattr(l, 'Pincode', '') or '',
            })
        return Response(data)

    @action(detail=False, methods=['get'], url_path='customers', permission_classes=[AllowAny])
    def customers(self, request):
        """
        Specialized endpoint returning Sundry Debtors (Customers) for driver mobile app.
        Includes contact details and current outstanding balance.
        """
        user = getattr(request, 'user', None)
        company_id = getattr(user, 'CompanyId', 1) or 1
        debtor_ledgers = (
            Ledger.objects.filter(CompanyId=company_id)
            .filter(Q(Group__GroupName__icontains='debtor') | Q(Group__GroupName__icontains='customer'))
            .select_related('Group')
            .order_by('LedgerName')
        )
        data = []
        for l in debtor_ledgers:
            data.append({
                'LedgerId': l.LedgerId,
                'LedgerName': l.LedgerName,
                'GroupName': l.Group.GroupName if l.Group else 'Sundry Debtors',
                'Phone': (getattr(l, 'MobileNumber', '') or getattr(l, 'PhoneNumber', '') or ''),
                'MobileNumber': getattr(l, 'MobileNumber', '') or '',
                'PhoneNumber': getattr(l, 'PhoneNumber', '') or '',
                'AddressLine1': getattr(l, 'AddressLine1', '') or '',
                'CurrentBalance': float(l.CurrentBalance or 0),
                'BalanceType': 'DR' if (l.CurrentBalance or 0) > 0 else ('CR' if (l.CurrentBalance or 0) < 0 else '')
            })
        return Response(data)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        if response.status_code == status.HTTP_201_CREATED:
            bills = request.data.get('bills') or request.data.get('ledger_lines', [])
            ledger_id = response.data.get('LedgerId')
            company_id = getattr(request.user, 'CompanyId', 0)
            for b in bills:
                b_no = str(b.get('BillNo') or '').strip()
                try:
                    amt = Decimal(str(b.get('Amount') or 0))
                except Exception:
                    amt = Decimal('0.00')
                if b_no and amt > 0:
                    b_date = safe_parse_date(b.get('BillDate')) or date.today()
                    d_date = safe_parse_date(b.get('DueDate'))
                    LedgerLine.objects.create(
                        Ledger_id=ledger_id,
                        BillNo=b_no,
                        BillDate=b_date,
                        DueDate=d_date,
                        Amount=amt,
                        Narration=str(b.get('Narration') or '').strip(),
                        CompanyId=company_id
                    )
        return response

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            bills = request.data.get('bills')
            if bills is not None:
                ledger_id = response.data.get('LedgerId')
                company_id = getattr(request.user, 'CompanyId', 0)
                LedgerLine.objects.filter(Ledger_id=ledger_id).delete()
                for b in bills:
                    b_no = str(b.get('BillNo') or '').strip()
                    try:
                        amt = Decimal(str(b.get('Amount') or 0))
                    except Exception:
                        amt = Decimal('0.00')
                    if b_no and amt > 0:
                        b_date = safe_parse_date(b.get('BillDate')) or date.today()
                        d_date = safe_parse_date(b.get('DueDate'))
                        LedgerLine.objects.create(
                            Ledger_id=ledger_id,
                            BillNo=b_no,
                            BillDate=b_date,
                            DueDate=d_date,
                            Amount=amt,
                            Narration=str(b.get('Narration') or '').strip(),
                            CompanyId=company_id
                        )
        return response

    def perform_create(self, serializer):
        op_bal = serializer.validated_data.get('OpeningBalance') or 0
        op_type = serializer.validated_data.get('OpeningBalanceType') or 'DR'

        dr_bal = serializer.validated_data.get('DebitBalance')
        cr_bal = serializer.validated_data.get('CreditBalance')
        curr_bal = serializer.validated_data.get('CurrentBalance')

        if dr_bal is None:
            dr_bal = op_bal if op_type == 'DR' else 0
        if cr_bal is None:
            cr_bal = op_bal if op_type == 'CR' else 0
        if curr_bal is None:
            curr_bal = op_bal if op_type == 'DR' else -op_bal

        instance = serializer.save(
            CompanyId=self.request.user.CompanyId,
            CurrentBalance=curr_bal,
            DebitBalance=dr_bal,
            CreditBalance=cr_bal,
            IsSystem=False
        )
        sync_ledger_balances(instance.LedgerId)

    def perform_update(self, serializer):
        instance = serializer.instance
        dr_bal = serializer.validated_data.get('DebitBalance', instance.DebitBalance)
        cr_bal = serializer.validated_data.get('CreditBalance', instance.CreditBalance)
        curr_bal = serializer.validated_data.get('CurrentBalance', instance.CurrentBalance)

        serializer.save(
            CurrentBalance=curr_bal,
            DebitBalance=dr_bal,
            CreditBalance=cr_bal,
        )
        sync_ledger_balances(instance.LedgerId)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        block_reason = serializer.get_delete_block_reason(instance)
        if block_reason:
            return Response({"detail": block_reason}, status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['post'], url_path='bulk-import')
    def bulk_import(self, request):
        """
        Bulk import complete ledger records with optional opening bills from a single Excel/CSV payload.
        Payload: { "ledgers": [ { "LedgerName": "...", "GroupName": "...", "OpeningBalance": 1000, "OpeningBalanceType": "DR", "bills": [...] }, ... ] }
        """
        ledgers_data = request.data.get('ledgers', [])
        if not ledgers_data or not isinstance(ledgers_data, list):
            return Response({'detail': 'Please provide a non-empty "ledgers" array.'}, status=status.HTTP_400_BAD_REQUEST)

        company_id = getattr(request.user, 'CompanyId', 0)

        # Pre-fetch existing groups and states for fast lookup
        from django.db.models import Q
        groups = {g.GroupName.strip().lower(): g for g in Group.objects.filter(Q(CompanyId=company_id) | Q(CompanyId=0))}
        states_by_name = {s.StateName.strip().lower(): s.StateId for s in State.objects.all()}
        states_by_code = {s.GSTStateCode.strip(): s.StateId for s in State.objects.all() if s.GSTStateCode}

        default_group = groups.get('sundry debtors') or groups.get('sundry creditors') or list(groups.values())[0]

        created_count = 0
        updated_count = 0
        total_bills_count = 0
        errors = []

        with transaction.atomic():
            for idx, item in enumerate(ledgers_data):
                ledger_name = str(item.get('LedgerName') or '').strip()
                if not ledger_name:
                    errors.append({'row': idx + 1, 'error': 'Ledger name is missing or blank.'})
                    continue

                # 1. Match Group
                group_val = str(item.get('GroupName') or item.get('Group') or '').strip().lower()
                matched_group = groups.get(group_val)
                if not matched_group:
                    for gname, gobj in groups.items():
                        if group_val and (group_val in gname or gname in group_val):
                            matched_group = gobj
                            break
                if not matched_group:
                    matched_group = default_group

                # 2. Match State
                state_val = str(item.get('State') or item.get('StateName') or '').strip()
                state_id = item.get('StateId')
                if not state_id and state_val:
                    state_id = states_by_name.get(state_val.lower()) or states_by_code.get(state_val)

                # 3. Opening balance & type
                try:
                    op_bal = Decimal(str(item.get('OpeningBalance') or 0))
                except Exception:
                    op_bal = Decimal('0.00')

                op_type = str(item.get('OpeningBalanceType') or 'DR').strip().upper()
                if op_type not in ('DR', 'CR'):
                    op_type = 'DR'

                bills = item.get('bills', [])
                if isinstance(bills, list) and bills:
                    # If op_bal is 0 and bills exist, calculate total from bills
                    if op_bal == 0:
                        sum_bills = Decimal('0.00')
                        for b in bills:
                            try:
                                sum_bills += Decimal(str(b.get('Amount') or 0))
                            except Exception:
                                pass
                        if sum_bills > 0:
                            op_bal = sum_bills

                # 4. Find existing ledger by name or create
                ledger = Ledger.objects.filter(LedgerName__iexact=ledger_name, CompanyId=company_id).first()
                is_new = False
                if not ledger:
                    is_new = True
                    ledger = Ledger(
                        LedgerName=ledger_name,
                        CompanyId=company_id,
                        IsSystem=False
                    )

                ledger.Group = matched_group
                ledger.OpeningBalance = op_bal
                ledger.OpeningBalanceType = op_type
                ledger.DebitBalance = op_bal if op_type == 'DR' else Decimal('0.00')
                ledger.CreditBalance = op_bal if op_type == 'CR' else Decimal('0.00')
                ledger.CurrentBalance = op_bal if op_type == 'DR' else -op_bal

                # Optional fields
                ledger.AddressLine1 = str(item.get('AddressLine1') or item.get('Address') or '').strip() or None
                ledger.AddressLine2 = str(item.get('AddressLine2') or '').strip() or None
                ledger.AddressLine3 = str(item.get('AddressLine3') or '').strip() or None
                ledger.City = str(item.get('City') or '').strip() or None
                ledger.Pincode = str(item.get('Pincode') or item.get('Pin') or '').strip() or None
                ledger.PhoneNumber = str(item.get('PhoneNumber') or item.get('Phone') or '').strip() or None
                ledger.MobileNumber = str(item.get('MobileNumber') or item.get('Mobile') or '').strip() or None
                ledger.Email = str(item.get('Email') or '').strip() or None
                raw_gst_type = str(item.get('GSTRegistrationType') or '').strip().lower()
                if 'comp' in raw_gst_type:
                    gst_type = 'Composition'
                elif 'reg' in raw_gst_type:
                    gst_type = 'Regular'
                elif 'unreg' in raw_gst_type or 'cons' in raw_gst_type:
                    gst_type = 'Unregistered'
                elif item.get('GSTIN'):
                    gst_type = 'Regular'
                else:
                    gst_type = 'Unregistered'
                ledger.GSTRegistrationType = gst_type

                gstin = str(item.get('GSTIN') or '').strip().upper()
                ledger.GSTIN = gstin if len(gstin) == 15 else None

                pan = str(item.get('PAN') or '').strip().upper()
                ledger.PAN = pan if len(pan) == 10 else None

                ledger.IsBillWise = bool(item.get('IsBillWise', True if bills else False))
                try:
                    ledger.CreditPeriodDays = int(item.get('CreditPeriodDays') or 0)
                except Exception:
                    ledger.CreditPeriodDays = 0

                try:
                    ledger.CreditLimit = Decimal(str(item.get('CreditLimit') or 0))
                except Exception:
                    ledger.CreditLimit = Decimal('0.00')

                ledger.Narration = str(item.get('Narration') or '').strip() or None
                ledger.IsActive = bool(item.get('IsActive', True))
                if state_id:
                    ledger.StateId = state_id

                ledger.save()

                if is_new:
                    created_count += 1
                else:
                    updated_count += 1

                # 5. Save Opening Bills into LedgerLine
                if isinstance(bills, list) and bills:
                    LedgerLine.objects.filter(Ledger=ledger).delete()
                    for b in bills:
                        b_no = str(b.get('BillNo') or '').strip()
                        try:
                            amt = Decimal(str(b.get('Amount') or 0))
                        except Exception:
                            amt = Decimal('0.00')
                        if b_no and amt > 0:
                            b_date = safe_parse_date(b.get('BillDate')) or date.today()
                            d_date = safe_parse_date(b.get('DueDate'))
                            LedgerLine.objects.create(
                                Ledger=ledger,
                                BillNo=b_no,
                                BillDate=b_date,
                                DueDate=d_date,
                                Amount=amt,
                                Narration=str(b.get('Narration') or '').strip(),
                                CompanyId=company_id
                            )
                            total_bills_count += 1

                sync_ledger_balances(ledger.LedgerId)

        return Response({
            'success': True,
            'created_count': created_count,
            'updated_count': updated_count,
            'total_bills_count': total_bills_count,
            'errors': errors
        }, status=status.HTTP_200_OK)


class PurchaseViewSet(viewsets.ModelViewSet):
    """
    Multi-table atomic transaction ViewSet for Purchases:
    - Purchase (voucher header)
    - PurchaseLine (item lines)
    - StockMovement (inwards stock allocation to godown)
    - Voucher (double-entry journal header)
    - VoucherLine (debit/credit accounting entries)
    """
    serializer_class = PurchaseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        company_id = getattr(user, 'CompanyId', 0)
        qs = Purchase.objects.select_related('SupplierLedger').prefetch_related('lines__Product', 'lines__Unit').all()
        if company_id:
            qs = qs.filter(CompanyId=company_id)
        return qs.order_by('-PurchaseDate', '-PurchaseId')

    def _get_system_ledger(self, company_id, group_id):
        ledger = Ledger.objects.filter(Group_id=group_id, CompanyId=company_id).first()
        if not ledger:
            ledger = Ledger.objects.filter(Group_id=group_id).first()
        return ledger

    def _get_ledger_by_name(self, company_id, name, fallback_group_id=None):
        ledger = Ledger.objects.filter(LedgerName__iexact=name, CompanyId=company_id).first()
        if not ledger and fallback_group_id:
            ledger = self._get_system_ledger(company_id, fallback_group_id)
        return ledger


    def create(self, request, *args, **kwargs):
        data = request.data
        lines_data = data.get('lines', [])
        if isinstance(lines_data, str):
            try:
                import json
                lines_data = json.loads(lines_data)
            except Exception:
                pass
        if not lines_data:
            return Response({'detail': 'Please add at least one line item.'}, status=status.HTTP_400_BAD_REQUEST)

        supplier_id = data.get('SupplierLedgerId')
        if not supplier_id:
            return Response({'detail': 'Supplier / Party Ledger is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate that the selected supplier is Sundry Creditor, Bank, or Cash (Strictly NO Sundry Debtors)
        supplier_ledger = Ledger.objects.filter(LedgerId=supplier_id).first()
        if not supplier_ledger:
            return Response({'detail': 'Selected supplier ledger does not exist.'}, status=status.HTTP_400_BAD_REQUEST)

        ALLOWED_PURCHASE_GROUPS = [16, 17, 24, 25]  # Cash, Bank Accounts, Sundry Creditors, Bank OD
        grp_id = supplier_ledger.Group_id
        grp_name = (supplier_ledger.Group.GroupName if supplier_ledger.Group else '').lower()
        if grp_id == 21 or 'debtor' in grp_name or 'customer' in grp_name:
            return Response(
                {'detail': 'Invalid supplier ledger. Sundry Debtors (Customers) cannot be selected as a supplier in a Purchase Invoice. Please select a Sundry Creditor, Bank, or Cash account.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if grp_id and grp_id not in ALLOWED_PURCHASE_GROUPS and 'creditor' not in grp_name and 'cash' not in grp_name and 'bank' not in grp_name:
            return Response(
                {'detail': 'Invalid supplier ledger. Only Sundry Creditors, Bank, or Cash accounts can be selected for purchase invoices.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        company_id = getattr(request.user, 'CompanyId', 1) or 1

        with transaction.atomic():
            sub_total = Decimal(str(data.get('SubTotal') or 0))
            tax_amount = Decimal(str(data.get('TaxAmount') or 0))
            grand_total = Decimal(str(data.get('GrandTotal') or 0))
            round_off = Decimal(str(data.get('RoundOff') or 0))

            purchase_no = data.get('PurchaseNo')
            if not purchase_no or not str(purchase_no).strip():
                existing = Purchase.objects.filter(CompanyId=company_id).values_list('PurchaseNo', flat=True)
                max_num = 0
                for pno in existing:
                    digits = ''.join(c for c in str(pno) if c.isdigit())
                    if digits:
                        try:
                            val = int(digits)
                            if val > max_num:
                                max_num = val
                        except ValueError:
                            pass
                purchase_no = f"{max_num + 1:03d}"
            else:
                digits = ''.join(c for c in str(purchase_no) if c.isdigit())
                purchase_no = digits if digits else "001"

            purchase = Purchase.objects.create(
                PurchaseNo=purchase_no,
                PurchaseDate=data.get('PurchaseDate') or date.today(),
                SupplierLedger_id=supplier_id,
                InvoiceNo=data.get('InvoiceNo') or None,
                InvoiceDate=data.get('InvoiceDate') or None,
                Notes=data.get('Notes') or '',
                SubTotal=sub_total,
                TaxAmount=tax_amount,
                GrandTotal=grand_total,
                RoundOff=round_off,
                CompanyId=company_id,
                SalesOrderNo=data.get('SalesOrderNo') or None,
                SalesOrderDate=data.get('SalesOrderDate') or None,
                DeliveryNo=data.get('DeliveryNo') or None,
                DeliveryDate=data.get('DeliveryDate') or None,
                ModeOfTransport=data.get('ModeOfTransport') or None,
                TruckNo=data.get('TruckNo') or None,
                TransporterName=data.get('TransporterName') or None,
                TankerSealNo=data.get('TankerSealNo') or None,
                EWayBillNo=data.get('EWayBillNo') or None,
                EWayBillValidDate=data.get('EWayBillValidDate') or None,
                PartyName=data.get('PartyName') or None,
                PartyPhone=data.get('PartyPhone') or None,
                PartyAddress=data.get('PartyAddress') or None,
                PartyState=data.get('PartyState') or None,
                PartyPincode=data.get('PartyPincode') or None,
            )

            for idx, item in enumerate(lines_data):
                p_id = item.get('ProductId')
                prod = Product.objects.filter(ProductId=p_id).first() if p_id else None
                qty = Decimal(str(item.get('Quantity') or 0))
                rate = Decimal(str(item.get('CostPrice') or item.get('Rate') or 0))
                tax_pct = Decimal(str(item.get('TaxPercent') or item.get('GSTPercent') or (prod.GSTPercentage if prod else 0) or 0))
                alt_unit_id = item.get('AltUnitId') or (prod.AltUnit_id if prod else None)
                unit_conv = Decimal(str(item.get('UnitConversion') or (prod.UnitConversion if prod else 1) or 1))
                alt_qty = Decimal(str(item.get('AltQuantity') or 0))

                if alt_qty > 0:
                    calc_qty = alt_qty
                elif alt_unit_id and unit_conv and unit_conv > 0 and unit_conv != Decimal('1'):
                    calc_qty = qty * unit_conv
                else:
                    calc_qty = qty

                taxable = Decimal(str(item.get('TaxableAmount') if item.get('TaxableAmount') is not None else (calc_qty * rate)))
                line_tax = Decimal(str(item.get('TaxAmount') if item.get('TaxAmount') is not None else ((taxable * tax_pct) / Decimal('100'))))
                total = Decimal(str(item.get('Total') if item.get('Total') is not None else (taxable + line_tax)))

                p_line = PurchaseLine.objects.create(
                    Purchase=purchase,
                    LineNo=idx + 1,
                    Product_id=p_id,
                    ProductName=item.get('ProductName') or (prod.ProductName if prod else ''),
                    Unit_id=item.get('UnitId') or (prod.Unit_id if prod else 1),
                    AltUnitId=alt_unit_id,
                    UnitConversion=Decimal(str(item.get('UnitConversion') or 1)),
                    CostPrice=rate,
                    TaxPercent=tax_pct,
                    TaxAmount=line_tax,
                    Quantity=qty,
                    Total=total,
                    DiscPercent=Decimal(str(item.get('DiscPercent') or 0)),
                    DiscAmount=Decimal(str(item.get('DiscAmount') or 0)),
                    CompanyId=company_id,
                )

                # StockMovement: Allocate to godown RouteVehicleDriverId=1
                StockMovement.objects.create(
                    CompanyId=company_id,
                    Product_id=p_id,
                    Unit_id=p_line.Unit_id,
                    AltUnitId=alt_unit_id,
                    UnitConversion=Decimal(str(item.get('UnitConversion') or 1)),
                    RouteVehicleDriverId=1,
                    TransactionType='PURCHASE',
                    ReferenceId=purchase.PurchaseId,
                    ReferenceLineId=p_line.PurchaseLineId,
                    TransactionNo=purchase.PurchaseNo,
                    TransactionDate=purchase.PurchaseDate,
                    InQty=qty,
                    InCostRate=rate,
                    InCostAmount=taxable,
                    OutQty=0,
                    Narration=f"Purchase {purchase.PurchaseNo}: {item.get('ProductName', '')}",
                )

            # Accounting Voucher
            voucher = Voucher.objects.create(
                VoucherNo=f"PUR-VCH-{purchase.PurchaseId}",
                VoucherDate=purchase.PurchaseDate,
                VoucherType='PURCHASE',
                ReferenceTable='Purchase',
                ReferenceId=purchase.PurchaseId,
                CompanyId=company_id,
                Narration=f"Purchase Inv #{purchase.InvoiceNo or purchase.PurchaseNo} from {purchase.SupplierLedger.LedgerName}",
                IsCancelled=False,
            )

            purchase_ledger = self._get_ledger_by_name(company_id, "Purchase", fallback_group_id=11)
            cgst_input_ledger = self._get_ledger_by_name(company_id, "CGST Input", fallback_group_id=3)
            sgst_input_ledger = self._get_ledger_by_name(company_id, "SGST Input", fallback_group_id=3)
            igst_input_ledger = self._get_ledger_by_name(company_id, "IGST Input", fallback_group_id=3)
            round_ledger = self._get_ledger_by_name(company_id, "Round Off", fallback_group_id=15)

            # Determine tax split
            cgst_amt = Decimal(str(data.get('CGSTAmount') or 0))
            sgst_amt = Decimal(str(data.get('SGSTAmount') or 0))
            igst_amt = Decimal(str(data.get('IGSTAmount') or 0))

            if cgst_amt == 0 and sgst_amt == 0 and igst_amt == 0 and tax_amount > 0:
                supplier = purchase.SupplierLedger
                is_intra = (not supplier or not supplier.StateId or supplier.StateId in [12, 32])
                if is_intra:
                    cgst_amt = (tax_amount / Decimal('2')).quantize(Decimal('0.01'))
                    sgst_amt = tax_amount - cgst_amt
                else:
                    igst_amt = tax_amount

            # Line 1: Credit Supplier
            VoucherLine.objects.create(
                Voucher=voucher,
                LineNo=1,
                Ledger_id=supplier_id,
                DebitAmount=Decimal('0.00'),
                CreditAmount=grand_total,
                Narration=f"Purchase {purchase.PurchaseNo}",
            )

            line_no = 2
            # Line 2: Debit Purchase Account
            if purchase_ledger:
                VoucherLine.objects.create(
                    Voucher=voucher,
                    LineNo=line_no,
                    Ledger=purchase_ledger,
                    DebitAmount=sub_total,
                    CreditAmount=Decimal('0.00'),
                    Narration=f"Purchase {purchase.PurchaseNo} goods",
                )
                line_no += 1

            # Line 3: Debit CGST Input
            if cgst_amt > 0 and cgst_input_ledger:
                VoucherLine.objects.create(
                    Voucher=voucher,
                    LineNo=line_no,
                    Ledger=cgst_input_ledger,
                    DebitAmount=cgst_amt,
                    CreditAmount=Decimal('0.00'),
                    Narration=f"CGST Input on {purchase.PurchaseNo}",
                )
                line_no += 1

            # Line 4: Debit SGST Input
            if sgst_amt > 0 and sgst_input_ledger:
                VoucherLine.objects.create(
                    Voucher=voucher,
                    LineNo=line_no,
                    Ledger=sgst_input_ledger,
                    DebitAmount=sgst_amt,
                    CreditAmount=Decimal('0.00'),
                    Narration=f"SGST Input on {purchase.PurchaseNo}",
                )
                line_no += 1

            # Line 5: Debit IGST Input
            if igst_amt > 0 and igst_input_ledger:
                VoucherLine.objects.create(
                    Voucher=voucher,
                    LineNo=line_no,
                    Ledger=igst_input_ledger,
                    DebitAmount=igst_amt,
                    CreditAmount=Decimal('0.00'),
                    Narration=f"IGST Input on {purchase.PurchaseNo}",
                )
                line_no += 1

            # Line 6: Round off adjustment
            if round_off != 0 and round_ledger:
                if round_off > 0:
                    VoucherLine.objects.create(
                        Voucher=voucher,
                        LineNo=line_no,
                        Ledger=round_ledger,
                        DebitAmount=round_off,
                        CreditAmount=Decimal('0.00'),
                        Narration="Round off adjustment",
                    )
                else:
                    VoucherLine.objects.create(
                        Voucher=voucher,
                        LineNo=line_no,
                        Ledger=round_ledger,
                        DebitAmount=Decimal('0.00'),
                        CreditAmount=abs(round_off),
                        Narration="Round off adjustment",
                    )

            # Sync All Involved Ledgers (Double-Entry Balance)
            affected_ledgers = {supplier_id}
            for l in [purchase_ledger, cgst_input_ledger, sgst_input_ledger, igst_input_ledger, round_ledger]:
                if l:
                    affected_ledgers.add(l.LedgerId)
            sync_ledger_balances(*affected_ledgers)

        serializer = self.get_serializer(purchase)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        data = request.data
        lines_data = data.get('lines', [])
        if isinstance(lines_data, str):
            try:
                import json
                lines_data = json.loads(lines_data)
            except Exception:
                pass
        if not lines_data:
            return Response({'detail': 'Please add at least one line item.'}, status=status.HTTP_400_BAD_REQUEST)

        company_id = instance.CompanyId or getattr(request.user, 'CompanyId', 1) or 1
        supplier_id = data.get('SupplierLedgerId') or instance.SupplierLedger_id
        if supplier_id:
            supplier_ledger = Ledger.objects.filter(LedgerId=supplier_id).first()
            if supplier_ledger:
                ALLOWED_PURCHASE_GROUPS = [16, 17, 24, 25]
                grp_id = supplier_ledger.Group_id
                grp_name = (supplier_ledger.Group.GroupName if supplier_ledger.Group else '').lower()
                if grp_id == 21 or 'debtor' in grp_name or 'customer' in grp_name:
                    return Response(
                        {'detail': 'Invalid supplier ledger. Sundry Debtors (Customers) cannot be selected as a supplier in a Purchase Invoice. Please select a Sundry Creditor, Bank, or Cash account.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                if grp_id and grp_id not in ALLOWED_PURCHASE_GROUPS and 'creditor' not in grp_name and 'cash' not in grp_name and 'bank' not in grp_name:
                    return Response(
                        {'detail': 'Invalid supplier ledger. Only Sundry Creditors, Bank, or Cash accounts can be selected for purchase invoices.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

        # Validate that stock from this purchase has not already been dispatched beyond the new quantity
        old_lines_map = {pl.Product_id: Decimal(str(pl.Quantity or 0)) for pl in instance.lines.all() if pl.Product_id}
        for item in lines_data:
            p_id = item.get('ProductId') or item.get('product_id')
            new_qty = Decimal(str(item.get('Quantity') or 0))
            if p_id in old_lines_map:
                old_qty = old_lines_map[p_id]
                if new_qty < old_qty:
                    diff = old_qty - new_qty
                    prod = Product.objects.filter(ProductId=p_id).first()
                    g_movs = StockMovement.objects.filter(
                        CompanyId=company_id,
                        Product_id=p_id,
                        RouteVehicleDriverId=1
                    )
                    f_in = g_movs.filter(
                        TransactionType__in=['PURCHASE', 'GODOWN_RETURN_FULL', 'RECEIPT_NOTE_RETURN']
                    ).aggregate(tot_in=Sum('InQty'))['tot_in'] or Decimal('0.00')
                    f_out = g_movs.filter(
                        TransactionType__in=['DELIVERY_NOTE', 'PURCHASE_RETURN']
                    ).aggregate(tot_out=Sum('OutQty'))['tot_out'] or Decimal('0.00')
                    current_godown_stock = max(Decimal('0.00'), f_in - f_out)
                    if diff > current_godown_stock:
                        p_name = prod.ProductName if prod else 'Item'
                        return Response({
                            'detail': f'Cannot reduce purchase quantity for {p_name} by {diff}: Stock has already been allocated to delivery vans. Current available godown stock is only {current_godown_stock}.'
                        }, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            sub_total = Decimal(str(data.get('SubTotal') or 0))
            tax_amount = Decimal(str(data.get('TaxAmount') or 0))
            grand_total = Decimal(str(data.get('GrandTotal') or 0))
            round_off = Decimal(str(data.get('RoundOff') or 0))

            if 'PurchaseNo' in data and data.get('PurchaseNo'):
                digits = ''.join(c for c in str(data.get('PurchaseNo')) if c.isdigit())
                if digits:
                    instance.PurchaseNo = digits
            instance.PurchaseDate = data.get('PurchaseDate', instance.PurchaseDate)
            instance.SupplierLedger_id = supplier_id
            instance.InvoiceNo = data.get('InvoiceNo', instance.InvoiceNo)
            instance.InvoiceDate = data.get('InvoiceDate', instance.InvoiceDate)
            instance.Notes = data.get('Notes', instance.Notes)
            instance.SubTotal = sub_total
            instance.TaxAmount = tax_amount
            instance.GrandTotal = grand_total
            instance.RoundOff = round_off
            instance.SalesOrderNo = data.get('SalesOrderNo', instance.SalesOrderNo)
            instance.SalesOrderDate = data.get('SalesOrderDate', instance.SalesOrderDate)
            instance.DeliveryNo = data.get('DeliveryNo', instance.DeliveryNo)
            instance.DeliveryDate = data.get('DeliveryDate', instance.DeliveryDate)
            instance.ModeOfTransport = data.get('ModeOfTransport', instance.ModeOfTransport)
            instance.TruckNo = data.get('TruckNo', instance.TruckNo)
            instance.TransporterName = data.get('TransporterName', instance.TransporterName)
            instance.TankerSealNo = data.get('TankerSealNo', instance.TankerSealNo)
            instance.EWayBillNo = data.get('EWayBillNo', instance.EWayBillNo)
            instance.EWayBillValidDate = data.get('EWayBillValidDate', instance.EWayBillValidDate)
            instance.PartyName = data.get('PartyName', instance.PartyName)
            instance.PartyPhone = data.get('PartyPhone', instance.PartyPhone)
            instance.PartyAddress = data.get('PartyAddress', instance.PartyAddress)
            instance.PartyState = data.get('PartyState', instance.PartyState)
            instance.PartyPincode = data.get('PartyPincode', instance.PartyPincode)
            instance.save()

            # Clean old dependent lines & collect affected ledgers
            StockMovement.objects.filter(TransactionType='PURCHASE', ReferenceId=instance.PurchaseId).delete()
            vouchers = Voucher.objects.filter(ReferenceTable='Purchase', ReferenceId=instance.PurchaseId)
            affected_ledger_ids = {supplier_id, instance.SupplierLedger_id}
            for v in vouchers:
                for vl in v.lines.all():
                    if vl.Ledger_id:
                        affected_ledger_ids.add(vl.Ledger_id)
                v.lines.all().delete()
            vouchers.delete()
            instance.lines.all().delete()

            # Recreate lines & stock
            for idx, item in enumerate(lines_data):
                qty = Decimal(str(item.get('Quantity') or 0))
                rate = Decimal(str(item.get('CostPrice') or item.get('Rate') or 0))
                tax_pct = Decimal(str(item.get('TaxPercent') or item.get('GSTPercent') or 0))
                alt_unit_id = item.get('AltUnitId') or item.get('UnitId')
                unit_conv = Decimal(str(item.get('UnitConversion') or 1))
                alt_qty = Decimal(str(item.get('AltQuantity') or 0))

                if alt_qty > 0:
                    calc_qty = alt_qty
                elif alt_unit_id and unit_conv and unit_conv > 0 and unit_conv != Decimal('1'):
                    calc_qty = qty * unit_conv
                else:
                    calc_qty = qty

                taxable = Decimal(str(item.get('TaxableAmount') if item.get('TaxableAmount') is not None else (calc_qty * rate)))
                line_tax = Decimal(str(item.get('TaxAmount') if item.get('TaxAmount') is not None else ((taxable * tax_pct) / Decimal('100'))))
                total = Decimal(str(item.get('Total') if item.get('Total') is not None else (taxable + line_tax)))

                p_line = PurchaseLine.objects.create(
                    Purchase=instance,
                    LineNo=idx + 1,
                    Product_id=item.get('ProductId'),
                    ProductName=item.get('ProductName'),
                    Unit_id=item.get('UnitId'),
                    AltUnitId=alt_unit_id,
                    UnitConversion=Decimal(str(item.get('UnitConversion') or 1)),
                    CostPrice=rate,
                    TaxPercent=tax_pct,
                    TaxAmount=line_tax,
                    Quantity=qty,
                    Total=total,
                    DiscPercent=Decimal(str(item.get('DiscPercent') or 0)),
                    DiscAmount=Decimal(str(item.get('DiscAmount') or 0)),
                    CompanyId=company_id,
                )

                StockMovement.objects.create(
                    CompanyId=company_id,
                    Product_id=item.get('ProductId'),
                    Unit_id=item.get('UnitId'),
                    AltUnitId=alt_unit_id,
                    UnitConversion=Decimal(str(item.get('UnitConversion') or 1)),
                    RouteVehicleDriverId=1,
                    TransactionType='PURCHASE',
                    ReferenceId=instance.PurchaseId,
                    ReferenceLineId=p_line.PurchaseLineId,
                    TransactionNo=instance.PurchaseNo,
                    TransactionDate=instance.PurchaseDate,
                    InQty=qty,
                    InCostRate=rate,
                    InCostAmount=taxable,
                    OutQty=0,
                    Narration=f"Purchase {instance.PurchaseNo}: {item.get('ProductName', '')}",
                )

            # Recreate Voucher
            voucher = Voucher.objects.create(
                VoucherNo=f"PUR-VCH-{instance.PurchaseId}",
                VoucherDate=instance.PurchaseDate,
                VoucherType='PURCHASE',
                ReferenceTable='Purchase',
                ReferenceId=instance.PurchaseId,
                CompanyId=company_id,
                Narration=f"Purchase Inv #{instance.InvoiceNo or instance.PurchaseNo} from {instance.SupplierLedger.LedgerName}",
                IsCancelled=False,
            )

            purchase_ledger = self._get_ledger_by_name(company_id, "Purchase", fallback_group_id=11)
            cgst_input_ledger = self._get_ledger_by_name(company_id, "CGST Input", fallback_group_id=3)
            sgst_input_ledger = self._get_ledger_by_name(company_id, "SGST Input", fallback_group_id=3)
            igst_input_ledger = self._get_ledger_by_name(company_id, "IGST Input", fallback_group_id=3)
            round_ledger = self._get_ledger_by_name(company_id, "Round Off", fallback_group_id=15)

            # Determine tax split
            cgst_amt = Decimal(str(data.get('CGSTAmount') or 0))
            sgst_amt = Decimal(str(data.get('SGSTAmount') or 0))
            igst_amt = Decimal(str(data.get('IGSTAmount') or 0))

            if cgst_amt == 0 and sgst_amt == 0 and igst_amt == 0 and tax_amount > 0:
                supplier = instance.SupplierLedger
                is_intra = (not supplier or not supplier.StateId or supplier.StateId in [12, 32])
                if is_intra:
                    cgst_amt = (tax_amount / Decimal('2')).quantize(Decimal('0.01'))
                    sgst_amt = tax_amount - cgst_amt
                else:
                    igst_amt = tax_amount

            VoucherLine.objects.create(
                Voucher=voucher,
                LineNo=1,
                Ledger_id=supplier_id,
                DebitAmount=Decimal('0.00'),
                CreditAmount=grand_total,
                Narration=f"Purchase {instance.PurchaseNo}",
            )

            line_no = 2
            if purchase_ledger:
                VoucherLine.objects.create(
                    Voucher=voucher,
                    LineNo=line_no,
                    Ledger=purchase_ledger,
                    DebitAmount=sub_total,
                    CreditAmount=Decimal('0.00'),
                    Narration=f"Purchase {instance.PurchaseNo} goods",
                )
                line_no += 1

            if cgst_amt > 0 and cgst_input_ledger:
                VoucherLine.objects.create(
                    Voucher=voucher,
                    LineNo=line_no,
                    Ledger=cgst_input_ledger,
                    DebitAmount=cgst_amt,
                    CreditAmount=Decimal('0.00'),
                    Narration=f"CGST Input on {instance.PurchaseNo}",
                )
                line_no += 1

            if sgst_amt > 0 and sgst_input_ledger:
                VoucherLine.objects.create(
                    Voucher=voucher,
                    LineNo=line_no,
                    Ledger=sgst_input_ledger,
                    DebitAmount=sgst_amt,
                    CreditAmount=Decimal('0.00'),
                    Narration=f"SGST Input on {instance.PurchaseNo}",
                )
                line_no += 1

            if igst_amt > 0 and igst_input_ledger:
                VoucherLine.objects.create(
                    Voucher=voucher,
                    LineNo=line_no,
                    Ledger=igst_input_ledger,
                    DebitAmount=igst_amt,
                    CreditAmount=Decimal('0.00'),
                    Narration=f"IGST Input on {instance.PurchaseNo}",
                )
                line_no += 1

            if round_off != 0 and round_ledger:
                if round_off > 0:
                    VoucherLine.objects.create(
                        Voucher=voucher,
                        LineNo=line_no,
                        Ledger=round_ledger,
                        DebitAmount=round_off,
                        CreditAmount=Decimal('0.00'),
                        Narration="Round off adjustment",
                    )
                else:
                    VoucherLine.objects.create(
                        Voucher=voucher,
                        LineNo=line_no,
                        Ledger=round_ledger,
                        DebitAmount=Decimal('0.00'),
                        CreditAmount=abs(round_off),
                        Narration="Round off adjustment",
                    )

            # Sync All Involved Ledgers (both old and new)
            for l in [purchase_ledger, cgst_input_ledger, sgst_input_ledger, igst_input_ledger, round_ledger]:
                if l:
                    affected_ledger_ids.add(l.LedgerId)
            sync_ledger_balances(*affected_ledger_ids)

        serializer = self.get_serializer(instance)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        company_id = instance.CompanyId or getattr(request.user, 'CompanyId', 1) or 1

        # Validate that stock from this purchase has not already been allocated or dispatched to vans
        for pl in instance.lines.all().select_related('Product'):
            if not pl.Product:
                continue
            g_movs = StockMovement.objects.filter(
                CompanyId=company_id,
                Product=pl.Product,
                RouteVehicleDriverId=1
            )
            f_in = g_movs.filter(
                TransactionType__in=['PURCHASE', 'GODOWN_RETURN_FULL', 'RECEIPT_NOTE_RETURN']
            ).aggregate(tot_in=Sum('InQty'))['tot_in'] or Decimal('0.00')
            f_out = g_movs.filter(
                TransactionType__in=['DELIVERY_NOTE', 'PURCHASE_RETURN']
            ).aggregate(tot_out=Sum('OutQty'))['tot_out'] or Decimal('0.00')
            current_godown_stock = max(Decimal('0.00'), f_in - f_out)

            line_qty = Decimal(str(pl.Quantity or 0))
            if line_qty > current_godown_stock:
                return Response({
                    'detail': f'Cannot delete purchase #{instance.PurchaseNo}: {pl.Product.ProductName} stock ({line_qty}) has already been allocated or dispatched to delivery vans. Current available godown stock is only {current_godown_stock}.'
                }, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            supplier_id = instance.SupplierLedger_id
            StockMovement.objects.filter(
                Q(TransactionType__iexact='PURCHASE') &
                (Q(ReferenceId=instance.PurchaseId) | Q(TransactionNo=instance.PurchaseNo))
            ).delete()
            vouchers = Voucher.objects.filter(ReferenceTable='Purchase', ReferenceId=instance.PurchaseId)
            affected_ledger_ids = {supplier_id} if supplier_id else set()
            for v in vouchers:
                for vl in v.lines.all():
                    if vl.Ledger_id:
                        affected_ledger_ids.add(vl.Ledger_id)
                v.lines.all().delete()
            vouchers.delete()
            instance.lines.all().delete()
            company_id = instance.CompanyId
            instance.delete()
            round_ledger = self._get_ledger_by_name(company_id, "Round Off", fallback_group_id=15)
            if round_ledger:
                affected_ledger_ids.add(round_ledger.LedgerId)
            sync_ledger_balances(*affected_ledger_ids)
        return Response(status=status.HTTP_204_NO_CONTENT)

def sync_sales_billwise_allocation(sale, voucher_line=None):
    """
    Synchronizes BillwiseAllocation records for a sales transaction.
    When a customer pays on a sale (PaidAmount > 0):
      1. Allocates against the sale invoice itself (BillType='SALES', BillReference=sale.SalesNo)
         for min(sale.PaidAmount, sale.GrandTotal).
      2. If customer paid excess (sale.PaidAmount > sale.GrandTotal),
         allocates the excess towards OPENING balance (BillType='OPENING', BillReference='OPENING').
      3. Sets ReferenceTable='Sales' and ReferenceId=sale.SalesId.
      4. Sets ReceiptLineId to the customer's credit VoucherLine if provided.
    """
    if not sale or sale.Status == 'CANCELLED':
        BillwiseAllocation.objects.filter(ReferenceTable='Sales', ReferenceId=sale.SalesId).delete()
        return

    paid_amt = Decimal(str(sale.PaidAmount or 0))
    if paid_amt <= Decimal('0.00') or not sale.CustomerLedger:
        BillwiseAllocation.objects.filter(ReferenceTable='Sales', ReferenceId=sale.SalesId).delete()
        return

    company_id = sale.CompanyId or 1
    gross_bill = Decimal(str(sale.GrandTotal or 0))
    bill_alloc_amt = min(paid_amt, gross_bill)
    excess_amt = max(Decimal('0.00'), paid_amt - gross_bill)
    receipt_vl_id = voucher_line.VoucherLineId if voucher_line else None

    # Safely synchronize sequence for BillwiseAllocation
    try:
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute('SELECT COALESCE(MAX("BillwiseAllocationId"), 0) FROM "BillwiseAllocation"')
            m = cursor.fetchone()[0]
            if m > 0:
                cursor.execute(f'SELECT setval(\'"BillwiseAllocation_BillwiseAllocationId_seq"\', {m}, true);')
            else:
                cursor.execute('SELECT setval(\'"BillwiseAllocation_BillwiseAllocationId_seq"\', 1, false);')
    except Exception:
        pass

    # 1. Allocation against the sale invoice itself
    if bill_alloc_amt > 0:
        sale_alloc = BillwiseAllocation.objects.filter(
            CompanyId=company_id,
            ReferenceTable='Sales',
            ReferenceId=sale.SalesId,
            BillType='SALES',
        ).first()

        if sale_alloc:
            sale_alloc.BillReference = sale.SalesNo
            sale_alloc.BillDate = sale.SalesDate
            sale_alloc.AllocatedAmount = bill_alloc_amt
            if receipt_vl_id:
                sale_alloc.ReceiptLineId = receipt_vl_id
            sale_alloc.save()
        else:
            BillwiseAllocation.objects.create(
                PaymentLine=None,
                ReceiptLineId=receipt_vl_id,
                ReferenceTable='Sales',
                ReferenceId=sale.SalesId,
                BillType='SALES',
                BillReference=sale.SalesNo,
                BillDate=sale.SalesDate,
                DueDate=None,
                AllocationType='Against Reference',
                AllocatedAmount=bill_alloc_amt,
                CompanyId=company_id,
            )
    else:
        BillwiseAllocation.objects.filter(
            CompanyId=company_id,
            ReferenceTable='Sales',
            ReferenceId=sale.SalesId,
            BillType='SALES',
        ).delete()

    # 2. Allocation for excess payment against opening balance
    if excess_amt > 0:
        excess_alloc = BillwiseAllocation.objects.filter(
            CompanyId=company_id,
            ReferenceTable='Sales',
            ReferenceId=sale.SalesId,
            BillType='OPENING',
        ).first()

        if excess_alloc:
            excess_alloc.BillReference = 'OPENING'
            excess_alloc.BillDate = sale.SalesDate
            excess_alloc.AllocatedAmount = excess_amt
            if receipt_vl_id:
                excess_alloc.ReceiptLineId = receipt_vl_id
            excess_alloc.save()
        else:
            BillwiseAllocation.objects.create(
                PaymentLine=None,
                ReceiptLineId=receipt_vl_id,
                ReferenceTable='Sales',
                ReferenceId=sale.SalesId,
                BillType='OPENING',
                BillReference='OPENING',
                BillDate=sale.SalesDate,
                DueDate=None,
                AllocationType='Against Reference',
                AllocatedAmount=excess_amt,
                CompanyId=company_id,
            )
    else:
        BillwiseAllocation.objects.filter(
            CompanyId=company_id,
            ReferenceTable='Sales',
            ReferenceId=sale.SalesId,
            BillType='OPENING',
        ).delete()


class PaymentViewSet(viewsets.ModelViewSet):
    """
    CRUD for Payments with Bill-Wise Allocations & Double-Entry Accounting Vouchers.
    """
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        company_id = getattr(user, 'CompanyId', 0)
        qs = (
            Payment.objects
            .select_related('PartyLedger')
            .prefetch_related('lines__Ledger', 'lines__allocations')
            .filter(route_expenses__isnull=True)
            .exclude(PartyLedger_id=31)
            .exclude(PartyLedger__LedgerName__icontains='travelling')
            .all()
        )
        if company_id:
            # Filter by ledgers belonging to the active company
            qs = qs.filter(PartyLedger__CompanyId=company_id)
        return qs.order_by('-PaymentId')

    @action(detail=False, methods=['get'], url_path='pending-bills')
    def pending_bills(self, request):
        """
        Calculates all pending / unpaid bills for a given Party / Supplier Ledger.
        Combines:
        1. Historical detailed bills from LedgerLine (imported or migration data).
        2. Lumpsum opening balance from Ledger.OpeningBalance (if unbilled balance exists).
        3. Regular live purchases from Purchase table.
        Pending Balance = Bill Amount - SUM(AllocatedAmount in BillwiseAllocation)
        """
        party_id = request.query_params.get('party_id')
        exclude_payment_id = request.query_params.get('exclude_payment_id')
        if not party_id:
            return Response({'detail': 'party_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        company_id = getattr(user, 'CompanyId', 0)

        party = Ledger.objects.filter(LedgerId=party_id).first()
        if not party:
            return Response({'detail': 'Party not found.'}, status=status.HTTP_404_NOT_FOUND)

        results = []

        g_name = (party.Group.GroupName or '').lower() if party.Group else ''
        is_debtor = (party.Group_id == 21 or 'debtor' in g_name or 'customer' in g_name)

        # Calculate actual ledger balance directly from voucher lines + opening balance
        v_agg = VoucherLine.objects.filter(Ledger_id=party_id, Voucher__IsCancelled=False).aggregate(
            tot_dr=Sum('DebitAmount'),
            tot_cr=Sum('CreditAmount')
        )
        tot_dr = v_agg['tot_dr'] or Decimal('0.00')
        tot_cr = v_agg['tot_cr'] or Decimal('0.00')
        op = party.OpeningBalance or Decimal('0.00')
        op_type = (party.OpeningBalanceType or ('DR' if is_debtor else 'CR')).upper()
        op_net = op if op_type == 'DR' else -op
        current_bal = op_net + tot_dr - tot_cr

        # If debtor has 0 or advance balance, no pending bills exist
        if is_debtor and current_bal <= Decimal('0.00'):
            return Response([], status=status.HTTP_200_OK)
        # If creditor has 0 or debit balance, no pending bills exist
        if not is_debtor and current_bal >= Decimal('0.00'):
            return Response([], status=status.HTTP_200_OK)

        bills = []

        # 1. Detailed Opening Bills from LedgerLine
        detailed_sum = Decimal('0.00')
        ledger_lines = LedgerLine.objects.filter(Ledger_id=party_id)
        if company_id:
            ledger_lines = ledger_lines.filter(CompanyId=company_id)
        ledger_lines = ledger_lines.order_by('BillDate', 'LedgerLineId')
        for ll in ledger_lines:
            amt = Decimal(str(ll.Amount or 0))
            detailed_sum += amt
            bills.append({
                'PurchaseId': 0,
                'SalesId': 0,
                'BillReference': ll.BillNo,
                'InvoiceNo': ll.BillNo,
                'BillDate': str(ll.BillDate),
                'BillAmount': amt,
                'BillType': 'OPENING',
            })

        # 2. Residual Opening Balance from Ledger
        unbilled_ob = op - detailed_sum
        if unbilled_ob > Decimal('0.00'):
            b_date = party.CreatedAt.strftime('%Y-%m-%d') if party.CreatedAt else '2024-01-01'
            bills.append({
                'PurchaseId': 0,
                'SalesId': 0,
                'BillReference': 'OPENING',
                'InvoiceNo': 'Opening Balance',
                'BillDate': b_date,
                'BillAmount': unbilled_ob,
                'BillType': 'OPENING',
            })

        # 3. Regular Purchases (for creditors)
        if not is_debtor:
            purchases = Purchase.objects.filter(SupplierLedger_id=party_id)
            if company_id:
                purchases = purchases.filter(CompanyId=company_id)
            for p in purchases.order_by('PurchaseDate', 'PurchaseId'):
                amt = Decimal(str(p.GrandTotal or 0))
                bills.append({
                    'PurchaseId': p.PurchaseId,
                    'SalesId': 0,
                    'BillReference': p.PurchaseNo or str(p.PurchaseId),
                    'InvoiceNo': p.InvoiceNo or '-',
                    'BillDate': str(p.InvoiceDate or p.PurchaseDate),
                    'BillAmount': amt,
                    'BillType': 'PURCHASE',
                })

        # 4. Regular Sales (for debtors)
        if is_debtor:
            sales = Sales.objects.filter(CustomerLedger_id=party_id).exclude(Status='CANCELLED')
            if company_id:
                sales = sales.filter(CompanyId=company_id)
            for s in sales.order_by('SalesDate', 'SalesId'):
                amt = Decimal(str(s.GrandTotal or 0))
                bills.append({
                    'PurchaseId': s.SalesId,
                    'SalesId': s.SalesId,
                    'BillReference': s.SalesNo or s.InvoiceNo or str(s.SalesId),
                    'InvoiceNo': s.InvoiceNo or s.SalesNo or '-',
                    'BillDate': str(s.SalesDate),
                    'BillAmount': amt,
                    'BillType': 'SALES',
                })

        # Collect all payments / allocations from BillwiseAllocation and VoucherLines
        explicit_allocs = {}
        alloc_qs = BillwiseAllocation.objects.filter(CompanyId=company_id)
        if is_debtor:
            alloc_qs = alloc_qs.filter(
                Q(PaymentLine__Payment__PartyLedger_id=party_id) |
                Q(ReceiptLineId__isnull=False, ReceiptLineId__in=VoucherLine.objects.filter(Ledger_id=party_id).values_list('VoucherLineId', flat=True)) |
                Q(ReferenceTable='Sales', ReferenceId__in=Sales.objects.filter(CustomerLedger_id=party_id).values_list('SalesId', flat=True))
            )
        else:
            alloc_qs = alloc_qs.filter(PaymentLine__Payment__PartyLedger_id=party_id)
        if exclude_payment_id:
            alloc_qs = alloc_qs.exclude(PaymentLine__Payment_id=exclude_payment_id)

        for a in alloc_qs.select_related('PaymentLine__Payment', 'PaymentLine__Ledger'):
            b_ref = a.BillReference
            if b_ref not in explicit_allocs:
                explicit_allocs[b_ref] = []
            pmt = a.PaymentLine.Payment if a.PaymentLine else None
            acct = a.PaymentLine.Ledger.LedgerName if a.PaymentLine and a.PaymentLine.Ledger else 'Cash'
            mode = a.PaymentLine.PaymentMode if a.PaymentLine else 'Cash'
            pmt_id = str(pmt.PaymentId).zfill(3) if pmt else '-'
            date_str = pmt.CreatedAt.strftime('%Y-%m-%d') if pmt and pmt.CreatedAt else (a.CreatedAt.strftime('%Y-%m-%d') if a.CreatedAt else '-')

            if not pmt and a.ReceiptLineId:
                vl = VoucherLine.objects.filter(VoucherLineId=a.ReceiptLineId).select_related('Voucher', 'Ledger').first()
                if vl and vl.Voucher:
                    pmt_id = vl.Voucher.VoucherNo
                    date_str = vl.Voucher.VoucherDate.strftime('%Y-%m-%d') if vl.Voucher.VoucherDate else date_str
                    debit_line = vl.Voucher.lines.filter(DebitAmount__gt=0).exclude(Ledger_id=party_id).select_related('Ledger').first()
                    if debit_line and debit_line.Ledger:
                        acct = debit_line.Ledger.LedgerName
                        mode = 'Cash' if 'cash' in acct.lower() else 'Bank'
            elif not pmt and a.ReferenceTable == 'Sales':
                pmt_id = f"SALE-{a.BillReference}"
                date_str = a.BillDate.strftime('%Y-%m-%d') if a.BillDate else date_str

            explicit_allocs[b_ref].append({
                'PaymentId': pmt.PaymentId if pmt else None,
                'PaymentNo': pmt_id,
                'Date': date_str,
                'Account': acct,
                'Mode': mode,
                'Amount': Decimal(str(a.AllocatedAmount)),
            })

        # Next: Collect VoucherLines that settled sales or made general collections
        sale_settled_credits = {}
        unallocated_pool = []

        party_vl_qs = VoucherLine.objects.filter(
            Ledger_id=party_id,
            Voucher__IsCancelled=False
        ).select_related('Voucher').order_by('Voucher__VoucherDate', 'VoucherLineId')

        for vl in party_vl_qs:
            v = vl.Voucher
            pay_amt = vl.CreditAmount if is_debtor else vl.DebitAmount
            if pay_amt <= Decimal('0.00'):
                continue

            counter_line = (
                v.lines.exclude(Ledger_id=party_id).filter(DebitAmount__gt=0).select_related('Ledger').first()
                if is_debtor else
                v.lines.exclude(Ledger_id=party_id).filter(CreditAmount__gt=0).select_related('Ledger').first()
            )
            acct_name = counter_line.Ledger.LedgerName if counter_line and counter_line.Ledger else 'Cash'
            pm_mode = 'Cash' if 'cash' in acct_name.lower() else ('Bank' if 'bank' in acct_name.lower() or 'upi' in acct_name.lower() else 'Direct')

            # Check if this voucher line is tied to a specific Sales invoice
            if is_debtor and v.ReferenceTable == 'Sales' and v.ReferenceId:
                if BillwiseAllocation.objects.filter(ReferenceTable='Sales', ReferenceId=v.ReferenceId).exists():
                    continue
                sale = Sales.objects.filter(SalesId=v.ReferenceId).first()
                if sale:
                    b_ref = sale.SalesNo or sale.InvoiceNo or str(sale.SalesId)
                    bill_total = Decimal(str(sale.GrandTotal or 0))
                    bill_cover = min(pay_amt, bill_total)
                    if b_ref not in sale_settled_credits:
                        sale_settled_credits[b_ref] = []
                    sale_settled_credits[b_ref].append({
                        'PaymentNo': v.VoucherNo,
                        'Date': str(v.VoucherDate),
                        'Account': acct_name,
                        'Mode': pm_mode,
                        'Amount': bill_cover,
                    })
                    excess = pay_amt - bill_cover
                    if excess > Decimal('0.00'):
                        unallocated_pool.append({
                            'PaymentNo': v.VoucherNo,
                            'Date': str(v.VoucherDate),
                            'Account': acct_name,
                            'Mode': pm_mode,
                            'RemainingAmount': excess,
                        })
                    continue

            # If it's a Payment with BillwiseAllocation, explicit_allocs already handles it
            if v.ReferenceTable == 'Payment' and v.ReferenceId:
                if BillwiseAllocation.objects.filter(PaymentLine__Payment_id=v.ReferenceId).exists():
                    continue

            unallocated_pool.append({
                'PaymentNo': v.VoucherNo,
                'Date': str(v.VoucherDate),
                'Account': acct_name,
                'Mode': pm_mode,
                'RemainingAmount': pay_amt,
            })

        # Calculate paid amount and pending balance for each bill chronologically
        bills.sort(key=lambda x: str(x.get('BillDate') or ''))

        for b in bills:
            b_ref = b['BillReference']
            total_bill = b['BillAmount']
            paid_so_far = Decimal('0.00')
            history = []

            # 1. Apply explicit allocations
            if b_ref in explicit_allocs:
                for item in explicit_allocs[b_ref]:
                    paid_so_far += item['Amount']
                    history.append({
                        'PaymentId': item.get('PaymentId'),
                        'PaymentNo': item.get('PaymentNo'),
                        'Date': item.get('Date'),
                        'Account': item.get('Account'),
                        'Mode': item.get('Mode'),
                        'Amount': float(item.get('Amount')),
                    })

            # 2. Apply sale-settled credits
            if b_ref in sale_settled_credits:
                for item in sale_settled_credits[b_ref]:
                    paid_so_far += item['Amount']
                    history.append({
                        'PaymentId': None,
                        'PaymentNo': item['PaymentNo'],
                        'Date': item['Date'],
                        'Account': item['Account'],
                        'Mode': item['Mode'],
                        'Amount': float(item['Amount']),
                    })

            # 3. Apply FIFO unallocated pool from vouchers
            if paid_so_far < total_bill:
                needed = total_bill - paid_so_far
                for pool_item in unallocated_pool:
                    avail = pool_item['RemainingAmount']
                    if avail <= Decimal('0.00'):
                        continue
                    alloc_from_pool = min(needed, avail)
                    paid_so_far += alloc_from_pool
                    pool_item['RemainingAmount'] -= alloc_from_pool
                    needed -= alloc_from_pool
                    history.append({
                        'PaymentId': None,
                        'PaymentNo': pool_item['PaymentNo'],
                        'Date': pool_item['Date'],
                        'Account': pool_item['Account'],
                        'Mode': pool_item['Mode'],
                        'Amount': float(alloc_from_pool),
                    })
                    if needed <= Decimal('0.00'):
                        break

            pending = total_bill - paid_so_far
            if pending > Decimal('0.00'):
                results.append({
                    'PurchaseId': b.get('PurchaseId', 0),
                    'SalesId': b.get('SalesId', 0),
                    'BillReference': b_ref,
                    'InvoiceNo': b.get('InvoiceNo', b_ref),
                    'BillDate': b.get('BillDate'),
                    'BillAmount': float(total_bill),
                    'PaidAmount': float(paid_so_far),
                    'PendingAmount': float(pending),
                    'PaymentHistory': history,
                    'BillType': b.get('BillType', 'SALES' if is_debtor else 'PURCHASE'),
                })

        # Sort all bills chronologically (Oldest first) to enable seamless FIFO
        results.sort(key=lambda x: str(x.get('BillDate') or ''))

        return Response(results, status=status.HTTP_200_OK)

    def create(self, request, *args, **kwargs):
        data = request.data
        party_id = data.get('PartyLedgerId')
        amount = Decimal(str(data.get('Amount') or 0))
        lines_data = data.get('lines', [])
        allocations_data = data.get('allocations', [])
        if not allocations_data and lines_data:
            for l in lines_data:
                if isinstance(l, dict) and 'allocations' in l:
                    allocations_data.extend(l['allocations'])

        party = Ledger.objects.filter(LedgerId=party_id).select_related('Group').first()
        if not party:
            return Response({'detail': 'Selected party ledger not found.'}, status=status.HTTP_400_BAD_REQUEST)
        if amount <= 0:
            return Response({'detail': 'Payment amount must be greater than 0.'}, status=status.HTTP_400_BAD_REQUEST)

        # Optional bill allocation validation (only if allocations provided)
        total_alloc = sum(Decimal(str(a.get('AllocatedAmount') or 0)) for a in allocations_data)
        if total_alloc > amount:
            return Response(
                {'detail': 'Total allocated amount cannot exceed the voucher amount.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user
        company_id = getattr(user, 'CompanyId', 0)

        with transaction.atomic():
            # Safely synchronize sequences for Payment, PaymentLine, and BillwiseAllocation
            try:
                from django.db import connection
                with connection.cursor() as cursor:
                    for tbl, col, seq in [
                        ('Payment', 'PaymentId', 'Payment_PaymentId_seq'),
                        ('PaymentLine', 'PaymentLineId', 'PaymentLine_PaymentLineId_seq'),
                        ('BillwiseAllocation', 'BillwiseAllocationId', 'BillwiseAllocation_BillwiseAllocationId_seq'),
                    ]:
                        cursor.execute(f'SELECT COALESCE(MAX("{col}"), 0) FROM "{tbl}"')
                        m = cursor.fetchone()[0]
                        if m > 0:
                            cursor.execute(f'SELECT setval(\'"{seq}"\', {m}, true);')
                        else:
                            cursor.execute(f'SELECT setval(\'"{seq}"\', 1, false);')
            except Exception:
                pass

            # 1. Create Payment Header
            payment = Payment.objects.create(
                PartyLedger_id=party_id,
                Amount=amount,
                Narration=data.get('Narration') or '',
            )

            # 2. Create Payment Line(s) (Defaults to 1 line if not specified)
            if not lines_data:
                # Default payment mode
                mode = data.get('PaymentMode', 'Cash')
                # Find Cash or Bank ledger
                ledger_id = data.get('PaymentLedgerId')
                if not ledger_id:
                    # Fallback to default Cash or Bank ledger
                    target_group = 16 if mode == 'Cash' else 17
                    fallback_ledger = Ledger.objects.filter(Group_id=target_group, CompanyId=company_id).first()
                    ledger_id = fallback_ledger.LedgerId if fallback_ledger else party_id

                lines_data = [{
                    'LineNo': 1,
                    'PaymentMode': mode,
                    'LedgerId': ledger_id,
                    'Amount': amount,
                    'InstrumentNumber': data.get('InstrumentNumber'),
                    'InstrumentDate': data.get('InstrumentDate') or None,
                    'TransactionReference': data.get('TransactionReference'),
                    'Narration': data.get('Narration'),
                }]

            created_lines = []
            for idx, l in enumerate(lines_data):
                line_lid = l.get('LedgerId') or data.get('PaymentLedgerId')
                if not line_lid:
                    pm = (l.get('PaymentMode') or data.get('PaymentMode') or 'Cash').lower()
                    target_group = 16 if pm == 'cash' else 17
                    fallback_ledger = Ledger.objects.filter(Group_id=target_group, CompanyId=company_id).first() or Ledger.objects.filter(LedgerId=24 if pm == 'cash' else 56).first()
                    line_lid = fallback_ledger.LedgerId if fallback_ledger else party_id

                p_line = PaymentLine.objects.create(
                    Payment=payment,
                    LineNo=l.get('LineNo', idx + 1),
                    PaymentMode=l.get('PaymentMode', 'Cash'),
                    Ledger_id=line_lid,
                    Amount=Decimal(str(l.get('Amount') or amount)),
                    InstrumentNumber=l.get('InstrumentNumber') or None,
                    InstrumentDate=l.get('InstrumentDate') or None,
                    BankName=l.get('BankName') or None,
                    BankBranch=l.get('BankBranch') or None,
                    ChequeStatus=l.get('ChequeStatus') or None,
                    ClearedDate=l.get('ClearedDate') or None,
                    TransactionReference=l.get('TransactionReference') or None,
                    Narration=l.get('Narration') or None,
                )
                created_lines.append(p_line)

            # 3. Create Billwise Allocations linked to the primary payment line
            primary_line = created_lines[0]
            # Detect Customer Collection (RECEIPT) vs Vendor / Expense (PAYMENT)
            explicit_voucher_type = (
                data.get('voucher_type')
                or data.get('VoucherType')
                or data.get('type')
            )
            if explicit_voucher_type:
                is_customer_receipt = str(explicit_voucher_type).strip().upper() == 'RECEIPT'
            else:
                g_name = (party.Group.GroupName or '').lower() if party.Group else ''
                is_customer_receipt = (
                    party.Group_id == 21
                    or 'debtor' in g_name
                    or 'customer' in g_name
                    or any(a.get('BillType') == 'SALES' for a in allocations_data)
                )

            alloc_instances = []
            for alloc in allocations_data:
                alloc_amt = Decimal(str(alloc.get('AllocatedAmount') or 0))
                if alloc_amt > 0:
                    b_ref = alloc.get('BillReference')
                    b_type = alloc.get('BillType')
                    if not b_type:
                        if b_ref == 'OPENING' or alloc.get('PurchaseId') == 0 or LedgerLine.objects.filter(Ledger_id=party_id, BillNo=b_ref).exists():
                            b_type = 'OPENING'
                        elif is_customer_receipt or Sales.objects.filter(CustomerLedger_id=party_id, SalesNo=b_ref).exists():
                            b_type = 'SALES'
                        else:
                            b_type = 'PURCHASE'

                    ba = BillwiseAllocation.objects.create(
                        PaymentLine=primary_line,
                        ReceiptLineId=None,
                        ReferenceTable='Receipt' if is_customer_receipt else 'Payment',
                        ReferenceId=payment.PaymentId,
                        BillType=b_type,
                        BillReference=b_ref,
                        BillDate=alloc.get('BillDate') or None,
                        DueDate=alloc.get('DueDate') or None,
                        AllocationType=alloc.get('AllocationType', 'Against Reference'),
                        AllocatedAmount=alloc_amt,
                        CompanyId=company_id,
                    )
                    alloc_instances.append((ba, b_type, b_ref, alloc_amt))

            # Build narrative string detailing allocated bills
            alloc_narr_parts = []
            for _, b_type, b_ref, b_amt in alloc_instances:
                alloc_narr_parts.append(f"Agst Ref: {b_ref} (₹{b_amt:,.2f})")
            alloc_summary = f" [{', '.join(alloc_narr_parts)}]" if alloc_narr_parts else ""

            # 4. Generate Accounting Voucher
            vch_type = 'RECEIPT' if is_customer_receipt else 'PAYMENT'
            vch_prefix = 'REC' if is_customer_receipt else 'PAY'
            action_desc = f"Receipt #{payment.PaymentId} from {payment.PartyLedger.LedgerName}{alloc_summary}" if is_customer_receipt else f"Payment #{payment.PaymentId} to {payment.PartyLedger.LedgerName}{alloc_summary}"

            vch_no = f"{vch_prefix}-VCH-{payment.PaymentId}"
            v_seq = 1
            while Voucher.objects.filter(CompanyId=company_id, VoucherType=vch_type, VoucherNo=vch_no).exists():
                vch_no = f"{vch_prefix}-VCH-{payment.PaymentId}-{v_seq}"
                v_seq += 1

            # Delete any existing stale voucher for this Payment reference
            stale_vchs = Voucher.objects.filter(CompanyId=company_id, ReferenceTable='Payment', ReferenceId=payment.PaymentId)
            for sv in stale_vchs:
                sv.lines.all().delete()
            stale_vchs.delete()

            voucher_narration = data.get('Narration') or action_desc
            if alloc_summary and alloc_summary not in voucher_narration:
                voucher_narration = f"{voucher_narration}{alloc_summary}"

            voucher = Voucher.objects.create(
                VoucherNo=vch_no,
                VoucherDate=payment.CreatedAt.date(),
                VoucherType=vch_type,
                ReferenceTable='Payment',
                ReferenceId=payment.PaymentId,
                CompanyId=company_id,
                Narration=voucher_narration,
                IsCancelled=False,
            )

            if is_customer_receipt:
                # Customer Collection:
                # Debit Cash / Bank (Asset increases)
                for idx, p_line in enumerate(created_lines):
                    VoucherLine.objects.create(
                        Voucher=voucher,
                        LineNo=idx + 1,
                        Ledger_id=p_line.Ledger_id,
                        DebitAmount=p_line.Amount,
                        CreditAmount=Decimal('0.00'),
                        Narration=f"{p_line.PaymentMode} receipt from {payment.PartyLedger.LedgerName}",
                    )
                # Credit Customer Ledger (Debtor asset decreases / cleared)
                cust_vl = VoucherLine.objects.create(
                    Voucher=voucher,
                    LineNo=len(created_lines) + 1,
                    Ledger_id=party_id,
                    DebitAmount=Decimal('0.00'),
                    CreditAmount=amount,
                    Narration=f"Collection from {payment.PartyLedger.LedgerName}{alloc_summary}",
                )

                # Wire customer VoucherLine to BillwiseAllocation and sync Sales.PaidAmount
                for ba, b_type, b_ref, alloc_amt in alloc_instances:
                    ba.ReceiptLineId = cust_vl.VoucherLineId
                    ba.save(update_fields=['ReceiptLineId'])

                    if b_type == 'SALES' or b_ref:
                        matched_sale = Sales.objects.filter(
                            CompanyId=company_id, CustomerLedger_id=party_id
                        ).filter(
                            Q(SalesNo=b_ref) | Q(InvoiceNo=b_ref)
                        ).first()
                        if matched_sale:
                            curr_paid = matched_sale.PaidAmount or Decimal('0.00')
                            matched_sale.PaidAmount = min(matched_sale.GrandTotal, curr_paid + alloc_amt)
                            matched_sale.save(update_fields=['PaidAmount'])
            else:
                # Vendor / Expense Payment:
                # Debit Supplier / Expense
                VoucherLine.objects.create(
                    Voucher=voucher,
                    LineNo=1,
                    Ledger_id=party_id,
                    DebitAmount=amount,
                    CreditAmount=Decimal('0.00'),
                    Narration=f"Payment to {payment.PartyLedger.LedgerName}{alloc_summary}",
                )
                # Credit Cash / Bank
                for idx, p_line in enumerate(created_lines):
                    VoucherLine.objects.create(
                        Voucher=voucher,
                        LineNo=idx + 2,
                        Ledger_id=p_line.Ledger_id,
                        DebitAmount=Decimal('0.00'),
                        CreditAmount=p_line.Amount,
                        Narration=f"{p_line.PaymentMode} payment",
                    )

            # 5. Sync Ledger Balances (Double-Entry Bookkeeping)
            sync_ledger_balances(party_id, *[p_line.Ledger_id for p_line in created_lines])

        serializer = self.get_serializer(payment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        data = request.data
        party_id = data.get('PartyLedgerId') or instance.PartyLedger_id
        amount = Decimal(str(data.get('Amount') or instance.Amount or 0))
        lines_data = data.get('lines', [])
        allocations_data = data.get('allocations', [])
        if not allocations_data and lines_data:
            for l in lines_data:
                if isinstance(l, dict) and 'allocations' in l:
                    allocations_data.extend(l['allocations'])

        party = Ledger.objects.filter(LedgerId=party_id).select_related('Group').first()
        if not party:
            return Response({'detail': 'Selected party ledger not found.'}, status=status.HTTP_400_BAD_REQUEST)
        if amount <= 0:
            return Response({'detail': 'Payment amount must be greater than 0.'}, status=status.HTTP_400_BAD_REQUEST)

        # Optional bill allocation validation (only if allocations provided)
        total_alloc = sum(Decimal(str(a.get('AllocatedAmount') or 0)) for a in allocations_data)
        if total_alloc > amount:
            return Response(
                {'detail': 'Total allocated amount cannot exceed the voucher amount.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user
        company_id = getattr(user, 'CompanyId', 1) or (instance.PartyLedger.CompanyId if instance.PartyLedger else 1) or 1

        with transaction.atomic():
            old_party_id = instance.PartyLedger_id
            old_payment_ledger_ids = list(instance.lines.values_list('Ledger_id', flat=True))

            # Update Payment Header
            instance.PartyLedger_id = party_id
            instance.Amount = amount
            if 'Narration' in data:
                instance.Narration = data.get('Narration') or ''
            instance.save()

            # Clean old dependent vouchers & allocations & lines, restoring any allocated Sales PaidAmount
            vouchers = Voucher.objects.filter(ReferenceTable='Payment', ReferenceId=instance.PaymentId)
            for v in vouchers:
                v.lines.all().delete()
            vouchers.delete()

            for line in instance.lines.all():
                for alloc in line.allocations.all():
                    if alloc.BillType == 'SALES' or alloc.BillReference:
                        s = Sales.objects.filter(CompanyId=company_id).filter(
                            Q(SalesNo=alloc.BillReference) | Q(InvoiceNo=alloc.BillReference)
                        ).first()
                        if s:
                            s.PaidAmount = max(Decimal('0.00'), (s.PaidAmount or Decimal('0.00')) - alloc.AllocatedAmount)
                            s.save(update_fields=['PaidAmount'])
                line.allocations.all().delete()

            # Also delete any allocations referencing this Payment/Receipt directly
            BillwiseAllocation.objects.filter(
                Q(ReferenceTable__in=['Payment', 'Receipt'], ReferenceId=instance.PaymentId)
            ).delete()
            instance.lines.all().delete()

            # Recreate lines
            if not lines_data:
                mode = data.get('PaymentMode', 'Cash')
                ledger_id = data.get('PaymentLedgerId')
                if not ledger_id:
                    target_group = 16 if mode == 'Cash' else 17
                    fallback_ledger = Ledger.objects.filter(Group_id=target_group, CompanyId=company_id).first()
                    ledger_id = fallback_ledger.LedgerId if fallback_ledger else party_id

                lines_data = [{
                    'LineNo': 1,
                    'PaymentMode': mode,
                    'LedgerId': ledger_id,
                    'Amount': amount,
                    'InstrumentNumber': data.get('InstrumentNumber'),
                    'InstrumentDate': data.get('InstrumentDate') or None,
                    'TransactionReference': data.get('TransactionReference'),
                    'Narration': data.get('Narration'),
                }]

            created_lines = []
            for idx, l in enumerate(lines_data):
                line_lid = l.get('LedgerId') or data.get('PaymentLedgerId')
                if not line_lid:
                    pm = (l.get('PaymentMode') or data.get('PaymentMode') or 'Cash').lower()
                    target_group = 16 if pm == 'cash' else 17
                    fallback_ledger = Ledger.objects.filter(Group_id=target_group, CompanyId=company_id).first() or Ledger.objects.filter(LedgerId=24 if pm == 'cash' else 56).first()
                    line_lid = fallback_ledger.LedgerId if fallback_ledger else party_id

                p_line = PaymentLine.objects.create(
                    Payment=instance,
                    LineNo=l.get('LineNo', idx + 1),
                    PaymentMode=l.get('PaymentMode', 'Cash'),
                    Ledger_id=line_lid,
                    Amount=Decimal(str(l.get('Amount') or amount)),
                    InstrumentNumber=l.get('InstrumentNumber') or None,
                    InstrumentDate=l.get('InstrumentDate') or None,
                    BankName=l.get('BankName') or None,
                    BankBranch=l.get('BankBranch') or None,
                    ChequeStatus=l.get('ChequeStatus') or None,
                    ClearedDate=l.get('ClearedDate') or None,
                    TransactionReference=l.get('TransactionReference') or None,
                    Narration=l.get('Narration') or None,
                )
                created_lines.append(p_line)

            # Recreate Billwise Allocations
            primary_line = created_lines[0]
            # Detect Customer Collection (RECEIPT) vs Vendor / Expense (PAYMENT)
            explicit_voucher_type = (
                data.get('voucher_type')
                or data.get('VoucherType')
                or data.get('type')
            )
            if explicit_voucher_type:
                is_customer_receipt = str(explicit_voucher_type).strip().upper() == 'RECEIPT'
            else:
                g_name = (party.Group.GroupName or '').lower() if party.Group else ''
                is_customer_receipt = (
                    party.Group_id == 21
                    or 'debtor' in g_name
                    or 'customer' in g_name
                    or any(a.get('BillType') == 'SALES' for a in allocations_data)
                )

            alloc_instances = []
            for alloc in allocations_data:
                alloc_amt = Decimal(str(alloc.get('AllocatedAmount') or 0))
                if alloc_amt > 0:
                    b_ref = alloc.get('BillReference')
                    b_type = alloc.get('BillType')
                    if not b_type:
                        if b_ref == 'OPENING' or alloc.get('PurchaseId') == 0 or LedgerLine.objects.filter(Ledger_id=party_id, BillNo=b_ref).exists():
                            b_type = 'OPENING'
                        elif is_customer_receipt or Sales.objects.filter(CustomerLedger_id=party_id, SalesNo=b_ref).exists():
                            b_type = 'SALES'
                        else:
                            b_type = 'PURCHASE'

                    ba = BillwiseAllocation.objects.create(
                        PaymentLine=primary_line,
                        ReceiptLineId=None,
                        ReferenceTable='Receipt' if is_customer_receipt else 'Payment',
                        ReferenceId=instance.PaymentId,
                        BillType=b_type,
                        BillReference=b_ref,
                        BillDate=alloc.get('BillDate') or None,
                        DueDate=alloc.get('DueDate') or None,
                        AllocationType=alloc.get('AllocationType', 'Against Reference'),
                        AllocatedAmount=alloc_amt,
                        CompanyId=company_id,
                    )
                    alloc_instances.append((ba, b_type, b_ref, alloc_amt))

            # Build narrative string detailing allocated bills
            alloc_narr_parts = []
            for _, b_type, b_ref, b_amt in alloc_instances:
                alloc_narr_parts.append(f"Agst Ref: {b_ref} (₹{b_amt:,.2f})")
            alloc_summary = f" [{', '.join(alloc_narr_parts)}]" if alloc_narr_parts else ""

            # Recreate Accounting Voucher
            vch_type = 'RECEIPT' if is_customer_receipt else 'PAYMENT'
            vch_prefix = 'REC' if is_customer_receipt else 'PAY'
            action_desc = f"Receipt #{instance.PaymentId} from {instance.PartyLedger.LedgerName}{alloc_summary}" if is_customer_receipt else f"Payment #{instance.PaymentId} to {instance.PartyLedger.LedgerName}{alloc_summary}"

            vch_no = f"{vch_prefix}-VCH-{instance.PaymentId}"
            v_seq = 1
            while Voucher.objects.filter(CompanyId=company_id, VoucherType=vch_type, VoucherNo=vch_no).exclude(ReferenceTable='Payment', ReferenceId=instance.PaymentId).exists():
                vch_no = f"{vch_prefix}-VCH-{instance.PaymentId}-{v_seq}"
                v_seq += 1

            voucher_narration = data.get('Narration') or action_desc
            if alloc_summary and alloc_summary not in voucher_narration:
                voucher_narration = f"{voucher_narration}{alloc_summary}"

            voucher = Voucher.objects.create(
                VoucherNo=vch_no,
                VoucherDate=instance.CreatedAt.date(),
                VoucherType=vch_type,
                ReferenceTable='Payment',
                ReferenceId=instance.PaymentId,
                CompanyId=company_id,
                Narration=voucher_narration,
                IsCancelled=False,
            )

            if is_customer_receipt:
                # Customer Collection:
                # Debit Cash / Bank (Asset increases)
                for idx, p_line in enumerate(created_lines):
                    VoucherLine.objects.create(
                        Voucher=voucher,
                        LineNo=idx + 1,
                        Ledger_id=p_line.Ledger_id,
                        DebitAmount=p_line.Amount,
                        CreditAmount=Decimal('0.00'),
                        Narration=f"{p_line.PaymentMode} receipt from {instance.PartyLedger.LedgerName}",
                    )
                # Credit Customer Ledger (Debtor asset decreases / cleared)
                cust_vl = VoucherLine.objects.create(
                    Voucher=voucher,
                    LineNo=len(created_lines) + 1,
                    Ledger_id=party_id,
                    DebitAmount=Decimal('0.00'),
                    CreditAmount=amount,
                    Narration=f"Collection from {instance.PartyLedger.LedgerName}{alloc_summary}",
                )

                # Wire customer VoucherLine to BillwiseAllocation and sync Sales.PaidAmount
                for ba, b_type, b_ref, alloc_amt in alloc_instances:
                    ba.ReceiptLineId = cust_vl.VoucherLineId
                    ba.save(update_fields=['ReceiptLineId'])

                    if b_type == 'SALES' or b_ref:
                        matched_sale = Sales.objects.filter(
                            CompanyId=company_id, CustomerLedger_id=party_id
                        ).filter(
                            Q(SalesNo=b_ref) | Q(InvoiceNo=b_ref)
                        ).first()
                        if matched_sale:
                            curr_paid = matched_sale.PaidAmount or Decimal('0.00')
                            matched_sale.PaidAmount = min(matched_sale.GrandTotal, curr_paid + alloc_amt)
                            matched_sale.save(update_fields=['PaidAmount'])
            else:
                # Vendor / Expense Payment:
                # Debit Supplier
                VoucherLine.objects.create(
                    Voucher=voucher,
                    LineNo=1,
                    Ledger_id=party_id,
                    DebitAmount=amount,
                    CreditAmount=Decimal('0.00'),
                    Narration=f"Payment to {instance.PartyLedger.LedgerName}{alloc_summary}",
                )
                # Credit Cash/Bank
                for idx, p_line in enumerate(created_lines):
                    VoucherLine.objects.create(
                        Voucher=voucher,
                        LineNo=idx + 2,
                        Ledger_id=p_line.Ledger_id,
                        DebitAmount=Decimal('0.00'),
                        CreditAmount=p_line.Amount,
                        Narration=f"{p_line.PaymentMode} payment",
                    )

            # Sync Ledger Balances (both old and new ledgers)
            all_ledgers = set([old_party_id, party_id] + old_payment_ledger_ids + [p.Ledger_id for p in created_lines])
            sync_ledger_balances(*all_ledgers)

        serializer = self.get_serializer(instance)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        company_id = getattr(request.user, 'CompanyId', 1) or (instance.PartyLedger.CompanyId if instance.PartyLedger else 1) or 1
        with transaction.atomic():
            party_id = instance.PartyLedger_id
            payment_ledger_ids = list(instance.lines.values_list('Ledger_id', flat=True))

            # Delete accounting vouchers & lines
            vouchers = Voucher.objects.filter(ReferenceTable='Payment', ReferenceId=instance.PaymentId)
            for v in vouchers:
                v.lines.all().delete()
            vouchers.delete()

            # Delete billwise allocations and restore Sales.PaidAmount
            for line in instance.lines.all():
                for alloc in line.allocations.all():
                    if alloc.BillType == 'SALES' or alloc.BillReference:
                        s = Sales.objects.filter(CompanyId=company_id).filter(
                            Q(SalesNo=alloc.BillReference) | Q(InvoiceNo=alloc.BillReference)
                        ).first()
                        if s:
                            s.PaidAmount = max(Decimal('0.00'), (s.PaidAmount or Decimal('0.00')) - alloc.AllocatedAmount)
                            s.save(update_fields=['PaidAmount'])
                line.allocations.all().delete()

            # Also delete any allocations referencing this Payment/Receipt directly
            BillwiseAllocation.objects.filter(
                Q(ReferenceTable__in=['Payment', 'Receipt'], ReferenceId=instance.PaymentId)
            ).delete()

            # Delete lines & payment
            instance.lines.all().delete()
            instance.delete()

            # Sync ledger balances directly from remaining voucher lines
            sync_ledger_balances(party_id, *payment_ledger_ids)

            # Safely synchronize sequences for Payment, PaymentLine, and BillwiseAllocation
            try:
                from django.db import connection
                with connection.cursor() as cursor:
                    for tbl, col, seq in [
                        ('Payment', 'PaymentId', 'Payment_PaymentId_seq'),
                        ('PaymentLine', 'PaymentLineId', 'PaymentLine_PaymentLineId_seq'),
                        ('BillwiseAllocation', 'BillwiseAllocationId', 'BillwiseAllocation_BillwiseAllocationId_seq'),
                    ]:
                        cursor.execute(f'SELECT COALESCE(MAX("{col}"), 0) FROM "{tbl}"')
                        m = cursor.fetchone()[0]
                        if m > 0:
                            cursor.execute(f'SELECT setval(\'"{seq}"\', {m}, true);')
                        else:
                            cursor.execute(f'SELECT setval(\'"{seq}"\', 1, false);')
            except Exception:
                pass

        return Response(status=status.HTTP_204_NO_CONTENT)


class LedgerLineViewSet(viewsets.ModelViewSet):
    """
    CRUD ViewSet for managing historical opening bills per Ledger (Party / Supplier).
    Supports bulk creation from Excel or individual bill management.
    """
    serializer_class = LedgerLineSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        company_id = getattr(user, 'CompanyId', 0)
        qs = LedgerLine.objects.all()
        if company_id:
            qs = qs.filter(CompanyId=company_id)

        ledger_id = self.request.query_params.get('ledger_id')
        if ledger_id:
            qs = qs.filter(Ledger_id=ledger_id)

        return qs.order_by('BillDate', 'LedgerLineId')

    def perform_create(self, serializer):
        user = self.request.user
        company_id = getattr(user, 'CompanyId', 0)
        serializer.save(CompanyId=company_id)

    @action(detail=False, methods=['post'], url_path='bulk-import')
    def bulk_import(self, request):
        """
        Allows bulk importing multiple opening bills for one or more ledgers.
        Payload: { "bills": [ { "Ledger": 14, "BillNo": "INV-101", "BillDate": "2024-01-15", "Amount": 15000, "Narration": "..." }, ... ] }
        """
        bills = request.data.get('bills', [])
        if not bills or not isinstance(bills, list):
            return Response({'detail': 'Please provide a "bills" array.'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        company_id = getattr(user, 'CompanyId', 0)

        created_records = []
        errors = []

        with transaction.atomic():
            for idx, b in enumerate(bills):
                serializer = self.get_serializer(data=b)
                if serializer.is_valid():
                    obj = serializer.save(CompanyId=company_id)
                    created_records.append(serializer.data)
                else:
                    errors.append({'index': idx, 'bill': b, 'errors': serializer.errors})

            if errors:
                transaction.set_rollback(True)
                return Response({'detail': 'Validation failed for some bills.', 'errors': errors}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'detail': f'Successfully imported {len(created_records)} opening bills.',
            'imported': created_records
        }, status=status.HTTP_201_CREATED)


from core.models import (
    DeliveryNote, DeliveryNoteLine, ReceiptNote, ReceiptNoteLine,
    Sales, SalesLine
)
from core.serializers import (
    DeliveryNoteSerializer, DeliveryNoteLineSerializer,
    ReceiptNoteSerializer, ReceiptNoteLineSerializer,
    EndRouteDriverSerializer, EndRouteDriverLineSerializer, SalesSerializer, SalesLineSerializer
)
from rest_framework.decorators import action

class DeliveryNoteViewSet(viewsets.ModelViewSet):
    """
    Handles Morning Van Stock Allocations (Loading Notes).
    Transfers stock from Godown Stock (RouteVehicleDriverId=1) to the Van Allocation.
    """
    serializer_class = DeliveryNoteSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        company_id = getattr(user, 'CompanyId', 1) or 1
        return DeliveryNote.objects.filter(CompanyId=company_id).prefetch_related(
            'lines__Product', 'lines__Unit', 'RouteVehicleDriver__Route',
            'RouteVehicleDriver__Vehicle', 'RouteVehicleDriver__Driver'
        )

    @action(detail=False, methods=['get'], url_path='godown-stock')
    def godown_stock(self, request):
        """Returns live stock available in Central Godown (RouteVehicleDriverId=1) separating filled and empty stock."""
        company_id = getattr(request.user, 'CompanyId', 1) or 1
        products = Product.objects.filter(CompanyId=company_id, IsActive=True)
        stock_list = []
        for p in products:
            g_movs = StockMovement.objects.filter(
                CompanyId=company_id,
                Product=p,
                RouteVehicleDriverId=1
            )
            # 1. Filled Cylinders / Stock in Central Godown
            f_in = g_movs.filter(
                TransactionType__in=['PURCHASE', 'GODOWN_RETURN_FULL', 'RECEIPT_NOTE_RETURN', 'OPENING_STOCK', 'ADJUSTMENT_IN']
            ).aggregate(tot_in=Sum('InQty'))['tot_in'] or Decimal('0.00')
            f_out = g_movs.filter(
                TransactionType__in=['DELIVERY_NOTE', 'PURCHASE_RETURN', 'ADJUSTMENT_OUT']
            ).aggregate(tot_out=Sum('OutQty'))['tot_out'] or Decimal('0.00')
            filled_available = max(Decimal('0.00'), f_in - f_out)

            # 2. Empty Cylinders in Central Godown (Returned from vans / shifts)
            e_in = g_movs.filter(
                TransactionType__in=['GODOWN_RETURN_EMPTY', 'VAN_UNLOAD_EMPTY', 'RECEIPT_NOTE_EMPTY_RETURN', 'VAN_EMPTY_RETURN', 'OPENING_EMPTY', 'ADJUSTMENT_EMPTY_IN']
            ).aggregate(tot_in=Sum('InQty'))['tot_in'] or Decimal('0.00')
            e_out = g_movs.filter(
                TransactionType__in=['PURCHASE_EMPTY_RETURN', 'FACTORY_EMPTY_RETURN', 'ADJUSTMENT_EMPTY_OUT']
            ).aggregate(tot_out=Sum('OutQty'))['tot_out'] or Decimal('0.00')
            empty_available = max(Decimal('0.00'), e_in - e_out)

            stock_list.append({
                'ProductId': p.ProductId,
                'ProductName': p.ProductName,
                'AppProductName': p.AppProductName or p.ProductName,
                'ProductCode': p.ProductCode,
                'UnitId': p.Unit_id,
                'UnitName': 'Cyls',
                'PurchasePrice': p.PurchasePrice,
                'AvailableGodownQty': float(filled_available),
                'EmptyGodownQty': float(empty_available),
                'TotalGodownQty': float(filled_available + empty_available),
            })
        return Response(stock_list)

    @action(detail=False, methods=['post'], url_path='add-godown-stock')
    def add_godown_stock(self, request):
        """
        Allows adding initial opening stock or stock adjustment directly to Central Godown (RouteVehicleDriverId=1).
        Accepts:
        - product_id (int)
        - filled_quantity (int/float)
        - empty_quantity (int/float, for cylinders)
        - date (optional YYYY-MM-DD, defaults to today)
        - remarks (optional string, defaults to 'Initial Godown Opening Stock')
        """
        company_id = getattr(request.user, 'CompanyId', 1) or 1
        data = request.data
        product_id = data.get('product_id') or data.get('ProductId')
        filled_qty = Decimal(str(data.get('filled_quantity') or data.get('FilledQuantity') or 0))
        empty_qty = Decimal(str(data.get('empty_quantity') or data.get('EmptyQuantity') or 0))
        stock_date = data.get('date') or date.today()
        remarks = data.get('remarks') or 'Initial Godown Opening Stock'

        if not product_id:
            return Response({'detail': 'Product is required.'}, status=status.HTTP_400_BAD_REQUEST)

        product = Product.objects.filter(ProductId=product_id, CompanyId=company_id).first()
        if not product:
            return Response({'detail': 'Product not found.'}, status=status.HTTP_404_NOT_FOUND)

        if filled_qty <= 0 and empty_qty <= 0:
            return Response({'detail': 'Please provide at least a filled or empty stock quantity greater than 0.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            cost_rate = product.PurchasePrice or Decimal('0.00')
            unit_id = product.Unit_id or 1

            if filled_qty > 0:
                StockMovement.objects.create(
                    CompanyId=company_id,
                    Product=product,
                    Unit_id=unit_id,
                    RouteVehicleDriverId=1,
                    TransactionType='OPENING_STOCK',
                    ReferenceId=product.ProductId,
                    TransactionNo=f"OPN-{product.ProductId}",
                    TransactionDate=stock_date,
                    InQty=filled_qty,
                    OutQty=Decimal('0.00'),
                    InCostRate=cost_rate,
                    InCostAmount=filled_qty * cost_rate,
                    Narration=remarks
                )

            if empty_qty > 0:
                StockMovement.objects.create(
                    CompanyId=company_id,
                    Product=product,
                    Unit_id=unit_id,
                    RouteVehicleDriverId=1,
                    TransactionType='OPENING_EMPTY',
                    ReferenceId=product.ProductId,
                    TransactionNo=f"OPN-EMP-{product.ProductId}",
                    TransactionDate=stock_date,
                    InQty=empty_qty,
                    OutQty=Decimal('0.00'),
                    InCostRate=Decimal('0.00'),
                    InCostAmount=Decimal('0.00'),
                    Narration=f"{remarks} (Empty Cylinders)"
                )

        return Response({
            'success': True,
            'message': f'Successfully added godown inventory for {product.ProductName}: {filled_qty} filled, {empty_qty} empties.'
        })

    @action(detail=False, methods=['get'], url_path='van-stock')
    def van_stock(self, request):
        """Returns live stock available inside a specific van (RouteVehicleDriverId)"""
        qp = getattr(request, 'query_params', getattr(request, 'GET', {}))
        allocation_id = qp.get('allocation_id') or qp.get('rvd_id') or qp.get('RouteVehicleDriverId')
        if not allocation_id:
            return Response({'detail': 'allocation_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        company_id = getattr(request.user, 'CompanyId', 1) or 1
        products = Product.objects.filter(CompanyId=company_id, IsActive=True).select_related('Category', 'Category__ParentCategory', 'Unit')

        # Check active Delivery Note: If none exists or status is COMPLETED / PENDING_APPROVAL, van is empty / awaiting next morning load
        latest_dn = DeliveryNote.objects.filter(
            CompanyId=company_id,
            RouteVehicleDriver_id=allocation_id
        ).order_by('-DeliveryNoteId').first()

        is_awaiting_new_load = False
        if not latest_dn or latest_dn.Status in ['COMPLETED', 'PENDING_APPROVAL']:
            is_awaiting_new_load = True

        stock_list = []
        if is_awaiting_new_load:
            for p in products:
                cat_name = p.Category.CategoryName if p.Category else ''
                parent_cat = p.Category.ParentCategory.CategoryName if p.Category and p.Category.ParentCategory else ''
                is_cylinder = ('cylinder' in cat_name.lower()) or ('cylinder' in parent_cat.lower()) or ('gas cylinder' in p.ProductName.lower())
                is_other = not is_cylinder or ('other' in cat_name.lower()) or ('other' in parent_cat.lower())
                stock_list.append({
                    'ProductId': p.ProductId,
                    'ProductName': p.ProductName,
                    'AppProductName': p.AppProductName or p.ProductName,
                    'ProductCode': p.ProductCode,
                    'CategoryName': cat_name,
                    'ParentCategoryName': parent_cat,
                    'IsCylinder': is_cylinder,
                    'IsOther': is_other,
                    'AllocatedQty': 0.0,
                    'DeliveredQty': 0.0,
                    'BalanceQty': 0.0,
                    'EmptyQty': 0.0,
                    'OnboardQty': 0.0,
                    'UnitName': p.Unit.UnitName if p.Unit else '',
                    'SalesPrice': float(p.SalesPrice or 0),
                    'GSTPercentage': float(p.GSTPercentage or 0),
                    'HSNCode': p.HSNCode or '',
                })
            return Response(stock_list)

        # Base movements for this van allocation
        base_movs = StockMovement.objects.filter(
            CompanyId=company_id,
            RouteVehicleDriverId=allocation_id
        )
        if latest_dn and latest_dn.Status == 'LOADED':
            last_settled = DeliveryNote.objects.filter(
                CompanyId=company_id,
                RouteVehicleDriver_id=allocation_id,
                Status__in=['COMPLETED', 'PENDING_APPROVAL']
            ).order_by('-DeliveryNoteId').first()

            loaded_notes_qs = DeliveryNote.objects.filter(
                CompanyId=company_id,
                RouteVehicleDriver_id=allocation_id,
                Status='LOADED'
            )
            if last_settled:
                loaded_notes_qs = loaded_notes_qs.filter(DeliveryNoteId__gt=last_settled.DeliveryNoteId)
            first_shift_dn = loaded_notes_qs.order_by('DeliveryNoteId').first()

            if first_shift_dn:
                first_dn_sm = StockMovement.objects.filter(
                    RouteVehicleDriverId=allocation_id,
                    ReferenceId=first_shift_dn.DeliveryNoteId,
                    TransactionType='DELIVERY_NOTE'
                ).order_by('StockMovementId').first()
                if first_dn_sm:
                    base_movs = base_movs.filter(StockMovementId__gte=first_dn_sm.StockMovementId)

        for p in products:
            v_movs = base_movs.filter(Product=p)
            dn_in = v_movs.filter(TransactionType='DELIVERY_NOTE').aggregate(s=Sum('InQty'))['s'] or Decimal('0.00')
            sale_out = v_movs.filter(TransactionType='VAN_SALE').aggregate(s=Sum('OutQty'))['s'] or Decimal('0.00')
            unload_full = v_movs.filter(TransactionType='VAN_UNLOAD_FULL').aggregate(s=Sum('OutQty'))['s'] or Decimal('0.00')
            v_bal = max(Decimal('0.00'), dn_in - sale_out - unload_full)

            empty_in = v_movs.filter(TransactionType='VAN_EMPTY_RETURN').aggregate(s=Sum('InQty'))['s'] or Decimal('0.00')
            empty_out = v_movs.filter(TransactionType='VAN_UNLOAD_EMPTY').aggregate(s=Sum('OutQty'))['s'] or Decimal('0.00')
            empty_bal = max(Decimal('0.00'), empty_in - empty_out)

            cat_name = p.Category.CategoryName if p.Category else ''
            parent_cat = p.Category.ParentCategory.CategoryName if p.Category and p.Category.ParentCategory else ''

            is_cylinder = ('cylinder' in cat_name.lower()) or ('cylinder' in parent_cat.lower()) or ('gas cylinder' in p.ProductName.lower())
            is_other = not is_cylinder or ('other' in cat_name.lower()) or ('other' in parent_cat.lower())

            stock_list.append({
                'ProductId': p.ProductId,
                'ProductName': p.ProductName,
                'AppProductName': p.AppProductName or p.ProductName,
                'ProductCode': p.ProductCode,
                'CategoryName': cat_name,
                'ParentCategoryName': parent_cat,
                'IsCylinder': is_cylinder,
                'IsOther': is_other,
                'AllocatedQty': float(dn_in),
                'DeliveredQty': float(sale_out),
                'BalanceQty': float(v_bal),
                'EmptyQty': float(empty_bal),
                'OnboardQty': float(v_bal),
                'UnitName': p.Unit.UnitName if p.Unit else '',
                'SalesPrice': float(p.SalesPrice or 0),
                'GSTPercentage': float(p.GSTPercentage or 0),
                'HSNCode': p.HSNCode or '',
            })
        return Response(stock_list)

    @action(detail=False, methods=['get'], url_path='stock-analysis')
    def stock_analysis(self, request):
        """
        Comprehensive stock analysis endpoint:
        Provides system-wide stock overview, Godown vs Allocated Breakdown,
        product-level distribution, and vehicle/van onboard inventory.
        """
        company_id = getattr(request.user, 'CompanyId', 1) or 1
        products = Product.objects.filter(CompanyId=company_id, IsActive=True).select_related('Unit')
        allocations_qs = RouteVehicleDriver.objects.filter(
            CompanyId=company_id, IsActive=True
        ).exclude(RouteVehicleDriverId=1).select_related('Route', 'Vehicle', 'Driver')

        # Also find any other registered active vehicles (excluding Godown and Office)
        allocated_vehicle_ids = set(allocations_qs.values_list('Vehicle_id', flat=True))
        all_active_vehicles = Vehicle.objects.filter(
            CompanyId=company_id, IsActive=True
        ).exclude(VehicleId=1).exclude(VehicleNumber__in=['Godown Stock', 'OFFICE'])

        all_movements = StockMovement.objects.filter(CompanyId=company_id)

        alloc_van_map = {}
        alloc_active_sm_id = {}
        for a in allocations_qs:
            alloc_van_map[a.RouteVehicleDriverId] = {
                'RouteVehicleDriverId': a.RouteVehicleDriverId,
                'VehicleNumber': a.Vehicle.VehicleNumber if a.Vehicle else '',
                'RouteName': a.Route.RouteName if a.Route else '',
                'DriverName': a.Driver.DriverName if a.Driver else '',
                'TotalCylinders': 0.0,
                'AllocatedCylinders': 0.0,
                'DeliveredCylinders': 0.0,
                'BalanceCylinders': 0.0,
                'EmptyCylinders': 0.0,
                'OtherProductsAllocated': 0.0,
                'OtherProductsDelivered': 0.0,
                'OtherProductsBalance': 0.0,
                'EstimatedValue': 0.0,
                'Products': []
            }

            # Scope each van's onboard stock to its current active shift (LOADED or PENDING_APPROVAL)
            active_dn = DeliveryNote.objects.filter(
                CompanyId=company_id,
                RouteVehicleDriver_id=a.RouteVehicleDriverId,
                Status__in=['LOADED', 'PENDING_APPROVAL']
            ).order_by('-DeliveryNoteId').first()

            if active_dn:
                first_sm = StockMovement.objects.filter(
                    CompanyId=company_id,
                    RouteVehicleDriverId=a.RouteVehicleDriverId,
                    ReferenceId=active_dn.DeliveryNoteId,
                    TransactionType='DELIVERY_NOTE'
                ).order_by('StockMovementId').first()
                if first_sm:
                    alloc_active_sm_id[a.RouteVehicleDriverId] = first_sm.StockMovementId
                else:
                    first_any_sm = StockMovement.objects.filter(
                        CompanyId=company_id,
                        RouteVehicleDriverId=a.RouteVehicleDriverId,
                        TransactionDate__gte=active_dn.DeliveryDate
                    ).order_by('StockMovementId').first()
                    if first_any_sm:
                        alloc_active_sm_id[a.RouteVehicleDriverId] = first_any_sm.StockMovementId

        # Add any unallocated registered vehicles so they appear as locations even with 0 stock
        for uv in all_active_vehicles.exclude(VehicleId__in=allocated_vehicle_ids):
            alloc_van_map[f"veh-{uv.VehicleId}"] = {
                'RouteVehicleDriverId': None,
                'VehicleId': uv.VehicleId,
                'VehicleNumber': uv.VehicleNumber,
                'RouteName': 'Unassigned Route',
                'DriverName': 'Unassigned',
                'TotalCylinders': 0.0,
                'AllocatedCylinders': 0.0,
                'DeliveredCylinders': 0.0,
                'BalanceCylinders': 0.0,
                'EmptyCylinders': 0.0,
                'OtherProductsAllocated': 0.0,
                'OtherProductsDelivered': 0.0,
                'OtherProductsBalance': 0.0,
                'EstimatedValue': 0.0,
                'Products': []
            }

        product_analysis = []
        total_godown_filled = Decimal('0.00')
        total_godown_empty = Decimal('0.00')
        total_allocated_filled = Decimal('0.00')
        total_allocated_empty = Decimal('0.00')
        total_system_value = Decimal('0.00')

        for p in products:
            cat_n = p.Category.CategoryName.lower() if p.Category else ''
            p_n = p.ProductName.lower()
            is_cylinder = ('cylinder' in cat_n) or ('cylinder' in p_n) or ('kg' in p_n) or ('lpg' in p_n)

            # Central Godown Filled Stock
            g_in = all_movements.filter(
                Product=p,
                RouteVehicleDriverId=1,
                TransactionType__in=['PURCHASE', 'GODOWN_RETURN_FULL', 'RECEIPT_NOTE_RETURN', 'OPENING_STOCK', 'ADJUSTMENT_IN']
            ).aggregate(tot=Sum('InQty'))['tot'] or Decimal('0.00')
            g_out = all_movements.filter(
                Product=p,
                RouteVehicleDriverId=1,
                TransactionType__in=['DELIVERY_NOTE', 'PURCHASE_RETURN', 'ADJUSTMENT_OUT']
            ).aggregate(tot=Sum('OutQty'))['tot'] or Decimal('0.00')
            g_qty = max(Decimal('0.00'), g_in - g_out)
            total_godown_filled += g_qty

            p_allocated = Decimal('0.00')
            p_vans = []

            # Latest price from StockMovement table (InCostRate / OutCostRate)
            latest_mov = all_movements.filter(
                Product=p
            ).filter(
                Q(InCostRate__gt=0) | Q(OutCostRate__gt=0)
            ).order_by('-TransactionDate', '-StockMovementId').first()

            if latest_mov:
                purch_rate = latest_mov.InCostRate or latest_mov.OutCostRate
            else:
                purch_rate = p.PurchasePrice or Decimal('0.00')

            unit_conv = Decimal(str(p.UnitConversion or 1))

            for a_id, van_obj in alloc_van_map.items():
                start_sm_id = alloc_active_sm_id.get(a_id)
                if start_sm_id:
                    v_movs = all_movements.filter(Product=p, RouteVehicleDriverId=a_id, StockMovementId__gte=start_sm_id)
                    dn_in = v_movs.filter(TransactionType='DELIVERY_NOTE').aggregate(s=Sum('InQty'))['s'] or Decimal('0.00')
                    sale_out = v_movs.filter(TransactionType='VAN_SALE').aggregate(s=Sum('OutQty'))['s'] or Decimal('0.00')
                    unload_full = v_movs.filter(TransactionType='VAN_UNLOAD_FULL').aggregate(s=Sum('OutQty'))['s'] or Decimal('0.00')
                    v_bal = max(Decimal('0.00'), dn_in - sale_out - unload_full)

                    empty_in = v_movs.filter(TransactionType='VAN_EMPTY_RETURN').aggregate(s=Sum('InQty'))['s'] or Decimal('0.00')
                    empty_out = v_movs.filter(TransactionType='VAN_UNLOAD_EMPTY').aggregate(s=Sum('OutQty'))['s'] or Decimal('0.00')
                    van_empty_bal = max(Decimal('0.00'), empty_in - empty_out)
                else:
                    dn_in = Decimal('0.00')
                    sale_out = Decimal('0.00')
                    unload_full = Decimal('0.00')
                    v_bal = Decimal('0.00')
                    empty_in = Decimal('0.00')
                    empty_out = Decimal('0.00')
                    van_empty_bal = Decimal('0.00')

                if dn_in > 0 or sale_out > 0 or v_bal > 0 or van_empty_bal > 0:
                    val = float(v_bal * unit_conv * purch_rate)
                    van_obj['EstimatedValue'] += val

                    p_allocated += v_bal
                    if is_cylinder:
                        van_obj['AllocatedCylinders'] += float(dn_in)
                        van_obj['DeliveredCylinders'] += float(sale_out)
                        van_obj['BalanceCylinders'] += float(v_bal)
                        van_obj['EmptyCylinders'] += float(van_empty_bal)
                        van_obj['TotalCylinders'] += float(v_bal)
                    else:
                        van_obj['OtherProductsAllocated'] += float(dn_in)
                        van_obj['OtherProductsDelivered'] += float(sale_out)
                        van_obj['OtherProductsBalance'] += float(v_bal)

                    p_vans.append({
                        'RouteVehicleDriverId': a_id,
                        'VehicleNumber': van_obj['VehicleNumber'],
                        'RouteName': van_obj['RouteName'],
                        'DriverName': van_obj['DriverName'],
                        'AllocatedQty': float(dn_in),
                        'DeliveredQty': float(sale_out),
                        'BalanceQty': float(v_bal),
                        'EmptyQty': float(van_empty_bal),
                        'Qty': float(v_bal),
                        'IsCylinder': is_cylinder,
                    })

                    van_obj['Products'].append({
                        'ProductId': p.ProductId,
                        'ProductName': p.ProductName,
                        'AppProductName': p.AppProductName or p.ProductName,
                        'ProductCode': p.ProductCode or '—',
                        'CategoryName': p.Category.CategoryName if p.Category else 'General',
                        'IsCylinder': is_cylinder,
                        'AllocatedQty': float(dn_in),
                        'DeliveredQty': float(sale_out),
                        'BalanceQty': float(v_bal),
                        'EmptyQty': float(van_empty_bal),
                        'Qty': float(v_bal),
                        'SalesPrice': float(p.SalesPrice or 0),
                        'EstimatedValue': val,
                    })

            total_p_qty = g_qty + p_allocated
            alt_qty = total_p_qty * unit_conv
            p_val = alt_qty * purch_rate
            total_system_value += p_val

            # Total Empty Cylinders in System: Van empties + Godown empties
            p_empty = sum(v['EmptyQty'] for v in p_vans)
            g_empty = all_movements.filter(
                Product=p,
                RouteVehicleDriverId=1,
                TransactionType__in=['GODOWN_RETURN_EMPTY', 'VAN_UNLOAD_EMPTY', 'RECEIPT_NOTE_EMPTY_RETURN', 'VAN_EMPTY_RETURN', 'OPENING_EMPTY', 'ADJUSTMENT_EMPTY_IN']
            ).aggregate(s=Sum('InQty'))['s'] or Decimal('0.00')
            g_empty_out = all_movements.filter(
                Product=p,
                RouteVehicleDriverId=1,
                TransactionType__in=['PURCHASE_EMPTY_RETURN', 'FACTORY_EMPTY_RETURN']
            ).aggregate(s=Sum('OutQty'))['s'] or Decimal('0.00')
            g_empty_bal = max(Decimal('0.00'), g_empty - g_empty_out) if is_cylinder else Decimal('0.00')
            total_empty = float(p_empty) + float(g_empty_bal) if is_cylinder else 0.0

            if is_cylinder:
                total_godown_empty += g_empty_bal
                total_allocated_filled += p_allocated
                total_allocated_empty += Decimal(str(p_empty))
            else:
                total_allocated_filled += p_allocated

            product_analysis.append({
                'ProductId': p.ProductId,
                'ProductName': p.ProductName,
                'AppProductName': p.AppProductName or p.ProductName,
                'ProductCode': p.ProductCode,
                'UnitName': 'Cyls' if is_cylinder else (p.Unit.UnitName if p.Unit else 'Nos'),
                'AltUnitName': p.Unit.UnitName if p.Unit else 'KG',
                'UnitConversion': float(unit_conv),
                'AltQty': float(alt_qty),
                'SalesPrice': float(p.SalesPrice or 0),
                'PurchasePrice': float(purch_rate),
                'Rate': float(purch_rate),
                'GodownQty': float(g_qty),
                'GodownFilledQty': float(g_qty),
                'GodownEmptyQty': float(g_empty_bal),
                'AllocatedQty': float(p_allocated),
                'FilledQty': float(total_p_qty),
                'EmptyQty': total_empty,
                'TotalQty': float(total_p_qty) + total_empty,
                'TotalStockQty': float(total_p_qty) + total_empty,
                'TotalValue': float(p_val),
                'AllocationRate': round(float((p_allocated / total_p_qty) * 100), 1) if total_p_qty > 0 else 0.0,
                'IsCylinder': is_cylinder,
                'Vans': p_vans
            })

        # Sort product_analysis: Cylinders first, then other products
        product_analysis.sort(key=lambda p: (not p.get('IsCylinder', False), p.get('ProductName', '')))

        for van_obj in alloc_van_map.values():
            van_obj['Products'].sort(key=lambda p: (not p.get('IsCylinder', False), p.get('ProductName', '')))

        active_vans = [v for v in alloc_van_map.values() if (v['TotalCylinders'] > 0 or v['AllocatedCylinders'] > 0 or v['OtherProductsAllocated'] > 0 or v.get('EmptyCylinders', 0) > 0)]
        empty_vans = [v for v in alloc_van_map.values() if v not in active_vans]

        total_godown = total_godown_filled + total_godown_empty
        total_allocated = total_allocated_filled + total_allocated_empty
        total_system = total_godown + total_allocated
        godown_pct = round(float((total_godown / total_system) * 100), 1) if total_system > 0 else 0.0
        allocated_pct = round(float((total_allocated / total_system) * 100), 1) if total_system > 0 else 0.0

        recent_notes_qs = DeliveryNote.objects.filter(CompanyId=company_id).select_related(
            'RouteVehicleDriver__Vehicle', 'RouteVehicleDriver__Route', 'RouteVehicleDriver__Driver'
        ).order_by('-DeliveryDate', '-DeliveryNoteId')[:10]

        recent_notes = []
        for n in recent_notes_qs:
            total_cyls = sum(line.Quantity for line in n.lines.all())
            recent_notes.append({
                'DeliveryNoteId': n.DeliveryNoteId,
                'DeliveryNoteNo': n.DeliveryNoteNo,
                'DeliveryDate': str(n.DeliveryDate),
                'VehicleNumber': n.RouteVehicleDriver.Vehicle.VehicleNumber if n.RouteVehicleDriver and n.RouteVehicleDriver.Vehicle else '',
                'RouteName': n.RouteVehicleDriver.Route.RouteName if n.RouteVehicleDriver and n.RouteVehicleDriver.Route else '',
                'DriverName': n.RouteVehicleDriver.Driver.DriverName if n.RouteVehicleDriver and n.RouteVehicleDriver.Driver else '',
                'TotalCylinders': float(total_cyls),
                'Status': n.Status
            })

        # Pending Shift Return Receipt Notes from Mobile Drivers
        pending_rn_qs = ReceiptNote.objects.filter(
            CompanyId=company_id, Status='RECEIPT_PENDING'
        ).select_related(
            'RouteVehicleDriver__Vehicle', 'RouteVehicleDriver__Route', 'RouteVehicleDriver__Driver'
        ).order_by('-ReceiptDate', '-ReceiptNoteId')

        pending_receipt_notes = []
        for prn in pending_rn_qs:
            lines = []
            for ln in prn.lines.select_related('Product').all():
                lines.append({
                    'LineId': ln.ReceiptNoteLineId,
                    'ProductId': ln.Product.ProductId if ln.Product else None,
                    'ProductName': ln.Product.ProductName if ln.Product else '',
                    'Quantity': float(ln.Quantity or 0),
                    'EmptyReturnedQty': 0,
                })
            pending_receipt_notes.append({
                'DeliveryNoteId': prn.ReceiptNoteId,
                'ReceiptNoteId': prn.ReceiptNoteId,
                'DeliveryNoteNo': prn.ReceiptNoteNo,
                'DeliveryDate': str(prn.ReceiptDate),
                'AllocationId': prn.RouteVehicleDriverId,
                'VehicleNumber': prn.RouteVehicleDriver.Vehicle.VehicleNumber if prn.RouteVehicleDriver and prn.RouteVehicleDriver.Vehicle else 'Delivery Van',
                'DriverName': prn.RouteVehicleDriver.Driver.DriverName if prn.RouteVehicleDriver and prn.RouteVehicleDriver.Driver else 'Driver',
                'RouteName': prn.RouteVehicleDriver.Route.RouteName if prn.RouteVehicleDriver and prn.RouteVehicleDriver.Route else '',
                'TotalFull': sum(l['Quantity'] for l in lines),
                'TotalEmpties': 0,
                'Remarks': prn.Remarks or '',
                'Lines': lines,
                'CreatedTime': prn.CreatedAt.strftime('%I:%M %p') if (hasattr(prn, 'CreatedAt') and prn.CreatedAt) else '',
            })

        # Today\'s live driver delivery sales
        today = date.today()
        today_sales_movs = StockMovement.objects.filter(
            CompanyId=company_id,
            TransactionDate=today,
            TransactionType='VAN_SALE'
        ).select_related('Product').order_by('-StockMovementId')

        sales_by_ticket = {}
        for sm in today_sales_movs:
            ticket = sm.TransactionNo or f'TKT-{sm.StockMovementId}'
            if ticket not in sales_by_ticket:
                narr = sm.Narration or ''
                cust_name = 'Counter Customer'
                p_method = 'Cash'
                typed_amt = 0.0
                if 'Sold to ' in narr:
                    parts = narr.replace('Sold to ', '').split(' • ')
                    cust_name = parts[0].strip()
                    if len(parts) > 1:
                        p_method = parts[1].strip()
                    if len(parts) > 2 and 'Amount: ' in parts[2]:
                        try:
                            typed_amt = float(parts[2].replace('Amount: ', '').strip())
                        except:
                            typed_amt = 0.0

                alloc_info = alloc_van_map.get(sm.RouteVehicleDriverId, {})
                sales_by_ticket[ticket] = {
                    'TicketNumber': ticket,
                    'AllocationId': sm.RouteVehicleDriverId,
                    'VehicleNumber': alloc_info.get('VehicleNumber') or 'Van',
                    'DriverName': alloc_info.get('DriverName') or 'Driver',
                    'CustomerName': cust_name,
                    'PaymentMethod': p_method,
                    'DeliveredCylinders': 0,
                    'EmptyReturns': 0,
                    'TotalAmount': typed_amt,
                    'Time': sm.CreatedAt.strftime('%I:%M %p') if (hasattr(sm, 'CreatedAt') and sm.CreatedAt) else '',
                    'Items': []
                }

            qty = float(sm.OutQty or 0)
            rate = float(sm.OutCostRate or 0)
            cat_n = sm.Product.Category.CategoryName.lower() if (sm.Product and sm.Product.Category) else ''
            p_n = sm.Product.ProductName.lower() if sm.Product else ''
            is_cyl = ('cylinder' in cat_n) or ('cylinder' in p_n) or ('kg' in p_n) or ('lpg' in p_n)

            if is_cyl:
                sales_by_ticket[ticket]['DeliveredCylinders'] += int(qty)
            if sales_by_ticket[ticket]['TotalAmount'] == 0.0:
                sales_by_ticket[ticket]['TotalAmount'] += float(sm.OutCostAmount or (Decimal(str(qty)) * Decimal(str(rate))))
            sales_by_ticket[ticket]['Items'].append({
                'ProductName': sm.Product.ProductName if sm.Product else 'Gas Cylinder',
                'Qty': qty,
                'Rate': rate,
            })

        # Empty returns today
        today_empties = StockMovement.objects.filter(
            CompanyId=company_id,
            TransactionDate=today,
            TransactionType='VAN_EMPTY_RETURN'
        )
        for em in today_empties:
            ticket = em.TransactionNo
            if ticket and ticket in sales_by_ticket:
                sales_by_ticket[ticket]['EmptyReturns'] += int(em.InQty or 0)

        today_deliveries = list(sales_by_ticket.values())

        # Attach live sales & collections to each van from Sales model (using actual PaidAmount)
        today_sales_all = Sales.objects.filter(
            CompanyId=company_id,
            SalesDate=today
        ).exclude(Status='CANCELLED')

        sales_map_by_alloc = {}
        for s in today_sales_all:
            al_id = s.RouteVehicleDriver_id
            if al_id:
                if al_id not in sales_map_by_alloc:
                    sales_map_by_alloc[al_id] = []
                sales_map_by_alloc[al_id].append(s)

        for a_id, van_obj in alloc_van_map.items():
            van_sales = [d for d in today_deliveries if d.get('AllocationId') == a_id]
            van_obj['LiveSales'] = van_sales

            alloc_sales = sales_map_by_alloc.get(a_id, [])
            if alloc_sales:
                van_obj['CashCollection'] = sum(
                    float(s.PaidAmount or 0) for s in alloc_sales if (s.PaymentMethod or '').lower() == 'cash'
                )
                van_obj['BankCollection'] = sum(
                    float(s.PaidAmount or 0) for s in alloc_sales if (s.PaymentMethod or '').lower() != 'cash'
                )
            else:
                van_obj['CashCollection'] = sum(float(s.get('TotalAmount', 0)) for s in van_sales if s.get('PaymentMethod', '').lower() == 'cash')
                van_obj['BankCollection'] = sum(float(s.get('TotalAmount', 0)) for s in van_sales if s.get('PaymentMethod', '').lower() != 'cash')
            van_obj['TotalCollection'] = van_obj['CashCollection'] + van_obj['BankCollection']

        # Construct comprehensive routes overview for Dashboard
        routes_overview = []
        all_routes = Route.objects.filter(CompanyId=company_id, IsActive=True)
        for r in all_routes:
            matched_van = next((v for v in alloc_van_map.values() if v.get('RouteName') == r.RouteName), None)
            if matched_van:
                routes_overview.append({
                    'RouteId': r.RouteId,
                    'RouteName': r.RouteName,
                    'AllocationId': matched_van['RouteVehicleDriverId'],
                    'VehicleNumber': matched_van['VehicleNumber'],
                    'DriverName': matched_van['DriverName'],
                    'FilledStock': matched_van.get('BalanceCylinders', 0.0),
                    'EmptyStock': matched_van.get('EmptyCylinders', 0.0),
                    'DeliveredStock': matched_van.get('DeliveredCylinders', 0.0),
                    'TotalStock': matched_van.get('BalanceCylinders', 0.0) + matched_van.get('EmptyCylinders', 0.0),
                    'CashCollection': matched_van.get('CashCollection', 0.0),
                    'BankCollection': matched_van.get('BankCollection', 0.0),
                    'TotalCollection': matched_van.get('TotalCollection', 0.0),
                    'LiveSales': matched_van.get('LiveSales', []),
                    'IsActive': True,
                })
            else:
                routes_overview.append({
                    'RouteId': r.RouteId,
                    'RouteName': r.RouteName,
                    'AllocationId': None,
                    'VehicleNumber': '—',
                    'DriverName': 'Unassigned',
                    'FilledStock': 0.0,
                    'EmptyStock': 0.0,
                    'DeliveredStock': 0.0,
                    'TotalStock': 0.0,
                    'CashCollection': 0.0,
                    'BankCollection': 0.0,
                    'TotalCollection': 0.0,
                    'LiveSales': [],
                    'IsActive': False,
                })

        # Last sync time (time this live stock snapshot was fetched)
        last_sync_str = datetime.now().strftime('%I:%M %p')

        return Response({
            'summary': {
                'total_system_cylinders': float(total_system),
                'total_godown_cylinders': float(total_godown),
                'total_godown_filled': float(total_godown_filled),
                'total_godown_empty': float(total_godown_empty),
                'total_allocated_cylinders': float(total_allocated),
                'total_allocated_filled': float(total_allocated_filled),
                'total_allocated_empty': float(total_allocated_empty),
                'total_system_value': float(total_system_value),
                'active_vans_count': len(active_vans),
                'total_registered_vans': len(alloc_van_map),
                'godown_percentage': godown_pct,
                'allocated_percentage': allocated_pct,
                'today_deliveries_count': len(today_deliveries),
                'pending_receipts_count': len(pending_receipt_notes),
                'last_sync_time': last_sync_str,
            },
            'products': product_analysis,
            'all_vans': list(alloc_van_map.values()),
            'active_vans': active_vans,
            'idle_vans': empty_vans,
            'routes_overview': routes_overview,
            'recent_notes': recent_notes,
            'pending_receipt_notes': pending_receipt_notes,
            'today_deliveries': today_deliveries,
            'last_sync_time': last_sync_str,
        })

    def create(self, request, *args, **kwargs):
        data = request.data
        company_id = getattr(request.user, 'CompanyId', 1) or 1
        allocation_id = data.get('RouteVehicleDriver')
        delivery_date = data.get('DeliveryDate') or date.today()
        remarks = data.get('Remarks', '')
        lines_data = data.get('lines', [])

        if not allocation_id:
            return Response({'detail': 'Please select a Route / Vehicle / Driver allocation.'}, status=status.HTTP_400_BAD_REQUEST)
        if not lines_data:
            return Response({'detail': 'Please add at least one cylinder or item to load.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # 1. Generate DeliveryNoteNo
            last_dn = DeliveryNote.objects.order_by('-DeliveryNoteId').first()
            next_num = (last_dn.DeliveryNoteId + 1) if last_dn else 1
            dn_no = data.get('DeliveryNoteNo') or f"DN-{next_num:04d}"
            while DeliveryNote.objects.filter(DeliveryNoteNo=dn_no).exists():
                next_num += 1
                dn_no = f"DN-{next_num:04d}"

            # 2. Create Delivery Note Header
            delivery_note = DeliveryNote.objects.create(
                DeliveryNoteNo=dn_no,
                DeliveryDate=delivery_date,
                RouteVehicleDriver_id=allocation_id,
                CompanyId=company_id,
                Remarks=remarks,
                Status='LOADED'
            )

            # 3. Create Lines & Balanced Stock Movements
            for item in lines_data:
                product_id = item.get('ProductId')
                unit_id = item.get('UnitId')
                qty = Decimal(str(item.get('Quantity') or 0))
                rate = Decimal(str(item.get('Rate') or 0))
                amt = qty * rate

                if qty <= 0:
                    continue

                line = DeliveryNoteLine.objects.create(
                    DeliveryNote=delivery_note,
                    Product_id=product_id,
                    Unit_id=unit_id,
                    Quantity=qty,
                    Rate=rate,
                    Amount=amt
                )

                # Deduct from Godown Stock (RouteVehicleDriverId = 1)
                StockMovement.objects.create(
                    CompanyId=company_id,
                    Product_id=product_id,
                    Unit_id=unit_id,
                    RouteVehicleDriverId=1,
                    TransactionType='DELIVERY_NOTE',
                    ReferenceId=delivery_note.DeliveryNoteId,
                    ReferenceLineId=line.DeliveryNoteLineId,
                    TransactionNo=delivery_note.DeliveryNoteNo,
                    TransactionDate=delivery_note.DeliveryDate,
                    InQty=Decimal('0.00'),
                    OutQty=qty,
                    OutCostRate=rate,
                    OutCostAmount=amt,
                    Narration=f"Loaded to Van: {delivery_note.DeliveryNoteNo}"
                )

                # Add into Van Allocation Stock (RouteVehicleDriverId = allocation_id)
                StockMovement.objects.create(
                    CompanyId=company_id,
                    Product_id=product_id,
                    Unit_id=unit_id,
                    RouteVehicleDriverId=allocation_id,
                    TransactionType='DELIVERY_NOTE',
                    ReferenceId=delivery_note.DeliveryNoteId,
                    ReferenceLineId=line.DeliveryNoteLineId,
                    TransactionNo=delivery_note.DeliveryNoteNo,
                    TransactionDate=delivery_note.DeliveryDate,
                    InQty=qty,
                    InCostRate=rate,
                    InCostAmount=amt,
                    OutQty=Decimal('0.00'),
                    Narration=f"Van Load: {delivery_note.DeliveryNoteNo}"
                )

        serializer = self.get_serializer(delivery_note)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        data = request.data
        company_id = instance.CompanyId or getattr(request.user, 'CompanyId', 1) or 1
        allocation_id = data.get('RouteVehicleDriver') or instance.RouteVehicleDriver_id
        delivery_date = data.get('DeliveryDate') or instance.DeliveryDate
        remarks = data.get('Remarks', instance.Remarks)
        lines_data = data.get('lines', [])

        if not allocation_id:
            return Response({'detail': 'Please select a Route / Vehicle / Driver allocation.'}, status=status.HTTP_400_BAD_REQUEST)
        if not lines_data:
            return Response({'detail': 'Please add at least one cylinder or item to load.'}, status=status.HTTP_400_BAD_REQUEST)

        # If changing allocation to another vehicle/van, ensure the target does not have an active LOADED note
        if allocation_id != instance.RouteVehicleDriver_id:
            target_already_active = DeliveryNote.objects.filter(
                CompanyId=company_id,
                RouteVehicleDriver_id=allocation_id,
                Status='LOADED'
            ).exclude(DeliveryNoteId=instance.DeliveryNoteId).exists()
            if target_already_active:
                return Response(
                    {'detail': 'The target vehicle/van already has an active loaded shift. End or settle that shift first.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        with transaction.atomic():
            # 1. Delete old stock movements and lines
            StockMovement.objects.filter(
                TransactionType='DELIVERY_NOTE',
                ReferenceId=instance.DeliveryNoteId
            ).delete()
            instance.lines.all().delete()

            # 2. Update Delivery Note Header
            instance.RouteVehicleDriver_id = allocation_id
            instance.DeliveryDate = delivery_date
            instance.Remarks = remarks
            instance.save()

            # 3. Create fresh Lines & Balanced Stock Movements
            for item in lines_data:
                product_id = item.get('ProductId')
                unit_id = item.get('UnitId')
                qty = Decimal(str(item.get('Quantity') or 0))
                rate = Decimal(str(item.get('Rate') or 0))
                amt = qty * rate

                if qty <= 0:
                    continue

                line = DeliveryNoteLine.objects.create(
                    DeliveryNote=instance,
                    Product_id=product_id,
                    Unit_id=unit_id,
                    Quantity=qty,
                    Rate=rate,
                    Amount=amt
                )

                # Deduct from Godown Stock (RouteVehicleDriverId = 1)
                StockMovement.objects.create(
                    CompanyId=company_id,
                    Product_id=product_id,
                    Unit_id=unit_id,
                    RouteVehicleDriverId=1,
                    TransactionType='DELIVERY_NOTE',
                    ReferenceId=instance.DeliveryNoteId,
                    ReferenceLineId=line.DeliveryNoteLineId,
                    TransactionNo=instance.DeliveryNoteNo,
                    TransactionDate=instance.DeliveryDate,
                    InQty=Decimal('0.00'),
                    OutQty=qty,
                    OutCostRate=rate,
                    OutCostAmount=amt,
                    Narration=f"Loaded to Van: {instance.DeliveryNoteNo}"
                )

                # Add into Van Allocation Stock (RouteVehicleDriverId = allocation_id)
                StockMovement.objects.create(
                    CompanyId=company_id,
                    Product_id=product_id,
                    Unit_id=unit_id,
                    RouteVehicleDriverId=allocation_id,
                    TransactionType='DELIVERY_NOTE',
                    ReferenceId=instance.DeliveryNoteId,
                    ReferenceLineId=line.DeliveryNoteLineId,
                    TransactionNo=instance.DeliveryNoteNo,
                    TransactionDate=instance.DeliveryDate,
                    InQty=qty,
                    InCostRate=rate,
                    InCostAmount=amt,
                    OutQty=Decimal('0.00'),
                    Narration=f"Van Load: {instance.DeliveryNoteNo}"
                )

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        with transaction.atomic():
            # Delete associated stock movements
            StockMovement.objects.filter(
                Q(TransactionType__in=['DELIVERY_NOTE', 'RECEIPT_NOTE', 'RECEIPT_NOTE_RETURN']) |
                Q(ReferenceId=instance.DeliveryNoteId) |
                Q(TransactionNo=instance.DeliveryNoteNo)
            ).delete()
            instance.lines.all().delete()
            instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # =========================================================================
    # MOBILE DRIVER APP & LIVE DELIVERY SYNCHRONIZATION ENDPOINTS
    # =========================================================================

    @action(detail=False, methods=['post'], url_path='create_sale')
    def create_sale(self, request):
        """
        Record driver delivery sale from mobile app.
        1. Creates Sales and SalesLine records in database.
        2. Deducts delivered full cylinders from van stock (VAN_SALE).
        3. Records returned empty cylinders (VAN_EMPTY_RETURN).
        4. Creates double-entry financial Voucher (Debit Cash/SBI/Customer, Credit Sales Account).
        """
        data = request.data
        allocation_id = data.get('allocation_id')
        customer_ledger_id = data.get('customer_ledger_id')
        items = data.get('items', [])
        payment_method = data.get('payment_method', 'Cash')
        amount_collected = Decimal(str(data.get('amount_collected') or 0))

        if not allocation_id:
            return Response({'success': False, 'message': 'allocation_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not items:
            return Response({'success': False, 'message': 'At least one item required.'}, status=status.HTTP_400_BAD_REQUEST)

        company_id = getattr(request.user, 'CompanyId', 1) or 1
        alloc = RouteVehicleDriver.objects.filter(RouteVehicleDriverId=allocation_id).select_related('Route', 'Vehicle', 'Driver').first()
        customer = Ledger.objects.filter(LedgerId=customer_ledger_id).first() if customer_ledger_id else None
        customer_name = customer.LedgerName if customer else str(data.get('customer_name', 'Direct Customer'))

        # Generate unique ticket ID
        today_str = date.today().strftime('%y%m%d')
        sale_count = StockMovement.objects.filter(CompanyId=company_id, TransactionType='VAN_SALE', TransactionDate=date.today()).values('TransactionNo').distinct().count() + 1
        ticket_id = data.get('ticket_id') or f"DT-{today_str}-{sale_count:03d}"
        if Sales.objects.filter(CompanyId=company_id, SalesNo=ticket_id).exists():
            ticket_id = f"DT-{today_str}-{int(time.time()) % 100000:05d}"

        with transaction.atomic():
            # 1. Parse and compute tax-inclusive GST breakdown per line
            # Gross Selling Price = Taxable Value + GST (e.g. 700 with 5% GST -> Taxable 666.67, CGST 16.67, SGST 16.66)
            total_deliv = Decimal('0.00')
            total_empty = Decimal('0.00')
            total_taxable_subtotal = Decimal('0.00')
            total_cgst_amount = Decimal('0.00')
            total_sgst_amount = Decimal('0.00')
            total_igst_amount = Decimal('0.00')
            total_gross_amount = Decimal('0.00')

            processed_items = []

            for idx, item in enumerate(items, 1):
                p_id = item.get('product_id') or item.get('productId') or item.get('ProductId')
                qty = Decimal(str(item.get('qty') or item.get('quantity') or item.get('deliveryQty') or 0))
                empty_qty = Decimal(str(item.get('empty_qty') or item.get('emptyReturnQty') or item.get('empty_quantity') or 0))
                rate = Decimal(str(item.get('rate') or item.get('price') or 0))

                prod = Product.objects.filter(ProductId=p_id).first() if p_id else None
                if not prod:
                    continue

                cat_n = prod.Category.CategoryName.lower() if prod.Category else ''
                p_n = prod.ProductName.lower()
                is_cylinder = ('cylinder' in cat_n) or ('cylinder' in p_n) or ('kg' in p_n) or ('lpg' in p_n)

                gross_unit_rate = rate or prod.SalesPrice or Decimal('0.00')
                line_gross_total = qty * gross_unit_rate

                gst_pct = Decimal(str(prod.GSTPercentage or '0.00'))
                is_intra = (not customer or not customer.StateId or customer.StateId in [12, 32])
                if gst_pct > 0 and line_gross_total > 0:
                    tax_factor = Decimal('1.00') + (gst_pct / Decimal('100.00'))
                    line_taxable = (line_gross_total / tax_factor).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                    unit_taxable = (gross_unit_rate / tax_factor).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                    line_tax = line_gross_total - line_taxable
                    if is_intra:
                        line_cgst = (line_tax / Decimal('2.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                        line_sgst = line_tax - line_cgst
                        line_igst = Decimal('0.00')
                    else:
                        line_cgst = Decimal('0.00')
                        line_sgst = Decimal('0.00')
                        line_igst = line_tax
                else:
                    line_taxable = line_gross_total
                    unit_taxable = gross_unit_rate
                    line_tax = Decimal('0.00')
                    line_cgst = Decimal('0.00')
                    line_sgst = Decimal('0.00')
                    line_igst = Decimal('0.00')

                total_deliv += qty
                total_empty += empty_qty
                total_taxable_subtotal += line_taxable
                total_cgst_amount += line_cgst
                total_sgst_amount += line_sgst
                total_igst_amount += line_igst
                total_gross_amount += line_gross_total

                processed_items.append({
                    'idx': idx,
                    'prod': prod,
                    'qty': qty,
                    'empty_qty': empty_qty,
                    'unit_taxable': unit_taxable,
                    'line_taxable': line_taxable,
                    'gst_pct': gst_pct,
                    'line_tax': line_tax,
                    'line_gross_total': line_gross_total,
                    'gross_unit_rate': gross_unit_rate,
                })

            total_tax_amount = total_cgst_amount + total_sgst_amount + total_igst_amount
            is_credit = (payment_method or '').strip().upper() == 'CREDIT'
            if is_credit:
                paid_amount = Decimal('0.00')
            elif amount_collected > 0:
                paid_amount = amount_collected
            else:
                paid_amount = total_gross_amount

            # 2. Create Sales record with complete GST & Gross calculations
            sale = Sales.objects.create(
                SalesNo=ticket_id,
                SalesDate=date.today(),
                InvoiceNo=ticket_id,
                RouteVehicleDriver=alloc,
                RouteTripId=alloc.RouteVehicleDriverId if alloc else None,
                RouteName=alloc.Route.RouteName if (alloc and alloc.Route) else '',
                DriverName=alloc.Driver.DriverName if (alloc and alloc.Driver) else '',
                VehicleName=alloc.Vehicle.VehicleNumber if (alloc and alloc.Vehicle) else '',
                CustomerLedger=customer,
                PaymentMethod=payment_method,
                Notes=f"Payment: {payment_method} | Customer: {customer_name}",
                SubTotal=total_taxable_subtotal,
                TaxAmount=total_tax_amount,
                GrandTotal=total_gross_amount,
                PaidAmount=paid_amount,
                RoundOff=Decimal('0.00'),
                TotalDeliveredQty=total_deliv,
                TotalEmptyQty=total_empty,
                Status='PENDING',
                CompanyId=company_id
            )

            # 3. Create SalesLine records and StockMovements
            for p_item in processed_items:
                SalesLine.objects.create(
                    Sales=sale,
                    LineNo=p_item['idx'],
                    Product=p_item['prod'],
                    ProductName=p_item['prod'].ProductName,
                    Unit=p_item['prod'].Unit,
                    SalesPrice=p_item['unit_taxable'],
                    TaxPercent=p_item['gst_pct'],
                    TaxAmount=p_item['line_tax'],
                    Quantity=p_item['qty'],
                    EmptyQuantity=p_item['empty_qty'],
                    Total=p_item['line_gross_total'],
                    DiscPercent=Decimal('0.00'),
                    DiscAmount=Decimal('0.00'),
                    CompanyId=company_id
                )

                # Van Delivered Stock OUT
                if p_item['qty'] > 0:
                    StockMovement.objects.create(
                        CompanyId=company_id,
                        Product=p_item['prod'],
                        Unit_id=p_item['prod'].Unit_id or 1,
                        RouteVehicleDriverId=allocation_id,
                        TransactionType='VAN_SALE',
                        ReferenceId=int(customer_ledger_id or 0),
                        TransactionNo=ticket_id,
                        TransactionDate=date.today(),
                        InQty=Decimal('0.00'),
                        OutQty=p_item['qty'],
                        OutCostRate=p_item['unit_taxable'],
                        OutCostAmount=p_item['line_taxable'],
                        Narration=f"Sold to {customer_name} | {payment_method} | Amount: {sale.GrandTotal}"
                    )

                # Empty Cylinders Return IN to Van
                if p_item['empty_qty'] > 0:
                    StockMovement.objects.create(
                        CompanyId=company_id,
                        Product=p_item['prod'],
                        Unit_id=p_item['prod'].Unit_id or 1,
                        RouteVehicleDriverId=allocation_id,
                        TransactionType='VAN_EMPTY_RETURN',
                        ReferenceId=int(customer_ledger_id or 0),
                        TransactionNo=ticket_id,
                        TransactionDate=date.today(),
                        InQty=p_item['empty_qty'],
                        OutQty=Decimal('0.00'),
                        InCostRate=Decimal('0.00'),
                        InCostAmount=Decimal('0.00'),
                        Narration=f"Empty Return from {customer_name}"
                    )

            # 4. Mark sale as LIVE for real-time dashboard visibility
            # Accounting vouchers will be officially posted upon End-Shift settlement approval
            sale.Status = 'LIVE'
            sale.save(update_fields=['Status'])

            # Wire billwise allocation for customer payment
            if sale.PaidAmount and sale.PaidAmount > 0 and sale.CustomerLedger:
                sync_sales_billwise_allocation(sale, None)

        now_time = datetime.now().strftime("%I:%M %p")
        return Response({
            'success': True,
            'ticket_id': ticket_id,
            'sales_id': sale.SalesId,
            'time': now_time,
            'amount': float(amount_collected),
            'customer_name': customer_name,
            'message': 'Delivery successfully logged and synchronized'
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='driver_sales')
    def driver_sales(self, request):
        """
        Returns van deliveries made specifically during the active delivery note / shift.
        Prevents bleeding of past shift collections and deliveries into new shifts.
        """
        qp = getattr(request, 'query_params', getattr(request, 'GET', {}))
        allocation_id = qp.get('allocation_id') or qp.get('rvd_id') or qp.get('RouteVehicleDriverId')
        if not allocation_id:
            return Response({'detail': 'allocation_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        company_id = getattr(request.user, 'CompanyId', 1) or 1

        # Check active or latest Delivery Note for this shift
        active_dn = DeliveryNote.objects.filter(
            CompanyId=company_id,
            RouteVehicleDriver_id=allocation_id,
            Status__in=['LOADED', 'PENDING_APPROVAL', 'COMPLETED']
        ).order_by('-DeliveryNoteId').first()

        # Query first-class Sales records created during this active shift or today
        sales_qs = Sales.objects.filter(
            CompanyId=company_id,
            RouteVehicleDriver_id=allocation_id
        ).exclude(Status='CANCELLED')

        if active_dn and active_dn.CreatedAt:
            sales_qs = sales_qs.filter(CreatedAt__gte=active_dn.CreatedAt)
        else:
            sales_qs = sales_qs.filter(SalesDate=date.today())

        sales_qs = sales_qs.select_related('CustomerLedger').prefetch_related('lines__Product').order_by('-SalesId')

        # Fallback to any sales recorded for this driver today if active DN shift filter yields none
        if not sales_qs.exists():
            sales_qs = Sales.objects.filter(
                CompanyId=company_id,
                RouteVehicleDriver_id=allocation_id,
                SalesDate=date.today()
            ).exclude(Status='CANCELLED').select_related('CustomerLedger').prefetch_related('lines__Product').order_by('-SalesId')

        if not sales_qs.exists() and not active_dn:
            return Response([])

        if sales_qs.exists():
            results = []
            for sale in sales_qs:
                items_data = []
                for line in sale.lines.all():
                    p = None
                    try:
                        p = line.Product
                    except Exception:
                        p = None
                    p_name = line.ProductName or (p.ProductName if p else '')
                    p_weight = p.AppProductName if (p and p.AppProductName) else ''
                    if not p_weight and p_name:
                        m_weight = re.search(r'(\d+(?:\.\d+)?\s*KG)', p_name, re.IGNORECASE)
                        p_weight = m_weight.group(1).replace(' ', '').upper() if m_weight else p_name
                    elif not p_weight:
                        p_weight = p_name
                    items_data.append({
                        'productId': line.Product_id,
                        'productName': p_name,
                        'weight': p_weight,
                        'deliveryQty': int(line.Quantity or 0),
                        'emptyReturnQty': int(line.EmptyQuantity or 0),
                        'rate': float(line.SalesPrice or 0),
                        'amount': float(line.Total or 0)
                    })
                time_str = sale.CreatedAt.strftime("%I:%M %p") if sale.CreatedAt else datetime.now().strftime("%I:%M %p")
                results.append({
                    'salesId': sale.SalesId,
                    'ticketId': sale.SalesNo,
                    'customer': {
                        'name': sale.CustomerLedger.LedgerName if sale.CustomerLedger else 'Direct Customer',
                        'ledgerId': sale.CustomerLedger_id,
                        'phone': (sale.CustomerLedger.MobileNumber or sale.CustomerLedger.PhoneNumber or '') if sale.CustomerLedger else '',
                    },
                    'items': items_data,
                    'totalCylinders': int(sale.TotalDeliveredQty or 0),
                    'totalEmpties': int(sale.TotalEmptyQty or 0),
                    'amount': float(sale.PaidAmount if (sale.PaidAmount is not None and (sale.PaidAmount > 0 or (sale.PaymentMethod or '').upper() == 'CREDIT')) else (sale.GrandTotal or 0)),
                    'paidAmount': float(sale.PaidAmount if sale.PaidAmount is not None else 0),
                    'grandTotal': float(sale.GrandTotal or 0),
                    'paymentMethod': sale.PaymentMethod or 'Cash',
                    'time': time_str,
                    'status': sale.Status
                })
            return Response(results)

        # Fallback to StockMovement for any historical entries
        movements = StockMovement.objects.filter(
            CompanyId=company_id,
            RouteVehicleDriverId=allocation_id,
            TransactionType__in=['VAN_SALE', 'VAN_EMPTY_RETURN'],
            CreatedAt__gte=active_dn.CreatedAt
        ).select_related('Product').order_by('-StockMovementId')

        grouped = {}
        for m in movements:
            t_no = m.TransactionNo or f"TKT-{m.StockMovementId}"
            if t_no not in grouped:
                time_str = m.CreatedAt.strftime("%I:%M %p") if hasattr(m, 'CreatedAt') and m.CreatedAt else datetime.now().strftime("%I:%M %p")
                grouped[t_no] = {
                    'ticketId': t_no,
                    'customer': {'name': 'Customer', 'ledgerId': m.ReferenceId},
                    'items': [],
                    'totalCylinders': 0,
                    'totalEmpties': 0,
                    'amount': 0.0,
                    'paymentMethod': 'Cash',
                    'time': time_str,
                    'status': 'Delivered'
                }

            order = grouped[t_no]
            narr = m.Narration or ''
            amt_match = re.search(r'Amount:\s*([\d.]+)', narr)
            if amt_match:
                try:
                    order['amount'] = float(amt_match.group(1))
                except:
                    pass

            if 'Sold to ' in narr or 'Empty Return from ' in narr:
                raw_info = narr.replace('Sold to ', '').replace('Empty Return from ', '')
                if 'Amount:' in raw_info:
                    raw_info = raw_info.split('Amount:')[0]
                for sep in ['|', '•', '-', '/']:
                    if sep in raw_info:
                        parts = raw_info.split(sep)
                        order['customer']['name'] = parts[0].strip()
                        if len(parts) > 1 and parts[1].strip():
                            order['paymentMethod'] = parts[1].strip()
                        break
                else:
                    if raw_info.strip():
                        order['customer']['name'] = raw_info.strip()

            prod = None
            try:
                prod = m.Product
            except Exception:
                prod = None
            p_weight = (prod.AppProductName if prod and prod.AppProductName else '')
            if not p_weight:
                p_full = (prod.ProductName if prod else '')
                m_weight = re.search(r'(\d+(?:\.\d+)?\s*KG)', p_full, re.IGNORECASE)
                p_weight = m_weight.group(1).replace(' ', '').upper() if m_weight else p_full
            cat_n = prod.Category.CategoryName.lower() if (prod and prod.Category) else ''
            p_n = prod.ProductName.lower() if prod else ''
            is_cylinder = ('cylinder' in cat_n) or ('cylinder' in p_n) or ('kg' in p_n) or ('lpg' in p_n)

            if m.TransactionType == 'VAN_SALE':
                if is_cylinder:
                    order['totalCylinders'] += int(m.OutQty)
                if order['amount'] == 0.0 and (m.OutCostAmount or 0) > 0:
                    order['amount'] = float(m.OutCostAmount)

                found = False
                for it in order['items']:
                    if it['weight'] == p_weight:
                        it['deliveryQty'] += int(m.OutQty)
                        found = True
                        break
                if not found:
                    order['items'].append({
                        'productId': m.Product_id,
                        'weight': p_weight,
                        'deliveryQty': int(m.OutQty),
                        'emptyReturnQty': 0,
                        'rate': float(m.OutCostRate or 0)
                    })
            elif m.TransactionType == 'VAN_EMPTY_RETURN':
                if is_cylinder:
                    order['totalEmpties'] += int(m.InQty)
                found = False
                for it in order['items']:
                    if it['weight'] == p_weight:
                        it['emptyReturnQty'] += int(m.InQty)
                        found = True
                        break
                if not found:
                    order['items'].append({
                        'productId': m.Product_id,
                        'weight': p_weight,
                        'deliveryQty': 0,
                        'emptyReturnQty': int(m.InQty),
                        'rate': 0.0
                    })

        return Response(list(grouped.values()))

    @action(detail=False, methods=['get'], url_path='driver_expenses')
    def driver_expenses(self, request):
        """
        Returns all trip expenses logged during the active delivery note / shift.
        """
        allocation_id = request.query_params.get('allocation_id')
        if not allocation_id:
            return Response({'detail': 'allocation_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        company_id = getattr(request.user, 'CompanyId', 1) or 1

        active_dn = DeliveryNote.objects.filter(
            CompanyId=company_id,
            RouteVehicleDriver_id=allocation_id,
            Status='LOADED'
        ).order_by('-DeliveryNoteId').first()

        if not active_dn:
            return Response([])

        expenses = RouteExpense.objects.filter(
            CompanyId=company_id,
            RouteVehicleDriver_id=allocation_id,
            CreatedAt__gte=active_dn.CreatedAt
        ).order_by('-CreatedAt', '-ExpenseId')

        results = []
        for exp in expenses:
            results.append({
                'id': f"EXP-{exp.ExpenseId}",
                'expense_id': exp.ExpenseId,
                'category': exp.Category,
                'title': exp.Category,
                'amount': float(exp.Amount or 0),
                'payment_mode': exp.PaymentMode or 'Cash',
                'paymentMethod': exp.PaymentMode or 'Cash',
                'notes': exp.Notes or '',
                'time': exp.CreatedAt.strftime('%I:%M %p') if exp.CreatedAt else '',
            })
        return Response(results)

    @action(detail=False, methods=['post'], url_path='create_expense')
    def create_expense(self, request):
        """
        Logs a driver trip expense and writes a double-entry Voucher debiting Travelling Expense (Ledger 31).
        """
        allocation_id = request.data.get('allocation_id')
        if not allocation_id:
            return Response({'detail': 'allocation_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        company_id = getattr(request.user, 'CompanyId', 1) or 1
        alloc = RouteVehicleDriver.objects.filter(RouteVehicleDriverId=allocation_id).select_related('Route', 'Vehicle', 'Driver').first()
        if not alloc:
            return Response({'detail': 'Allocation not found.'}, status=status.HTTP_404_NOT_FOUND)

        category = request.data.get('category') or request.data.get('title') or 'Other'
        try:
            amount = Decimal(str(request.data.get('amount', 0)))
        except Exception:
            return Response({'detail': 'Invalid amount.'}, status=status.HTTP_400_BAD_REQUEST)

        if amount <= 0:
            return Response({'detail': 'Amount must be greater than zero.'}, status=status.HTTP_400_BAD_REQUEST)

        payment_mode = request.data.get('payment_method') or request.data.get('payment_mode') or 'Cash'
        notes = request.data.get('notes') or ''

        with transaction.atomic():
            # DO NOT post Payment or Voucher here! Only create RouteExpense.
            # Financial accounting vouchers are posted only upon End-Shift settlement approval.
            exp = RouteExpense.objects.create(
                CompanyId=company_id,
                Route=alloc.Route,
                RouteVehicleDriver=alloc,
                Driver=alloc.Driver,
                Vehicle=alloc.Vehicle,
                Payment=None,
                ExpenseDate=date.today(),
                Category=category,
                Amount=amount,
                PaymentMode=payment_mode,
                Notes=notes,
            )

        return Response({
            'success': True,
            'id': f"EXP-{exp.ExpenseId}",
            'expense_id': exp.ExpenseId,
            'category': exp.Category,
            'title': exp.Category,
            'amount': float(exp.Amount),
            'payment_mode': exp.PaymentMode,
            'paymentMethod': exp.PaymentMode,
            'notes': exp.Notes,
            'time': exp.CreatedAt.strftime('%I:%M %p') if exp.CreatedAt else '',
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='delete_expense')
    def delete_driver_expense(self, request):
        expense_id = request.data.get('expense_id') or request.data.get('id')
        if not expense_id:
            return Response({'detail': 'expense_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        clean_id = str(expense_id).replace('EXP-', '').replace('PMT-', '')
        try:
            exp = RouteExpense.objects.get(ExpenseId=clean_id)
            with transaction.atomic():
                if exp.Payment:
                    pmt = exp.Payment
                    affected_ledgers = set()
                    if pmt.PartyLedger:
                        affected_ledgers.add(pmt.PartyLedger.LedgerId)
                    for pl in pmt.lines.all():
                        if pl.Ledger:
                            affected_ledgers.add(pl.Ledger.LedgerId)
                    vouchers = Voucher.objects.filter(ReferenceTable='Payment', ReferenceId=pmt.PaymentId)
                    for v in vouchers:
                        v.lines.all().delete()
                    vouchers.delete()
                    pmt.lines.all().delete()
                    pmt.delete()
                    if affected_ledgers:
                        sync_ledger_balances(*affected_ledgers)
                exp.delete()
            return Response({'success': True})
        except RouteExpense.DoesNotExist:
            return Response({'detail': 'Expense not found.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post', 'delete'], url_path='cancel_sale')
    def cancel_sale(self, request):
        """
        Cancels a sale:
        1. Restores van inventory by reversing StockMovements.
        2. Sets Sales status to CANCELLED.
        3. Cancels financial Voucher and recalibrates ledger balances.
        """
        ticket_id = request.data.get('ticket_id') or request.query_params.get('ticket_id')
        sales_id = request.data.get('sales_id')
        if not ticket_id and not sales_id:
            return Response({'success': False, 'message': 'ticket_id or sales_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        company_id = getattr(request.user, 'CompanyId', 1) or 1
        with transaction.atomic():
            sale = None
            if sales_id:
                sale = Sales.objects.filter(CompanyId=company_id, SalesId=sales_id).first()
            if not sale and ticket_id:
                sale = Sales.objects.filter(CompanyId=company_id, SalesNo=ticket_id, Status__in=['LIVE', 'PENDING']).order_by('-SalesId').first()
                if not sale:
                    sale = Sales.objects.filter(CompanyId=company_id, SalesNo=ticket_id).order_by('-SalesId').first()

            t_no = sale.SalesNo if sale else ticket_id

            # 1. Reverse StockMovement
            deleted_count, _ = StockMovement.objects.filter(
                CompanyId=company_id,
                TransactionNo=t_no
            ).delete()

            # 2. Cancel Sale record
            if sale:
                sale.Status = 'CANCELLED'
                sale.save(update_fields=['Status'])

                # 3. Cancel Voucher
                vouchers = Voucher.objects.filter(CompanyId=company_id, ReferenceTable='Sales', ReferenceId=sale.SalesId)
                for v in vouchers:
                    v.IsCancelled = True
                    v.save(update_fields=['IsCancelled'])
                    v_ledgers = v.lines.values_list('Ledger_id', flat=True)
                    sync_ledger_balances(*v_ledgers)

        return Response({
            'success': True,
            'message': f'Sale {t_no} cancelled and stock successfully restored ({deleted_count} movements reversed).'
        })

    @action(detail=False, methods=['post', 'put', 'patch'], url_path='update_sale')
    def update_sale(self, request):
        """
        Allows driver or admin to correct a mistyped sale amount, payment method, or quantities.
        Synchronously updates Sales, SalesLine, StockMovement, and Voucher.
        """
        data = request.data
        ticket_id = data.get('ticket_id') or data.get('ticketId')
        sales_id = data.get('sales_id') or data.get('SalesId')
        new_amount = Decimal(str(data.get('amount_collected') or data.get('amount') or 0))
        new_payment_method = data.get('payment_method') or data.get('paymentMethod')
        items = data.get('items', [])
        company_id = getattr(request.user, 'CompanyId', 1) or 1

        sale = None
        if sales_id:
            sale = Sales.objects.filter(CompanyId=company_id, SalesId=sales_id).first()
        if not sale and ticket_id:
            sale = Sales.objects.filter(CompanyId=company_id, SalesNo=ticket_id).first()

        if not sale:
            return Response({'success': False, 'message': 'Sale record not found.'}, status=status.HTTP_404_NOT_FOUND)

        if sale.Status in ['COMPLETED', 'SETTLED', 'APPROVED']:
            return Response({'success': False, 'message': 'Cannot edit an already settled/approved sale.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            if new_amount > 0:
                sale.GrandTotal = new_amount
                sale.SubTotal = new_amount
            if new_payment_method:
                sale.PaymentMethod = new_payment_method
                sale.Notes = f"Payment: {new_payment_method}"

            if items:
                sale.lines.all().delete()
                tot_deliv = Decimal('0')
                tot_empty = Decimal('0')
                tot_taxable = Decimal('0')
                tot_cgst = Decimal('0')
                tot_sgst = Decimal('0')
                tot_gross = Decimal('0')

                for idx, item in enumerate(items, 1):
                    p_id = item.get('product_id') or item.get('productId') or item.get('ProductId')
                    qty = Decimal(str(item.get('qty') or item.get('quantity') or item.get('deliveryQty') or 0))
                    empty_qty = Decimal(str(item.get('empty_qty') or item.get('emptyReturnQty') or item.get('empty_quantity') or 0))
                    rate = Decimal(str(item.get('rate') or item.get('price') or 0))
                    prod = Product.objects.filter(ProductId=p_id).first() if p_id else None
                    if not prod:
                        continue
                    tot_deliv += qty
                    tot_empty += empty_qty

                    gross_unit = (rate or prod.SalesPrice or Decimal('0.00'))
                    line_gross = qty * gross_unit
                    gst_p = Decimal(str(prod.GSTPercentage or '0.00'))

                    if gst_p > 0 and line_gross > 0:
                        tfactor = Decimal('1.00') + (gst_p / Decimal('100.00'))
                        line_taxable = (line_gross / tfactor).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                        unit_taxable = (gross_unit / tfactor).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                        line_tax = line_gross - line_taxable
                        line_cgst = (line_tax / Decimal('2.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                        line_sgst = line_tax - line_cgst
                    else:
                        line_taxable = line_gross
                        unit_taxable = gross_unit
                        line_tax = Decimal('0.00')
                        line_cgst = Decimal('0.00')
                        line_sgst = Decimal('0.00')

                    tot_taxable += line_taxable
                    tot_cgst += line_cgst
                    tot_sgst += line_sgst
                    tot_gross += line_gross

                    SalesLine.objects.create(
                        Sales=sale,
                        LineNo=idx,
                        Product=prod,
                        ProductName=prod.ProductName,
                        Unit=prod.Unit,
                        SalesPrice=unit_taxable,
                        TaxPercent=gst_p,
                        TaxAmount=line_tax,
                        Quantity=qty,
                        EmptyQuantity=empty_qty,
                        Total=line_gross,
                        CompanyId=company_id
                    )

                sale.TotalDeliveredQty = tot_deliv
                sale.TotalEmptyQty = tot_empty
                sale.SubTotal = tot_taxable
                sale.TaxAmount = tot_cgst + tot_sgst
                if new_amount > 0:
                    sale.GrandTotal = new_amount
                elif tot_gross > 0:
                    sale.GrandTotal = tot_gross

                # Re-sync StockMovement for this ticket
                StockMovement.objects.filter(CompanyId=company_id, TransactionNo=sale.SalesNo).delete()
                customer_name = sale.CustomerLedger.LedgerName if sale.CustomerLedger else 'Customer'
                for line in sale.lines.all():
                    if line.Quantity > 0:
                        StockMovement.objects.create(
                            CompanyId=company_id,
                            Product=line.Product,
                            Unit=line.Unit or line.Product.Unit,
                            RouteVehicleDriverId=sale.RouteVehicleDriver_id,
                            TransactionType='VAN_SALE',
                            ReferenceId=int(sale.CustomerLedger_id or 0),
                            TransactionNo=sale.SalesNo,
                            TransactionDate=sale.SalesDate,
                            InQty=Decimal('0.00'),
                            OutQty=line.Quantity,
                            OutCostRate=line.SalesPrice,
                            OutCostAmount=line.Total,
                            Narration=f"Sold to {customer_name} | {sale.PaymentMethod} | Amount: {sale.GrandTotal}"
                        )
                    if line.EmptyQuantity > 0:
                        StockMovement.objects.create(
                            CompanyId=company_id,
                            Product=line.Product,
                            Unit=line.Unit or line.Product.Unit,
                            RouteVehicleDriverId=sale.RouteVehicleDriver_id,
                            TransactionType='VAN_EMPTY_RETURN',
                            ReferenceId=int(sale.CustomerLedger_id or 0),
                            TransactionNo=sale.SalesNo,
                            TransactionDate=sale.SalesDate,
                            InQty=line.EmptyQuantity,
                            OutQty=Decimal('0.00'),
                            InCostRate=Decimal('0.00'),
                            InCostAmount=Decimal('0.00'),
                            Narration=f"Empty Return from {customer_name}"
                        )
            else:
                StockMovement.objects.filter(CompanyId=company_id, TransactionNo=sale.SalesNo, TransactionType='VAN_SALE').update(
                    Narration=f"Sold to {sale.CustomerLedger.LedgerName if sale.CustomerLedger else 'Customer'} | {sale.PaymentMethod} | Amount: {sale.GrandTotal}"
                )

            sale.save()

            # Update Voucher
            voucher = Voucher.objects.filter(CompanyId=company_id, ReferenceTable='Sales', ReferenceId=sale.SalesId).first()
            if voucher:
                pm_upper = (sale.PaymentMethod or 'CASH').upper()
                debit_ledger_id = 24
                if 'UPI' in pm_upper or 'BANK' in pm_upper or 'ONLINE' in pm_upper:
                    debit_ledger_id = 56
                elif 'CREDIT' in pm_upper and sale.CustomerLedger:
                    debit_ledger_id = sale.CustomerLedger.LedgerId

                voucher.lines.all().delete()
                # Line 1: Debit Cash/Bank
                VoucherLine.objects.create(
                    Voucher=voucher,
                    LineNo=1,
                    Ledger_id=debit_ledger_id,
                    DebitAmount=sale.GrandTotal,
                    CreditAmount=Decimal('0.00'),
                    Narration=f"Received for {sale.SalesNo}"
                )
                # Line 2: Credit Sales (Taxable SubTotal)
                sales_acc = Ledger.objects.filter(LedgerId=20).first() or Ledger.objects.filter(Group__GroupName='Sales Accounts').first()
                if sales_acc:
                    VoucherLine.objects.create(
                        Voucher=voucher,
                        LineNo=2,
                        Ledger=sales_acc,
                        DebitAmount=Decimal('0.00'),
                        CreditAmount=sale.SubTotal or sale.GrandTotal,
                        Narration=f"Sales Income {sale.SalesNo}"
                    )
                # Line 3: CGST Output
                half_tax = (Decimal(str(sale.TaxAmount or 0)) / Decimal('2.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                other_half = (Decimal(str(sale.TaxAmount or 0)) - half_tax).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                if half_tax > 0:
                    cgst_ledger = Ledger.objects.filter(LedgerId=22).first() or Ledger.objects.filter(LedgerName__icontains='CGST Output').first()
                    if cgst_ledger:
                        VoucherLine.objects.create(
                            Voucher=voucher,
                            LineNo=3,
                            Ledger=cgst_ledger,
                            DebitAmount=Decimal('0.00'),
                            CreditAmount=half_tax,
                            Narration=f"CGST Output {sale.SalesNo}"
                        )
                # Line 4: SGST Output
                if other_half > 0:
                    sgst_ledger = Ledger.objects.filter(LedgerId=23).first() or Ledger.objects.filter(LedgerName__icontains='SGST Output').first()
                    if sgst_ledger:
                        VoucherLine.objects.create(
                            Voucher=voucher,
                            LineNo=4,
                            Ledger=sgst_ledger,
                            DebitAmount=Decimal('0.00'),
                            CreditAmount=other_half,
                            Narration=f"SGST Output {sale.SalesNo}"
                        )
                sync_ledger_balances(debit_ledger_id, 20, 22, 23)

        return Response({
            'success': True,
            'message': f'Sale {sale.SalesNo} successfully updated.',
            'data': {
                'salesId': sale.SalesId,
                'ticketId': sale.SalesNo,
                'amount': float(sale.GrandTotal),
                'paymentMethod': sale.PaymentMethod,
                'totalCylinders': int(sale.TotalDeliveredQty or 0),
                'totalEmpties': int(sale.TotalEmptyQty or 0),
            }
        })

    @action(detail=False, methods=['post'], url_path='end_shift')
    def end_shift(self, request):
        """
        Driver ends daily shift:
        Submits physical counts of remaining full cylinders, returned empties, and collections.
        Creates EndRouteDriver header and product lines for Godown settlement.
        Shift returns belong strictly in End Allocation and do not pollute manual Receipt Notes.
        """
        data = request.data
        allocation_id = data.get('allocation_id')
        if not allocation_id:
            return Response({'success': False, 'message': 'allocation_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        company_id = getattr(request.user, 'CompanyId', 1) or 1
        alloc = RouteVehicleDriver.objects.filter(RouteVehicleDriverId=allocation_id).select_related('Route', 'Vehicle', 'Driver').first()
        if not alloc:
            return Response({'success': False, 'message': 'Allocation not found.'}, status=status.HTTP_404_NOT_FOUND)

        remaining_cylinders = data.get('remaining_cylinders', [])
        remaining_other = data.get('remaining_other', [])
        cash_balance = float(data.get('cash_balance') or data.get('cash_collected') or 0)
        bank_balance = float(data.get('bank_balance') or data.get('bank_collected') or 0)

        with transaction.atomic():
            cash_ledger = (
                Ledger.objects.filter(CompanyId=company_id, Group__GroupName__icontains='Cash').first()
                or Ledger.objects.filter(LedgerId=24).first()
            )
            bank_ledger = (
                Ledger.objects.filter(CompanyId=company_id, Group__GroupName__icontains='Bank').first()
                or Ledger.objects.filter(LedgerId=56).first()
            )

            # Mark active DeliveryNote for this driver allocation as PENDING_APPROVAL
            active_dn = DeliveryNote.objects.filter(
                RouteVehicleDriver=alloc,
                CompanyId=company_id,
                Status='LOADED'
            ).order_by('-DeliveryNoteId').first()

            if not active_dn:
                active_dn = DeliveryNote.objects.filter(
                    RouteVehicleDriver=alloc,
                    CompanyId=company_id,
                    DeliveryDate=date.today()
                ).order_by('-DeliveryNoteId').first()

            dn_id = active_dn.DeliveryNoteId if active_dn else allocation_id

            if active_dn:
                active_dn.Status = 'PENDING_APPROVAL'
                active_dn.save(update_fields=['Status'])

            # Mark today's sales for this driver allocation as PENDING_APPROVAL
            Sales.objects.filter(
                RouteVehicleDriver=alloc,
                CompanyId=company_id,
                SalesDate=date.today(),
                Status='LIVE'
            ).update(Status='PENDING_APPROVAL')

            # Process remaining physical stock: unload full and empty cylinders to Central Godown
            for item in remaining_cylinders + remaining_other:
                p_id = item.get('product_id') or item.get('ProductId')
                filled_qty = int(float(item.get('qty') or item.get('balanceStock') or item.get('filledStock') or 0))
                empty_qty = int(float(item.get('empty_qty') or 0))

                prod = Product.objects.filter(ProductId=p_id).first() if p_id else None
                if not prod or (filled_qty <= 0 and empty_qty <= 0):
                    continue

                # 1. Immediately allocate returned empty cylinders to Central Godown (RouteVehicleDriverId=1)
                # and remove them from the vehicle inventory (RouteVehicleDriverId=alloc.RouteVehicleDriverId)
                if empty_qty > 0 and prod:
                    StockMovement.objects.create(
                        CompanyId=company_id,
                        Product=prod,
                        Unit_id=prod.Unit_id or 1,
                        RouteVehicleDriverId=alloc.RouteVehicleDriverId,
                        TransactionType='VAN_UNLOAD_EMPTY',
                        ReferenceId=dn_id,
                        TransactionNo=f"ERD-{dn_id}",
                        TransactionDate=date.today(),
                        InQty=Decimal('0.00'),
                        OutQty=Decimal(str(empty_qty)),
                        Narration=f"Shift Unload Empty to Godown from Van {alloc.Vehicle.VehicleNumber if alloc and alloc.Vehicle else ''}"
                    )
                    StockMovement.objects.create(
                        CompanyId=company_id,
                        Product=prod,
                        Unit_id=prod.Unit_id or 1,
                        RouteVehicleDriverId=1,
                        TransactionType='GODOWN_RETURN_EMPTY',
                        ReferenceId=dn_id,
                        TransactionNo=f"ERD-{dn_id}",
                        TransactionDate=date.today(),
                        InQty=Decimal(str(empty_qty)),
                        OutQty=Decimal('0.00'),
                        Narration=f"Shift Return Empty from Van {alloc.Vehicle.VehicleNumber if alloc and alloc.Vehicle else ''}"
                    )

                # 2. Return unsold full cylinders to Central Godown (RouteVehicleDriverId=1)
                if filled_qty > 0 and prod:
                    StockMovement.objects.create(
                        CompanyId=company_id,
                        Product=prod,
                        Unit_id=prod.Unit_id or 1,
                        RouteVehicleDriverId=alloc.RouteVehicleDriverId,
                        TransactionType='VAN_UNLOAD_FULL',
                        ReferenceId=dn_id,
                        TransactionNo=f"ERD-{dn_id}",
                        TransactionDate=date.today(),
                        InQty=Decimal('0.00'),
                        OutQty=Decimal(str(filled_qty)),
                        Narration=f"Shift Unload Full to Godown from Van {alloc.Vehicle.VehicleNumber if alloc and alloc.Vehicle else ''}"
                    )
                    StockMovement.objects.create(
                        CompanyId=company_id,
                        Product=prod,
                        Unit_id=prod.Unit_id or 1,
                        RouteVehicleDriverId=1,
                        TransactionType='GODOWN_RETURN_FULL',
                        ReferenceId=dn_id,
                        TransactionNo=f"ERD-{dn_id}",
                        TransactionDate=date.today(),
                        InQty=Decimal(str(filled_qty)),
                        OutQty=Decimal('0.00'),
                        Narration=f"Shift Return Full from Van {alloc.Vehicle.VehicleNumber if alloc and alloc.Vehicle else ''}"
                    )

        return Response({
            'success': True,
            'settlement_id': dn_id,
            'status': 'PENDING',
            'message': 'Shift end request successfully submitted for Godown Admin approval.'
        })

    @action(detail=False, methods=['post'], url_path='process_receipt_note')
    def process_receipt_note(self, request):
        """
        Godown Admin accepts and saves the Receipt Note:
        Transfers remaining stock from Van -> Godown (RouteVehicleDriverId=1).
        """
        receipt_id = request.data.get('receipt_note_id') or request.data.get('delivery_note_id') or request.data.get('receipt_id')
        rn = ReceiptNote.objects.filter(ReceiptNoteId=receipt_id, Status='RECEIPT_PENDING').first()
        if rn:
            company_id = getattr(request.user, 'CompanyId', 1) or 1
            alloc_id = rn.RouteVehicleDriver_id

            with transaction.atomic():
                for line in rn.lines.all():
                    qty = line.Quantity
                    if qty > 0:
                        # 1. Van Stock OUT
                        StockMovement.objects.create(
                            CompanyId=company_id,
                            Product=line.Product,
                            Unit=line.Unit,
                            RouteVehicleDriver_id=alloc_id,
                            TransactionType='RECEIPT_NOTE_RETURN',
                            ReferenceId=rn.ReceiptNoteId,
                            ReferenceLineId=line.ReceiptNoteLineId,
                            TransactionNo=rn.ReceiptNoteNo,
                            TransactionDate=rn.ReceiptDate,
                            InQty=Decimal('0.00'),
                            OutQty=qty,
                            Narration=f"Shift Return to Godown: {rn.ReceiptNoteNo}"
                        )
                        # 2. Central Godown Stock IN
                        StockMovement.objects.create(
                            CompanyId=company_id,
                            Product=line.Product,
                            Unit=line.Unit,
                            RouteVehicleDriverId=1,
                            TransactionType='RECEIPT_NOTE_RETURN',
                            ReferenceId=rn.ReceiptNoteId,
                            ReferenceLineId=line.ReceiptNoteLineId,
                            TransactionNo=rn.ReceiptNoteNo,
                            TransactionDate=rn.ReceiptDate,
                            InQty=qty,
                            OutQty=Decimal('0.00'),
                            Narration=f"Shift Return from Van {rn.RouteVehicleDriver.Vehicle.VehicleNumber if rn.RouteVehicleDriver and rn.RouteVehicleDriver.Vehicle else ''}"
                        )

                rn.Status = 'SETTLED'
                rn.save(update_fields=['Status'])

            return Response({
                'success': True,
                'message': f'Receipt Note {rn.ReceiptNoteNo} processed. Stock successfully transferred to Central Godown.'
            })

        # Fallback to DeliveryNote for legacy records
        rn_dn = DeliveryNote.objects.filter(DeliveryNoteId=receipt_id, Status='RECEIPT_PENDING').first()
        if not rn_dn:
            return Response({'success': False, 'message': 'Receipt Note not found or already processed.'}, status=status.HTTP_404_NOT_FOUND)

        company_id = getattr(request.user, 'CompanyId', 1) or 1
        alloc_id = rn_dn.RouteVehicleDriver_id

        with transaction.atomic():
            for line in rn_dn.lines.all():
                qty = line.Quantity
                if qty > 0:
                    StockMovement.objects.create(
                        CompanyId=company_id,
                        Product=line.Product,
                        Unit=line.Unit,
                        RouteVehicleDriver_id=alloc_id,
                        TransactionType='RECEIPT_NOTE_RETURN',
                        ReferenceId=rn_dn.DeliveryNoteId,
                        ReferenceLineId=line.DeliveryNoteLineId,
                        TransactionNo=rn_dn.DeliveryNoteNo,
                        TransactionDate=rn_dn.DeliveryDate,
                        InQty=Decimal('0.00'),
                        OutQty=qty,
                        Narration=f"Shift Return to Godown: {rn_dn.DeliveryNoteNo}"
                    )
                    StockMovement.objects.create(
                        CompanyId=company_id,
                        Product=line.Product,
                        Unit=line.Unit,
                        RouteVehicleDriverId=1,
                        TransactionType='RECEIPT_NOTE_RETURN',
                        ReferenceId=rn_dn.DeliveryNoteId,
                        ReferenceLineId=line.DeliveryNoteLineId,
                        TransactionNo=rn_dn.DeliveryNoteNo,
                        TransactionDate=rn_dn.DeliveryDate,
                        InQty=qty,
                        OutQty=Decimal('0.00'),
                        Narration=f"Shift Return from Van {rn_dn.RouteVehicleDriver.Vehicle.VehicleNumber if rn_dn.RouteVehicleDriver and rn_dn.RouteVehicleDriver.Vehicle else ''}"
                    )

            rn_dn.Status = 'SETTLED'
            rn_dn.save(update_fields=['Status'])

        return Response({
            'success': True,
            'message': f'Receipt Note {rn_dn.DeliveryNoteNo} processed. Stock successfully transferred to Central Godown.'
        })

    @action(detail=False, methods=['get'], url_path='allocated-products')
    def allocated_products(self, request):
        """
        Fetch the list of cylinder products allocated to a specific van / route allocation.
        Returns product list only (product_id, product_name, unit_name) without counts.
        """
        allocation_id = getattr(request, 'query_params', getattr(request, 'GET', {})).get('allocation_id')
        if not allocation_id:
            return Response([])

        company_id = getattr(request.user, 'CompanyId', 1) or 1
        alloc = RouteVehicleDriver.objects.filter(RouteVehicleDriverId=allocation_id).first()
        if not alloc:
            return Response([])

        prod_ids = set()

        # 1. From recent DeliveryNotes for this allocation
        dn_lines = DeliveryNoteLine.objects.filter(
            DeliveryNote__CompanyId=company_id,
            DeliveryNote__RouteVehicleDriver=alloc
        ).values_list('Product_id', flat=True).distinct()
        prod_ids.update(dn_lines)

        # 2. From StockMovements on this van
        sm_prods = StockMovement.objects.filter(
            CompanyId=company_id,
            RouteVehicleDriverId=alloc.RouteVehicleDriverId
        ).values_list('Product_id', flat=True).distinct()
        prod_ids.update(sm_prods)

        # 3. Fallback: all active cylinder/gas products in system if no prior movement
        if not prod_ids:
            cyl_prods = Product.objects.filter(
                CompanyId=company_id
            ).filter(
                Q(ProductName__icontains='cylinder') |
                Q(ProductName__icontains='kg') |
                Q(Category__CategoryName__icontains='cylinder')
            ).values_list('ProductId', flat=True)[:10]
            prod_ids.update(cyl_prods)

        products = Product.objects.filter(ProductId__in=prod_ids).select_related('Unit', 'Category').order_by('ProductName')
        results = []
        for p in products:
            cat_n = p.Category.CategoryName.lower() if p.Category else ''
            p_n = p.ProductName.lower()
            is_cyl = ('cylinder' in cat_n) or ('cylinder' in p_n) or ('kg' in p_n) or ('lpg' in p_n)
            results.append({
                'product_id': p.ProductId,
                'product_name': p.ProductName,
                'unit_id': p.Unit_id,
                'unit_name': p.Unit.UnitName if p.Unit else 'Unit',
                'is_cylinder': is_cyl,
            })
        return Response(results)




    @action(detail=False, methods=['get', 'post'], url_path='receipt-notes')
    def receipt_notes(self, request):
        """
        Inbound Van Route Receipt Notes (Delegates directly to ReceiptNoteViewSet).
        """
        rn_view = ReceiptNoteViewSet()
        rn_view.request = request
        rn_view.format_kwarg = None
        if request.method == 'GET':
            return rn_view.list(request)
        elif request.method == 'POST':
            return rn_view.create(request)

    @action(detail=False, methods=['get'], url_path='last_sync')
    def last_sync(self, request):
        """
        Returns live sync timestamp and delivery count.
        """
        allocation_id = getattr(request, 'query_params', getattr(request, 'GET', {})).get('allocation_id')
        company_id = getattr(request.user, 'CompanyId', 1) or 1
        qs = StockMovement.objects.filter(CompanyId=company_id)
        if allocation_id:
            qs = qs.filter(RouteVehicleDriverId=allocation_id)

        last_mov = qs.order_by('-StockMovementId').first()
        ts = last_mov.CreatedAt.isoformat() if last_mov and hasattr(last_mov, 'CreatedAt') and last_mov.CreatedAt else datetime.now().isoformat()

        del_count = StockMovement.objects.filter(
            CompanyId=company_id,
            RouteVehicleDriverId=allocation_id,
            TransactionType='VAN_SALE',
            TransactionDate=date.today()
        ).values('TransactionNo').distinct().count() if allocation_id else 0

        return Response({
            'last_updated': ts,
            'last_sync_time': datetime.now().strftime("%I:%M %p"),
            'deliveries_count': del_count
        })


class ReceiptNoteViewSet(viewsets.ModelViewSet):
    """
    Handles Godown Receipt Notes (check-ins of unsold stock and empty cylinder returns).
    Completely decoupled from DeliveryNote: wires directly to ReceiptNote and ReceiptNoteLine tables.
    """
    serializer_class = ReceiptNoteSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        company_id = getattr(self.request.user, 'CompanyId', 1) or 1
        return ReceiptNote.objects.filter(CompanyId=company_id).select_related(
            'RouteVehicleDriver__Vehicle', 'RouteVehicleDriver__Route', 'RouteVehicleDriver__Driver'
        ).prefetch_related('lines__Product').order_by('-ReceiptDate', '-ReceiptNoteId')

    def list(self, request, *args, **kwargs):
        notes_qs = self.get_queryset()
        company_id = getattr(request.user, 'CompanyId', 1) or 1
        results = []

        for n in notes_qs:
            alloc = n.RouteVehicleDriver
            veh_no = alloc.Vehicle.VehicleNumber if alloc and alloc.Vehicle else 'Delivery Van'
            r_name = alloc.Route.RouteName if alloc and alloc.Route else 'Route'
            d_name = alloc.Driver.DriverName if alloc and alloc.Driver else 'Driver'

            # Find referenced Delivery Note
            loaded_dn = DeliveryNote.objects.filter(
                CompanyId=company_id,
                RouteVehicleDriver=alloc,
                DeliveryDate=n.ReceiptDate,
                Status='LOADED'
            ).first()
            if not loaded_dn:
                loaded_dn = DeliveryNote.objects.filter(
                    CompanyId=company_id,
                    RouteVehicleDriver=alloc
                ).order_by('-DeliveryDate', '-DeliveryNoteId').first()

            dn_ref = loaded_dn.DeliveryNoteNo if loaded_dn else '—'

            # Lines breakdown (Support both Filled & Empty breakdown)
            empty_breakdown = []
            full_breakdown = []
            total_empties = 0
            total_full = 0

            rem_text = n.Remarks or ''
            if 'Filled:' in rem_text and 'Empty:' in rem_text:
                try:
                    f_section = rem_text.split('Filled:')[1].split('•')[0].strip()
                    if f_section and f_section != '0':
                        for part in f_section.split(','):
                            if 'x' in part:
                                p_nm, q_s = part.split('x')
                                cnt = int(float(q_s.strip()))
                                if cnt > 0:
                                    full_breakdown.append({'product': p_nm.strip(), 'qty': cnt})
                                    total_full += cnt

                    e_section = rem_text.split('Empty:')[1].split('•')[0].strip()
                    if e_section and e_section != '0':
                        for part in e_section.split(','):
                            if 'x' in part:
                                p_nm, q_s = part.split('x')
                                cnt = int(float(q_s.strip()))
                                if cnt > 0:
                                    empty_breakdown.append({'product': p_nm.strip(), 'qty': cnt})
                                    total_empties += cnt
                except Exception:
                    pass

            if not empty_breakdown and not full_breakdown:
                for line in n.lines.all():
                    p_name = line.Product.ProductName if line.Product else 'Gas Cylinder'
                    q = int(line.Quantity)
                    empty_breakdown.append({'product': p_name, 'qty': q})
                    total_empties += q

            results.append({
                'id': str(n.ReceiptNoteId),
                'receiptNoteId': n.ReceiptNoteId,
                'deliveryNoteId': n.ReceiptNoteId,
                'noteNumber': n.ReceiptNoteNo,
                'date': n.ReceiptDate.strftime('%d %b %Y'),
                'time': n.CreatedAt.strftime('%I:%M %p') if (hasattr(n, 'CreatedAt') and n.CreatedAt) else '',
                'vehicleNumber': veh_no,
                'routeName': r_name,
                'driverName': d_name,
                'deliveryNoteRef': dn_ref,
                'emptyCylindersTotal': total_empties,
                'filledCylindersTotal': total_full,
                'emptyBreakdown': empty_breakdown,
                'filledBreakdown': full_breakdown,
                'cashCollected': 0.0,
                'digitalCollected': 0.0,
                'status': 'pending' if n.Status == 'RECEIPT_PENDING' else 'settled',
                'notes': n.Remarks or '',
            })

        return Response(results)




    def create(self, request, *args, **kwargs):
        data = request.data
        allocation_id = data.get('allocation_id')
        delivery_date = safe_parse_date(data.get('delivery_date')) or date.today()
        items = data.get('items', [])
        empty_items = data.get('empty_items', [])
        remarks = data.get('remarks', '')
        auto_settle = data.get('auto_settle', True)
        company_id = getattr(request.user, 'CompanyId', 1) or 1

        if not items and empty_items:
            items = [
                {
                    'product_id': it.get('product_id') or it.get('ProductId'),
                    'empty_qty': it.get('qty') or it.get('quantity') or 0,
                    'filled_qty': it.get('filled_qty') or 0
                }
                for it in empty_items
            ]

        if not allocation_id:
            return Response({'detail': 'Please select an active vehicle / route allocation.'}, status=status.HTTP_400_BAD_REQUEST)

        alloc = RouteVehicleDriver.objects.filter(RouteVehicleDriverId=allocation_id).select_related('Route', 'Vehicle', 'Driver').first()
        if not alloc:
            return Response({'detail': 'Allocation not found.'}, status=status.HTTP_404_NOT_FOUND)

        today_str = date.today().strftime('%Y')
        last_rn = ReceiptNote.objects.filter(ReceiptNoteNo__startswith=f"RN-{today_str}-").order_by('-ReceiptNoteId').first()
        next_seq = 1
        if last_rn and '-' in last_rn.ReceiptNoteNo:
            try:
                parts = last_rn.ReceiptNoteNo.split('-')
                next_seq = int(parts[-1]) + 1
            except:
                next_seq = ReceiptNote.objects.count() + 1

        rn_no = f"RN-{today_str}-{next_seq:04d}"
        while ReceiptNote.objects.filter(ReceiptNoteNo=rn_no).exists():
            next_seq += 1
            rn_no = f"RN-{today_str}-{next_seq:04d}"

        # Build structured breakdown for Filled & Empty
        filled_summary = []
        empty_summary = []

        for it in items:
            p_id = it.get('product_id') or it.get('ProductId')
            f_qty = int(float(it.get('filled_qty') or 0))
            e_qty = int(float(it.get('empty_qty') or it.get('qty') or 0))
            if p_id and (f_qty > 0 or e_qty > 0):
                p_obj = Product.objects.filter(ProductId=p_id).first()
                p_name = p_obj.ProductName if p_obj else f"Product {p_id}"
                if f_qty > 0:
                    filled_summary.append(f"{p_name} x {f_qty}")
                if e_qty > 0:
                    empty_summary.append(f"{p_name} x {e_qty}")

        other_items = data.get('other_items', [])
        other_summary = []
        for oit in other_items:
            p_id = oit.get('product_id') or oit.get('ProductId')
            qty = int(float(oit.get('qty') or oit.get('quantity') or 0))
            if p_id and qty > 0:
                p_obj = Product.objects.filter(ProductId=p_id).first()
                p_name = p_obj.ProductName if p_obj else f"Product {p_id}"
                other_summary.append(f"{p_name} x {qty}")

        filled_part = f"Filled: {', '.join(filled_summary)}" if filled_summary else "Filled: 0"
        empty_part = f"Empty: {', '.join(empty_summary)}" if empty_summary else "Empty: 0"
        final_remarks = f"{filled_part} • {empty_part}"
        if other_summary:
            final_remarks += f" • Other Returns: {', '.join(other_summary)}"
        if remarks:
            final_remarks += f" • {remarks}"

        note_status = 'SETTLED' if auto_settle else 'RECEIPT_PENDING'

        with transaction.atomic():
            rn = ReceiptNote.objects.create(
                ReceiptNoteNo=rn_no,
                ReceiptDate=delivery_date,
                RouteVehicleDriver=alloc,
                CompanyId=company_id,
                Remarks=final_remarks,
                Status=note_status
            )

            for it in items:
                p_id = it.get('product_id') or it.get('ProductId')
                f_qty = Decimal(str(it.get('filled_qty') or 0))
                e_qty = Decimal(str(it.get('empty_qty') or it.get('qty') or 0))
                total_item_qty = f_qty + e_qty

                if not p_id or total_item_qty <= 0:
                    continue
                prod = Product.objects.filter(ProductId=p_id).first()
                if not prod:
                    continue

                line = ReceiptNoteLine.objects.create(
                    ReceiptNote=rn,
                    Product=prod,
                    Unit_id=prod.Unit_id or 1,
                    Quantity=total_item_qty,
                    Rate=prod.SalesPrice or Decimal('0.00'),
                    Amount=total_item_qty * (prod.SalesPrice or Decimal('0.00'))
                )

                if auto_settle:
                    if e_qty > 0:
                        StockMovement.objects.create(
                            CompanyId=company_id,
                            Product=prod,
                            Unit_id=prod.Unit_id or 1,
                            RouteVehicleDriverId=alloc.RouteVehicleDriverId,
                            TransactionType='RECEIPT_NOTE_RETURN',
                            ReferenceId=rn.ReceiptNoteId,
                            ReferenceLineId=line.ReceiptNoteLineId,
                            TransactionNo=rn.ReceiptNoteNo,
                            TransactionDate=rn.ReceiptDate,
                            InQty=Decimal('0.00'),
                            OutQty=e_qty,
                            Narration=f"Shift Return Empties to Godown: {rn.ReceiptNoteNo}"
                        )
                        StockMovement.objects.create(
                            CompanyId=company_id,
                            Product=prod,
                            Unit_id=prod.Unit_id or 1,
                            RouteVehicleDriverId=1,
                            TransactionType='RECEIPT_NOTE_RETURN',
                            ReferenceId=rn.ReceiptNoteId,
                            ReferenceLineId=line.ReceiptNoteLineId,
                            TransactionNo=rn.ReceiptNoteNo,
                            TransactionDate=rn.ReceiptDate,
                            InQty=e_qty,
                            OutQty=Decimal('0.00'),
                            Narration=f"Shift Return from Van {alloc.Vehicle.VehicleNumber if alloc.Vehicle else ''}"
                        )

                    if f_qty > 0:
                        StockMovement.objects.create(
                            CompanyId=company_id,
                            Product=prod,
                            Unit_id=prod.Unit_id or 1,
                            RouteVehicleDriverId=alloc.RouteVehicleDriverId,
                            TransactionType='RECEIPT_NOTE_RETURN',
                            ReferenceId=rn.ReceiptNoteId,
                            ReferenceLineId=line.ReceiptNoteLineId,
                            TransactionNo=rn.ReceiptNoteNo,
                            TransactionDate=rn.ReceiptDate,
                            InQty=Decimal('0.00'),
                            OutQty=f_qty,
                            Narration=f"Shift Return Full Cylinders to Godown: {rn.ReceiptNoteNo}"
                        )
                        StockMovement.objects.create(
                            CompanyId=company_id,
                            Product=prod,
                            Unit_id=prod.Unit_id or 1,
                            RouteVehicleDriverId=1,
                            TransactionType='RECEIPT_NOTE_RETURN',
                            ReferenceId=rn.ReceiptNoteId,
                            ReferenceLineId=line.ReceiptNoteLineId,
                            TransactionNo=rn.ReceiptNoteNo,
                            TransactionDate=rn.ReceiptDate,
                            InQty=f_qty,
                            OutQty=Decimal('0.00'),
                            Narration=f"Shift Return Full from Van {alloc.Vehicle.VehicleNumber if alloc.Vehicle else ''}"
                        )

            for oit in other_items:
                p_id = oit.get('product_id') or oit.get('ProductId')
                qty = Decimal(str(oit.get('qty') or oit.get('quantity') or 0))
                if not p_id or qty <= 0:
                    continue
                prod = Product.objects.filter(ProductId=p_id).first()
                if not prod:
                    continue
                line = ReceiptNoteLine.objects.create(
                    ReceiptNote=rn,
                    Product=prod,
                    Unit_id=prod.Unit_id or 1,
                    Quantity=qty,
                    Rate=prod.SalesPrice or Decimal('0.00'),
                    Amount=qty * (prod.SalesPrice or Decimal('0.00'))
                )
                if auto_settle:
                    StockMovement.objects.create(
                        CompanyId=company_id,
                        Product=prod,
                        Unit_id=prod.Unit_id or 1,
                        RouteVehicleDriverId=alloc.RouteVehicleDriverId,
                        TransactionType='RECEIPT_NOTE_RETURN',
                        ReferenceId=rn.ReceiptNoteId,
                        ReferenceLineId=line.ReceiptNoteLineId,
                        TransactionNo=rn.ReceiptNoteNo,
                        TransactionDate=rn.ReceiptDate,
                        InQty=Decimal('0.00'),
                        OutQty=qty,
                        Narration=f"Shift Return Items to Godown: {rn.ReceiptNoteNo}"
                    )
                    StockMovement.objects.create(
                        CompanyId=company_id,
                        Product=prod,
                        Unit_id=prod.Unit_id or 1,
                        RouteVehicleDriverId=1,
                        TransactionType='RECEIPT_NOTE_RETURN',
                        ReferenceId=rn.ReceiptNoteId,
                        ReferenceLineId=line.ReceiptNoteLineId,
                        TransactionNo=rn.ReceiptNoteNo,
                        TransactionDate=rn.ReceiptDate,
                        InQty=qty,
                        OutQty=Decimal('0.00'),
                        Narration=f"Shift Return Items from Van {alloc.Vehicle.VehicleNumber if alloc.Vehicle else ''}"
                    )

        return Response({
            'success': True,
            'id': str(rn.ReceiptNoteId),
            'receiptNoteId': rn.ReceiptNoteId,
            'deliveryNoteId': rn.ReceiptNoteId,
            'noteNumber': rn.ReceiptNoteNo,
            'status': 'settled' if auto_settle else 'pending',
            'message': f'Receipt Note {rn.ReceiptNoteNo} created and {"settled into Godown" if auto_settle else "queued for verification"}.'
        }, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        with transaction.atomic():
            StockMovement.objects.filter(
                Q(TransactionType='RECEIPT_NOTE_RETURN') |
                Q(TransactionType='RECEIPT_NOTE'),
                Q(ReferenceId=instance.ReceiptNoteId) |
                Q(TransactionNo=instance.ReceiptNoteNo)
            ).delete()
            instance.lines.all().delete()
            instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['post'], url_path='process_receipt_note')
    def process_receipt_note(self, request):
        receipt_id = request.data.get('receipt_note_id') or request.data.get('delivery_note_id') or request.data.get('receipt_id')
        rn = ReceiptNote.objects.filter(ReceiptNoteId=receipt_id, Status='RECEIPT_PENDING').first()
        if not rn:
            return Response({'success': False, 'message': 'Receipt Note not found or already processed.'}, status=status.HTTP_404_NOT_FOUND)

        company_id = getattr(request.user, 'CompanyId', 1) or 1
        alloc_id = rn.RouteVehicleDriver_id

        with transaction.atomic():
            for line in rn.lines.all():
                qty = line.Quantity
                if qty > 0:
                    StockMovement.objects.create(
                        CompanyId=company_id,
                        Product=line.Product,
                        Unit=line.Unit,
                        RouteVehicleDriver_id=alloc_id,
                        TransactionType='RECEIPT_NOTE_RETURN',
                        ReferenceId=rn.ReceiptNoteId,
                        ReferenceLineId=line.ReceiptNoteLineId,
                        TransactionNo=rn.ReceiptNoteNo,
                        TransactionDate=rn.ReceiptDate,
                        InQty=Decimal('0.00'),
                        OutQty=qty,
                        Narration=f"Shift Return to Godown: {rn.ReceiptNoteNo}"
                    )
                    StockMovement.objects.create(
                        CompanyId=company_id,
                        Product=line.Product,
                        Unit=line.Unit,
                        RouteVehicleDriverId=1,
                        TransactionType='RECEIPT_NOTE_RETURN',
                        ReferenceId=rn.ReceiptNoteId,
                        ReferenceLineId=line.ReceiptNoteLineId,
                        TransactionNo=rn.ReceiptNoteNo,
                        TransactionDate=rn.ReceiptDate,
                        InQty=qty,
                        OutQty=Decimal('0.00'),
                        Narration=f"Shift Return from Van {rn.RouteVehicleDriver.Vehicle.VehicleNumber if rn.RouteVehicleDriver and rn.RouteVehicleDriver.Vehicle else ''}"
                    )

            rn.Status = 'SETTLED'
            rn.save(update_fields=['Status'])

        return Response({
            'success': True,
            'message': f'Receipt Note {rn.ReceiptNoteNo} processed. Stock successfully transferred to Central Godown.'
        })

    @action(detail=False, methods=['get'], url_path='allocated-products')
    def allocated_products(self, request):
        allocation_id = getattr(request, 'query_params', getattr(request, 'GET', {})).get('allocation_id')
        if not allocation_id:
            return Response([])

        company_id = getattr(request.user, 'CompanyId', 1) or 1
        alloc = RouteVehicleDriver.objects.filter(RouteVehicleDriverId=allocation_id).first()
        if not alloc:
            return Response([])

        prod_ids = set()
        dn_lines = DeliveryNoteLine.objects.filter(
            DeliveryNote__CompanyId=company_id,
            DeliveryNote__RouteVehicleDriver=alloc
        ).values_list('Product_id', flat=True).distinct()
        prod_ids.update(dn_lines)

        sm_prods = StockMovement.objects.filter(
            CompanyId=company_id,
            RouteVehicleDriverId=alloc.RouteVehicleDriverId
        ).values_list('Product_id', flat=True).distinct()
        prod_ids.update(sm_prods)

        if not prod_ids:
            cyl_prods = Product.objects.filter(
                CompanyId=company_id
            ).filter(
                Q(ProductName__icontains='cylinder') |
                Q(ProductName__icontains='kg') |
                Q(Category__CategoryName__icontains='cylinder')
            ).values_list('ProductId', flat=True)[:10]
            prod_ids.update(cyl_prods)

        products = Product.objects.filter(ProductId__in=prod_ids).select_related('Unit', 'Category').order_by('ProductName')
        results = []
        for p in products:
            cat_n = p.Category.CategoryName.lower() if p.Category else ''
            p_n = p.ProductName.lower()
            is_cyl = ('cylinder' in cat_n) or ('cylinder' in p_n) or ('kg' in p_n) or ('lpg' in p_n)
            results.append({
                'product_id': p.ProductId,
                'product_name': p.ProductName,
                'unit_id': p.Unit_id,
                'unit_name': p.Unit.UnitName if p.Unit else 'Unit',
                'is_cylinder': is_cyl,
            })
        return Response(results)


class EndRouteDriverViewSet(viewsets.ModelViewSet):
    """
    Handles daily shift settlements dynamically powered by Sales, SalesLine, and DeliveryNotes.
    Decoupled from legacy EndRouteDriver tables for single-source-of-truth accuracy.
    """
    serializer_class = EndRouteDriverSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        company_id = getattr(self.request.user, 'CompanyId', 1) or 1
        return DeliveryNote.objects.filter(
            CompanyId=company_id,
            Status__in=['PENDING_APPROVAL', 'COMPLETED', 'SETTLED']
        ).select_related(
            'RouteVehicleDriver__Vehicle', 'RouteVehicleDriver__Driver', 'RouteVehicleDriver__Route'
        ).order_by('-DeliveryDate', '-DeliveryNoteId')

    def list(self, request, *args, **kwargs):
        """
        Dynamically returns driver shift records aggregated directly from DeliveryNotes and Sales.
        Only includes shifts where driver has submitted End Shift (PENDING_APPROVAL) or that are settled (COMPLETED).
        """
        company_id = getattr(request.user, 'CompanyId', 1) or 1
        dn_qs = DeliveryNote.objects.filter(
            CompanyId=company_id,
            Status__in=['PENDING_APPROVAL', 'COMPLETED', 'SETTLED']
        ).select_related(
            'RouteVehicleDriver__Vehicle', 'RouteVehicleDriver__Driver', 'RouteVehicleDriver__Route'
        ).prefetch_related('lines__Product', 'lines__Unit').order_by('-DeliveryDate', '-DeliveryNoteId')

        items = []
        for dn in dn_qs:
            alloc = dn.RouteVehicleDriver
            s_date = dn.DeliveryDate

            # Time-window scoping: scope strictly to this delivery note shift
            next_dn = DeliveryNote.objects.filter(
                CompanyId=company_id,
                RouteVehicleDriver_id=dn.RouteVehicleDriver_id,
                DeliveryNoteId__gt=dn.DeliveryNoteId
            ).order_by('DeliveryNoteId').first()

            sales_qs = Sales.objects.filter(
                CompanyId=company_id,
                RouteVehicleDriver_id=dn.RouteVehicleDriver_id,
                CreatedAt__gte=dn.CreatedAt
            ).exclude(Status='CANCELLED')
            if next_dn and next_dn.CreatedAt:
                sales_qs = sales_qs.filter(CreatedAt__lt=next_dn.CreatedAt)

            trip_expenses_qs = RouteExpense.objects.filter(
                CompanyId=company_id,
                RouteVehicleDriver_id=dn.RouteVehicleDriver_id,
                CreatedAt__gte=dn.CreatedAt
            )
            if next_dn and next_dn.CreatedAt:
                trip_expenses_qs = trip_expenses_qs.filter(CreatedAt__lt=next_dn.CreatedAt)

            # Cash & Bank collections (strictly actual collected money, excluding credit sales)
            cash_amt = float(sales_qs.filter(PaymentMethod__iexact='Cash').aggregate(s=Sum('PaidAmount'))['s'] or 0)
            bank_amt = float(sales_qs.filter(PaymentMethod__in=['UPI', 'Bank', 'Online', 'Card', 'Digital', 'CHEQUE', 'Cheque', 'bank', 'upi']).aggregate(s=Sum('PaidAmount'))['s'] or 0)
            gross_amt = float(sales_qs.aggregate(s=Sum('PaidAmount'))['s'] or (cash_amt + bank_amt))

            # Driver trip expenses for this shift
            trip_expenses = float(trip_expenses_qs.aggregate(s=Sum('Amount'))['s'] or 0)

            # Aggregated product lines combining DeliveryNote (Loaded) and SalesLine (Delivered)
            prod_map = {}

            # 1. First, populate from DeliveryNote lines (Morning Loaded stock)
            for dnl in dn.lines.all():
                p = dnl.Product
                p_id = dnl.Product_id
                if not p_id:
                    continue
                if p_id not in prod_map:
                    prod_map[p_id] = {
                        'EndRouteDriverLineId': dnl.DeliveryNoteLineId,
                        'Product': p_id,
                        'product_name': p.ProductName if p else 'Cylinder',
                        'Unit': dnl.Unit_id or (p.Unit_id if p else 1),
                        'unit_name': dnl.Unit.UnitName if dnl.Unit else (p.Unit.UnitName if p and p.Unit else 'Cyls'),
                        'LoadedQty': 0,
                        'DeliveredQty': 0,
                        'FilledQty': 0,
                        'EmptyQty': 0,
                        'Rate': float(dnl.Rate or (p.SalesPrice if p else 0) or 0),
                        'Amount': 0.0,
                    }
                prod_map[p_id]['LoadedQty'] += int(dnl.Quantity or 0)

            # 2. Next, accumulate Delivered full and Empty returned from Sales lines
            lines_qs = SalesLine.objects.filter(Sales__in=sales_qs).select_related('Product', 'Unit')
            for l in lines_qs:
                p = l.Product
                p_id = l.Product_id
                if not p_id:
                    continue
                if p_id not in prod_map:
                    prod_map[p_id] = {
                        'EndRouteDriverLineId': l.SalesLineId,
                        'Product': p_id,
                        'product_name': p.ProductName if p else (l.ProductName or 'Cylinder'),
                        'Unit': l.Unit_id or (p.Unit_id if p else 1),
                        'unit_name': l.Unit.UnitName if l.Unit else (p.Unit.UnitName if p and p.Unit else 'Cyls'),
                        'LoadedQty': 0,
                        'DeliveredQty': 0,
                        'FilledQty': 0,
                        'EmptyQty': 0,
                        'Rate': float(l.SalesPrice or (p.SalesPrice if p else 0) or 0),
                        'Amount': 0.0,
                    }
                prod_map[p_id]['DeliveredQty'] += int(l.Quantity or 0)
                prod_map[p_id]['EmptyQty'] += int(l.EmptyQuantity or 0)
                prod_map[p_id]['Amount'] += float(l.Total or 0)

            # 3. Calculate Unsold Full (FilledQty) = max(0, LoadedQty - DeliveredQty)
            for p_id, p_info in prod_map.items():
                p_info['FilledQty'] = max(0, p_info['LoadedQty'] - p_info['DeliveredQty'])

            total_loaded = sum(p['LoadedQty'] for p in prod_map.values())
            total_delivered = sum(p['DeliveredQty'] for p in prod_map.values())
            total_filled = sum(p['FilledQty'] for p in prod_map.values())
            total_empty = sum(p['EmptyQty'] for p in prod_map.values())

            status_str = 'SETTLED' if dn.Status == 'COMPLETED' else 'PENDING'
            net_balance = (cash_amt + bank_amt) - trip_expenses

            items.append({
                'EndRouteDriverId': dn.DeliveryNoteId,
                'ShiftDate': str(s_date),
                'RouteVehicleDriver': dn.RouteVehicleDriver_id,
                'driver_name': alloc.Driver.DriverName if alloc and alloc.Driver else 'Driver',
                'vehicle_number': alloc.Vehicle.VehicleNumber if alloc and alloc.Vehicle else 'Van',
                'route_name': alloc.Route.RouteName if alloc and alloc.Route else 'Route',
                'Ledger': 24,
                'ledger_name': 'Cash in Hand' if cash_amt >= bank_amt else 'Bank Accounts',
                'CompanyId': company_id,
                'Remarks': dn.Remarks or f"Shift: {alloc.Vehicle.VehicleNumber if alloc and alloc.Vehicle else 'Van'}",
                'Status': status_str,
                'CreatedAt': dn.CreatedAt.isoformat() if (hasattr(dn, 'CreatedAt') and dn.CreatedAt) else str(s_date),
                'cash_amount': cash_amt,
                'bank_amount': bank_amt,
                'gross_amount': gross_amt,
                'trip_expenses': trip_expenses,
                'net_balance': net_balance,
                'total_loaded': total_loaded,
                'total_delivered': total_delivered,
                'total_filled': total_filled,
                'total_unsold': total_filled,
                'total_empty': total_empty,
                'lines': list(prod_map.values()),
            })

        return Response(items)

    def destroy(self, request, *args, **kwargs):
        pk = kwargs.get('pk')
        company_id = getattr(request.user, 'CompanyId', 1) or 1
        dn = DeliveryNote.objects.filter(DeliveryNoteId=pk, CompanyId=company_id).first()
        if dn:
            with transaction.atomic():
                # 1. Revert DeliveryNote status to LOADED
                dn.Status = 'LOADED'
                dn.save(update_fields=['Status'])

                # 2. Reverse and remove end-shift / settlement stock unload movements
                StockMovement.objects.filter(
                    CompanyId=company_id,
                    ReferenceId=dn.DeliveryNoteId,
                    TransactionType__in=['VAN_UNLOAD_FULL', 'GODOWN_RETURN_FULL', 'VAN_UNLOAD_EMPTY', 'GODOWN_RETURN_EMPTY']
                ).delete()

                # Also catch any with TransactionNo matching ERD-<id>
                StockMovement.objects.filter(
                    CompanyId=company_id,
                    TransactionNo=f"ERD-{dn.DeliveryNoteId}"
                ).delete()

                # 3. Revert Sales status back to LIVE
                sales_qs = Sales.objects.filter(
                    RouteVehicleDriver_id=dn.RouteVehicleDriver_id,
                    SalesDate=dn.DeliveryDate,
                    CompanyId=company_id
                ).exclude(Status='CANCELLED')
                affected_ledgers = {24, 56, 20, 22, 23, 35}
                for s in sales_qs:
                    if s.CustomerLedger_id:
                        affected_ledgers.add(s.CustomerLedger_id)

                # 4. If vouchers were created during a previous settlement, remove them and re-sync ledger balances
                sale_ids = list(sales_qs.values_list('SalesId', flat=True))
                vouchers = Voucher.objects.filter(CompanyId=company_id, ReferenceTable='Sales', ReferenceId__in=sale_ids)
                for v in vouchers:
                    v.lines.all().delete()
                vouchers.delete()
                Voucher.objects.filter(CompanyId=company_id, VoucherNo=f"SHIFT-VCH-{dn.DeliveryNoteId}").delete()

                # Also remove expense payment vouchers settled during this shift
                settled_exps = RouteExpense.objects.filter(
                    CompanyId=company_id,
                    RouteVehicleDriver_id=dn.RouteVehicleDriver_id,
                    Payment__isnull=False
                ).filter(
                    Q(ExpenseDate=dn.DeliveryDate) | Q(CreatedAt__gte=dn.CreatedAt)
                )
                for exp in settled_exps:
                    pmt = exp.Payment
                    exp.Payment = None
                    exp.save(update_fields=['Payment'])
                    if pmt:
                        if pmt.PartyLedger:
                            affected_ledgers.add(pmt.PartyLedger.LedgerId)
                        for pl in pmt.lines.all():
                            if pl.Ledger:
                                affected_ledgers.add(pl.Ledger.LedgerId)
                        exp_vchs = Voucher.objects.filter(ReferenceTable='Payment', ReferenceId=pmt.PaymentId)
                        for ev in exp_vchs:
                            ev.lines.all().delete()
                        exp_vchs.delete()
                        pmt.lines.all().delete()
                        pmt.delete()

                sales_qs.update(Status='LIVE', ApprovedBy=None, ApprovedAt=None)
                sync_ledger_balances(*affected_ledgers)

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='settle')
    def settle(self, request, pk=None):
        company_id = getattr(request.user, 'CompanyId', 1) or 1
        dn = DeliveryNote.objects.filter(DeliveryNoteId=pk, CompanyId=company_id).select_related(
            'RouteVehicleDriver__Vehicle', 'RouteVehicleDriver__Driver', 'RouteVehicleDriver__Route'
        ).first()

        if not dn:
            return Response({'success': False, 'message': 'Shift delivery note record not found.'}, status=status.HTTP_404_NOT_FOUND)

        alloc = dn.RouteVehicleDriver
        shift_date = dn.DeliveryDate

        with transaction.atomic():
            # 1. Mark DeliveryNote as COMPLETED
            dn.Status = 'COMPLETED'
            dn.save(update_fields=['Status'])

            # 2. Update all Sales for this driver allocation and shift date to COMPLETED / APPROVED
            sales_qs = Sales.objects.filter(
                RouteVehicleDriver_id=dn.RouteVehicleDriver_id,
                SalesDate=shift_date,
                CompanyId=company_id
            ).exclude(Status='CANCELLED')
            sales_qs.update(
                Status='COMPLETED',
                ApprovedBy=request.user if request.user.is_authenticated else None,
                ApprovedAt=timezone.now()
            )

            # 3. Empty the van completely: Transfer ALL remaining unsold filled cylinders & customer empty returns to Central Godown (RouteVehicleDriverId=1)
            # Safeguard: If this shift was already unloaded (e.g. by end_shift), do not duplicate GODOWN_RETURN_FULL / GODOWN_RETURN_EMPTY
            already_unloaded = StockMovement.objects.filter(
                CompanyId=company_id,
                ReferenceId=dn.DeliveryNoteId,
                TransactionType__in=['VAN_UNLOAD_FULL', 'GODOWN_RETURN_FULL']
            ).exists()

            if not already_unloaded:
                allocated_prod_ids = set(
                    StockMovement.objects.filter(
                        CompanyId=company_id,
                        RouteVehicleDriverId=alloc.RouteVehicleDriverId
                    ).values_list('Product_id', flat=True)
                )
                for dnl in dn.lines.all():
                    if dnl.Product_id:
                        allocated_prod_ids.add(dnl.Product_id)

                # Find the starting StockMovementId for this specific shift to avoid aggregating past shifts
                first_dn_sm = StockMovement.objects.filter(
                    RouteVehicleDriverId=alloc.RouteVehicleDriverId,
                    TransactionType='DELIVERY_NOTE',
                    ReferenceId=dn.DeliveryNoteId
                ).order_by('StockMovementId').first()

                for p_id in allocated_prod_ids:
                    if not p_id:
                        continue
                    prod = Product.objects.filter(ProductId=p_id).first()
                    if not prod:
                        continue

                    v_movs = StockMovement.objects.filter(
                        CompanyId=company_id,
                        Product=prod,
                        RouteVehicleDriverId=alloc.RouteVehicleDriverId
                    )
                    if first_dn_sm:
                        v_movs = v_movs.filter(StockMovementId__gte=first_dn_sm.StockMovementId)

                    dn_in = v_movs.filter(TransactionType='DELIVERY_NOTE').aggregate(s=Sum('InQty'))['s'] or Decimal('0.00')
                    sale_out = v_movs.filter(TransactionType='VAN_SALE').aggregate(s=Sum('OutQty'))['s'] or Decimal('0.00')
                    unload_full = v_movs.filter(TransactionType='VAN_UNLOAD_FULL').aggregate(s=Sum('OutQty'))['s'] or Decimal('0.00')
                    bal_full = max(Decimal('0.00'), dn_in - sale_out - unload_full)

                    empty_in = v_movs.filter(TransactionType='VAN_EMPTY_RETURN').aggregate(s=Sum('InQty'))['s'] or Decimal('0.00')
                    empty_out = v_movs.filter(TransactionType='VAN_UNLOAD_EMPTY').aggregate(s=Sum('OutQty'))['s'] or Decimal('0.00')
                    bal_empty = max(Decimal('0.00'), empty_in - empty_out)

                    # Return remaining unsold full cylinders to Godown (RouteVehicleDriverId=1)
                    if bal_full > 0:
                        StockMovement.objects.create(
                            CompanyId=company_id,
                            Product=prod,
                            Unit_id=prod.Unit_id or 1,
                            RouteVehicleDriverId=alloc.RouteVehicleDriverId,
                            TransactionType='VAN_UNLOAD_FULL',
                            ReferenceId=dn.DeliveryNoteId,
                            TransactionNo=f"ERD-{dn.DeliveryNoteId}",
                            TransactionDate=shift_date,
                            InQty=Decimal('0.00'),
                            OutQty=bal_full,
                            Narration=f"Shift Return Unsold Full from Van {alloc.Vehicle.VehicleNumber if alloc and alloc.Vehicle else ''}"
                        )
                        StockMovement.objects.create(
                            CompanyId=company_id,
                            Product=prod,
                            Unit_id=prod.Unit_id or 1,
                            RouteVehicleDriverId=1,
                            TransactionType='GODOWN_RETURN_FULL',
                            ReferenceId=dn.DeliveryNoteId,
                            TransactionNo=f"ERD-{dn.DeliveryNoteId}",
                            TransactionDate=shift_date,
                            InQty=bal_full,
                            OutQty=Decimal('0.00'),
                            Narration=f"Shift Return Full to Godown from Van {alloc.Vehicle.VehicleNumber if alloc and alloc.Vehicle else ''}"
                        )

                    # Return empty cylinders collected from customers to Godown (RouteVehicleDriverId=1)
                    if bal_empty > 0:
                        StockMovement.objects.create(
                            CompanyId=company_id,
                            Product=prod,
                            Unit_id=prod.Unit_id or 1,
                            RouteVehicleDriverId=alloc.RouteVehicleDriverId,
                            TransactionType='VAN_UNLOAD_EMPTY',
                            ReferenceId=dn.DeliveryNoteId,
                            TransactionNo=f"ERD-{dn.DeliveryNoteId}",
                            TransactionDate=shift_date,
                            InQty=Decimal('0.00'),
                            OutQty=bal_empty,
                            Narration=f"Shift Return Empty from Van {alloc.Vehicle.VehicleNumber if alloc and alloc.Vehicle else ''}"
                        )
                        StockMovement.objects.create(
                            CompanyId=company_id,
                            Product=prod,
                            Unit_id=prod.Unit_id or 1,
                            RouteVehicleDriverId=1,
                            TransactionType='GODOWN_RETURN_EMPTY',
                            ReferenceId=dn.DeliveryNoteId,
                            TransactionNo=f"ERD-{dn.DeliveryNoteId}",
                            TransactionDate=shift_date,
                            InQty=bal_empty,
                            OutQty=Decimal('0.00'),
                            Narration=f"Shift Return Empty to Godown from Van {alloc.Vehicle.VehicleNumber if alloc and alloc.Vehicle else ''}"
                        )

            # 5. Generate Double-Entry Accounting Vouchers for Shift & Customer Accounts
            affected_ledgers = {24, 56, 20, 22, 23, 35}
            cash_led = Ledger.objects.filter(LedgerId=24).first() or Ledger.objects.filter(CompanyId=company_id, Group__GroupName__icontains='Cash').first()
            bank_led = Ledger.objects.filter(LedgerId=56).first() or Ledger.objects.filter(CompanyId=company_id, Group__GroupName__icontains='Bank').first()
            sales_led = Ledger.objects.filter(LedgerId=20).first() or Ledger.objects.filter(Group__GroupName='Sales Accounts').first()
            cgst_led = Ledger.objects.filter(LedgerId=22).first() or Ledger.objects.filter(LedgerName__icontains='CGST Output').first()
            sgst_led = Ledger.objects.filter(LedgerId=23).first() or Ledger.objects.filter(LedgerName__icontains='SGST Output').first()
            igst_led = Ledger.objects.filter(LedgerId=35).first() or Ledger.objects.filter(CompanyId=company_id, LedgerName__icontains='IGST Output').first()

            for sale in sales_qs:
                subtotal = Decimal(str(sale.SubTotal or 0))
                tax = Decimal(str(sale.TaxAmount or 0))
                gross_bill = Decimal(str(sale.GrandTotal or 0)) or (subtotal + tax)
                paid_amt = Decimal(str(sale.PaidAmount or 0))

                cust = sale.CustomerLedger
                is_intra = (not cust or not cust.StateId or cust.StateId in [12, 32])
                if is_intra:
                    half_tax = (tax / Decimal('2.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                    other_half = (tax - half_tax).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                    igst_tax = Decimal('0.00')
                else:
                    half_tax = Decimal('0.00')
                    other_half = Decimal('0.00')
                    igst_tax = tax

                pm = (sale.PaymentMethod or 'Cash').upper()
                cash_or_bank = bank_led if ('UPI' in pm or 'BANK' in pm or 'ONLINE' in pm) else cash_led

                vch = Voucher.objects.filter(
                    CompanyId=company_id,
                    ReferenceTable='Sales',
                    ReferenceId=sale.SalesId,
                ).first()
                if not vch:
                    base_no = f"SALE-{sale.SalesNo}"
                    candidate_no = base_no
                    counter = 1
                    while Voucher.objects.filter(CompanyId=company_id, VoucherType='SALES', VoucherNo=candidate_no).exists():
                        candidate_no = f"{base_no}-{sale.SalesId}" if counter == 1 else f"{base_no}-{sale.SalesId}-{counter}"
                        counter += 1

                    vch = Voucher.objects.create(
                        CompanyId=company_id,
                        ReferenceTable='Sales',
                        ReferenceId=sale.SalesId,
                        VoucherNo=candidate_no,
                        VoucherDate=sale.SalesDate,
                        VoucherType='SALES',
                        Narration=f"Shift Sale {sale.SalesNo} - {sale.CustomerLedger.LedgerName if sale.CustomerLedger else 'Direct Customer'}",
                        IsCancelled=False,
                    )
                vch.lines.all().delete()
                line_no = 1

                if sale.CustomerLedger:
                    cust = sale.CustomerLedger
                    affected_ledgers.add(cust.LedgerId)

                    # A. Customer Debit for Invoice
                    if gross_bill > 0:
                        VoucherLine.objects.create(
                            Voucher=vch, LineNo=line_no, Ledger=cust,
                            DebitAmount=gross_bill, CreditAmount=Decimal('0.00'),
                            Narration=f"Bill {sale.SalesNo}"
                        )
                        line_no += 1
                        if subtotal > 0 and sales_led:
                            VoucherLine.objects.create(
                                Voucher=vch, LineNo=line_no, Ledger=sales_led,
                                DebitAmount=Decimal('0.00'), CreditAmount=subtotal,
                                Narration=f"Sales Taxable {sale.SalesNo}"
                            )
                            line_no += 1
                        if is_intra:
                            if half_tax > 0 and cgst_led:
                                VoucherLine.objects.create(
                                    Voucher=vch, LineNo=line_no, Ledger=cgst_led,
                                    DebitAmount=Decimal('0.00'), CreditAmount=half_tax,
                                    Narration=f"CGST Output {sale.SalesNo}"
                                )
                                line_no += 1
                            if other_half > 0 and sgst_led:
                                VoucherLine.objects.create(
                                    Voucher=vch, LineNo=line_no, Ledger=sgst_led,
                                    DebitAmount=Decimal('0.00'), CreditAmount=other_half,
                                    Narration=f"SGST Output {sale.SalesNo}"
                                )
                                line_no += 1
                        else:
                            if igst_tax > 0 and igst_led:
                                VoucherLine.objects.create(
                                    Voucher=vch, LineNo=line_no, Ledger=igst_led,
                                    DebitAmount=Decimal('0.00'), CreditAmount=igst_tax,
                                    Narration=f"IGST Output {sale.SalesNo}"
                                )
                                line_no += 1

                    # B. Payment Received from Customer (clears past outstanding via double-entry)
                    if paid_amt > 0 and cash_or_bank:
                        VoucherLine.objects.create(
                            Voucher=vch, LineNo=line_no, Ledger=cash_or_bank,
                            DebitAmount=paid_amt, CreditAmount=Decimal('0.00'),
                            Narration=f"Payment for {sale.SalesNo} ({pm})"
                        )
                        line_no += 1
                        cust_vl = VoucherLine.objects.create(
                            Voucher=vch, LineNo=line_no, Ledger=cust,
                            DebitAmount=Decimal('0.00'), CreditAmount=paid_amt,
                            Narration=f"Payment Received ({pm})"
                        )
                        line_no += 1
                        sync_sales_billwise_allocation(sale, cust_vl)
                else:
                    # Walk-in cash/bank sale
                    amt = paid_amt if paid_amt > 0 else gross_bill
                    if amt > 0 and cash_or_bank:
                        VoucherLine.objects.create(
                            Voucher=vch, LineNo=line_no, Ledger=cash_or_bank,
                            DebitAmount=amt, CreditAmount=Decimal('0.00'),
                            Narration=f"Direct Sale {sale.SalesNo}"
                        )
                        line_no += 1
                    if subtotal > 0 and sales_led:
                        VoucherLine.objects.create(
                            Voucher=vch, LineNo=line_no, Ledger=sales_led,
                            DebitAmount=Decimal('0.00'), CreditAmount=subtotal,
                            Narration=f"Sales Taxable {sale.SalesNo}"
                        )
                        line_no += 1
                    if is_intra:
                        if half_tax > 0 and cgst_led:
                            VoucherLine.objects.create(
                                Voucher=vch, LineNo=line_no, Ledger=cgst_led,
                                DebitAmount=Decimal('0.00'), CreditAmount=half_tax,
                                Narration=f"CGST Output {sale.SalesNo}"
                            )
                            line_no += 1
                        if other_half > 0 and sgst_led:
                            VoucherLine.objects.create(
                                Voucher=vch, LineNo=line_no, Ledger=sgst_led,
                                DebitAmount=Decimal('0.00'), CreditAmount=other_half,
                                Narration=f"SGST Output {sale.SalesNo}"
                            )
                            line_no += 1
                    else:
                        if igst_tax > 0 and igst_led:
                            VoucherLine.objects.create(
                                Voucher=vch, LineNo=line_no, Ledger=igst_led,
                                DebitAmount=Decimal('0.00'), CreditAmount=igst_tax,
                                Narration=f"IGST Output {sale.SalesNo}"
                            )
                            line_no += 1

            # 6. Generate Double-Entry Accounting Vouchers for Shift Route Expenses
            shift_expenses_qs = RouteExpense.objects.filter(
                CompanyId=company_id,
                RouteVehicleDriver_id=dn.RouteVehicleDriver_id,
                Payment__isnull=True
            ).filter(
                Q(ExpenseDate=shift_date) | Q(CreatedAt__gte=dn.CreatedAt)
            )

            next_dn = DeliveryNote.objects.filter(
                CompanyId=company_id,
                RouteVehicleDriver_id=dn.RouteVehicleDriver_id,
                CreatedAt__gt=dn.CreatedAt
            ).order_by('CreatedAt').first()
            if next_dn and next_dn.CreatedAt:
                shift_expenses_qs = shift_expenses_qs.filter(CreatedAt__lt=next_dn.CreatedAt)

            travelling_ledger = (
                Ledger.objects.filter(LedgerId=31).first()
                or Ledger.objects.filter(CompanyId=company_id, LedgerName__iexact='Travelling Expense').first()
                or Ledger.objects.filter(LedgerName__icontains='travel').first()
            )

            for exp in shift_expenses_qs:
                exp_amt = Decimal(str(exp.Amount or 0))
                if exp_amt <= Decimal('0.00'):
                    continue

                pm_lower = (exp.PaymentMode or 'Cash').lower()
                exp_cash_or_bank = bank_led if ('upi' in pm_lower or 'bank' in pm_lower or 'online' in pm_lower) else cash_led
                if travelling_ledger and exp_cash_or_bank:
                    v_num = alloc.Vehicle.VehicleNumber if alloc and alloc.Vehicle else ''
                    d_nm = alloc.Driver.DriverName if alloc and alloc.Driver else ''
                    r_nm = alloc.Route.RouteName if alloc and alloc.Route else ''
                    notes_str = f" | {exp.Notes}" if exp.Notes else ""
                    exp_narration = f"Trip Expense: {exp.Category} | Route: {r_nm} | Van: {v_num} | Driver: {d_nm}{notes_str}".strip()

                    payment = Payment.objects.create(
                        PartyLedger=travelling_ledger,
                        Amount=exp_amt,
                        Narration=exp_narration,
                    )
                    PaymentLine.objects.create(
                        Payment=payment,
                        LineNo=1,
                        PaymentMode=exp.PaymentMode or 'Cash',
                        Ledger=exp_cash_or_bank,
                        Amount=exp_amt,
                        Narration=f"{exp.PaymentMode or 'Cash'} payment for trip expense",
                    )
                    voucher = Voucher.objects.create(
                        VoucherNo=f"EXP-PAY-{payment.PaymentId}",
                        VoucherDate=shift_date,
                        VoucherType='PAYMENT',
                        ReferenceTable='Payment',
                        ReferenceId=payment.PaymentId,
                        CompanyId=company_id,
                        Narration=exp_narration,
                        IsCancelled=False,
                    )
                    VoucherLine.objects.create(
                        Voucher=voucher,
                        LineNo=1,
                        Ledger=travelling_ledger,
                        DebitAmount=exp_amt,
                        CreditAmount=Decimal('0.00'),
                        Narration=exp_narration,
                    )
                    VoucherLine.objects.create(
                        Voucher=voucher,
                        LineNo=2,
                        Ledger=exp_cash_or_bank,
                        DebitAmount=Decimal('0.00'),
                        CreditAmount=exp_amt,
                        Narration=f"Payment via {exp_cash_or_bank.LedgerName}",
                    )
                    exp.Payment = payment
                    exp.save(update_fields=['Payment'])

                    affected_ledgers.add(travelling_ledger.LedgerId)
                    affected_ledgers.add(exp_cash_or_bank.LedgerId)

            # Clean up any legacy shift-level bulk voucher to avoid double counting
            Voucher.objects.filter(VoucherNo=f"SHIFT-VCH-{dn.DeliveryNoteId}").delete()

            # Synchronize balances across all customer ledgers, cash, bank, and revenue accounts
            sync_ledger_balances(*affected_ledgers)

        return Response({
            'success': True,
            'message': f'Shift settlement for Delivery Note #{dn.DeliveryNoteNo} approved and verified into accounts.',
            'settlement_id': dn.DeliveryNoteId
        })

    @action(detail=False, methods=['get'], url_path='shift_status')
    def shift_status(self, request):
        allocation_id = getattr(request, 'query_params', getattr(request, 'GET', {})).get('allocation_id')
        driver_id = request.query_params.get('driver_id')
        company_id = getattr(request.user, 'CompanyId', 1) or 1

        dn_qs = DeliveryNote.objects.filter(CompanyId=company_id)
        if allocation_id:
            dn_qs = dn_qs.filter(RouteVehicleDriver_id=allocation_id)
        elif driver_id:
            dn_qs = dn_qs.filter(RouteVehicleDriver__DriverId=driver_id)

        latest_dn = dn_qs.order_by('-DeliveryDate', '-DeliveryNoteId').first()
        if latest_dn and latest_dn.DeliveryDate == date.today():
            is_settled = (latest_dn.Status == 'COMPLETED')
            is_pending = (latest_dn.Status == 'PENDING_APPROVAL')
            has_ended = is_settled or is_pending

            return Response({
                'has_ended_shift': has_ended,
                'status': 'SETTLED' if is_settled else ('PENDING' if is_pending else 'ACTIVE'),
                'is_settled': is_settled,
                'waiting_for_next_allocation': is_settled,
                'shift_date': str(latest_dn.DeliveryDate),
                'settlement_id': latest_dn.DeliveryNoteId,
            })

        return Response({
            'has_ended_shift': False,
            'status': 'ACTIVE',
            'is_settled': False,
            'waiting_for_next_allocation': False,
            'shift_date': str(date.today()),
        })


class SalesViewSet(viewsets.ModelViewSet):
    """
    Handles sales records, invoice generation, status tracking, and audit approvals.
    """
    serializer_class = SalesSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_permissions(self):
        if self.action in ['invoice_pdf', 'detail_invoice_pdf', 'invoice_pdf_detail']:
            return [AllowAny()]
        return super().get_permissions()

    def get_queryset(self):
        company_id = getattr(self.request.user, 'CompanyId', 1) or 1
        qs = Sales.objects.filter(CompanyId=company_id).select_related(
            'RouteVehicleDriver__Route', 'RouteVehicleDriver__Vehicle', 'RouteVehicleDriver__Driver',
            'CustomerLedger', 'ApprovedBy'
        ).prefetch_related('lines__Product', 'lines__Unit').order_by('-SalesDate', '-SalesId')

        alloc_id = self.request.query_params.get('allocation_id')
        if alloc_id:
            qs = qs.filter(RouteVehicleDriver_id=alloc_id)

        sales_date = self.request.query_params.get('date') or self.request.query_params.get('sales_date')
        if sales_date:
            parsed = safe_parse_date(sales_date)
            if parsed:
                qs = qs.filter(SalesDate=parsed)

        st = self.request.query_params.get('status')
        if st:
            qs = qs.filter(Status__iexact=st)

        return qs

    def perform_update(self, serializer):
        sale = serializer.save()
        if sale.Status == 'CANCELLED':
            BillwiseAllocation.objects.filter(ReferenceTable='Sales', ReferenceId=sale.SalesId).delete()
        elif sale.PaidAmount and sale.PaidAmount > 0 and sale.CustomerLedger:
            sync_sales_billwise_allocation(sale, None)

    def perform_destroy(self, instance):
        BillwiseAllocation.objects.filter(ReferenceTable='Sales', ReferenceId=instance.SalesId).delete()
        instance.delete()

    @action(detail=False, methods=['get'], url_path='invoice-pdf', permission_classes=[AllowAny])
    def invoice_pdf(self, request):
        """
        Public / authenticated endpoint to stream official GST Tax Invoice PDF.
        Lookup via ?ticket_id=... or ?sales_id=...
        """
        ticket_id = request.query_params.get('ticket_id') or request.query_params.get('ticketNo')
        sales_id = request.query_params.get('sales_id')

        sale = None
        if sales_id:
            try:
                sale = Sales.objects.filter(SalesId=int(sales_id)).first()
            except (ValueError, TypeError):
                pass

        if not sale and ticket_id:
            cleaned_ticket = str(ticket_id).strip()
            sale = Sales.objects.filter(SalesNo=cleaned_ticket).first() or Sales.objects.filter(InvoiceNo=cleaned_ticket).first()
            if not sale:
                # Also check StockMovement TransactionNo
                sm = StockMovement.objects.filter(TransactionNo=cleaned_ticket).first()
                if sm and sm.RouteVehicleDriverId:
                    sale = Sales.objects.filter(
                        RouteVehicleDriver_id=sm.RouteVehicleDriverId,
                        SalesDate=sm.TransactionDate
                    ).order_by('-SalesId').first()

        if not sale:
            return Response({'detail': f'Sale invoice not found for reference "{ticket_id or sales_id}".'}, status=status.HTTP_404_NOT_FOUND)

        try:
            from core.invoice_generator import generate_tax_invoice_pdf
            pdf_bytes = generate_tax_invoice_pdf(sale)
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            filename = f"Tax_Invoice_{sale.SalesNo}.pdf"
            response['Content-Disposition'] = f'inline; filename="{filename}"'
            return response
        except Exception as e:
            return Response({'detail': f'Error generating invoice PDF: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'], url_path='invoice-pdf', permission_classes=[AllowAny])
    def detail_invoice_pdf(self, request, pk=None):
        sale = Sales.objects.filter(SalesId=pk).first()
        if not sale:
            return Response({'detail': f'Sale invoice #{pk} not found.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            from core.invoice_generator import generate_tax_invoice_pdf
            pdf_bytes = generate_tax_invoice_pdf(sale)
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            filename = f"Tax_Invoice_{sale.SalesNo}.pdf"
            response['Content-Disposition'] = f'inline; filename="{filename}"'
            return response
        except Exception as e:
            return Response({'detail': f'Error generating invoice PDF: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
