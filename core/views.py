from decimal import Decimal
from django.db import transaction
from rest_framework.decorators import action
from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import AnonRateThrottle
from drf_spectacular.utils import extend_schema
from django.db.models import Sum, F


from core.models import (
    State, UserRole, Company, Driver, Route, Vehicle, RouteVehicleDriver,
    User, Category, Unit, Product, Group, Ledger, ProductPriceAudit,
    Purchase, PurchaseLine, StockMovement, Voucher, VoucherLine,
    Payment, PaymentLine, BillwiseAllocation
)


from core.serializers import (
    LoginSerializer, RegisterSerializer, UserMeSerializer,
    CompanySerializer, StateSerializer, UserRoleSerializer,
    DriverSerializer, RouteSerializer, VehicleSerializer, RouteVehicleDriverSerializer,
    UserManagementSerializer, CategorySerializer, UnitSerializer, ProductSerializer,
    GroupSerializer, LedgerSerializer, ProductPriceAuditSerializer,
    PurchaseSerializer, PurchaseLineSerializer,PaymentSerializer, PaymentLineSerializer, BillwiseAllocationSerializer
)

from core.permissions import HasModulePermission, MODULE_COMPANY


def sync_ledger_balances(*ledger_ids):
    """
    Recalculates DebitBalance, CreditBalance, and CurrentBalance for the given ledger IDs
    directly from actual non-cancelled VoucherLines + OpeningBalance.
    Guarantees balances never drift, go negative unexpectedly, or corrupt on voucher deletion.
    """
    ids = [lid for lid in ledger_ids if lid]
    if not ids:
        return

    ledgers = Ledger.objects.filter(LedgerId__in=ids)
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


class RouteVehicleDriverViewSet(viewsets.ModelViewSet):
    """
    CRUD API for Route-Vehicle-Driver Allocations scoped to the logged-in user's company.
    """
    serializer_class = RouteVehicleDriverSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            RouteVehicleDriver.objects
            .filter(CompanyId=self.request.user.CompanyId)
            .select_related('Route', 'Vehicle', 'Driver')
            .order_by('-RouteVehicleDriverId')
        )

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

    def get_queryset(self):
        company_id = self.request.user.CompanyId

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

        return qs

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

        serializer.save(
            CompanyId=self.request.user.CompanyId,
            CurrentBalance=curr_bal,
            DebitBalance=dr_bal,
            CreditBalance=cr_bal,
            IsSystem=False
        )

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
                PurchaseDate=data.get('PurchaseDate'),
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
                    Purchase=purchase,
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

                # StockMovement: Allocate to godown RouteVehicleDriverId=1
                StockMovement.objects.create(
                    CompanyId=company_id,
                    Product_id=item.get('ProductId'),
                    Unit_id=item.get('UnitId'),
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

            # Sync Supplier Ledger & Round Off
            round_id = round_ledger.LedgerId if round_ledger else None
            sync_ledger_balances(supplier_id, round_id)

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

            # Clean old dependent lines
            StockMovement.objects.filter(TransactionType='PURCHASE', ReferenceId=instance.PurchaseId).delete()
            vouchers = Voucher.objects.filter(ReferenceTable='Purchase', ReferenceId=instance.PurchaseId)
            for v in vouchers:
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

            # Sync Supplier Ledger & Round Off
            round_id = round_ledger.LedgerId if round_ledger else None
            sync_ledger_balances(supplier_id, round_id)

        serializer = self.get_serializer(instance)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        with transaction.atomic():
            supplier_id = instance.SupplierLedger_id
            StockMovement.objects.filter(TransactionType='PURCHASE', ReferenceId=instance.PurchaseId).delete()
            vouchers = Voucher.objects.filter(ReferenceTable='Purchase', ReferenceId=instance.PurchaseId)
            for v in vouchers:
                v.lines.all().delete()
            vouchers.delete()
            instance.lines.all().delete()
            company_id = instance.CompanyId
            instance.delete()
            round_ledger = self._get_ledger_by_name(company_id, "Round Off", fallback_group_id=15)
            round_id = round_ledger.LedgerId if round_ledger else None
            sync_ledger_balances(supplier_id, round_id)
        return Response(status=status.HTTP_204_NO_CONTENT)

class PaymentViewSet(viewsets.ModelViewSet):
    """
    CRUD for Payments with Bill-Wise Allocations & Double-Entry Accounting Vouchers.
    """
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        company_id = getattr(user, 'CompanyId', 0)
        qs = Payment.objects.select_related('PartyLedger').prefetch_related('lines__Ledger', 'lines__allocations').all()
        if company_id:
            # Filter by ledgers belonging to the active company
            qs = qs.filter(PartyLedger__CompanyId=company_id)
        return qs.order_by('-PaymentId')

    @action(detail=False, methods=['get'], url_path='pending-bills')
    def pending_bills(self, request):
        """
        Calculates all pending / unpaid purchase bills for a given Party / Supplier Ledger.
        Pending Balance = Purchase GrandTotal - SUM(AllocatedAmount in BillwiseAllocation)
        """
        party_id = request.query_params.get('party_id')
        exclude_payment_id = request.query_params.get('exclude_payment_id')
        if not party_id:
            return Response({'detail': 'party_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        company_id = getattr(user, 'CompanyId', 0)

        purchases = Purchase.objects.filter(SupplierLedger_id=party_id)
        if company_id:
            purchases = purchases.filter(CompanyId=company_id)
        purchases = purchases.order_by('PurchaseDate', 'PurchaseId')

        results = []
        for p in purchases:
            bill_ref = p.PurchaseNo or str(p.PurchaseId)
            total_bill = Decimal(str(p.GrandTotal or 0))

            # Sum of previous allocations against this bill reference
            alloc_qs = BillwiseAllocation.objects.filter(
                BillType='PURCHASE',
                BillReference=bill_ref
            )
            if exclude_payment_id:
                alloc_qs = alloc_qs.exclude(PaymentLine__Payment_id=exclude_payment_id)
            allocated = alloc_qs.aggregate(total=Sum('AllocatedAmount'))['total'] or Decimal('0.00')

            pending_balance = total_bill - Decimal(str(allocated))

            # Only return bills with an outstanding pending balance
            if pending_balance > Decimal('0.00'):
                results.append({
                    'PurchaseId': p.PurchaseId,
                    'BillReference': bill_ref,
                    'InvoiceNo': p.InvoiceNo or '-',
                    'BillDate': p.InvoiceDate or p.PurchaseDate,
                    'BillAmount': float(total_bill),
                    'PaidAmount': float(allocated),
                    'PendingAmount': float(pending_balance),
                })

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

        if not party_id:
            return Response({'detail': 'Please select a Party / Supplier.'}, status=status.HTTP_400_BAD_REQUEST)
        if amount <= 0:
            return Response({'detail': 'Payment amount must be greater than 0.'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        company_id = getattr(user, 'CompanyId', 0)

        with transaction.atomic():
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
                p_line = PaymentLine.objects.create(
                    Payment=payment,
                    LineNo=l.get('LineNo', idx + 1),
                    PaymentMode=l.get('PaymentMode', 'Cash'),
                    Ledger_id=l.get('LedgerId'),
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
            for alloc in allocations_data:
                alloc_amt = Decimal(str(alloc.get('AllocatedAmount') or 0))
                if alloc_amt > 0:
                    BillwiseAllocation.objects.create(
                        PaymentLine=primary_line,
                        BillType='PURCHASE',
                        BillReference=alloc.get('BillReference'),
                        BillDate=alloc.get('BillDate') or None,
                        DueDate=alloc.get('DueDate') or None,
                        AllocationType=alloc.get('AllocationType', 'Against Reference'),
                        AllocatedAmount=alloc_amt,
                        CompanyId=company_id,
                    )

            # 4. Generate Accounting Voucher
            # Debit: Party / Supplier Ledger (reduces accounts payable)
            # Credit: Cash / Bank Ledger (reduces asset)
            voucher = Voucher.objects.create(
                VoucherNo=f"PAY-VCH-{payment.PaymentId}",
                VoucherDate=payment.CreatedAt.date(),
                VoucherType='PAYMENT',
                ReferenceTable='Payment',
                ReferenceId=payment.PaymentId,
                CompanyId=company_id,
                Narration=f"Payment #{payment.PaymentId} to {payment.PartyLedger.LedgerName}",
                IsCancelled=False,
            )

            # Debit Supplier
            VoucherLine.objects.create(
                Voucher=voucher,
                LineNo=1,
                Ledger_id=party_id,
                DebitAmount=amount,
                CreditAmount=Decimal('0.00'),
                Narration=f"Payment to {payment.PartyLedger.LedgerName}",
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

        if not party_id:
            return Response({'detail': 'Please select a Party / Supplier.'}, status=status.HTTP_400_BAD_REQUEST)
        if amount <= 0:
            return Response({'detail': 'Payment amount must be greater than 0.'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        company_id = getattr(user, 'CompanyId', 0)

        with transaction.atomic():
            old_party_id = instance.PartyLedger_id
            old_payment_ledger_ids = list(instance.lines.values_list('Ledger_id', flat=True))

            # Update Payment Header
            instance.PartyLedger_id = party_id
            instance.Amount = amount
            if 'Narration' in data:
                instance.Narration = data.get('Narration') or ''
            instance.save()

            # Clean old dependent vouchers & allocations & lines
            vouchers = Voucher.objects.filter(ReferenceTable='Payment', ReferenceId=instance.PaymentId)
            for v in vouchers:
                v.lines.all().delete()
            vouchers.delete()

            for line in instance.lines.all():
                line.allocations.all().delete()
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
                p_line = PaymentLine.objects.create(
                    Payment=instance,
                    LineNo=l.get('LineNo', idx + 1),
                    PaymentMode=l.get('PaymentMode', 'Cash'),
                    Ledger_id=l.get('LedgerId'),
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
            for alloc in allocations_data:
                alloc_amt = Decimal(str(alloc.get('AllocatedAmount') or 0))
                if alloc_amt > 0:
                    BillwiseAllocation.objects.create(
                        PaymentLine=primary_line,
                        BillType='PURCHASE',
                        BillReference=alloc.get('BillReference'),
                        BillDate=alloc.get('BillDate') or None,
                        DueDate=alloc.get('DueDate') or None,
                        AllocationType=alloc.get('AllocationType', 'Against Reference'),
                        AllocatedAmount=alloc_amt,
                        CompanyId=company_id,
                    )

            # Recreate Accounting Voucher
            voucher = Voucher.objects.create(
                VoucherNo=f"PAY-VCH-{instance.PaymentId}",
                VoucherDate=instance.CreatedAt.date(),
                VoucherType='PAYMENT',
                ReferenceTable='Payment',
                ReferenceId=instance.PaymentId,
                CompanyId=company_id,
                Narration=f"Payment #{instance.PaymentId} to {instance.PartyLedger.LedgerName}",
                IsCancelled=False,
            )

            # Debit Supplier
            VoucherLine.objects.create(
                Voucher=voucher,
                LineNo=1,
                Ledger_id=party_id,
                DebitAmount=amount,
                CreditAmount=Decimal('0.00'),
                Narration=f"Payment to {instance.PartyLedger.LedgerName}",
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
        with transaction.atomic():
            party_id = instance.PartyLedger_id
            payment_ledger_ids = list(instance.lines.values_list('Ledger_id', flat=True))

            # Delete accounting vouchers & lines
            vouchers = Voucher.objects.filter(ReferenceTable='Payment', ReferenceId=instance.PaymentId)
            for v in vouchers:
                v.lines.all().delete()
            vouchers.delete()

            # Delete billwise allocations
            for line in instance.lines.all():
                line.allocations.all().delete()

            # Delete lines & payment
            instance.lines.all().delete()
            instance.delete()

            # Sync ledger balances directly from remaining voucher lines
            sync_ledger_balances(party_id, *payment_ledger_ids)

        return Response(status=status.HTTP_204_NO_CONTENT)

