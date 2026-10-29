from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager


class State(models.Model):
    StateId = models.BigAutoField(primary_key=True, db_column='StateId')
    StateName = models.CharField(max_length=100, db_column='StateName')
    GSTStateCode = models.CharField(max_length=2, null=True, blank=True, db_column='GSTStateCode')
    IsActive = models.BooleanField(default=True, db_column='IsActive')
    CreatedAt = models.DateTimeField(auto_now_add=True, db_column='CreatedAt')
    UpdatedAt = models.DateTimeField(auto_now=True, db_column='UpdatedAt')

    class Meta:
        managed = False
        db_table = '"State"'

    def __str__(self):
        return self.StateName


class UserRole(models.Model):
    UserRoleId = models.BigAutoField(primary_key=True, db_column='UserRoleId')
    RoleName = models.CharField(max_length=50, unique=True, db_column='RoleName')
    Description = models.CharField(max_length=200, null=True, blank=True, db_column='Description')
    IsActive = models.BooleanField(default=True, db_column='IsActive')
    IsSystem = models.BooleanField(default=False, db_column='IsSystem')
    CreatedAt = models.DateTimeField(auto_now_add=True, db_column='CreatedAt')
    UpdatedAt = models.DateTimeField(auto_now=True, db_column='UpdatedAt')

    class Meta:
        managed = False
        db_table = '"UserRole"'

    def __str__(self):
        return self.RoleName


class Company(models.Model):
    CompanyId = models.BigAutoField(primary_key=True, db_column='CompanyId')
    Name = models.CharField(max_length=200, db_column='Name')
    AddressLine1 = models.CharField(max_length=100, default='', db_column='AddressLine1')
    AddressLine2 = models.CharField(max_length=100, default='', blank=True, db_column='AddressLine2')
    AddressLine3 = models.CharField(max_length=100, default='', blank=True, db_column='AddressLine3')
    Phone = models.CharField(max_length=20, null=True, blank=True, db_column='Phone')
    Narration = models.CharField(max_length=500, null=True, blank=True, db_column='Narration')
    Pincode = models.CharField(max_length=10, null=True, blank=True, db_column='Pincode')
    GstNo = models.CharField(max_length=20, null=True, blank=True, db_column='GstNo')
    State = models.ForeignKey(State, on_delete=models.SET_NULL, null=True, blank=True, db_column='StateId')
    Email = models.CharField(max_length=200, null=True, blank=True, db_column='Email')
    CreatedAt = models.DateTimeField(auto_now_add=True, db_column='CreatedAt')
    UpdatedAt = models.DateTimeField(auto_now=True, db_column='UpdatedAt')

    class Meta:
        managed = False
        db_table = '"Company"'

    def __str__(self):
        return self.Name


class CustomUserManager(BaseUserManager):
    def create_user(self, Username, password=None, **extra_fields):
        if not Username:
            raise ValueError('The Username field must be set')
        user = self.model(Username=Username, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, Username, password=None, **extra_fields):
        extra_fields.setdefault('IsSystem', True)
        return self.create_user(Username, password, **extra_fields)


class User(AbstractBaseUser):
    UserId = models.BigAutoField(primary_key=True, db_column='UserId')
    Username = models.CharField(max_length=100, unique=True, db_column='Username')
    password = models.CharField(max_length=500, db_column='PasswordHash')
    UserRole = models.ForeignKey(UserRole, on_delete=models.PROTECT, db_column='UserRoleId')
    CompanyId = models.BigIntegerField(default=0, db_column='CompanyId')
    IsActive = models.BooleanField(default=True, db_column='IsActive')
    IsSystem = models.BooleanField(default=False, db_column='IsSystem')
    last_login = models.DateTimeField(null=True, blank=True, db_column='LastLoginAt')
    CreatedAt = models.DateTimeField(auto_now_add=True, db_column='CreatedAt')
    UpdatedAt = models.DateTimeField(auto_now=True, db_column='UpdatedAt')
    DriverId = models.BigIntegerField(null=True, blank=True, db_column='DriverId')

    objects = CustomUserManager()

    USERNAME_FIELD = 'Username'
    REQUIRED_FIELDS = []

    class Meta:
        managed = False
        db_table = '"User"'

    @property
    def id(self):
        return self.UserId
    def check_password(self, raw_password):
        from django.contrib.auth.hashers import check_password
        return check_password(raw_password, (self.password or '').strip())
    
    @property
    def is_active(self):
        return self.IsActive

    @property
    def company(self):
        if not hasattr(self, '_cached_company'):
            if self.CompanyId:
                self._cached_company = Company.objects.filter(CompanyId=self.CompanyId).first()
            else:
                self._cached_company = None
        return self._cached_company

    def __str__(self):
        return self.Username


class Driver(models.Model):
    DriverId = models.BigAutoField(primary_key=True, db_column='DriverId')
    DriverName = models.CharField(max_length=150, db_column='DriverName')
    PhoneNumber = models.CharField(max_length=20, db_column='PhoneNumber')
    LicenseNumber = models.CharField(max_length=50, null=True, blank=True, db_column='LicenseNumber')
    LicenseExpiryDate = models.DateField(null=True, blank=True, db_column='LicenseExpiryDate')
    AddressLine1 = models.CharField(max_length=100, null=True, blank=True, db_column='AddressLine1')
    AddressLine2 = models.CharField(max_length=100, null=True, blank=True, db_column='AddressLine2')
    AddressLine3 = models.CharField(max_length=100, null=True, blank=True, db_column='AddressLine3')
    IsActive = models.BooleanField(default=True, db_column='IsActive')
    CreatedAt = models.DateTimeField(auto_now_add=True, db_column='CreatedAt')
    UpdatedAt = models.DateTimeField(auto_now=True, db_column='UpdatedAt')
    CompanyId = models.BigIntegerField(default=0, db_column='CompanyId')

    class Meta:
        managed = False
        db_table = '"Driver"'

    def __str__(self):
        return self.DriverName


class Vehicle(models.Model):
    VehicleId = models.BigAutoField(primary_key=True, db_column='VehicleId')
    VehicleNumber = models.CharField(max_length=20, db_column='VehicleNumber')
    VehicleName = models.CharField(max_length=100, null=True, blank=True, db_column='VehicleName')
    RcExpiryDate = models.DateField(null=True, blank=True, db_column='RcExpiryDate')
    InsuranceExpiryDate = models.DateField(null=True, blank=True, db_column='InsuranceExpiryDate')
    FitnessExpiryDate = models.DateField(null=True, blank=True, db_column='FitnessExpiryDate')
    PollutionExpiryDate = models.DateField(null=True, blank=True, db_column='PollutionExpiryDate')
    IsActive = models.BooleanField(default=True, db_column='IsActive')
    CreatedAt = models.DateTimeField(auto_now_add=True, db_column='CreatedAt')
    UpdatedAt = models.DateTimeField(auto_now=True, db_column='UpdatedAt')
    CompanyId = models.BigIntegerField(default=0, db_column='CompanyId')

    class Meta:
        managed = False
        db_table = '"Vehicle"'

    def __str__(self):
        return self.VehicleNumber


class Route(models.Model):
    RouteId = models.BigAutoField(primary_key=True, db_column='RouteId')
    RouteName = models.CharField(max_length=150, db_column='RouteName')
    Description = models.CharField(max_length=250, null=True, blank=True, db_column='Description')
    StartLocation = models.CharField(max_length=200, null=True, blank=True, db_column='StartLocation')
    EndLocation = models.CharField(max_length=200, null=True, blank=True, db_column='EndLocation')
    IsActive = models.BooleanField(default=True, db_column='IsActive')
    CreatedAt = models.DateTimeField(auto_now_add=True, db_column='CreatedAt')
    UpdatedAt = models.DateTimeField(auto_now=True, db_column='UpdatedAt')
    CompanyId = models.BigIntegerField(default=0, db_column='CompanyId')

    class Meta:
        managed = False
        db_table = '"Route"'

    def __str__(self):
        return self.RouteName


class RouteVehicleDriver(models.Model):
    RouteVehicleDriverId = models.BigAutoField(primary_key=True, db_column='RouteVehicleDriverId')
    Route = models.ForeignKey(Route, on_delete=models.CASCADE, db_column='RouteId')
    Vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, db_column='VehicleId')
    Driver = models.ForeignKey(Driver, on_delete=models.CASCADE, db_column='DriverId')
    AssignmentDate = models.DateField(null=True, blank=True, db_column='AssignmentDate')
    IsActive = models.BooleanField(default=True, db_column='IsActive')
    CompanyId = models.BigIntegerField(default=0, db_column='CompanyId')
    Narration = models.CharField(max_length=250, null=True, blank=True, db_column='Narration')
    CreatedAt = models.DateTimeField(auto_now_add=True, db_column='CreatedAt')
    UpdatedAt = models.DateTimeField(auto_now=True, db_column='UpdatedAt')

    class Meta:
        managed = False
        db_table = '"RouteVehicleDriver"'


class Group(models.Model):
    NATURE_CHOICES = [
        ('Asset', 'Asset'),
        ('Liability', 'Liability'),
        ('Income', 'Income'),
        ('Expense', 'Expense'),
    ]

    GroupId = models.BigAutoField(primary_key=True, db_column='GroupId')
    GroupName = models.CharField(max_length=150, db_column='GroupName')
    ParentGroup = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, db_column='ParentGroupId')
    Nature = models.CharField(max_length=20, choices=NATURE_CHOICES, db_column='Nature')
    IsSystem = models.BooleanField(default=False, db_column='IsSystem')
    SortOrder = models.IntegerField(default=0, db_column='SortOrder')
    CompanyId = models.BigIntegerField(db_column='CompanyId')

    class Meta:
        managed = False
        db_table = '"Group"'

    def __str__(self):
        return self.GroupName


class Ledger(models.Model):
    LedgerId = models.BigAutoField(primary_key=True, db_column='LedgerId')
    LedgerName = models.CharField(max_length=150, db_column='LedgerName')
    Group = models.ForeignKey(Group, on_delete=models.PROTECT, db_column='GroupId')
    OpeningBalance = models.DecimalField(max_digits=18, decimal_places=2, default=0, db_column='OpeningBalance')
    OpeningBalanceType = models.CharField(max_length=2, default='DR', db_column='OpeningBalanceType')
    DebitBalance = models.DecimalField(max_digits=18, decimal_places=2, default=0, db_column='DebitBalance')
    CreditBalance = models.DecimalField(max_digits=18, decimal_places=2, default=0, db_column='CreditBalance')
    CurrentBalance = models.DecimalField(max_digits=18, decimal_places=2, default=0, db_column='CurrentBalance')
    AddressLine1 = models.CharField(max_length=300, null=True, blank=True, db_column='AddressLine1')
    AddressLine2 = models.CharField(max_length=300, null=True, blank=True, db_column='AddressLine2')
    AddressLine3 = models.CharField(max_length=300, null=True, blank=True, db_column='AddressLine3')
    City = models.CharField(max_length=100, null=True, blank=True, db_column='City')
    StateId = models.BigIntegerField(null=True, blank=True, db_column='StateId')
    Pincode = models.CharField(max_length=10, null=True, blank=True, db_column='Pincode')
    PhoneNumber = models.CharField(max_length=20, null=True, blank=True, db_column='PhoneNumber')
    MobileNumber = models.CharField(max_length=20, null=True, blank=True, db_column='MobileNumber')
    Email = models.CharField(max_length=150, null=True, blank=True, db_column='Email')
    GSTRegistrationType = models.CharField(max_length=30, null=True, blank=True, db_column='GSTRegistrationType')
    GSTIN = models.CharField(max_length=15, null=True, blank=True, db_column='GSTIN')
    PAN = models.CharField(max_length=10, null=True, blank=True, db_column='PAN')
    IsBillWise = models.BooleanField(default=False, db_column='IsBillWise')
    CreditPeriodDays = models.IntegerField(default=0, db_column='CreditPeriodDays')
    CreditLimit = models.DecimalField(max_digits=18, decimal_places=2, default=0, db_column='CreditLimit')
    BankName = models.CharField(max_length=150, null=True, blank=True, db_column='BankName')
    BankAccountNumber = models.CharField(max_length=50, null=True, blank=True, db_column='BankAccountNumber')
    IFSCCode = models.CharField(max_length=20, null=True, blank=True, db_column='IFSCCode')
    BankBranch = models.CharField(max_length=150, null=True, blank=True, db_column='BankBranch')
    EmptyStockLimit = models.DecimalField(max_digits=18, decimal_places=2, default=0, db_column='EmptyStockLimit')
    IsActive = models.BooleanField(default=True, db_column='IsActive')
    IsSystem = models.BooleanField(default=False, db_column='IsSystem')
    CompanyId = models.BigIntegerField(default=0, db_column='CompanyId')
    Narration = models.CharField(max_length=250, null=True, blank=True, db_column='Narration')
    CreatedAt = models.DateTimeField(auto_now_add=True, db_column='CreatedAt')
    UpdatedAt = models.DateTimeField(auto_now=True, db_column='UpdatedAt')

    class Meta:
        managed = False
        db_table = '"Ledger"'

    def __str__(self):
        return self.LedgerName
class Category(models.Model):
    CategoryId = models.BigAutoField(primary_key=True, db_column='CategoryId')
    CategoryName = models.CharField(max_length=150, db_column='CategoryName')
    ParentCategory = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='ParentCategoryId',
        related_name='subcategories'
    )
    IsActive = models.BooleanField(default=True, db_column='IsActive')
    CompanyId = models.BigIntegerField(default=0, db_column='CompanyId')
    CreatedAt = models.DateTimeField(auto_now_add=True, db_column='CreatedAt')

    class Meta:
        managed = False
        db_table = '"Category"'

    def __str__(self):
        return self.CategoryName


class Unit(models.Model):
    UnitId = models.BigAutoField(primary_key=True, db_column='UnitId')
    UnitName = models.CharField(max_length=50, db_column='UnitName')
    IsActive = models.BooleanField(default=True, db_column='IsActive')
    CreatedAt = models.DateTimeField(auto_now_add=True, db_column='CreatedAt')
    CompanyId = models.BigIntegerField(default=0, db_column='CompanyId')

    class Meta:
        managed = False
        db_table = '"Unit"'

    def __str__(self):
        return self.UnitName


class Product(models.Model):
    ProductId = models.BigAutoField(primary_key=True, db_column='ProductId')
    ProductCode = models.CharField(max_length=30, null=True, blank=True, db_column='ProductCode')
    ProductName = models.CharField(max_length=150, db_column='ProductName')
    AppProductName = models.CharField(max_length=150, null=True, blank=True, db_column='AppProductName')
    Category = models.ForeignKey('Category', on_delete=models.PROTECT, db_column='CategoryId', related_name='products')
    Unit = models.ForeignKey('Unit', on_delete=models.PROTECT, db_column='UnitId', related_name='base_products')
    AltUnit = models.ForeignKey('Unit', on_delete=models.SET_NULL, null=True, blank=True, db_column='AltUnitId', related_name='alt_products')
    UnitConversion = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, db_column='UnitConversion')
    HSNCode = models.CharField(max_length=20, null=True, blank=True, db_column='HSNCode')
    GSTPercentage = models.DecimalField(max_digits=5, decimal_places=2, default=0, db_column='GSTPercentage')
    SalesPrice = models.DecimalField(max_digits=12, decimal_places=2, default=0, db_column='SalesPrice')
    PurchasePrice = models.DecimalField(max_digits=12, decimal_places=2, default=0, db_column='PurchasePrice')
    MRP = models.DecimalField(max_digits=12, decimal_places=2, default=0, db_column='MRP')
    IsActive = models.BooleanField(default=True, db_column='IsActive')
    CreatedAt = models.DateTimeField(auto_now_add=True, db_column='CreatedAt')
    UpdatedAt = models.DateTimeField(auto_now=True, db_column='UpdatedAt')
    CompanyId = models.BigIntegerField(default=0, db_column='CompanyId')

    class Meta:
        managed = False
        db_table = '"Product"'

    def __str__(self):
        return self.ProductName


class ProductPriceAudit(models.Model):
    AuditId = models.BigAutoField(primary_key=True, db_column='AuditId')
    Product = models.ForeignKey(Product, on_delete=models.CASCADE, db_column='ProductId', related_name='price_audits')
    ProductName = models.CharField(max_length=150, db_column='ProductName')
    OldSalesPrice = models.DecimalField(max_digits=12, decimal_places=2, default=0, db_column='OldSalesPrice')
    NewSalesPrice = models.DecimalField(max_digits=12, decimal_places=2, default=0, db_column='NewSalesPrice')
    User = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, db_column='UserId')
    Role = models.ForeignKey(UserRole, on_delete=models.SET_NULL, null=True, blank=True, db_column='RoleId')
    CompanyId = models.BigIntegerField(default=0, db_column='CompanyId')
    CreatedTimestamp = models.DateTimeField(auto_now_add=True, db_column='CreatedTimestamp')

    class Meta:
        managed = False
        db_table = '"ProductPriceAudit"'
        ordering = ['-CreatedTimestamp']

    def __str__(self):
        return f"{self.ProductName}: {self.OldSalesPrice} -> {self.NewSalesPrice}"


class Purchase(models.Model):
    PurchaseId = models.BigAutoField(primary_key=True, db_column='PurchaseId')
    PurchaseNo = models.CharField(max_length=50, db_column='PurchaseNo')
    PurchaseDate = models.DateField(db_column='PurchaseDate')
    SupplierLedger = models.ForeignKey(Ledger, on_delete=models.PROTECT, db_column='SupplierLedgerId', related_name='purchases')
    InvoiceNo = models.CharField(max_length=50, null=True, blank=True, db_column='InvoiceNo')
    InvoiceDate = models.DateField(null=True, blank=True, db_column='InvoiceDate')
    Notes = models.CharField(max_length=500, null=True, blank=True, db_column='Notes')
    SubTotal = models.DecimalField(max_digits=18, decimal_places=2, default=0, db_column='SubTotal')
    TaxAmount = models.DecimalField(max_digits=18, decimal_places=2, default=0, db_column='TaxAmount')
    GrandTotal = models.DecimalField(max_digits=18, decimal_places=2, default=0, db_column='GrandTotal')
    RoundOff = models.DecimalField(max_digits=10, decimal_places=2, default=0, db_column='RoundOff')
    CompanyId = models.BigIntegerField(default=0, db_column='CompanyId')
    CreatedAt = models.DateTimeField(auto_now_add=True, db_column='CreatedAt')
    UpdatedAt = models.DateTimeField(auto_now=True, db_column='UpdatedAt')

    # Transport & Consignor details
    SalesOrderNo = models.CharField(max_length=50, null=True, blank=True, db_column='SalesOrderNo')
    SalesOrderDate = models.DateField(null=True, blank=True, db_column='SalesOrderDate')
    DeliveryNo = models.CharField(max_length=50, null=True, blank=True, db_column='DeliveryNo')
    DeliveryDate = models.DateField(null=True, blank=True, db_column='DeliveryDate')
    ModeOfTransport = models.CharField(max_length=50, null=True, blank=True, db_column='ModeOfTransport')
    TruckNo = models.CharField(max_length=50, null=True, blank=True, db_column='TruckNo')
    TransporterName = models.CharField(max_length=150, null=True, blank=True, db_column='TransporterName')
    TankerSealNo = models.CharField(max_length=50, null=True, blank=True, db_column='TankerSealNo')
    EWayBillNo = models.CharField(max_length=50, null=True, blank=True, db_column='EWayBillNo')
    EWayBillValidDate = models.DateField(null=True, blank=True, db_column='EWayBillValidDate')
    PartyName = models.CharField(max_length=150, null=True, blank=True, db_column='PartyName')
    PartyPhone = models.CharField(max_length=30, null=True, blank=True, db_column='PartyPhone')
    PartyAddress = models.TextField(null=True, blank=True, db_column='PartyAddress')
    PartyState = models.CharField(max_length=100, null=True, blank=True, db_column='PartyState')
    PartyPincode = models.CharField(max_length=20, null=True, blank=True, db_column='PartyPincode')

    class Meta:
        managed = False
        db_table = '"Purchase"'
        ordering = ['-PurchaseDate', '-PurchaseId']

    def __str__(self):
        return f"{self.PurchaseNo} ({self.PurchaseDate})"


class PurchaseLine(models.Model):
    PurchaseLineId = models.BigAutoField(primary_key=True, db_column='PurchaseLineId')
    Purchase = models.ForeignKey(Purchase, on_delete=models.CASCADE, db_column='PurchaseId', related_name='lines')
    LineNo = models.IntegerField(default=1, db_column='LineNo')
    Product = models.ForeignKey(Product, on_delete=models.PROTECT, db_column='ProductId', related_name='purchase_lines')
    ProductName = models.CharField(max_length=150, null=True, blank=True, db_column='ProductName')
    Unit = models.ForeignKey(Unit, on_delete=models.PROTECT, db_column='UnitId', related_name='purchase_units')
    AltUnitId = models.BigIntegerField(null=True, blank=True, db_column='AltUnitId')
    UnitConversion = models.DecimalField(max_digits=12, decimal_places=4, default=1, db_column='UnitConversion')
    CostPrice = models.DecimalField(max_digits=18, decimal_places=2, default=0, db_column='CostPrice')
    TaxPercent = models.DecimalField(max_digits=5, decimal_places=2, default=0, db_column='TaxPercent')
    TaxAmount = models.DecimalField(max_digits=18, decimal_places=2, default=0, db_column='TaxAmount')
    Quantity = models.DecimalField(max_digits=18, decimal_places=2, default=0, db_column='Quantity')
    Total = models.DecimalField(max_digits=18, decimal_places=2, default=0, db_column='Total')
    DiscPercent = models.DecimalField(max_digits=5, decimal_places=2, default=0, db_column='DiscPercent')
    DiscAmount = models.DecimalField(max_digits=18, decimal_places=2, default=0, db_column='DiscAmount')
    CompanyId = models.BigIntegerField(default=0, db_column='CompanyId')

    class Meta:
        managed = False
        db_table = '"PurchaseLine"'
        ordering = ['LineNo']

    def __str__(self):
        return f"Line {self.LineNo}: {self.ProductName} x {self.Quantity}"


class StockMovement(models.Model):
    StockMovementId = models.BigAutoField(primary_key=True, db_column='StockMovementId')
    CompanyId = models.BigIntegerField(default=0, db_column='CompanyId')
    Product = models.ForeignKey(Product, on_delete=models.PROTECT, db_column='ProductId', related_name='stock_movements')
    Unit = models.ForeignKey(Unit, on_delete=models.PROTECT, db_column='UnitId', related_name='stock_units')
    AltUnitId = models.BigIntegerField(null=True, blank=True, db_column='AltUnitId')
    UnitConversion = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True, db_column='UnitConversion')
    RouteVehicleDriverId = models.BigIntegerField(default=1, db_column='RouteVehicleDriverId')
    TransactionType = models.CharField(max_length=50, db_column='TransactionType')
    ReferenceId = models.BigIntegerField(db_column='ReferenceId')
    ReferenceLineId = models.BigIntegerField(null=True, blank=True, db_column='ReferenceLineId')
    TransactionNo = models.CharField(max_length=50, null=True, blank=True, db_column='TransactionNo')
    TransactionDate = models.DateField(db_column='TransactionDate')
    InQty = models.DecimalField(max_digits=18, decimal_places=2, default=0, db_column='InQty')
    InCostRate = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True, db_column='InCostRate')
    InCostAmount = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True, db_column='InCostAmount')
    OutQty = models.DecimalField(max_digits=18, decimal_places=2, default=0, db_column='OutQty')
    OutCostRate = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True, db_column='OutCostRate')
    OutCostAmount = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True, db_column='OutCostAmount')
    Narration = models.CharField(max_length=250, null=True, blank=True, db_column='Narration')
    CreatedAt = models.DateTimeField(auto_now_add=True, db_column='CreatedAt')

    class Meta:
        managed = False
        db_table = '"StockMovement"'


class Voucher(models.Model):
    VoucherId = models.BigAutoField(primary_key=True, db_column='VoucherId')
    VoucherNo = models.CharField(max_length=50, db_column='VoucherNo')
    VoucherDate = models.DateField(db_column='VoucherDate')
    VoucherType = models.CharField(max_length=50, db_column='VoucherType')
    ReferenceTable = models.CharField(max_length=50, db_column='ReferenceTable')
    ReferenceId = models.BigIntegerField(db_column='ReferenceId')
    CompanyId = models.BigIntegerField(default=0, db_column='CompanyId')
    Narration = models.CharField(max_length=250, null=True, blank=True, db_column='Narration')
    IsCancelled = models.BooleanField(default=False, db_column='IsCancelled')
    CreatedAt = models.DateTimeField(auto_now_add=True, db_column='CreatedAt')
    UpdatedAt = models.DateTimeField(auto_now=True, db_column='UpdatedAt')

    class Meta:
        managed = False
        db_table = '"Voucher"'


class VoucherLine(models.Model):
    VoucherLineId = models.BigAutoField(primary_key=True, db_column='VoucherLineId')
    Voucher = models.ForeignKey(Voucher, on_delete=models.CASCADE, db_column='VoucherId', related_name='lines')
    LineNo = models.IntegerField(default=1, db_column='LineNo')
    Ledger = models.ForeignKey(Ledger, on_delete=models.PROTECT, db_column='LedgerId', related_name='voucher_lines')
    DebitAmount = models.DecimalField(max_digits=18, decimal_places=2, default=0, db_column='DebitAmount')
    CreditAmount = models.DecimalField(max_digits=18, decimal_places=2, default=0, db_column='CreditAmount')
    Narration = models.CharField(max_length=250, null=True, blank=True, db_column='Narration')

    class Meta:
        managed = False
        db_table = '"VoucherLine"'
        ordering = ['LineNo']
class Payment(models.Model):
    PaymentId = models.BigAutoField(primary_key=True, db_column='PaymentId')
    PartyLedger = models.ForeignKey(Ledger, on_delete=models.PROTECT, db_column='PartyLedgerId', related_name='payments')
    Amount = models.DecimalField(max_digits=18, decimal_places=2, db_column='Amount')
    Narration = models.CharField(max_length=500, null=True, blank=True, db_column='Narration')
    CreatedAt = models.DateTimeField(auto_now_add=True, db_column='CreatedAt')
    UpdatedAt = models.DateTimeField(auto_now=True, db_column='UpdatedAt')

    class Meta:
        managed = False
        db_table = '"Payment"'
        ordering = ['-PaymentId']

    def __str__(self):
        return f"Payment #{self.PaymentId}: {self.PartyLedger.LedgerName} (₹{self.Amount})"


class PaymentLine(models.Model):
    PaymentLineId = models.BigAutoField(primary_key=True, db_column='PaymentLineId')
    Payment = models.ForeignKey(Payment, on_delete=models.CASCADE, db_column='PaymentId', related_name='lines')
    LineNo = models.IntegerField(default=1, db_column='LineNo')
    PaymentMode = models.CharField(max_length=50, db_column='PaymentMode')  # Cash, Bank, Cheque, UPI, NEFT
    Ledger = models.ForeignKey(Ledger, on_delete=models.PROTECT, db_column='LedgerId', related_name='payment_lines')  # Bank / Cash Account
    Amount = models.DecimalField(max_digits=18, decimal_places=2, db_column='Amount')
    InstrumentNumber = models.CharField(max_length=100, null=True, blank=True, db_column='InstrumentNumber')
    InstrumentDate = models.DateField(null=True, blank=True, db_column='InstrumentDate')
    BankName = models.CharField(max_length=150, null=True, blank=True, db_column='BankName')
    BankBranch = models.CharField(max_length=150, null=True, blank=True, db_column='BankBranch')
    ChequeStatus = models.CharField(max_length=50, null=True, blank=True, db_column='ChequeStatus')
    ClearedDate = models.DateField(null=True, blank=True, db_column='ClearedDate')
    TransactionReference = models.CharField(max_length=150, null=True, blank=True, db_column='TransactionReference')
    Narration = models.CharField(max_length=250, null=True, blank=True, db_column='Narration')

    class Meta:
        managed = False
        db_table = '"PaymentLine"'
        ordering = ['LineNo']

    def __str__(self):
        return f"Line {self.LineNo}: {self.PaymentMode} via {self.Ledger.LedgerName} (₹{self.Amount})"


class BillwiseAllocation(models.Model):
    BillwiseAllocationId = models.BigAutoField(primary_key=True, db_column='BillwiseAllocationId')
    PaymentLine = models.ForeignKey(PaymentLine, on_delete=models.CASCADE, null=True, blank=True, db_column='PaymentLineId', related_name='allocations')
    ReceiptLineId = models.BigIntegerField(null=True, blank=True, db_column='ReceiptLineId')
    BillType = models.CharField(max_length=50, db_column='BillType')  # 'PURCHASE'
    BillReference = models.CharField(max_length=100, null=True, blank=True, db_column='BillReference')  # InvoiceNo or PurchaseNo
    BillDate = models.DateField(null=True, blank=True, db_column='BillDate')
    DueDate = models.DateField(null=True, blank=True, db_column='DueDate')
    AllocationType = models.CharField(max_length=50, default='Against Reference', db_column='AllocationType')  # Against Reference, On Account, Advance
    AllocatedAmount = models.DecimalField(max_digits=18, decimal_places=2, db_column='AllocatedAmount')
    CompanyId = models.BigIntegerField(default=0, db_column='CompanyId')
    CreatedAt = models.DateTimeField(auto_now_add=True, db_column='CreatedAt')

    class Meta:
        managed = False
        db_table = '"BillwiseAllocation"'

    def __str__(self):
        return f"{self.BillReference}: {self.AllocationType} (₹{self.AllocatedAmount})"


class LedgerLine(models.Model):
    LedgerLineId = models.BigAutoField(primary_key=True, db_column='LedgerLineId')
    Ledger = models.ForeignKey(Ledger, on_delete=models.CASCADE, db_column='LedgerId', related_name='ledger_lines')
    BillNo = models.CharField(max_length=100, db_column='BillNo')
    BillDate = models.DateField(db_column='BillDate')
    DueDate = models.DateField(null=True, blank=True, db_column='DueDate')
    Amount = models.DecimalField(max_digits=18, decimal_places=2, db_column='Amount')
    Narration = models.CharField(max_length=250, null=True, blank=True, db_column='Narration')
    CompanyId = models.BigIntegerField(default=0, db_column='CompanyId')
    CreatedAt = models.DateTimeField(auto_now_add=True, db_column='CreatedAt')
    UpdatedAt = models.DateTimeField(auto_now=True, db_column='UpdatedAt')

    class Meta:
        managed = False
        db_table = '"LedgerLine"'
        ordering = ['BillDate', 'LedgerLineId']

    def __str__(self):
        return f"{self.Ledger.LedgerName} - {self.BillNo} (₹{self.Amount})"

class DeliveryNote(models.Model):
    DeliveryNoteId = models.BigAutoField(primary_key=True, db_column='DeliveryNoteId')
    DeliveryNoteNo = models.CharField(max_length=50, unique=True, db_column='DeliveryNoteNo')
    DeliveryDate = models.DateField(db_column='DeliveryDate')
    RouteVehicleDriver = models.ForeignKey(
        RouteVehicleDriver,
        on_delete=models.PROTECT,
        db_column='RouteVehicleDriverId',
        related_name='delivery_notes'
    )
    CompanyId = models.BigIntegerField(default=0, db_column='CompanyId')
    Remarks = models.TextField(null=True, blank=True, db_column='Remarks')
    Status = models.CharField(max_length=50, default='LOADED', db_column='Status')  # LOADED, SETTLED, CANCELLED
    CreatedAt = models.DateTimeField(auto_now_add=True, db_column='CreatedAt')

    class Meta:
        managed = False
        db_table = '"DeliveryNote"'
        ordering = ['-DeliveryDate', '-DeliveryNoteId']

    def __str__(self):
        return f"{self.DeliveryNoteNo} ({self.RouteVehicleDriver})"

class DeliveryNoteLine(models.Model):
    DeliveryNoteLineId = models.BigAutoField(primary_key=True, db_column='DeliveryNoteLineId')
    DeliveryNote = models.ForeignKey(
        DeliveryNote,
        on_delete=models.CASCADE,
        db_column='DeliveryNoteId',
        related_name='lines'
    )
    Product = models.ForeignKey(Product, on_delete=models.PROTECT, db_column='ProductId')
    Unit = models.ForeignKey(Unit, on_delete=models.PROTECT, db_column='UnitId')
    Quantity = models.DecimalField(max_digits=18, decimal_places=2, default=0, db_column='Quantity')
    Rate = models.DecimalField(max_digits=18, decimal_places=2, default=0, db_column='Rate')
    Amount = models.DecimalField(max_digits=18, decimal_places=2, default=0, db_column='Amount')

    class Meta:
        managed = False
        db_table = '"DeliveryNoteLine"'
        ordering = ['DeliveryNoteLineId']
