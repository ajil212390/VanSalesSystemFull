import re
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from drf_spectacular.utils import extend_schema_field
from core.models import User, Company, State, UserRole,Driver, Route, Vehicle, RouteVehicleDriver
from core.services import register_company


class StateSerializer(serializers.ModelSerializer):
    class Meta:
        model = State
        fields = ['StateId', 'StateName', 'GSTStateCode']


class UserRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserRole
        fields = ['UserRoleId', 'RoleName', 'Description']


class UserMeSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='UserId', read_only=True)
    username = serializers.CharField(source='Username', read_only=True)
    role = serializers.CharField(source='UserRole.RoleName', read_only=True)
    company_id = serializers.IntegerField(source='CompanyId', read_only=True)
    company_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'role', 'company_id', 'company_name']

    @extend_schema_field(serializers.CharField)
    def get_company_name(self, obj):
        return obj.company.Name if obj.company else ''


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        username = attrs.get('username', '').strip()
        password = attrs.get('password', '')

        user = User.objects.filter(Username=username).first()
        if not user or not user.check_password(password):
            raise serializers.ValidationError({"non_field_errors": ["Invalid login details"]})

        if not user.IsActive:
            raise serializers.ValidationError({"non_field_errors": ["Invalid login details"]})

        # Generate tokens
        refresh = RefreshToken.for_user(user)
        # Add custom claims as hints
        refresh['username'] = user.Username
        refresh['role'] = user.UserRole.RoleName if user.UserRole else ''
        refresh['company_id'] = user.CompanyId

        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserMeSerializer(user).data
        }


class RegisterSerializer(serializers.Serializer):
    # Step 1: Company Fields
    company_name = serializers.CharField(max_length=200, required=True)
    address_line1 = serializers.CharField(max_length=100, required=True)
    address_line2 = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    address_line3 = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    state_id = serializers.IntegerField(required=True)
    pincode = serializers.CharField(max_length=6, required=False, allow_blank=True, allow_null=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True, allow_null=True)
    email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    gst_no = serializers.CharField(max_length=15, required=False, allow_blank=True, allow_null=True)
    narration = serializers.CharField(max_length=500, required=False, allow_blank=True, allow_null=True)

    # Step 2: Owner Fields
    username = serializers.CharField(min_length=3, max_length=100, required=True)
    password = serializers.CharField(min_length=8, max_length=128, write_only=True, required=True)
    confirm_password = serializers.CharField(min_length=8, max_length=128, write_only=True, required=True)

    def validate_username(self, value):
        val = value.strip()
        if ' ' in val:
            raise serializers.ValidationError("Username cannot contain spaces.")
        if User.objects.filter(Username=val).exists():
            raise serializers.ValidationError("This username is already taken.")
        return val

    def validate_pincode(self, value):
        if value:
            val = value.strip()
            if not re.match(r'^\d{6}$', val):
                raise serializers.ValidationError("Pincode must be exactly 6 digits.")
            return val
        return ''

    def validate_phone(self, value):
        if value:
            val = value.strip()
            if not re.match(r'^\d{10}$', val):
                raise serializers.ValidationError("Phone number must be exactly 10 digits.")
            return val
        return ''

    def validate_gst_no(self, value):
        if value:
            val = value.strip().upper()
            gst_regex = r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
            if not re.match(gst_regex, val):
                raise serializers.ValidationError("Invalid GST format. (e.g. 29ABCDE1234F1Z5)")
            return val
        return ''

    def validate_state_id(self, value):
        if not State.objects.filter(StateId=value).exists():
            raise serializers.ValidationError("Selected state does not exist.")
        return value

    def validate(self, attrs):
        if attrs.get('password') != attrs.get('confirm_password'):
            raise serializers.ValidationError({"confirm_password": ["Passwords do not match."]})
        return attrs

    def create(self, validated_data):
        company_data = {
            'name': validated_data['company_name'],
            'address_line1': validated_data['address_line1'],
            'address_line2': validated_data.get('address_line2', ''),
            'address_line3': validated_data.get('address_line3', ''),
            'state_id': validated_data['state_id'],
            'pincode': validated_data.get('pincode', ''),
            'phone': validated_data.get('phone', ''),
            'email': validated_data.get('email', ''),
            'gst_no': validated_data.get('gst_no', ''),
            'narration': validated_data.get('narration', ''),
        }
        owner_data = {
            'username': validated_data['username'],
            'password': validated_data['password'],
        }

        company, user = register_company(company_data, owner_data)

        refresh = RefreshToken.for_user(user)
        refresh['username'] = user.Username
        refresh['role'] = user.UserRole.RoleName
        refresh['company_id'] = user.CompanyId

        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserMeSerializer(user).data
        }


class CompanySerializer(serializers.ModelSerializer):
    state_name = serializers.CharField(source='State.StateName', read_only=True)
    state_id = serializers.IntegerField(source='State.StateId', required=False, allow_null=True)

    class Meta:
        model = Company
        fields = [
            'CompanyId', 'Name', 'AddressLine1', 'AddressLine2', 'AddressLine3',
            'Phone', 'Narration', 'Pincode', 'GstNo', 'state_id', 'state_name',
            'Email', 'CreatedAt', 'UpdatedAt'
        ]
        read_only_fields = ['CompanyId', 'CreatedAt', 'UpdatedAt']

    def update(self, instance, validated_data):
        state_data = validated_data.pop('State', None)
        if state_data and 'StateId' in state_data:
            state_id = state_data['StateId']
            instance.State = State.objects.filter(StateId=state_id).first()
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance
class DriverSerializer(serializers.ModelSerializer):
    class Meta:
        model = Driver
        fields = [
            'DriverId', 'DriverName', 'PhoneNumber', 'LicenseNumber',
            'LicenseExpiryDate', 'AddressLine1', 'AddressLine2', 'AddressLine3',
            'IsActive', 'CreatedAt', 'UpdatedAt', 'CompanyId'
        ]
        read_only_fields = ['DriverId', 'CreatedAt', 'UpdatedAt', 'CompanyId']


class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = [
            'VehicleId', 'VehicleNumber', 'VehicleName',
            'RcExpiryDate', 'InsuranceExpiryDate', 'FitnessExpiryDate', 'PollutionExpiryDate',
            'IsActive', 'CreatedAt', 'UpdatedAt', 'CompanyId'
        ]
        read_only_fields = ['VehicleId', 'CreatedAt', 'UpdatedAt', 'CompanyId']


class RouteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Route
        fields = [
            'RouteId', 'RouteName', 'Description', 'StartLocation', 'EndLocation',
            'IsActive', 'CreatedAt', 'UpdatedAt', 'CompanyId'
        ]
        read_only_fields = ['RouteId', 'CreatedAt', 'UpdatedAt', 'CompanyId']


class RouteVehicleDriverSerializer(serializers.ModelSerializer):
    RouteName = serializers.CharField(source='Route.RouteName', read_only=True)
    VehicleNumber = serializers.CharField(source='Vehicle.VehicleNumber', read_only=True)
    DriverName = serializers.CharField(source='Driver.DriverName', read_only=True)

    class Meta:
        model = RouteVehicleDriver
        fields = [
            'RouteVehicleDriverId', 'Route', 'Vehicle', 'Driver',
            'RouteName', 'VehicleNumber', 'DriverName',
            'AssignmentDate', 'Narration', 'IsActive',
            'CreatedAt', 'UpdatedAt', 'CompanyId'
        ]
        read_only_fields = ['RouteVehicleDriverId', 'CreatedAt', 'UpdatedAt', 'CompanyId']
class UserManagementSerializer(serializers.ModelSerializer):
    """
    Serializer for managing company staff users.
    Allows creating users and optionally linking them to a Driver record.
    """
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, min_length=6)
    role_name = serializers.CharField(source='UserRole.RoleName', read_only=True)
    driver_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'UserId', 'Username', 'password', 'UserRole', 'role_name',
            'DriverId', 'driver_name', 'IsActive', 'CreatedAt'
        ]
        read_only_fields = ['UserId', 'CreatedAt', 'role_name', 'driver_name']

    def get_driver_name(self, obj):
        if obj.DriverId:
            driver = Driver.objects.filter(DriverId=obj.DriverId).first()
            return driver.DriverName if driver else None
        return None

    def validate_Username(self, value):
        val = value.strip()
        if ' ' in val:
            raise serializers.ValidationError("Username cannot contain spaces.")
        existing = User.objects.filter(Username=val)
        if self.instance:
            existing = existing.exclude(UserId=self.instance.UserId)
        if existing.exists():
            raise serializers.ValidationError("This username is already taken.")
        return val

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        if not password:
            raise serializers.ValidationError({'password': ['Password is required for new users.']})
        company_id = self.context['request'].user.CompanyId

        user = User(
            Username=validated_data['Username'],
            UserRole=validated_data['UserRole'],
            DriverId=validated_data.get('DriverId'),
            CompanyId=company_id,
            IsActive=validated_data.get('IsActive', True),
        )
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password and password.strip():
            instance.set_password(password.strip())
        instance.save()
        return instance
