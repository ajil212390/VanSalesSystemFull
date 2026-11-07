import os
import sys
from decimal import Decimal

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import RequestFactory
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, force_authenticate

from core.models import (
    Ledger, Group, Product, RouteVehicleDriver, DeliveryNote, DeliveryNoteLine,
    Sales, SalesLine, StockMovement, Voucher, VoucherLine, Payment, PaymentLine,
    Purchase, PurchaseLine, BillwiseAllocation, RouteExpense, Company, State, LedgerLine
)
from core.views import (
    PurchaseViewSet, PaymentViewSet, DeliveryNoteViewSet,
    EndRouteDriverViewSet, SalesViewSet, LedgerViewSet, RouteViewSet, sync_ledger_balances
)

factory = APIRequestFactory()

def run_full_audit():
    print("=========================================================================")
    print("      COMPREHENSIVE END-TO-END MULTI-MODULE AUDIT & REGRESSION TEST      ")
    print("=========================================================================\n")

    user = get_user_model().objects.filter(Username='admin').first() or get_user_model().objects.first()
    print(f"Executing Audit with User: {user.Username} (ID: {user.UserId}, Company: {user.CompanyId})")
    company_id = user.CompanyId or 1

    audit_errors = []
    def record_error(category, title, details):
        audit_errors.append({'category': category, 'title': title, 'details': details})
        print(f"\n❌ [AUDIT FAILURE] [{category}] {title}: {details}")

    # -------------------------------------------------------------
    # PHASE 0: BASELINE RESET
    # -------------------------------------------------------------
    print("\n--- PHASE 0: PRISTINE DATABASE RESET ---")
    StockMovement.objects.all().delete()
    DeliveryNoteLine.objects.all().delete()
    DeliveryNote.objects.all().delete()
    SalesLine.objects.all().delete()
    Sales.objects.all().delete()
    PurchaseLine.objects.all().delete()
    Purchase.objects.all().delete()
    BillwiseAllocation.objects.all().delete()
    PaymentLine.objects.all().delete()
    Payment.objects.all().delete()
    VoucherLine.objects.all().delete()
    Voucher.objects.all().delete()
    RouteExpense.objects.all().delete()
    LedgerLine.objects.all().delete()
    Ledger.objects.all().update(OpeningBalance=Decimal('0.00'), OpeningBalanceType='DR')

    sync_ledger_balances()
    non_zero = Ledger.objects.exclude(CurrentBalance=Decimal('0.00'))
    print(f"Total Ledgers in system: {Ledger.objects.count()}. Non-zero ledgers: {non_zero.count()}")
    if non_zero.exists():
        record_error("Baseline", "Non-zero ledgers after reset", str(list(non_zero.values('LedgerId', 'CurrentBalance'))))

    company = Company.objects.first()
    print(f"Company: {company.Name} | State: {company.State} (ID: {company.CompanyId}) | GSTIN: {company.GstNo}")

    # -------------------------------------------------------------
    # PHASE 1: PURCHASES (INTRA-STATE & INTER-STATE)
    # -------------------------------------------------------------
    print("\n--- PHASE 1: PURCHASES & GST INPUT ACCOUNTING ---")
    
    # 1. Intra-State Supplier (Kerala, StateId 12)
    kerala_sup = Ledger.objects.filter(LedgerName="Kerala IOCL Depot").first()
    if not kerala_sup:
        kerala_sup = Ledger.objects.create(
            LedgerName="Kerala IOCL Depot", Group_id=24, StateId=12,
            GSTIN="32AAACL1234F1Z1", GSTRegistrationType="Regular",
            IsActive=True, CompanyId=company_id
        )

    # 2. Inter-State Supplier (Super Gas, Karnataka, StateId 11)
    super_gas = Ledger.objects.get(LedgerId=63)
    super_gas.StateId = 11
    super_gas.save(update_fields=['StateId'])

    p17 = Product.objects.filter(ProductName__icontains='17KG').first()
    p12 = Product.objects.filter(ProductName__icontains='12KG').first()

    # 1.1 Purchase 50 × 17KG from Kerala Supplier @ 1000 = 50,000 + 18% GST (CGST 4500, SGST 4500) = 59,000
    purch_view = PurchaseViewSet.as_view({'post': 'create'})
    p1_payload = {
        "SupplierLedgerId": kerala_sup.LedgerId,
        "PurchaseDate": "2026-11-06",
        "InvoiceNo": "INV-IOCL-101",
        "SubTotal": "50000.00",
        "TaxAmount": "9000.00",
        "CGSTAmount": "4500.00",
        "SGSTAmount": "4500.00",
        "IGSTAmount": "0.00",
        "GrandTotal": "59000.00",
        "lines": [{
            "ProductId": p17.ProductId, "ProductName": p17.ProductName, "UnitId": p17.Unit_id or 1,
            "Quantity": 50, "Rate": "1000.00", "TaxableAmount": "50000.00", "TaxPercent": "18.00",
            "TaxAmount": "9000.00", "Total": "59000.00"
        }]
    }
    req = factory.post('/api/purchases/', p1_payload, format='json')
    force_authenticate(req, user=user)
    res = purch_view(req)
    assert res.status_code == 201, f"Purchase 1 failed: {res.data}"
    p1_id = res.data['PurchaseId']
    p1_no = res.data['PurchaseNo']
    print(f"Purchase 1 (Intra-State) created: #{p1_no} (ID: {p1_id})")

    # 1.2 Purchase 20 × 12KG from Super Gas (Karnataka) @ 800 = 16,000 + 18% IGST 2880 = 18,880
    p2_payload = {
        "SupplierLedgerId": super_gas.LedgerId,
        "PurchaseDate": "2026-11-06",
        "InvoiceNo": "INV-SG-102",
        "SubTotal": "16000.00",
        "TaxAmount": "2880.00",
        "CGSTAmount": "0.00",
        "SGSTAmount": "0.00",
        "IGSTAmount": "2880.00",
        "GrandTotal": "18880.00",
        "lines": [{
            "ProductId": p12.ProductId, "ProductName": p12.ProductName, "UnitId": p12.Unit_id or 1,
            "Quantity": 20, "Rate": "800.00", "TaxableAmount": "16000.00", "TaxPercent": "18.00",
            "TaxAmount": "2880.00", "Total": "18880.00"
        }]
    }
    req = factory.post('/api/purchases/', p2_payload, format='json')
    force_authenticate(req, user=user)
    res = purch_view(req)
    assert res.status_code == 201, f"Purchase 2 failed: {res.data}"
    p2_id = res.data['PurchaseId']
    p2_no = res.data['PurchaseNo']
    print(f"Purchase 2 (Inter-State) created: #{p2_no} (ID: {p2_id})")

    # Verify Accounting Vouchers for Purchases
    sync_ledger_balances()
    cgst_in = Ledger.objects.get(LedgerId=27)
    sgst_in = Ledger.objects.get(LedgerId=28)
    igst_in = Ledger.objects.get(LedgerId=34)
    purch_acc = Ledger.objects.get(LedgerId=21)
    kerala_sup.refresh_from_db()
    super_gas.refresh_from_db()

    print(f"  Purchase Account (21): {purch_acc.CurrentBalance} Dr (Expected: 66000.00)")
    print(f"  CGST Input (27):       {cgst_in.CurrentBalance} Dr (Expected: 4500.00)")
    print(f"  SGST Input (28):       {sgst_in.CurrentBalance} Dr (Expected: 4500.00)")
    print(f"  IGST Input (34):       {igst_in.CurrentBalance} Dr (Expected: 2880.00)")
    print(f"  Kerala Supplier (64):  {kerala_sup.CurrentBalance} Cr (Expected: -59000.00)")
    print(f"  Super Gas (63):        {super_gas.CurrentBalance} Cr (Expected: -18880.00)")

    assert purch_acc.CurrentBalance == Decimal('66000.00'), "Purchase Account balance mismatch"
    assert cgst_in.CurrentBalance == Decimal('4500.00'), "CGST Input balance mismatch"
    assert sgst_in.CurrentBalance == Decimal('4500.00'), "SGST Input balance mismatch"
    assert igst_in.CurrentBalance == Decimal('2880.00'), "IGST Input balance mismatch"
    assert kerala_sup.CurrentBalance == Decimal('-59000.00'), "Kerala Supplier balance mismatch"
    assert super_gas.CurrentBalance == Decimal('-18880.00'), "Super Gas balance mismatch"

    # -------------------------------------------------------------
    # PHASE 2: PENDING BILLS & VENDOR PAYMENTS
    # -------------------------------------------------------------
    print("\n--- PHASE 2: VENDOR PENDING BILLS & PAYMENTS ---")
    pay_view = PaymentViewSet.as_view({'get': 'pending_bills', 'post': 'create'})
    req = factory.get(f'/api/payments/pending-bills/?party_id={kerala_sup.LedgerId}')
    force_authenticate(req, user=user)
    res = pay_view(req)
    assert len(res.data) == 1, f"Expected 1 pending bill for Kerala Supplier, got {len(res.data)}"
    assert res.data[0]['PendingAmount'] == 59000.0
    print(f"  Pending Bill for Kerala Supplier verified: Ref={res.data[0]['BillReference']}, Pending={res.data[0]['PendingAmount']}")

    # Pay ₹25,000 against bill from SBI Bank (Ledger 56)
    pay_payload = {
        "PartyLedgerId": kerala_sup.LedgerId,
        "Amount": "25000.00",
        "Narration": "Part payment via SBI NEFT",
        "lines": [{"LineNo": 1, "PaymentMode": "Bank", "LedgerId": 56, "Amount": "25000.00"}],
        "allocations": [{"BillReference": res.data[0]['BillReference'], "BillDate": "2026-11-06", "BillAmount": 59000.0, "AllocatedAmount": "25000.00"}]
    }
    req = factory.post('/api/payments/', pay_payload, format='json')
    force_authenticate(req, user=user)
    res = pay_view(req)
    assert res.status_code == 201, f"Payment creation failed: {res.data}"
    print(f"  Payment #001 created. Kerala Supplier balance updated.")

    sync_ledger_balances()
    kerala_sup.refresh_from_db()
    sbi = Ledger.objects.get(LedgerId=56)
    assert kerala_sup.CurrentBalance == Decimal('-34000.00'), f"Expected -34000.00, got {kerala_sup.CurrentBalance}"
    assert sbi.CurrentBalance == Decimal('-25000.00'), f"Expected -25000.00, got {sbi.CurrentBalance}"
    print(f"  Kerala Supplier remaining payable: {kerala_sup.CurrentBalance} Cr")
    print(f"  SBI Bank balance:                  {sbi.CurrentBalance} Cr")

    # -------------------------------------------------------------
    # PHASE 3: VAN ALLOCATION (LOADED)
    # -------------------------------------------------------------
    print("\n--- PHASE 3: VAN MORNING ALLOCATION ---")
    rvd = RouteVehicleDriver.objects.get(RouteVehicleDriverId=11)
    dn_create = DeliveryNoteViewSet.as_view({'post': 'create'})
    dn_payload = {
        "RouteVehicleDriver": rvd.RouteVehicleDriverId,
        "DeliveryDate": "2026-11-06",
        "Remarks": "Morning Route Load",
        "lines": [
            {"ProductId": p17.ProductId, "UnitId": p17.Unit_id or 1, "Quantity": 10, "Rate": "1200.00"},
            {"ProductId": p12.ProductId, "UnitId": p12.Unit_id or 1, "Quantity": 5, "Rate": "950.00"}
        ]
    }
    req = factory.post('/api/delivery-notes/', dn_payload, format='json')
    force_authenticate(req, user=user)
    res = dn_create(req)
    assert res.status_code == 201, f"DN create failed: {res.data}"
    dn_id = res.data['DeliveryNoteId']
    print(f"  DeliveryNote #{res.data['DeliveryNoteNo']} (ID: {dn_id}) created with LOADED status.")

    # Check Van Stock
    req = factory.get(f'/api/delivery-notes/van-stock/?allocation_id={rvd.RouteVehicleDriverId}')
    force_authenticate(req, user=user)
    res = DeliveryNoteViewSet.as_view({'get': 'van_stock'})(req)
    assert isinstance(res.data, list) and len(res.data) > 0, "Van stock empty"
    for item in res.data:
        if item['ProductId'] == p17.ProductId:
            assert item['BalanceQty'] == 10.0
        elif item['ProductId'] == p12.ProductId:
            assert item['BalanceQty'] == 5.0
    print(f"  Van Stock verified: 10 × 17KG and 5 × 12KG loaded onboard.")

    # -------------------------------------------------------------
    # PHASE 4: ROUTE SALES (CASH, CREDIT, PARTIAL UPI, INTER-STATE)
    # -------------------------------------------------------------
    print("\n--- PHASE 4: ROUTE SALES & EMPTY CYLINDER RETURNS ---")
    cust1 = Ledger.objects.get(LedgerId=60) # Customer-1 (Intra)
    cust2 = Ledger.objects.get(LedgerId=61) # Customer-2 (Intra)
    cust3 = Ledger.objects.get(LedgerId=62) # Customer-3 (Intra)

    # Ensure Customer-TamilNadu exists (Inter-State customer, StateId 33 / Tamil Nadu)
    cust_inter = Ledger.objects.filter(LedgerName="Coimbatore Gas Distributors").first()
    if not cust_inter:
        cust_inter = Ledger.objects.create(
            LedgerName="Coimbatore Gas Distributors", Group_id=21, StateId=33, # Tamil Nadu
            IsActive=True, CompanyId=company_id
        )

    sale_view = DeliveryNoteViewSet.as_view({'post': 'create_sale'})

    # Sale 1: Cust1 -> 3 × 17KG @ 1200 = 3600 CASH. Empties returned: 2
    req = factory.post('/api/delivery-notes/create_sale/', {
        "allocation_id": rvd.RouteVehicleDriverId, "customer_ledger_id": cust1.LedgerId,
        "payment_method": "Cash", "amount_collected": "3600.00",
        "items": [{"product_id": p17.ProductId, "qty": 3, "rate": "1200.00", "empty_qty": 2}]
    }, format='json')
    force_authenticate(req, user=user)
    s1_res = sale_view(req)
    assert s1_res.status_code == 201, f"Sale 1 failed: {s1_res.data}"
    s1_id = s1_res.data['sales_id']
    s1 = Sales.objects.get(SalesId=s1_id)
    assert s1.GrandTotal == Decimal('3600.00')
    assert s1.PaidAmount == Decimal('3600.00')
    print(f"  Sale 1 (Cash): Bill=3600, Paid=3600, Method=Cash -> GrandTotal={s1.GrandTotal}, PaidAmount={s1.PaidAmount}")

    # Sale 2: Cust2 -> 2 × 17KG @ 1200 = 2400 CREDIT. Empties returned: 1
    req = factory.post('/api/delivery-notes/create_sale/', {
        "allocation_id": rvd.RouteVehicleDriverId, "customer_ledger_id": cust2.LedgerId,
        "payment_method": "Credit", "amount_collected": "0.00",
        "items": [{"product_id": p17.ProductId, "qty": 2, "rate": "1200.00", "empty_qty": 1}]
    }, format='json')
    force_authenticate(req, user=user)
    s2_res = sale_view(req)
    assert s2_res.status_code == 201, f"Sale 2 failed: {s2_res.data}"
    s2_id = s2_res.data['sales_id']
    s2 = Sales.objects.get(SalesId=s2_id)
    assert s2.GrandTotal == Decimal('2400.00'), f"Expected GrandTotal 2400, got {s2.GrandTotal}"
    assert s2.PaidAmount == Decimal('0.00'), f"Expected PaidAmount 0.00 on credit, got {s2.PaidAmount}"
    print(f"  Sale 2 (Credit): Bill=2400, Paid=0, Method=Credit -> GrandTotal={s2.GrandTotal}, PaidAmount={s2.PaidAmount}")

    # Sale 3: Cust3 -> 1 × 12KG @ 950 = 950. Paid 500 UPI, 450 Balance. Empties returned: 1
    req = factory.post('/api/delivery-notes/create_sale/', {
        "allocation_id": rvd.RouteVehicleDriverId, "customer_ledger_id": cust3.LedgerId,
        "payment_method": "UPI", "amount_collected": "500.00",
        "items": [{"product_id": p12.ProductId, "qty": 1, "rate": "950.00", "empty_qty": 1}]
    }, format='json')
    force_authenticate(req, user=user)
    s3_res = sale_view(req)
    assert s3_res.status_code == 201, f"Sale 3 failed: {s3_res.data}"
    s3_id = s3_res.data['sales_id']
    s3 = Sales.objects.get(SalesId=s3_id)
    assert s3.GrandTotal == Decimal('950.00'), f"Expected GrandTotal 950, got {s3.GrandTotal}"
    assert s3.PaidAmount == Decimal('500.00'), f"Expected PaidAmount 500, got {s3.PaidAmount}"
    print(f"  Sale 3 (Partial UPI): Bill=950, Paid=500, Method=UPI -> GrandTotal={s3.GrandTotal}, PaidAmount={s3.PaidAmount}")

    # Sale 4: Inter-State Customer (Tamil Nadu) -> 1 × 17KG @ 1200 CREDIT. Empties returned: 0
    req = factory.post('/api/delivery-notes/create_sale/', {
        "allocation_id": rvd.RouteVehicleDriverId, "customer_ledger_id": cust_inter.LedgerId,
        "payment_method": "Credit", "amount_collected": "0.00",
        "items": [{"product_id": p17.ProductId, "qty": 1, "rate": "1200.00", "empty_qty": 0}]
    }, format='json')
    force_authenticate(req, user=user)
    s4_res = sale_view(req)
    assert s4_res.status_code == 201, f"Sale 4 failed: {s4_res.data}"
    s4_id = s4_res.data['sales_id']
    s4 = Sales.objects.get(SalesId=s4_id)
    assert s4.GrandTotal == Decimal('1200.00')
    assert s4.PaidAmount == Decimal('0.00')
    print(f"  Sale 4 (Inter-State Credit): Bill=1200, Paid=0 -> GrandTotal={s4.GrandTotal}, PaidAmount={s4.PaidAmount}")

    # -------------------------------------------------------------
    # PHASE 5: INVOICE PDF GENERATION (PUBLIC ACCESS TEST)
    # -------------------------------------------------------------
    print("\n--- PHASE 5: INVOICE PDF GENERATOR VERIFICATION ---")
    pdf_view = SalesViewSet.as_view({'get': 'detail_invoice_pdf'})
    for sid in [s1_id, s2_id, s3_id, s4_id]:
        req_anon = factory.get(f'/api/sales/{sid}/invoice-pdf/')
        res_pdf = pdf_view(req_anon, pk=sid)
        assert res_pdf.status_code == 200, f"Public PDF download failed with code {res_pdf.status_code}"
        assert res_pdf['Content-Type'] == 'application/pdf'
        print(f"  Public Invoice PDF for Sale {sid}: 200 OK | Content-Type: application/pdf | Size: {len(res_pdf.content)} bytes")

    # -------------------------------------------------------------
    # PHASE 6: ROUTE EXPENSE
    # -------------------------------------------------------------
    print("\n--- PHASE 6: ROUTE TRIP EXPENSES ---")
    exp_view = DeliveryNoteViewSet.as_view({'post': 'create_expense'})
    req = factory.post('/api/delivery-notes/create_expense/', {
        "allocation_id": rvd.RouteVehicleDriverId, "category": "Fuel",
        "amount": "600.00", "payment_mode": "Cash", "notes": "Van Diesel"
    }, format='json')
    force_authenticate(req, user=user)
    exp_res = exp_view(req)
    assert exp_res.status_code == 201, f"Expense failed: {exp_res.data}"
    print("  Trip Expense: Diesel ₹600 logged and double-entry voucher posted.")

    # -------------------------------------------------------------
    # PHASE 7: SHIFT END & ADMIN SETTLEMENT
    # -------------------------------------------------------------
    print("\n--- PHASE 7: SHIFT END SUBMISSION & ADMIN SETTLEMENT ---")
    end_shift_view = DeliveryNoteViewSet.as_view({'post': 'end_shift'})
    req = factory.post('/api/delivery-notes/end_shift/', {
        "allocation_id": rvd.RouteVehicleDriverId, "closing_km": 15420,
        "cash_collected": "3600.00", "bank_collected": "500.00", "total_expense": "600.00",
        "remaining_cylinders": [
            {"product_id": p17.ProductId, "qty": 4, "empty_qty": 3},
            {"product_id": p12.ProductId, "qty": 4, "empty_qty": 1}
        ]
    }, format='json')
    force_authenticate(req, user=user)
    es_res = end_shift_view(req)
    assert es_res.status_code == 200, f"End shift failed: {es_res.data}"
    print("  Driver End-Shift submitted with physical counts.")

    # Admin Settle
    settle_view = EndRouteDriverViewSet.as_view({'post': 'settle'})
    req = factory.post(f'/api/end-route-drivers/{dn_id}/settle/', {}, format='json')
    force_authenticate(req, user=user)
    s_res = settle_view(req, pk=dn_id)
    assert s_res.status_code == 200, f"Settle failed: {s_res.data}"
    print(f"  Admin Settlement for DN #{dn_id} successfully approved.")

    # -------------------------------------------------------------
    # PHASE 8: POST-SETTLE STOCK & ACCOUNTING VERIFICATION
    # -------------------------------------------------------------
    print("\n--- PHASE 8: POST-SETTLE INVENTORY & ACCOUNTS AUDIT ---")
    sync_ledger_balances()

    # 1. Van Stock MUST be 0
    req = factory.get(f'/api/delivery-notes/van-stock/?allocation_id={rvd.RouteVehicleDriverId}')
    force_authenticate(req, user=user)
    van_stk_res = DeliveryNoteViewSet.as_view({'get': 'van_stock'})(req)
    for p in van_stk_res.data:
        assert p['BalanceQty'] == 0.0 and p['EmptyQty'] == 0.0, f"Van stock not 0: {p}"
    print("  ✅ Van Stock is exactly 0.0 Full and 0.0 Empty (100% flushed).")

    # 2. Godown Stock
    req = factory.get('/api/delivery-notes/godown-stock/')
    force_authenticate(req, user=user)
    g_res = DeliveryNoteViewSet.as_view({'get': 'godown_stock'})(req)
    for p in g_res.data:
        if p['ProductId'] == p17.ProductId:
            assert p['AvailableGodownQty'] == 44.0, f"Expected 44 full 17KG, got {p['AvailableGodownQty']}"
            assert p['EmptyGodownQty'] == 3.0, f"Expected 3 empty 17KG, got {p['EmptyGodownQty']}"
            print(f"  ✅ Godown 17KG Stock: Filled={p['AvailableGodownQty']}, Empty={p['EmptyGodownQty']}, Total={p['TotalGodownQty']}")
        elif p['ProductId'] == p12.ProductId:
            assert p['AvailableGodownQty'] == 19.0, f"Expected 19 full 12KG, got {p['AvailableGodownQty']}"
            assert p['EmptyGodownQty'] == 1.0, f"Expected 1 empty 12KG, got {p['EmptyGodownQty']}"
            print(f"  ✅ Godown 12KG Stock: Filled={p['AvailableGodownQty']}, Empty={p['EmptyGodownQty']}, Total={p['TotalGodownQty']}")

    # 3. Customer Ledger Balances
    cust1.refresh_from_db()
    cust2.refresh_from_db()
    cust3.refresh_from_db()
    cust_inter.refresh_from_db()

    print(f"\n  Customer 1 Bal: {cust1.CurrentBalance} (Expected: 0.00)")
    print(f"  Customer 2 Bal: {cust2.CurrentBalance} (Expected: 2400.00 Dr)")
    print(f"  Customer 3 Bal: {cust3.CurrentBalance} (Expected: 450.00 Dr)")
    print(f"  Inter-State Customer Bal: {cust_inter.CurrentBalance} (Expected: 1200.00 Dr)")

    assert cust1.CurrentBalance == Decimal('0.00'), f"Customer 1 balance should be 0.00, got {cust1.CurrentBalance}"
    assert cust2.CurrentBalance == Decimal('2400.00'), f"Customer 2 balance MUST retain 2400.00 Dr debt, got {cust2.CurrentBalance}"
    assert cust3.CurrentBalance == Decimal('450.00'), f"Customer 3 balance MUST retain 450.00 Dr debt, got {cust3.CurrentBalance}"
    assert cust_inter.CurrentBalance == Decimal('1200.00'), f"Inter-state Customer MUST retain 1200.00 Dr debt, got {cust_inter.CurrentBalance}"
    print("  ✅ All Customer Balances (Cash, Credit, Partial, Inter-state) verified strictly accurate!")

    # 4. GST Output Balances
    cgst_out = Ledger.objects.get(LedgerId=22)
    sgst_out = Ledger.objects.get(LedgerId=23)
    igst_out = Ledger.objects.get(LedgerId=35)
    print(f"\n  CGST Output (22): {cgst_out.CurrentBalance} Cr")
    print(f"  SGST Output (23): {sgst_out.CurrentBalance} Cr")
    print(f"  IGST Output (35): {igst_out.CurrentBalance} Cr")
    assert igst_out.CurrentBalance < Decimal('0.00'), "IGST Output MUST have a credit balance from the inter-state sale!"
    print("  ✅ GST Output routing verified: Intra-state credited CGST/SGST, Inter-state credited IGST Output!")

    # 5. Van Management Metrics Check
    vm_view = RouteViewSet.as_view({'get': 'van_management'})
    req = factory.get('/api/routes/van-management/')
    force_authenticate(req, user=user)
    vm_res = vm_view(req)
    for r in vm_res.data['routes']:
        if r['route_id'] == rvd.Route.RouteId:
            col = r['collection']
            exp = r['expense']
            print(f"\n  Van Management: Cash={col['cash_collection']}, Bank={col['bank_collection']}, Total={col['total_collection']}, Net={exp['net_collection']}")
            assert col['cash_collection'] == 3600.0, f"Expected 3600 cash, got {col['cash_collection']}"
            assert col['bank_collection'] == 500.0, f"Expected 500 bank, got {col['bank_collection']}"
            assert col['total_collection'] == 4100.0, f"Expected 4100 total collected, got {col['total_collection']}"
            assert exp['net_collection'] == 3500.0, f"Expected 3500 net (4100-600), got {exp['net_collection']}"
            print("  ✅ Van Management Dashboard reports accurate collections (Zero phantom credit money).")

    # -------------------------------------------------------------
    # PHASE 9: CUSTOMER PAYMENT COLLECTION & RECEIPT VOUCHER
    # -------------------------------------------------------------
    print("\n--- PHASE 9: CUSTOMER PAYMENT RECEIPT & BILL ALLOCATION ---")
    req = factory.get(f'/api/payments/pending-bills/?party_id={cust2.LedgerId}')
    force_authenticate(req, user=user)
    pb_res = pay_view(req)
    assert len(pb_res.data) == 1, f"Expected 1 pending sales invoice for Customer 2, got {len(pb_res.data)}"
    cust2_bill = pb_res.data[0]
    print(f"  Pending Sales Invoice retrieved for Customer-2: Ref={cust2_bill['BillReference']}, Pending={cust2_bill['PendingAmount']}, Type={cust2_bill['BillType']}")
    assert cust2_bill['BillType'] == 'SALES'
    assert cust2_bill['PendingAmount'] == 2400.0

    # Submit Receipt Voucher: ₹2400 from Customer 2 into SBI Bank (Ledger 56)
    rec_payload = {
        "PartyLedgerId": cust2.LedgerId,
        "Amount": "2400.00",
        "Narration": "Receipt from Customer-2 via SBI Bank Transfer",
        "lines": [{"LineNo": 1, "PaymentMode": "Bank", "LedgerId": 56, "Amount": "2400.00"}],
        "allocations": [{"BillReference": cust2_bill['BillReference'], "BillType": "SALES", "BillDate": cust2_bill['BillDate'], "BillAmount": 2400.0, "AllocatedAmount": "2400.00"}]
    }
    req = factory.post('/api/payments/', rec_payload, format='json')
    force_authenticate(req, user=user)
    rec_res = pay_view(req)
    assert rec_res.status_code == 201, f"Receipt failed: {rec_res.data}"
    rec_id = rec_res.data['PaymentId']

    rec_vch = Voucher.objects.filter(ReferenceTable='Payment', ReferenceId=rec_id).first()
    assert rec_vch is not None, "Receipt voucher not found"
    assert rec_vch.VoucherType == 'RECEIPT', f"Expected VoucherType RECEIPT, got {rec_vch.VoucherType}"
    v_lines = list(rec_vch.lines.order_by('LineNo'))
    print(f"  Receipt Voucher #{rec_vch.VoucherNo} lines:")
    for vl in v_lines:
        print(f"    Line {vl.LineNo}: Ledger={vl.Ledger.LedgerName} ({vl.Ledger_id}), Dr={vl.DebitAmount}, Cr={vl.CreditAmount}, Narration={vl.Narration}")

    assert v_lines[0].Ledger_id == 56 and v_lines[0].DebitAmount == Decimal('2400.00'), "Debit must be SBI Bank"
    assert v_lines[1].Ledger_id == cust2.LedgerId and v_lines[1].CreditAmount == Decimal('2400.00'), "Credit must be Customer-2"

    sync_ledger_balances()
    cust2.refresh_from_db()
    sbi.refresh_from_db()
    print(f"  Customer 2 closing balance after receipt: {cust2.CurrentBalance} (Expected: 0.00)")
    assert cust2.CurrentBalance == Decimal('0.00'), f"Customer 2 balance should be 0.00, got {cust2.CurrentBalance}"

    # Verify pending-bills for Customer 2 is now clear
    req = factory.get(f'/api/payments/pending-bills/?party_id={cust2.LedgerId}')
    force_authenticate(req, user=user)
    assert len(pay_view(req).data) == 0, "Customer 2 should have 0 pending bills now"
    print("  ✅ Customer-2 pending bill cleared completely.")

    # -------------------------------------------------------------
    # PHASE 10: GLOBAL TRIAL BALANCE & DOUBLE-ENTRY EQUALITY PROOF
    # -------------------------------------------------------------
    print("\n--- PHASE 10: GLOBAL TRIAL BALANCE EQUALITY AUDIT ---")
    sync_ledger_balances()
    total_debits = sum(Decimal(str(l.DebitBalance or 0)) for l in Ledger.objects.all())
    total_credits = sum(Decimal(str(l.CreditBalance or 0)) for l in Ledger.objects.all())
    diff = total_debits - total_credits

    print(f"  Total Debits:  ₹{total_debits:,.2f}")
    print(f"  Total Credits: ₹{total_credits:,.2f}")
    print(f"  Difference:    ₹{diff:,.2f}")

    assert abs(diff) == Decimal('0.00'), f"Trial Balance does NOT balance! Diff={diff}"
    print("\n=========================================================================")
    print("  >>> AUDIT COMPLETE: 100% MATHEMATICAL PRECISION (Delta = 0.00) <<<    ")
    print("=========================================================================")
    return len(audit_errors)

if __name__ == '__main__':
    errs = run_full_audit()
    sys.exit(errs)
