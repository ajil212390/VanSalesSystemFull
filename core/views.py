from rest_framework import status,viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import AnonRateThrottle
from drf_spectacular.utils import extend_schema

from core.models import State, UserRole, Company, Driver, Route, Vehicle, RouteVehicleDriver, User, Category, Unit, Product, Group, Ledger

from core.serializers import (
    LoginSerializer, RegisterSerializer, UserMeSerializer,
    CompanySerializer, StateSerializer, UserRoleSerializer,
    DriverSerializer, RouteSerializer, VehicleSerializer, RouteVehicleDriverSerializer,
    UserManagementSerializer, CategorySerializer, UnitSerializer, ProductSerializer,
    GroupSerializer, LedgerSerializer
)


from core.permissions import HasModulePermission, MODULE_COMPANY


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

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        block_reason = serializer.get_delete_block_reason(instance)
        if block_reason:
            return Response({"detail": block_reason}, status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)

