import os
import sys
from decimal import Decimal

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

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

def run_opening_balance_test():
    print("=========================================================================")
    print("   END-TO-END AUDIT WITH OPENING BALANCES, VAN OPS & TRIAL BALANCE       ")
    print("=========================================================================\n")

    user = get_user_model().objects.filter(Username='admin').first() or get_user_model().objects.first()
    company_id = user.CompanyId or 1
    print(f"Executing Audit with User: {user.Username} (ID: {user.UserId}, Company: {company_id})")

    # -------------------------------------------------------------
    # PHASE 0: DATABASE TRANSACTIONAL RESET
    # -------------------------------------------------------------
    print("\n--- PHASE 0: RESET TRANSACTION TABLES ---")
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

    # Clear opening balances on all ledgers first
    Ledger.objects.all().update(OpeningBalance=Decimal('0.00'), OpeningBalanceType='DR')
    sync_ledger_balances()

    # -------------------------------------------------------------
    # PHASE 1: SETUP BALANCED OPENING BALANCES & OPENING BILLS
    # -------------------------------------------------------------
    print("\n--- PHASE 1: SETUP BALANCED OPENING BALANCES & BILLS ---")
    
    # 1. Partner's Capital Account (Group 2)
    capital_led = Ledger.objects.filter(Group_id=2).first()
    if not capital_led:
        capital_led = Ledger.objects.create(
            LedgerName="Partner's Capital Account", Group_id=2,
            IsActive=True, CompanyId=company_id
        )

    # 2. Customer-1 (Ledger 60) -> ₹2,000.00 Dr (Matches user handwritten sketch: Previous Bill pending = 2000)
    cust1 = Ledger.objects.get(LedgerId=60)
    cust1.OpeningBalance = Decimal('2000.00')
    cust1.OpeningBalanceType = 'DR'
    cust1.save(update_fields=['OpeningBalance', 'OpeningBalanceType'])
    LedgerLine.objects.create(
        Ledger=cust1, BillNo="OPENING-CUST-1", BillDate="2026-11-01",
        Amount=Decimal('2000.00'), Narration="Previous Month Pending Debt",
        CompanyId=company_id
    )

    # 3. Customer-2 (Ledger 61) -> ₹1,000.00 Dr
    cust2 = Ledger.objects.get(LedgerId=61)
    cust2.OpeningBalance = Decimal('1000.00')
    cust2.OpeningBalanceType = 'DR'
    cust2.save(update_fields=['OpeningBalance', 'OpeningBalanceType'])
    LedgerLine.objects.create(
        Ledger=cust2, BillNo="OPENING-CUST-2", BillDate="2026-11-01",
        Amount=Decimal('1000.00'), Narration="Opening Balance",
        CompanyId=company_id
    )

    # 4. Super Gas Supplier (Ledger 63) -> ₹15,000.00 Cr (Unpaid past bills)
    super_gas = Ledger.objects.get(LedgerId=63)
    super_gas.OpeningBalance = Decimal('15000.00')
    super_gas.OpeningBalanceType = 'CR'
    super_gas.save(update_fields=['OpeningBalance', 'OpeningBalanceType'])
    LedgerLine.objects.create(
        Ledger=super_gas, BillNo="OPENING-SG-01", BillDate="2026-10-25",
        Amount=Decimal('15000.00'), Narration="Past Unpaid Gas Supply",
        CompanyId=company_id
    )

    # 5. SBI Bank (Ledger 56) -> ₹50,000.00 Dr
    sbi = Ledger.objects.get(LedgerId=56)
    sbi.OpeningBalance = Decimal('50000.00')
    sbi.OpeningBalanceType = 'DR'
    sbi.save(update_fields=['OpeningBalance', 'OpeningBalanceType'])

    # 6. Cash in Hand (Ledger 24) -> ₹10,000.00 Dr
    cash = Ledger.objects.get(LedgerId=24)
    cash.OpeningBalance = Decimal('10000.00')
    cash.OpeningBalanceType = 'DR'
    cash.save(update_fields=['OpeningBalance', 'OpeningBalanceType'])

    # 7. Balancing Capital Account:
    # Debits = Cust1 (2000) + Cust2 (1000) + SBI (50000) + Cash (10000) = ₹63,000 Dr
    # Credits = Super Gas (15000) -> Net Capital = 63,000 - 15,000 = ₹48,000 Cr
    capital_led.OpeningBalance = Decimal('48000.00')
    capital_led.OpeningBalanceType = 'CR'
    capital_led.save(update_fields=['OpeningBalance', 'OpeningBalanceType'])

    sync_ledger_balances()

    total_op_dr = sum(Decimal(str(l.OpeningBalance or 0)) for l in Ledger.objects.filter(OpeningBalanceType='DR'))
    total_op_cr = sum(Decimal(str(l.OpeningBalance or 0)) for l in Ledger.objects.filter(OpeningBalanceType='CR'))
    print(f"  Total Opening Debits:  ₹{total_op_dr:,.2f}")
    print(f"  Total Opening Credits: ₹{total_op_cr:,.2f}")
    assert total_op_dr == total_op_cr, f"Opening balance imbalance: Dr={total_op_dr}, Cr={total_op_cr}"
    print("  ✅ Opening Trial Balance is 100% Balanced (Dr == Cr)!")

    # -------------------------------------------------------------
    # PHASE 2: VERIFY PENDING BILLS API & PAY SUPPLIER OPENING BILL
    # -------------------------------------------------------------
    print("\n--- PHASE 2: PAY SUPPLIER OPENING BILL VIA SBI BANK ---")
    pay_view = PaymentViewSet.as_view({'get': 'pending_bills', 'post': 'create'})
    req = factory.get(f'/api/payments/pending-bills/?party_id={super_gas.LedgerId}')
    force_authenticate(req, user=user)
    pb_res = pay_view(req)
    assert len(pb_res.data) >= 1, f"Expected opening bill for Super Gas, got {pb_res.data}"
    sg_bill = pb_res.data[0]
    print(f"  Super Gas Opening Bill: Ref={sg_bill['BillReference']}, Amount={sg_bill['BillAmount']}, Pending={sg_bill['PendingAmount']}, Type={sg_bill['BillType']}")
    assert sg_bill['BillType'] == 'OPENING'
    assert sg_bill['PendingAmount'] == 15000.0

    # Pay ₹15,000 against OPENING bill via SBI Bank
    pay_payload = {
        "PartyLedgerId": super_gas.LedgerId,
        "Amount": "15000.00",
        "Narration": "Settlement of opening supplier liability via SBI",
        "lines": [{"LineNo": 1, "PaymentMode": "Bank", "LedgerId": 56, "Amount": "15000.00"}],
        "allocations": [{"BillReference": sg_bill['BillReference'], "BillType": "OPENING", "BillDate": sg_bill['BillDate'], "BillAmount": 15000.0, "AllocatedAmount": "15000.00"}]
    }
    req = factory.post('/api/payments/', pay_payload, format='json')
    force_authenticate(req, user=user)
    p_res = pay_view(req)
    assert p_res.status_code == 201, f"Payment failed: {p_res.data}"

    sync_ledger_balances()
    super_gas.refresh_from_db()
    sbi.refresh_from_db()
    print(f"  Super Gas balance after payment: {super_gas.CurrentBalance} (Expected: 0.00)")
    print(f"  SBI Bank balance after payment:   {sbi.CurrentBalance} Dr (Expected: 35000.00)")
    assert super_gas.CurrentBalance == Decimal('0.00'), f"Super gas expected 0.00, got {super_gas.CurrentBalance}"
    assert sbi.CurrentBalance == Decimal('35000.00'), f"SBI expected 35000.00, got {sbi.CurrentBalance}"

    # -------------------------------------------------------------
    # PHASE 3: PURCHASE CYLINDERS TO GODOWN
    # -------------------------------------------------------------
    print("\n--- PHASE 3: PURCHASE GODOWN STOCK ---")
    kerala_sup = Ledger.objects.get(LedgerId=64)
    p17 = Product.objects.filter(ProductName__icontains='17KG').first()
    p12 = Product.objects.filter(ProductName__icontains='12KG').first()

    purch_view = PurchaseViewSet.as_view({'post': 'create'})
    p_payload = {
        "SupplierLedgerId": kerala_sup.LedgerId,
        "PurchaseDate": "2026-11-06",
        "InvoiceNo": "INV-IOCL-201",
        "SubTotal": "50000.00", "TaxAmount": "9000.00", "CGSTAmount": "4500.00", "SGSTAmount": "4500.00",
        "GrandTotal": "59000.00",
        "lines": [
            {"ProductId": p17.ProductId, "ProductName": p17.ProductName, "UnitId": p17.Unit_id or 1, "Quantity": 50, "Rate": "800.00", "TaxableAmount": "40000.00", "TaxPercent": "18.00", "TaxAmount": "7200.00", "Total": "47200.00"},
            {"ProductId": p12.ProductId, "ProductName": p12.ProductName, "UnitId": p12.Unit_id or 1, "Quantity": 20, "Rate": "500.00", "TaxableAmount": "10000.00", "TaxPercent": "18.00", "TaxAmount": "1800.00", "Total": "11800.00"}
        ]
    }
    req = factory.post('/api/purchases/', p_payload, format='json')
    force_authenticate(req, user=user)
    purch_res = purch_view(req)
    assert purch_res.status_code == 201, f"Purchase failed: {purch_res.data}"
    print("  Purchase 50 × 17KG + 20 × 12KG completed into Godown.")

    # -------------------------------------------------------------
    # PHASE 4: MORNING VAN ALLOCATION (LOADED)
    # -------------------------------------------------------------
    print("\n--- PHASE 4: MORNING VAN ALLOCATION ---")
    rvd = RouteVehicleDriver.objects.get(RouteVehicleDriverId=11)
    dn_create = DeliveryNoteViewSet.as_view({'post': 'create'})
    dn_van_stock = DeliveryNoteViewSet.as_view({'get': 'van_stock'})

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
    dn_res = dn_create(req)
    assert dn_res.status_code == 201, f"DN failed: {dn_res.data}"
    dn_id = dn_res.data['DeliveryNoteId']
    print(f"  DeliveryNote #{dn_res.data['DeliveryNoteNo']} (ID: {dn_id}) created. Van Stock: 10 × 17KG, 5 × 12KG.")

    # -------------------------------------------------------------
    # PHASE 5: ROUTE SALES (MATCHING HANDWRITTEN PICTURE SCENARIO)
    # -------------------------------------------------------------
    print("\n--- PHASE 5: ROUTE SALES & INVOICE PDF VERIFICATION ---")
    sale_view = DeliveryNoteViewSet.as_view({'post': 'create_sale'})

    # Sale 1: Customer-1 (Previous Pending: ₹2000.00)
    # Buys 1 × 17KG @ 700.00 gross (taxable 666.67, CGST 16.67, SGST 16.66)
    # Returns 1 Empty cylinder
    # Pays ₹1000.00 Cash (Current bill 700 + 300 off previous pending!)
    req = factory.post('/api/delivery-notes/create_sale/', {
        "allocation_id": rvd.RouteVehicleDriverId,
        "customer_ledger_id": cust1.LedgerId,
        "payment_method": "Cash",
        "amount_collected": "1000.00",
        "items": [{"product_id": p17.ProductId, "qty": 1, "rate": "700.00", "empty_qty": 1}]
    }, format='json')
    force_authenticate(req, user=user)
    s1_res = sale_view(req)
    assert s1_res.status_code == 201, f"Sale 1 failed: {s1_res.data}"
    s1_id = s1_res.data['sales_id']
    s1 = Sales.objects.get(SalesId=s1_id)
    print(f"  Sale 1 Created: GrandTotal={s1.GrandTotal}, PaidAmount={s1.PaidAmount}, Deliv={s1.TotalDeliveredQty}, Empty={s1.TotalEmptyQty}")
    assert s1.GrandTotal == Decimal('700.00')
    assert s1.PaidAmount == Decimal('1000.00')
    assert s1.TotalEmptyQty == Decimal('1.00')

    # Test PDF generation for Sale 1 BEFORE settlement (Live Route Delivery)
    pdf_view = SalesViewSet.as_view({'get': 'detail_invoice_pdf'})
    req = factory.get(f'/api/sales/{s1_id}/invoice-pdf/')
    res_pdf = pdf_view(req, pk=s1_id)
    assert res_pdf.status_code == 200
    print(f"  ✅ Sale 1 Live Invoice PDF generated: 200 OK ({len(res_pdf.content)} bytes)")

    # Sale 2: Customer-2 (Previous Pending: ₹1000.00)
    # Buys 2 × 17KG @ 1200.00 = 2400.00 on CREDIT. Returns 1 Empty.
    req = factory.post('/api/delivery-notes/create_sale/', {
        "allocation_id": rvd.RouteVehicleDriverId,
        "customer_ledger_id": cust2.LedgerId,
        "payment_method": "Credit",
        "amount_collected": "0.00",
        "items": [{"product_id": p17.ProductId, "qty": 2, "rate": "1200.00", "empty_qty": 1}]
    }, format='json')
    force_authenticate(req, user=user)
    s2_res = sale_view(req)
    assert s2_res.status_code == 201, f"Sale 2 failed: {s2_res.data}"
    s2_id = s2_res.data['sales_id']
    s2 = Sales.objects.get(SalesId=s2_id)
    assert s2.GrandTotal == Decimal('2400.00')
    assert s2.PaidAmount == Decimal('0.00')
    print(f"  Sale 2 (Credit) Created: GrandTotal={s2.GrandTotal}, PaidAmount={s2.PaidAmount}")

    # Sale 3: Customer-3 (Walk-in / Direct)
    # Buys 1 × 12KG @ 950.00 via UPI. Pays 950. Returns 1 Empty.
    cust3 = Ledger.objects.get(LedgerId=62)
    req = factory.post('/api/delivery-notes/create_sale/', {
        "allocation_id": rvd.RouteVehicleDriverId,
        "customer_ledger_id": cust3.LedgerId,
        "payment_method": "UPI",
        "amount_collected": "950.00",
        "items": [{"product_id": p12.ProductId, "qty": 1, "rate": "950.00", "empty_qty": 1}]
    }, format='json')
    force_authenticate(req, user=user)
    s3_res = sale_view(req)
    assert s3_res.status_code == 201
    s3_id = s3_res.data['sales_id']
    print("  Sale 3 (UPI) Created: Bill=950, Paid=950")

    # Trip Expense: Diesel ₹500
    exp_view = DeliveryNoteViewSet.as_view({'post': 'create_expense'})
    req = factory.post('/api/delivery-notes/create_expense/', {
        "allocation_id": rvd.RouteVehicleDriverId, "category": "Fuel",
        "amount": "500.00", "payment_mode": "Cash", "notes": "Route Diesel"
    }, format='json')
    force_authenticate(req, user=user)
    exp_res = exp_view(req)
    assert exp_res.status_code == 201
    print("  Trip Expense: Diesel ₹500 Cash logged.")

    # -------------------------------------------------------------
    # PHASE 6: SHIFT END & ADMIN SETTLEMENT
    # -------------------------------------------------------------
    print("\n--- PHASE 6: SHIFT END PHYSICAL SUBMISSION & ADMIN SETTLEMENT ---")
    end_shift_view = DeliveryNoteViewSet.as_view({'post': 'end_shift'})
    req = factory.post('/api/delivery-notes/end_shift/', {
        "allocation_id": rvd.RouteVehicleDriverId, "closing_km": 15450,
        "cash_collected": "1000.00", "bank_collected": "950.00", "total_expense": "500.00",
        "remaining_cylinders": [
            {"product_id": p17.ProductId, "qty": 7, "empty_qty": 2},
            {"product_id": p12.ProductId, "qty": 4, "empty_qty": 1}
        ]
    }, format='json')
    force_authenticate(req, user=user)
    assert end_shift_view(req).status_code == 200
    print("  Driver submitted physical counts: 7 Full + 2 Empty 17KG, 4 Full + 1 Empty 12KG.")

    # Admin Settle
    settle_view = EndRouteDriverViewSet.as_view({'post': 'settle'})
    req = factory.post(f'/api/end-route-drivers/{dn_id}/settle/', {}, format='json')
    force_authenticate(req, user=user)
    assert settle_view(req, pk=dn_id).status_code == 200
    print(f"  Admin approved settlement for DeliveryNote #{dn_id}.")

    # -------------------------------------------------------------
    # PHASE 7: POST-SETTLE STOCK & ACCOUNTING VERIFICATION
    # -------------------------------------------------------------
    print("\n--- PHASE 7: POST-SETTLE STOCK & ACCOUNTS AUDIT ---")
    sync_ledger_balances()

    # 1. Van Stock MUST be 0.0 (100% unloaded to Godown)
    req = factory.get(f'/api/delivery-notes/van-stock/?allocation_id={rvd.RouteVehicleDriverId}')
    force_authenticate(req, user=user)
    van_stk_res = DeliveryNoteViewSet.as_view({'get': 'van_stock'})(req)
    for p in van_stk_res.data:
        assert p['BalanceQty'] == 0.0 and p['EmptyQty'] == 0.0, f"Van stock not 0: {p}"
    print("  ✅ Van Stock is 0.0 Full and 0.0 Empty (100% unloaded).")

    # 2. Godown Stock Reconciliation
    req = factory.get('/api/delivery-notes/godown-stock/')
    force_authenticate(req, user=user)
    g_res = DeliveryNoteViewSet.as_view({'get': 'godown_stock'})(req)
    for p in g_res.data:
        if p['ProductId'] == p17.ProductId:
            # 50 purchased - 10 loaded + 7 returned full = 47 full. Empties returned = 2.
            assert p['AvailableGodownQty'] == 47.0, f"Expected 47 full, got {p['AvailableGodownQty']}"
            assert p['EmptyGodownQty'] == 2.0, f"Expected 2 empty, got {p['EmptyGodownQty']}"
            print(f"  ✅ Godown 17KG: Filled={p['AvailableGodownQty']}, Empty={p['EmptyGodownQty']}, Total={p['TotalGodownQty']}")
        elif p['ProductId'] == p12.ProductId:
            # 20 purchased - 5 loaded + 4 returned full = 19 full. Empties returned = 1.
            assert p['AvailableGodownQty'] == 19.0, f"Expected 19 full, got {p['AvailableGodownQty']}"
            assert p['EmptyGodownQty'] == 1.0, f"Expected 1 empty, got {p['EmptyGodownQty']}"
            print(f"  ✅ Godown 12KG: Filled={p['AvailableGodownQty']}, Empty={p['EmptyGodownQty']}, Total={p['TotalGodownQty']}")

    # 3. Customer Ledger Balances
    cust1.refresh_from_db()
    cust2.refresh_from_db()
    cust3.refresh_from_db()
    cash.refresh_from_db()
    sbi.refresh_from_db()

    print(f"\n  Customer 1 Bal: {cust1.CurrentBalance} Dr (Expected: 1700.00 Dr [2000 + 700 - 1000])")
    print(f"  Customer 2 Bal: {cust2.CurrentBalance} Dr (Expected: 3400.00 Dr [1000 + 2400])")
    print(f"  Cash in Hand:   {cash.CurrentBalance} Dr (Expected: 10500.00 Dr [10000 + 1000 - 500])")
    print(f"  SBI Bank:       {sbi.CurrentBalance} Dr (Expected: 35950.00 Dr [50000 - 15000 + 950])")

    assert cust1.CurrentBalance == Decimal('1700.00'), f"Customer 1 expected 1700.00, got {cust1.CurrentBalance}"
    assert cust2.CurrentBalance == Decimal('3400.00'), f"Customer 2 expected 3400.00, got {cust2.CurrentBalance}"
    assert cash.CurrentBalance == Decimal('10500.00'), f"Cash expected 10500.00, got {cash.CurrentBalance}"
    assert sbi.CurrentBalance == Decimal('35950.00'), f"SBI expected 35950.00, got {sbi.CurrentBalance}"
    print("  ✅ All Balances with Opening Balances mathematically accurate!")

    # 4. Re-verify Invoice PDF for Customer 1 after Settlement
    req = factory.get(f'/api/sales/{s1_id}/invoice-pdf/')
    res_pdf = pdf_view(req, pk=s1_id)
    assert res_pdf.status_code == 200
    print(f"  ✅ Sale 1 Settled Invoice PDF generated: 200 OK ({len(res_pdf.content)} bytes)")

    # -------------------------------------------------------------
    # PHASE 8: CUSTOMER RECEIPT AGAINST REMAINING BALANCE
    # -------------------------------------------------------------
    print("\n--- PHASE 8: CUSTOMER 1 RECEIPT VIA SBI BANK ---")
    # Customer 1 pays remaining ₹1,700 via Bank
    rec_payload = {
        "PartyLedgerId": cust1.LedgerId,
        "Amount": "1700.00",
        "Narration": "Final clearing of Customer-1 account via SBI",
        "lines": [{"LineNo": 1, "PaymentMode": "Bank", "LedgerId": 56, "Amount": "1700.00"}],
        "allocations": [{"BillReference": "OPENING-CUST-1", "BillType": "OPENING", "BillDate": "2026-11-01", "BillAmount": 2000.0, "AllocatedAmount": "1700.00"}]
    }
    req = factory.post('/api/payments/', rec_payload, format='json')
    force_authenticate(req, user=user)
    rec_res = pay_view(req)
    assert rec_res.status_code == 201, f"Receipt failed: {rec_res.data}"

    sync_ledger_balances()
    cust1.refresh_from_db()
    sbi.refresh_from_db()
    print(f"  Customer 1 closing balance after receipt: {cust1.CurrentBalance} (Expected: 0.00)")
    print(f"  SBI Bank balance after receipt:           {sbi.CurrentBalance} Dr (Expected: 37650.00)")
    assert cust1.CurrentBalance == Decimal('0.00')
    assert sbi.CurrentBalance == Decimal('37650.00')
    print("  ✅ Customer-1 account completely cleared to ₹0.00.")

    # -------------------------------------------------------------
    # PHASE 9: GLOBAL TRIAL BALANCE EQUALITY AUDIT
    # -------------------------------------------------------------
    print("\n--- PHASE 9: GLOBAL CLOSING TRIAL BALANCE EQUALITY ---")
    sync_ledger_balances()

    total_dr_bal = sum(l.CurrentBalance for l in Ledger.objects.filter(CurrentBalance__gt=0))
    total_cr_bal = sum(abs(l.CurrentBalance) for l in Ledger.objects.filter(CurrentBalance__lt=0))
    diff = total_dr_bal - total_cr_bal

    print(f"  Total Closing Debit Balances:  ₹{total_dr_bal:,.2f}")
    print(f"  Total Closing Credit Balances: ₹{total_cr_bal:,.2f}")
    print(f"  Difference (Delta):            ₹{diff:,.2f}")

    assert abs(diff) == Decimal('0.00'), f"Trial Balance unequal! Diff={diff}"
    print("\n=========================================================================")
    print(" >>> 100% MATHEMATICAL PRECISION WITH OPENING BALANCES (Delta = 0.00) <<< ")
    print("=========================================================================")
    return 0

if __name__ == '__main__':
    sys.exit(run_opening_balance_test())
