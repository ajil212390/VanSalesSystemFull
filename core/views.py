from rest_framework import status,viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import AnonRateThrottle
from drf_spectacular.utils import extend_schema

from core.models import State, UserRole, Company, Driver, Route, Vehicle, RouteVehicleDriver,User

from core.serializers import (
    LoginSerializer, RegisterSerializer, UserMeSerializer,
    CompanySerializer, StateSerializer, UserRoleSerializer,
    DriverSerializer, RouteSerializer, VehicleSerializer, RouteVehicleDriverSerializer,
    UserManagementSerializer
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
