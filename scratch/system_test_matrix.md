# FutureGas (RouteFlow / SuperGas) System Test Matrix

## 1. Models Inventory (38 Models in `core/models.py`)

| Model Name | Key Fields & Types | Constraints & Keys |
| :--- | :--- | :--- |
| **State** | `StateId` (PK), `StateName` (CharField 100), `StateCode` (CharField 10) | Unique StateName/Code |
| **UserRole** | `RoleId` (PK), `RoleName` (CharField 50) | Unique RoleName |
| **Company** | `CompanyId` (PK), `CompanyName`, `Address`, `GSTIN`, `State` (FK State) | GSTIN format, Active status |
| **FinancialYear** | `FinancialYearId` (PK), `Company` (FK), `StartDate`, `EndDate`, `IsActive` | Active FY validation |
| **User** | `UserId` (PK), `Username`, `Password`, `Role` (FK UserRole), `Company` (FK Company) | AbstractBaseUser, Unique username |
| **Driver** | `DriverId` (PK), `Name`, `Phone`, `LicenseNumber`, `Company` (FK) | Unique LicenseNumber |
| **Vehicle** | `VehicleId` (PK), `VehicleNumber`, `Model`, `Capacity`, `Company` (FK) | Unique VehicleNumber |
| **Route** | `RouteId` (PK), `RouteName`, `RouteCode`, `Company` (FK) | Unique RouteCode |
| **RouteVehicleDriver** (RVD) | `RouteVehicleDriverId` (PK), `Route`, `Vehicle`, `Driver`, `Company`, `IsActive` | Represents active delivery/godown entity |
| **Group** | `GroupId` (PK), `GroupName`, `ParentGroup` (FK Self), `Company` (FK) | Chart of accounts hierarchy |
| **Ledger** | `LedgerId` (PK), `LedgerName`, `Group` (FK), `OpeningBalance`, `Company` (FK) | Customers, Suppliers, Banks, Cash |
| **Category** | `CategoryId` (PK), `CategoryName`, `Company` (FK) | Product category grouping |
| **Unit** | `UnitId` (PK), `UnitName`, `Symbol`, `Company` (FK) | Cylinder/Accessory unit of measure |
| **Product** | `ProductId` (PK), `ProductName`, `ProductCode`, `UnitPrice`, `TaxRate`, `Category`, `Unit` | LPG Gas Cylinder (Full/Empty), Accessories |
| **ProductPriceAudit** | `AuditId` (PK), `Product` (FK), `OldPrice`, `NewPrice`, `ChangedBy`, `Timestamp` | Price history tracking |
| **CustomerProductPrice** | `Id` (PK), `Customer` (FK Ledger), `Product` (FK), `CustomPrice` | Special pricing overrides per customer |
| **Purchase** | `PurchaseId` (PK), `PurchaseDate`, `Supplier` (FK Ledger), `TotalAmount`, `InvoiceNumber` | Stock replenishment from refinery/plant |
| **PurchaseLine** | `PurchaseLineId` (PK), `Purchase` (FK), `Product` (FK), `Quantity`, `UnitPrice`, `TaxAmount` | Line item details |
| **Sales** | `SalesId` (PK), `SalesDate`, `InvoiceNumber`, `Customer` (FK Ledger), `PaymentMethod`, `GrandTotal` | Cash, Credit, UPI, Split sales |
| **SalesLine** | `SalesLineId` (PK), `Sales` (FK), `Product` (FK), `Quantity`, `UnitPrice`, `Discount`, `TaxAmount` | Individual sale items |
| **StockMovement** | `StockMovementId` (PK), `Product` (FK), `RouteVehicleDriver` (FK), `InQty`, `OutQty`, `TransactionType` | Core inventory ledger driving all stock |
| **Voucher** | `VoucherId` (PK), `VoucherNumber`, `VoucherDate`, `VoucherType`, `Company` (FK) | Double-entry journal/payment/sales voucher |
| **VoucherLine** | `VoucherLineId` (PK), `Voucher` (FK), `Ledger` (FK), `DebitAmount`, `CreditAmount` | Balanced debits and credits ($\sum Dr = \sum Cr$) |
| **Payment** | `PaymentId` (PK), `PaymentDate`, `Customer/Supplier` (FK Ledger), `Amount`, `PaymentMode` | Financial payments and receipts |
| **PaymentLine** | `PaymentLineId` (PK), `Payment` (FK), `InvoiceNumber`, `PaidAmount` | Match payments to specific invoices |
| **BillwiseAllocation** | `AllocationId` (PK), `Voucher` (FK), `Ledger` (FK), `BillNumber`, `Amount`, `Type` | Outstanding receivables & payables tracking |
| **LedgerLine** | `LedgerLineId` (PK), `Ledger` (FK), `Date`, `Description`, `Debit`, `Credit`, `Balance` | Detailed account ledger entries |
| **DeliveryNote** | `DeliveryNoteId` (PK), `DeliveryDate`, `RouteVehicleDriver` (FK), `Status`, `IsSettled` | Morning van load / shift allocation |
| **DeliveryNoteLine** | `DeliveryNoteLineId` (PK), `DeliveryNote` (FK), `Product` (FK), `FilledQty`, `EmptyQty` | Line items loaded onto the vehicle |
| **ReceiptNote** | `ReceiptNoteId` (PK), `ReceiptDate`, `RouteVehicleDriver` (FK), `ReturnedQty` | Unloading cylinders from van back to warehouse |
| **ReceiptNoteLine** | `ReceiptNoteLineId` (PK), `ReceiptNote` (FK), `Product` (FK), `Quantity`, `Condition` | Return inspection details |
| **RouteExpense** | `ExpenseId` (PK), `RouteVehicleDriver` (FK), `ExpenseType`, `Amount`, `PaymentMode`, `Notes` | Driver on-road expenses (Fuel, Food, Toll) |
| **SaleEditHistory** | `EditId` (PK), `Sale` (FK), `EditedBy`, `OldData`, `NewData`, `Timestamp` | Audit trail for invoice edits |
| **ConnectionPackage** | `PackageId` (PK), `PackageName`, `TotalDeposit`, `InstallationFee`, `IsActive` | New connection bundle (Cylinder + Regulator + Pipe) |
| **ConnectionPackageItem**| `ItemId` (PK), `Package` (FK), `Product` (FK), `Quantity` | Components of connection package |
| **Godown** | `GodownId` (PK), `GodownName`, `Location`, `RouteVehicleDriver` (FK), `IsCentral` | Main warehouse vs sub-depots |
| **CustomerAdvance** | `AdvanceId` (PK), `Customer` (FK Ledger), `Amount`, `Date`, `Status` | Prepayments received from customers |
| **AdvanceAdjustment** | `AdjustmentId` (PK), `Advance` (FK), `Sale` (FK), `AdjustedAmount` | Applying prepayments to sales orders |

---

## 2. API Endpoints Inventory (`/api/v1/`)

| Method | Endpoint | ViewSet / Action | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/login/` | `LoginView` | Staff & Driver token authentication |
| `POST` | `/auth/refresh/` | `TokenRefreshView` | Refresh expired access tokens |
| `GET` | `/auth/me/` | `MeView` | Logged-in user profile, role, company |
| `GET/PUT` | `/company/` | `CompanyProfileView` | Company details, GSTIN, letterhead settings |
| `GET` | `/godowns/` | `GodownViewSet` | Godown locations and RVD mappings |
| `GET/POST`| `/drivers/` | `DriverViewSet` | Manage delivery drivers |
| `GET/POST`| `/vehicles/` | `VehicleViewSet` | Manage fleet transport vehicles |
| `GET/POST`| `/routes/` | `RouteViewSet` | Route geographic master list |
| `GET` | `/routes/van_management/`| `RouteViewSet.van_management` | Live overview of all active routes, stock, and cash |
| `GET` | `/allocations/current/` | `RouteVehicleDriverViewSet.current`| Active vehicle/route/driver assignment |
| `GET/POST`| `/products/` | `ProductViewSet` | Product catalog, pricing, tax rates |
| `GET/POST`| `/ledgers/` | `LedgerViewSet` | Chart of accounts, Customer & Supplier lists |
| `GET` | `/ledgers/customers/` | `LedgerViewSet.customers` | Filtered customer directory with balances |
| `GET/POST`| `/delivery-notes/` | `DeliveryNoteViewSet` | Morning loading of vans from godown |
| `GET` | `/delivery-notes/van_stock/` | `DeliveryNoteViewSet.van_stock` | Live stock onboard a specific van |
| `POST` | `/delivery-notes/create_sale/` | `DeliveryNoteViewSet.create_sale` | Mobile driver sale creation (Cylinders + Cash/UPI/Credit/Split) |
| `POST` | `/delivery-notes/create_expense/` | `DeliveryNoteViewSet.create_expense`| On-route driver expense recording |
| `POST` | `/end-route-drivers/settle/` | `EndRouteDriverViewSet.settle` | End-of-shift reconciliation & voucher generation |
| `GET/POST`| `/sales/` | `SalesViewSet` | Office & direct counter sales |
| `GET` | `/sales/{id}/invoice_pdf/` | `SalesViewSet.invoice_pdf` | Tax invoice generation (PDF) |
| `GET/POST`| `/connection-packages/` | `ConnectionPackageViewSet` | New customer cylinder connection packages |

---

## 3. Stock Movement & Inventory Flow Architecture

Inventory is tracked via the `StockMovement` table tagged by `RouteVehicleDriverId` (representing Godowns or Vans):
- **Warehouse/Godown Out -> Van In**:
  - `DELIVERY_NOTE`: `InQty` on Van RVD, `OutQty` on Godown RVD
- **Customer Deliveries (Full Cylinders)**:
  - `VAN_SALE`: `OutQty` on Van RVD (reduces filled stock onboard)
- **Empty Cylinder Collections**:
  - `VAN_EMPTY_RETURN`: `InQty` on Van RVD (increases empty stock onboard)
- **Evening Unloading (Shift Settlement)**:
  - `VAN_UNLOAD_FULL`: `OutQty` on Van RVD, returned to Godown
  - `VAN_UNLOAD_EMPTY`: `OutQty` on Van RVD, returned to Godown
- **Inter-Godown Transfers**:
  - `GODOWN_TRANSFER_OUT`: `OutQty` from Source Godown
  - `GODOWN_TRANSFER_IN`: `InQty` to Destination Godown
- **Refinery Purchasing**:
  - `PURCHASE`: `InQty` on Godown RVD

---

## 4. Accounting & Billing Rules

1. **GST Calculation (Kerala State Code 32)**:
   - Intra-State: CGST (2.5%) + SGST (2.5%) = 5.0% total for Domestic/Commercial LPG.
   - Taxable Value = Gross Amount - Discount.
   - Tax Amount = Taxable Value * TaxRate.
   - Grand Total = Taxable Value + CGST + SGST.
2. **Double-Entry Voucher Posting**:
   - Total Debit = Total Credit strictly enforced on every voucher.
   - **Cash Sale**: Dr Cash Ledger, Cr Sales Ledger, Cr CGST Ledger, Cr SGST Ledger.
   - **Bank/UPI Sale**: Dr Bank (SBI) Ledger, Cr Sales Ledger, Cr CGST Ledger, Cr SGST Ledger.
   - **Credit Sale**: Dr Customer Account Ledger, Cr Sales Ledger, Cr CGST Ledger, Cr SGST Ledger.
   - **Split Sale**: Dr Cash Ledger (X), Dr Bank Ledger (Y), Cr Sales & Tax Ledgers (X + Y).
3. **Conservation Laws**:
   - Stock: Loaded Filled - Delivered Filled = Remaining Van Filled.
   - Cash: Opening Cash + Cash Collected - Approved Expenses = Closing Cash Handover.

---

## 5. Flutter Driver App Screen Inventory

| Screen | Route / File | Core Operations & Verification Requirements |
| :--- | :--- | :--- |
| **Login** | `login_screen.dart` | Driver login via DRV001 / staff credentials; session caching. |
| **Home / Shell** | `home_shell.dart`, `home_screen.dart` | Dashboard metrics: Filled Stock, Empty Stock, Collections, Expenses. |
| **Add Delivery** | `add_delivery_screen.dart` | Cylinder selection, unit price, Payment modes (Cash, Bank/UPI, Split). New connection bottom sheet. |
| **Collect Empty**| `collect_empty_screen.dart` | Collecting empty cylinders with or without simultaneous sale. |
| **Stock Status** | `stock_screen.dart` | Breakdown of van stock by cylinder SKU (12KG, 17KG, 19KG, etc.). |
| **Orders** | `orders_screen.dart` | View pending customer delivery orders assigned to driver. |
| **Success** | `success_screen.dart` | Sale completion screen displaying invoice summary and split payments. |
| **Profile** | `profile_screen.dart` | Driver information, active vehicle, route, and logout button. |
| **Admin** | `admin_screen.dart` | Configuration and diagnostic settings for technical team. |

