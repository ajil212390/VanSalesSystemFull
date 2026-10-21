import re
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from drf_spectacular.utils import extend_schema_field
from core.models import User, Company, State, UserRole, Driver, Route, Vehicle, RouteVehicleDriver, Category, Unit, Product, Group, Ledger

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
    delete_block_reason = serializers.SerializerMethodField()

    class Meta:
        model = Driver
        fields = [
            'DriverId', 'DriverName', 'PhoneNumber', 'LicenseNumber',
            'LicenseExpiryDate', 'AddressLine1', 'AddressLine2', 'AddressLine3',
            'IsActive', 'CreatedAt', 'UpdatedAt', 'CompanyId',
            'delete_block_reason'
        ]
        read_only_fields = ['DriverId', 'CreatedAt', 'UpdatedAt', 'CompanyId', 'delete_block_reason']

    def get_delete_block_reason(self, obj):
        # 1. Check if assigned to any route allocations
        if RouteVehicleDriver.objects.filter(Driver=obj).exists():
            return "Cannot delete: Driver is assigned to an active route allocation."
        # 2. Check if linked to a staff user login
        if User.objects.filter(DriverId=obj.DriverId).exists():
            return "Cannot delete: Driver is linked to a staff user account."
        return None



class VehicleSerializer(serializers.ModelSerializer):
    delete_block_reason = serializers.SerializerMethodField()

    class Meta:
        model = Vehicle
        fields = [
            'VehicleId', 'VehicleNumber', 'VehicleName',
            'RcExpiryDate', 'InsuranceExpiryDate', 'FitnessExpiryDate', 'PollutionExpiryDate',
            'IsActive', 'CreatedAt', 'UpdatedAt', 'CompanyId',
            'delete_block_reason'
        ]
        read_only_fields = ['VehicleId', 'CreatedAt', 'UpdatedAt', 'CompanyId', 'delete_block_reason']

    def get_delete_block_reason(self, obj):
        if RouteVehicleDriver.objects.filter(Vehicle=obj).exists():
            return "Cannot delete: Vehicle is assigned to an active route allocation."
        return None


class RouteSerializer(serializers.ModelSerializer):
    delete_block_reason = serializers.SerializerMethodField()

    class Meta:
        model = Route
        fields = [
            'RouteId', 'RouteName', 'Description', 'StartLocation', 'EndLocation',
            'IsActive', 'CreatedAt', 'UpdatedAt', 'CompanyId',
            'delete_block_reason'
        ]
        read_only_fields = ['RouteId', 'CreatedAt', 'UpdatedAt', 'CompanyId', 'delete_block_reason']

    def get_delete_block_reason(self, obj):
        if RouteVehicleDriver.objects.filter(Route=obj).exists():
            return "Cannot delete: Route is assigned to an active vehicle/driver allocation."
        return None


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

    def validate(self, attrs):
        driver = attrs.get('Driver')
        vehicle = attrs.get('Vehicle')
        route = attrs.get('Route')
        is_active = attrs.get('IsActive', getattr(self.instance, 'IsActive', True) if self.instance else True)

        if driver and not User.objects.filter(DriverId=driver.DriverId).exists():
            raise serializers.ValidationError({
                "Driver": ["Selected driver does not have a linked user account. Please create a staff user login first."]
            })

        if is_active:
            # Check if Vehicle is already in an active allocation
            if vehicle:
                qs_v = RouteVehicleDriver.objects.filter(Vehicle=vehicle, IsActive=True)
                if self.instance:
                    qs_v = qs_v.exclude(RouteVehicleDriverId=self.instance.RouteVehicleDriverId)
                if qs_v.exists():
                    existing = qs_v.select_related('Route', 'Driver').first()
                    raise serializers.ValidationError({
                        "Vehicle": [f"Vehicle '{vehicle.VehicleNumber}' is already actively allocated to Route '{existing.Route.RouteName}' with Driver '{existing.Driver.DriverName}'."]
                    })

            # Check if Driver is already in an active allocation
            if driver:
                qs_d = RouteVehicleDriver.objects.filter(Driver=driver, IsActive=True)
                if self.instance:
                    qs_d = qs_d.exclude(RouteVehicleDriverId=self.instance.RouteVehicleDriverId)
                if qs_d.exists():
                    existing = qs_d.select_related('Route', 'Vehicle').first()
                    raise serializers.ValidationError({
                        "Driver": [f"Driver '{driver.DriverName}' is already actively allocated to Vehicle '{existing.Vehicle.VehicleNumber}' on Route '{existing.Route.RouteName}'."]
                    })

            # Check if Route is already in an active allocation
            if route:
                qs_r = RouteVehicleDriver.objects.filter(Route=route, IsActive=True)
                if self.instance:
                    qs_r = qs_r.exclude(RouteVehicleDriverId=self.instance.RouteVehicleDriverId)
                if qs_r.exists():
                    existing = qs_r.select_related('Vehicle', 'Driver').first()
                    raise serializers.ValidationError({
                        "Route": [f"Route '{route.RouteName}' is already actively allocated to Vehicle '{existing.Vehicle.VehicleNumber}' with Driver '{existing.Driver.DriverName}'."]
                    })

        return attrs


class UserManagementSerializer(serializers.ModelSerializer):
    """
    Serializer for managing company staff users.
    Allows creating users and optionally linking them to a Driver record.
    """
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, min_length=6)
    role_name = serializers.CharField(source='UserRole.RoleName', read_only=True)
    driver_name = serializers.SerializerMethodField()
    delete_block_reason = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'UserId', 'Username', 'password', 'UserRole', 'role_name',
            'DriverId', 'driver_name', 'IsActive', 'CreatedAt',
            'delete_block_reason'
        ]
        read_only_fields = ['UserId', 'CreatedAt', 'role_name', 'driver_name', 'delete_block_reason']

    def get_driver_name(self, obj):
        if obj.DriverId:
            driver = Driver.objects.filter(DriverId=obj.DriverId).first()
            return driver.DriverName if driver else None
        return None

    def get_delete_block_reason(self, obj):
        request = self.context.get('request')
        if request and request.user and request.user.UserId == obj.UserId:
            return "Cannot delete: You cannot delete your own logged-in account."
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


class CategorySerializer(serializers.ModelSerializer):
    parent_category_name = serializers.CharField(source='ParentCategory.CategoryName', read_only=True, default=None)
    delete_block_reason = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            'CategoryId', 'CategoryName', 'ParentCategory', 'parent_category_name',
            'IsActive', 'CreatedAt', 'CompanyId', 'delete_block_reason'
        ]
        read_only_fields = ['CategoryId', 'CreatedAt', 'CompanyId', 'delete_block_reason']

    def get_delete_block_reason(self, obj):
        # 1. Check if child sub-categories exist
        if Category.objects.filter(ParentCategory=obj).exists():
            return "Cannot delete: This category has active sub-categories attached to it."
        # 2. Check if products exist in this category
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute('SELECT COUNT(*) FROM "Product" WHERE "CategoryId" = %s', [obj.CategoryId])
            count = cursor.fetchone()[0]
            if count > 0:
                return f"Cannot delete: {count} product(s) belong to this category."
        return None

    def validate_CategoryName(self, value):
        val = value.strip()
        if not val:
            raise serializers.ValidationError("Category name cannot be empty.")
        return val

    def validate(self, attrs):
        parent = attrs.get('ParentCategory')
        # Prevent circular self-assignment (cannot be its own parent)
        if self.instance and parent and parent.CategoryId == self.instance.CategoryId:
            raise serializers.ValidationError({"ParentCategory": ["A category cannot be its own parent category."]})
        return attrs


class UnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unit
        fields = ['UnitId', 'UnitName', 'IsActive', 'CreatedAt', 'CompanyId']
        read_only_fields = ['UnitId', 'CreatedAt', 'CompanyId']


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='Category.CategoryName', read_only=True)
    unit_name = serializers.CharField(source='Unit.UnitName', read_only=True)
    alt_unit_name = serializers.CharField(source='AltUnit.UnitName', read_only=True, default=None)
    delete_block_reason = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'ProductId', 'ProductCode', 'ProductName',
            'Category', 'category_name',
            'Unit', 'unit_name',
            'AltUnit', 'alt_unit_name', 'UnitConversion',
            'HSNCode', 'GSTPercentage',
            'SalesPrice', 'PurchasePrice', 'MRP',
            'IsActive', 'CreatedAt', 'UpdatedAt', 'CompanyId',
            'delete_block_reason'
        ]
        read_only_fields = ['ProductId', 'CreatedAt', 'UpdatedAt', 'CompanyId', 'category_name', 'unit_name', 'alt_unit_name', 'delete_block_reason']

    def get_delete_block_reason(self, obj):
        from django.db import connection
        with connection.cursor() as cursor:
            # 1. Check Sales
            cursor.execute('SELECT COUNT(*) FROM "SalesLine" WHERE "ProductId" = %s', [obj.ProductId])
            sales_count = cursor.fetchone()[0]
            if sales_count > 0:
                return f"Cannot delete: Product is linked to {sales_count} sales record(s)."
            
            # 2. Check Delivery Notes
            cursor.execute('SELECT COUNT(*) FROM "DeliveryNoteLine" WHERE "ProductId" = %s', [obj.ProductId])
            dn_count = cursor.fetchone()[0]
            if dn_count > 0:
                return f"Cannot delete: Product is linked to {dn_count} delivery note(s)."
            
            # 3. Check Purchases
            cursor.execute('SELECT COUNT(*) FROM "PurchaseLine" WHERE "ProductId" = %s', [obj.ProductId])
            purch_count = cursor.fetchone()[0]
            if purch_count > 0:
                return f"Cannot delete: Product is linked to {purch_count} purchase record(s)."

            # 4. Check Stock Movements
            cursor.execute('SELECT COUNT(*) FROM "StockMovement" WHERE "ProductId" = %s', [obj.ProductId])
            sm_count = cursor.fetchone()[0]
            if sm_count > 0:
                return f"Cannot delete: Product has {sm_count} stock movement transaction(s)."
        return None

    def validate_ProductName(self, value):
        val = value.strip()
        if not val:
            raise serializers.ValidationError("Product name cannot be empty.")
        return val
class GroupSerializer(serializers.ModelSerializer):
    """
    Serializer for standard accounting groups.
    """
    parent_group_name = serializers.CharField(source='ParentGroup.GroupName', read_only=True)

    class Meta:
        model = Group
        fields = [
            'GroupId',
            'GroupName',
            'ParentGroup',
            'parent_group_name',
            'Nature',
            'IsSystem',
            'SortOrder',
            'CompanyId',
        ]


class LedgerSerializer(serializers.ModelSerializer):
    """
    Comprehensive Ledger Serializer for Indian Accounting,
    GST Compliance, Credit Terms, and Van Sales Cylinder limits.
    """
    group_name = serializers.CharField(source='Group.GroupName', read_only=True)
    group_nature = serializers.CharField(source='Group.Nature', read_only=True)
    delete_block_reason = serializers.SerializerMethodField()

    class Meta:
        model = Ledger
        fields = [
            'LedgerId',
            'LedgerName',
            'Group',
            'group_name',
            'group_nature',
            'OpeningBalance',
            'OpeningBalanceType',
            'DebitBalance',
            'CreditBalance',
            'CurrentBalance',
            'AddressLine1',
            'AddressLine2',
            'AddressLine3',
            'City',
            'StateId',
            'Pincode',
            'PhoneNumber',
            'MobileNumber',
            'Email',
            'GSTRegistrationType',
            'GSTIN',
            'PAN',
            'IsBillWise',
            'CreditPeriodDays',
            'CreditLimit',
            'BankName',
            'BankAccountNumber',
            'IFSCCode',
            'BankBranch',
            'EmptyStockLimit',
            'IsActive',
            'IsSystem',
            'CompanyId',
            'Narration',
            'CreatedAt',
            'UpdatedAt',
            'delete_block_reason',
        ]
        read_only_fields = ['LedgerId', 'IsSystem', 'CompanyId', 'CreatedAt', 'UpdatedAt']

    def get_delete_block_reason(self, obj):
        if obj.IsSystem:
            return "Cannot delete system-defined ledger."

        from django.db import connection
        with connection.cursor() as cursor:
            # Check if ledger is referenced in Sales
            try:
                cursor.execute('SELECT COUNT(*) FROM "Sales" WHERE "LedgerId" = %s', [obj.LedgerId])
                sales_count = cursor.fetchone()[0]
                if sales_count > 0:
                    return f"Cannot delete: Ledger is linked to {sales_count} sales invoice(s)."
            except Exception:
                pass

            # Check if ledger is referenced in Purchase
            try:
                cursor.execute('SELECT COUNT(*) FROM "Purchase" WHERE "LedgerId" = %s', [obj.LedgerId])
                purch_count = cursor.fetchone()[0]
                if purch_count > 0:
                    return f"Cannot delete: Ledger is linked to {purch_count} purchase bill(s)."
            except Exception:
                pass
        return None

    def validate_LedgerName(self, value):
        val = value.strip()
        if not val:
            raise serializers.ValidationError("Ledger name cannot be blank.")
        return val

    def validate_GSTIN(self, value):
        if value:
            val = value.strip().upper()
            if len(val) != 15:
                raise serializers.ValidationError("GSTIN must be exactly 15 characters.")
            return val
        return None

    def validate_PAN(self, value):
        if value:
            val = value.strip().upper()
            if len(val) != 10:
                raise serializers.ValidationError("PAN must be exactly 10 characters.")
            return val
        return None

