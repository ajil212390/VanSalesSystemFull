import logging
from django.db import transaction, IntegrityError
from core.models import (
    Company, User, UserRole, Group, Ledger, Driver, Vehicle, Route, RouteVehicleDriver, State
)
from core.exceptions import ServiceError

logger = logging.getLogger(__name__)

# 18 Standard Groups defined for a new company
STANDARD_GROUPS = [
    # Top-level primary groups (Nature: Asset, Liability, Income, Expense)
    {"name": "Branch / Divisions", "nature": "Liability", "parent": None, "sort": 1},
    {"name": "Capital Account", "nature": "Liability", "parent": None, "sort": 2},
    {"name": "Current Assets", "nature": "Asset", "parent": None, "sort": 3},
    {"name": "Current Liabilities", "nature": "Liability", "parent": None, "sort": 4},
    {"name": "Fixed Assets", "nature": "Asset", "parent": None, "sort": 5},
    {"name": "Investments", "nature": "Asset", "parent": None, "sort": 6},
    {"name": "Loans (Liability)", "nature": "Liability", "parent": None, "sort": 7},
    {"name": "Misc. Expenses (Asset)", "nature": "Asset", "parent": None, "sort": 8},
    {"name": "Suspense Account", "nature": "Liability", "parent": None, "sort": 9},
    {"name": "Sales Accounts", "nature": "Income", "parent": None, "sort": 10},
    {"name": "Purchase Accounts", "nature": "Expense", "parent": None, "sort": 11},
    {"name": "Direct Income", "nature": "Income", "parent": None, "sort": 12},
    {"name": "Indirect Income", "nature": "Income", "parent": None, "sort": 13},
    {"name": "Direct Expenses", "nature": "Expense", "parent": None, "sort": 14},
    {"name": "Indirect Expenses", "nature": "Expense", "parent": None, "sort": 15},
    # Sub-groups under Current Assets and Current Liabilities
    {"name": "Cash-in-Hand", "nature": "Asset", "parent": "Current Assets", "sort": 16},
    {"name": "Bank Accounts", "nature": "Asset", "parent": "Current Assets", "sort": 17},
    {"name": "Duties & Taxes", "nature": "Liability", "parent": "Current Liabilities", "sort": 18},
]

# Standard Ledgers defined for a new company
STANDARD_LEDGERS = [
    {"name": "Cash", "group": "Cash-in-Hand", "balance_type": "DR"},
    {"name": "Bank", "group": "Bank Accounts", "balance_type": "DR"},
    {"name": "General Sales", "group": "Sales Accounts", "balance_type": "CR"},
    {"name": "General Purchase", "group": "Purchase Accounts", "balance_type": "DR"},
    {"name": "CGST Output", "group": "Duties & Taxes", "balance_type": "CR"},
    {"name": "SGST Output", "group": "Duties & Taxes", "balance_type": "CR"},
    {"name": "IGST Output", "group": "Duties & Taxes", "balance_type": "CR"},
    {"name": "CGST Input", "group": "Current Assets", "balance_type": "DR"},
    {"name": "SGST Input", "group": "Current Assets", "balance_type": "DR"},
    {"name": "IGST Input", "group": "Current Assets", "balance_type": "DR"},
]


def _register_company(company_data: dict, owner_data: dict, owner_role: UserRole) -> tuple[Company, User]:
    """
    Private core creation routine. Runs entirely within an atomic block.
    If anything raises, all changes roll back completely.
    """
    with transaction.atomic():
        # 1. Create Company
        state_id = company_data.get('state_id')
        state = None
        if state_id:
            state = State.objects.filter(StateId=state_id).first()

        company = Company.objects.create(
            Name=company_data['name'].strip(),
            AddressLine1=company_data.get('address_line1', '').strip(),
            AddressLine2=company_data.get('address_line2', '').strip(),
            AddressLine3=company_data.get('address_line3', '').strip(),
            Phone=company_data.get('phone', '').strip() or None,
            Narration=company_data.get('narration', '').strip() or None,
            Pincode=company_data.get('pincode', '').strip() or None,
            GstNo=company_data.get('gst_no', '').strip() or None,
            State=state,
            Email=company_data.get('email', '').strip() or None
        )

        # 2. Create Owner User
        username = owner_data['username'].strip()
        user = User(
            Username=username,
            UserRole=owner_role,
            CompanyId=company.CompanyId,
            IsActive=True,
            IsSystem=False
        )
        user.set_password(owner_data['password'])
        user.save()

        # 3. Create 18 standard groups
        group_map = {}
        # First pass: create parent groups
        for g_info in STANDARD_GROUPS:
            if g_info['parent'] is None:
                grp = Group.objects.create(
                    GroupName=g_info['name'],
                    ParentGroup=None,
                    Nature=g_info['nature'],
                    IsSystem=True,
                    SortOrder=g_info['sort'],
                    CompanyId=company.CompanyId
                )
                group_map[g_info['name']] = grp

        # Second pass: create child groups
        for g_info in STANDARD_GROUPS:
            if g_info['parent'] is not None:
                parent_grp = group_map.get(g_info['parent'])
                grp = Group.objects.create(
                    GroupName=g_info['name'],
                    ParentGroup=parent_grp,
                    Nature=g_info['nature'],
                    IsSystem=True,
                    SortOrder=g_info['sort'],
                    CompanyId=company.CompanyId
                )
                group_map[g_info['name']] = grp

        # 4. Create 6 standard ledgers
        for l_info in STANDARD_LEDGERS:
            target_group = group_map.get(l_info['group'])
            if target_group:
                Ledger.objects.create(
                    LedgerName=l_info['name'],
                    Group=target_group,
                    OpeningBalance=0,
                    OpeningBalanceType=l_info['balance_type'],
                    DebitBalance=0,
                    CreditBalance=0,
                    CurrentBalance=0,
                    IsActive=True,
                    IsSystem=True,
                    CompanyId=company.CompanyId
                )

        # 5. Create Godown Structure (Driver + Vehicle + Route + RouteVehicleDriver)
        godown_phone = company.Phone or f"GDN-{company.CompanyId}"
        godown_driver = Driver.objects.create(
            DriverName=f"Godown Keeper ({company.Name[:30]})",
            PhoneNumber=godown_phone,
            IsActive=True,
            CompanyId=company.CompanyId
        )

        godown_vehicle = Vehicle.objects.create(
            VehicleNumber=f"GODOWN-{company.CompanyId}",
            VehicleName="Main Godown Storage",
            IsActive=True,
            CompanyId=company.CompanyId
        )

        godown_route = Route.objects.create(
            RouteName=f"Godown Route ({company.Name[:30]})",
            Description="Internal Godown Main Distribution",
            IsActive=True,
            CompanyId=company.CompanyId
        )

        RouteVehicleDriver.objects.create(
            Route=godown_route,
            Vehicle=godown_vehicle,
            Driver=godown_driver,
            IsActive=True,
            CompanyId=company.CompanyId,
            Narration="Auto-generated primary Godown facility"
        )

        logger.info(f"Successfully registered Company '{company.Name}' (ID {company.CompanyId}) with Owner '{user.Username}'")
        return company, user


def register_company(company_data: dict, owner_data: dict) -> tuple[Company, User]:
    """
    Public entry point for company and administrator registration.
    Runs validation outside transaction, calls _register_company inside atomic block,
    and safely catches IntegrityError without corrupting outer transaction.
    """
    # Verify Administrator role exists in DB before beginning
    try:
        admin_role = UserRole.objects.get(RoleName='Administrator')
    except UserRole.DoesNotExist:
        logger.error("System UserRole 'Administrator' is missing from the database.")
        raise ServiceError("System setup incomplete: Administrator role is not configured.", field="non_field_errors")

    # Pre-check username availability
    username = owner_data.get('username', '').strip()
    if not username:
        raise ServiceError("Username is required.", field="username")

    if User.objects.filter(Username=username).exists():
        raise ServiceError("This username is already taken. Please choose another.", field="username")

    try:
        return _register_company(company_data, owner_data, admin_role)
    except IntegrityError as exc:
        err_msg = str(exc)
        logger.warning(f"IntegrityError during company registration: {err_msg}")
        if 'Username' in err_msg or 'UQ_User_Username' in err_msg:
            raise ServiceError("This username is already taken.", field="username")
        elif 'PhoneNumber' in err_msg or 'UQ_Driver_PhoneNumber' in err_msg:
            raise ServiceError("A record with this phone number already exists.", field="phone")
        raise ServiceError("Could not complete registration due to a data constraint conflict.", field="non_field_errors")
