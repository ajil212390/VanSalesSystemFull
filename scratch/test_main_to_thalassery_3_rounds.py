import os, sys, django
from decimal import Decimal
from datetime import date, timedelta

sys.path.insert(0, 'd:/FUTUREGASBACKEND')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import transaction
from django.db.models import Sum, Q
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, force_authenticate

from core.models import (
    Godown, RouteVehicleDriver, Route, Vehicle, Driver,
    Product, Unit, DeliveryNote, DeliveryNoteLine,
    ReceiptNote, ReceiptNoteLine, Sales, SalesLine,
    StockMovement, Ledger, Voucher, VoucherLine
)
from core.views import EndRouteDriverViewSet, ReceiptNoteViewSet

User = get_user_model()

def run_multi_depot_3_rounds():
    print("=" * 80)
    print("  FUTURE GAS ERP: 3-ROUND END-TO-END MULTI-DEPOT OPERATIONAL VERIFICATION")
    print("  Scenario: Main Godown -> Van Trip -> End Allocation -> Send to Thalassery Godown -> Receive")
    print("=" * 80)

    admin_user = User.objects.first()
    factory = APIRequestFactory()

    # Godowns
    main_godown = Godown.objects.filter(GodownId=1).first() or Godown.objects.filter(IsCentral=True).first()
    thalassery_godown = Godown.objects.filter(GodownId=2).first() or Godown.objects.filter(GodownName__icontains='Thalassery').first()

    assert main_godown, "Main Godown (Godown 1) not found!"
    assert thalassery_godown, "Thalassery Godown (Godown 2) not found!"

    # Products & Units
    product = Product.objects.filter(CompanyId=1).first()
    assert product, "Test product not found!"
    unit = product.Unit or Unit.objects.first()

    # Customers
    cust_cash = Ledger.objects.filter(CompanyId=1, Group__GroupName__icontains='Debtor').first()
    cust_credit = Ledger.objects.filter(CompanyId=1, Group__GroupName__icontains='Debtor').last()
    assert cust_cash and cust_credit, "Debtor ledgers not found!"

    # Route Vehicle Driver for Van
    van_rvd = RouteVehicleDriver.objects.filter(
        CompanyId=1,
        IsActive=True
    ).exclude(RouteVehicleDriverId__in=[main_godown.RouteVehicleDriver_id, thalassery_godown.RouteVehicleDriver_id]).first()

    if not van_rvd:
        route = Route.objects.first()
        veh = Vehicle.objects.first()
        drv = Driver.objects.first()
        van_rvd = RouteVehicleDriver.objects.create(
            CompanyId=1, Route=route, Vehicle=veh, Driver=drv, IsActive=True
        )

    # Clean up any leftover test data
    DeliveryNote.objects.filter(DeliveryNoteNo__startswith='DN-TEST-').delete()
    DeliveryNote.objects.filter(DeliveryNoteNo__startswith='TDN-').delete()
    ReceiptNote.objects.filter(ReceiptNoteNo__startswith='RN-').delete()
    Sales.objects.filter(SalesNo__startswith='SAL-R').delete()
    Voucher.objects.filter(VoucherNo__icontains='SAL-R').delete()
    StockMovement.objects.filter(TransactionNo__startswith='DN-TEST-').delete()
    StockMovement.objects.filter(TransactionNo__startswith='SAL-R').delete()
    StockMovement.objects.filter(TransactionNo__startswith='ERD-').delete()
    StockMovement.objects.filter(TransactionNo__startswith='RN-').delete()
    StockMovement.objects.filter(Narration__icontains='Shift Return').delete()

    print(f"[*] Main Godown: {main_godown.GodownName} (ID: {main_godown.GodownId}, RVD: {main_godown.RouteVehicleDriver_id})")
    print(f"[*] Thalassery Godown: {thalassery_godown.GodownName} (ID: {thalassery_godown.GodownId}, RVD: {thalassery_godown.RouteVehicleDriver_id})")
    print(f"[*] Delivery Van Allocation: RVD {van_rvd.RouteVehicleDriverId} ({van_rvd.Vehicle.VehicleNumber if van_rvd.Vehicle else 'Van'} - {van_rvd.Driver.DriverName if van_rvd.Driver else 'Driver'})")
    print(f"[*] Test Cylinder: {product.ProductName} (ID: {product.ProductId}, Unit: {unit.UnitName if unit else 'Cyl'})")
    print("-" * 80)

    def get_stock(rvd_id, prod_id):
        # Calculate full stock
        full_in = StockMovement.objects.filter(
            RouteVehicleDriverId=rvd_id, Product_id=prod_id, TransactionType__in=['DELIVERY_NOTE', 'PURCHASE', 'GODOWN_RETURN_FULL', 'TRANSFER_IN']
        ).aggregate(s=Sum('InQty'))['s'] or Decimal('0.00')
        full_out = StockMovement.objects.filter(
            RouteVehicleDriverId=rvd_id, Product_id=prod_id, TransactionType__in=['DELIVERY_NOTE', 'VAN_SALE', 'VAN_UNLOAD_FULL', 'TRANSFER_OUT']
        ).aggregate(s=Sum('OutQty'))['s'] or Decimal('0.00')

        # Calculate empty stock
        empty_in = StockMovement.objects.filter(
            RouteVehicleDriverId=rvd_id, Product_id=prod_id, TransactionType__in=['VAN_EMPTY_RETURN', 'GODOWN_RETURN_EMPTY']
        ).aggregate(s=Sum('InQty'))['s'] or Decimal('0.00')
        empty_out = StockMovement.objects.filter(
            RouteVehicleDriverId=rvd_id, Product_id=prod_id, TransactionType__in=['VAN_UNLOAD_EMPTY', 'SUPPLIER_REFILL_OUT']
        ).aggregate(s=Sum('OutQty'))['s'] or Decimal('0.00')

        return {
            'full': full_in - full_out,
            'empty': empty_in - empty_out
        }

    erd_view = EndRouteDriverViewSet.as_view({'post': 'settle'})
    rn_view = ReceiptNoteViewSet.as_view({'post': 'process_receipt_note'})

    rounds_passed = 0

    for round_num in range(1, 4):
        print(f"\n>>> EXECUTING ROUND {round_num} / 3 <<<")
        shift_date = date.today() + timedelta(days=round_num)

        init_main = get_stock(main_godown.RouteVehicleDriver_id, product.ProductId)
        init_thal = get_stock(thalassery_godown.RouteVehicleDriver_id, product.ProductId)
        init_van = get_stock(van_rvd.RouteVehicleDriverId, product.ProductId)

        print(f"  [Baseline] Main Godown: Full={init_main['full']}, Empty={init_main['empty']}")
        print(f"  [Baseline] Thalassery Godown: Full={init_thal['full']}, Empty={init_thal['empty']}")
        print(f"  [Baseline] Van Stock: Full={init_van['full']}, Empty={init_van['empty']}")

        load_qty = Decimal('50.00')
        sale1_qty = Decimal('20.00')
        sale2_qty = Decimal('10.00')
        cyl_rate = product.SalesPrice or Decimal('1800.00')

        # Step 1: Dispatch Van from Main Godown
        with transaction.atomic():
            dn_no = f"DN-TEST-R{round_num}-{int(shift_date.strftime('%Y%m%d'))}"
            dn = DeliveryNote.objects.create(
                DeliveryNoteNo=dn_no,
                DeliveryDate=shift_date,
                RouteVehicleDriver=van_rvd,
                CompanyId=1,
                GodownId=main_godown.GodownId,
                CreatedById=admin_user.UserId if admin_user else 1,
                Remarks=f"Round {round_num} Dispatch to Van from {main_godown.GodownName}",
                Status='LOADED'
            )
            dnl = DeliveryNoteLine.objects.create(
                DeliveryNote=dn,
                Product=product,
                Unit=unit,
                Quantity=load_qty,
                Rate=cyl_rate,
                Amount=load_qty * cyl_rate
            )
            # Main Godown Out
            StockMovement.objects.create(
                CompanyId=1, Product=product, Unit=unit,
                RouteVehicleDriverId=main_godown.RouteVehicleDriver_id,
                TransactionType='DELIVERY_NOTE', ReferenceId=dn.DeliveryNoteId, ReferenceLineId=dnl.DeliveryNoteLineId,
                TransactionNo=dn.DeliveryNoteNo, TransactionDate=shift_date,
                InQty=Decimal('0.00'), OutQty=load_qty,
                Narration=f"Van Load from {main_godown.GodownName}"
            )
            # Van In
            StockMovement.objects.create(
                CompanyId=1, Product=product, Unit=unit,
                RouteVehicleDriverId=van_rvd.RouteVehicleDriverId,
                TransactionType='DELIVERY_NOTE', ReferenceId=dn.DeliveryNoteId, ReferenceLineId=dnl.DeliveryNoteLineId,
                TransactionNo=dn.DeliveryNoteNo, TransactionDate=shift_date,
                InQty=load_qty, OutQty=Decimal('0.00'),
                Narration=f"Loaded into Van: {dn.DeliveryNoteNo}"
            )

        print(f"  [Step 1] Van loaded with {int(load_qty)} filled cylinders from {main_godown.GodownName} ({dn_no})")

        # Step 2: Driver delivers sales along the route
        with transaction.atomic():
            # Sale 1: Cash sale (20 full delivered, 20 empties collected, cash paid)
            s1_no = f"SAL-R{round_num}-001"
            sale1 = Sales.objects.create(
                SalesNo=s1_no,
                SalesDate=shift_date,
                RouteVehicleDriver=van_rvd,
                CustomerLedger=cust_cash,
                PaymentMethod='Cash',
                GrandTotal=sale1_qty * cyl_rate,
                PaidAmount=sale1_qty * cyl_rate,
                TotalDeliveredQty=sale1_qty,
                TotalEmptyQty=sale1_qty,
                CompanyId=1,
                Status='LIVE',
                IsApproved=False
            )
            SalesLine.objects.create(
                Sales=sale1, Product=product, Unit=unit,
                Quantity=sale1_qty, SalesPrice=cyl_rate, Total=sale1_qty * cyl_rate,
                EmptyQuantity=sale1_qty, LineNo=1
            )
            StockMovement.objects.create(
                CompanyId=1, Product=product, Unit=unit,
                RouteVehicleDriverId=van_rvd.RouteVehicleDriverId,
                TransactionType='VAN_SALE', ReferenceId=sale1.SalesId,
                TransactionNo=s1_no, TransactionDate=shift_date,
                InQty=Decimal('0.00'), OutQty=sale1_qty,
                Narration=f"Delivery to {cust_cash.LedgerName}"
            )
            StockMovement.objects.create(
                CompanyId=1, Product=product, Unit=unit,
                RouteVehicleDriverId=van_rvd.RouteVehicleDriverId,
                TransactionType='VAN_EMPTY_RETURN', ReferenceId=sale1.SalesId,
                TransactionNo=s1_no, TransactionDate=shift_date,
                InQty=sale1_qty, OutQty=Decimal('0.00'),
                Narration=f"Customer empty cylinder return: {cust_cash.LedgerName}"
            )

            # Sale 2: Credit sale (10 full delivered, 10 empties collected, unpaid balance)
            s2_no = f"SAL-R{round_num}-002"
            sale2 = Sales.objects.create(
                SalesNo=s2_no,
                SalesDate=shift_date,
                RouteVehicleDriver=van_rvd,
                CustomerLedger=cust_credit,
                PaymentMethod='Credit',
                GrandTotal=sale2_qty * cyl_rate,
                PaidAmount=Decimal('0.00'),
                TotalDeliveredQty=sale2_qty,
                TotalEmptyQty=sale2_qty,
                CompanyId=1,
                Status='LIVE',
                IsApproved=False
            )
            SalesLine.objects.create(
                Sales=sale2, Product=product, Unit=unit,
                Quantity=sale2_qty, SalesPrice=cyl_rate, Total=sale2_qty * cyl_rate,
                EmptyQuantity=sale2_qty, LineNo=1
            )
            StockMovement.objects.create(
                CompanyId=1, Product=product, Unit=unit,
                RouteVehicleDriverId=van_rvd.RouteVehicleDriverId,
                TransactionType='VAN_SALE', ReferenceId=sale2.SalesId,
                TransactionNo=s2_no, TransactionDate=shift_date,
                InQty=Decimal('0.00'), OutQty=sale2_qty,
                Narration=f"Delivery to {cust_credit.LedgerName}"
            )
            StockMovement.objects.create(
                CompanyId=1, Product=product, Unit=unit,
                RouteVehicleDriverId=van_rvd.RouteVehicleDriverId,
                TransactionType='VAN_EMPTY_RETURN', ReferenceId=sale2.SalesId,
                TransactionNo=s2_no, TransactionDate=shift_date,
                InQty=sale2_qty, OutQty=Decimal('0.00'),
                Narration=f"Customer empty cylinder return: {cust_credit.LedgerName}"
            )

        cash_coll = sale1_qty * cyl_rate
        print(f"  [Step 2] Driver delivered 30 fulls, collected 30 empties, received ₹{cash_coll:,.2f} Cash")

        # Step 3: Driver Submits End Allocation at Thalassery
        dn.Status = 'PENDING_APPROVAL'
        dn.save(update_fields=['Status'])
        print(f"  [Step 3] Driver arrived at Thalassery & submitted End Allocation ({dn_no} -> PENDING_APPROVAL)")

        # Step 4: Manager Reviews on Web App & clicks "Send to Thalassery Godown"
        req = factory.post(f'/api/end-route-driver/{dn.DeliveryNoteId}/settle/', {
            'godown_id': thalassery_godown.GodownId
        }, format='json')
        force_authenticate(req, user=admin_user)
        resp = erd_view(req, pk=dn.DeliveryNoteId)
        assert resp.status_code == 200, f"Settle failed: {resp.data}"

        # Verify cross-depot ReceiptNote generated
        created_rn = ReceiptNote.objects.filter(
            CompanyId=1,
            GodownId=thalassery_godown.GodownId,
            SourceGodownId=main_godown.GodownId,
            Status='RECEIPT_PENDING'
        ).order_by('-ReceiptNoteId').first()
        assert created_rn, "Cross-depot ReceiptNote was not generated!"

        print(f"  [Step 4] Manager settled shift & routed to Thalassery: Created Pending Receipt Note {created_rn.ReceiptNoteNo}")
        print(f"          Remarks: {created_rn.Remarks}")

        # Step 5: Thalassery Godown Manager Receives & Accepts into Godown
        req_rcv = factory.post('/api/receipt-notes/process_receipt_note/', {
            'receipt_note_id': created_rn.ReceiptNoteId,
            'godown_id': thalassery_godown.GodownId
        }, format='json')
        force_authenticate(req_rcv, user=admin_user)
        resp_rcv = rn_view(req_rcv)
        assert resp_rcv.status_code == 200, f"Receive failed: {resp_rcv.data}"

        created_rn.refresh_from_db()
        assert created_rn.Status == 'SETTLED', f"Receipt note status is {created_rn.Status}, expected SETTLED"
        print(f"  [Step 5] Thalassery Godown Manager verified & accepted: {created_rn.ReceiptNoteNo} -> SETTLED")

        # Step 6: Verify Stock and Accounting Reconciliation
        fin_main = get_stock(main_godown.RouteVehicleDriver_id, product.ProductId)
        fin_thal = get_stock(thalassery_godown.RouteVehicleDriver_id, product.ProductId)
        fin_van = get_stock(van_rvd.RouteVehicleDriverId, product.ProductId)

        print(f"  [Verification - Stock]")
        print(f"    Van Stock: Full={fin_van['full']} (Expected 0), Empty={fin_van['empty']} (Expected 0)")
        print(f"    Main Godown Net: Full Change={fin_main['full'] - init_main['full']} (Expected -50)")
        print(f"    Thalassery Net: Full Change=+{fin_thal['full'] - init_thal['full']} (Expected +20), Empty Change=+{fin_thal['empty'] - init_thal['empty']} (Expected +30)")

        assert fin_van['full'] == 0, f"Van full stock not cleared: {fin_van['full']}"
        assert fin_van['empty'] == 0, f"Van empty stock not cleared: {fin_van['empty']}"
        assert (fin_main['full'] - init_main['full']) == -load_qty, f"Main godown full mismatch"
        assert (fin_thal['full'] - init_thal['full']) == (load_qty - sale1_qty - sale2_qty), f"Thalassery full mismatch"
        assert (fin_thal['empty'] - init_thal['empty']) == (sale1_qty + sale2_qty), f"Thalassery empty mismatch"

        # Check General Ledger Balance
        total_dr = VoucherLine.objects.filter(Voucher__CompanyId=1).aggregate(s=Sum('DebitAmount'))['s'] or Decimal('0.00')
        total_cr = VoucherLine.objects.filter(Voucher__CompanyId=1).aggregate(s=Sum('CreditAmount'))['s'] or Decimal('0.00')
        discrepancy = abs(total_dr - total_cr)
        print(f"  [Verification - Accounting]")
        print(f"    Total Dr: ₹{total_dr:,.2f} == Total Cr: ₹{total_cr:,.2f} (Discrepancy: ₹{discrepancy:,.2f})")
        assert discrepancy == Decimal('0.00'), f"General Ledger Imbalance detected: ₹{discrepancy}"

        rounds_passed += 1
        print(f"  >>> ROUND {round_num} PASSED 100% PERFECTLY! <<<\n")

    print("=" * 80)
    print(f"  TEST COMPLETE: {rounds_passed}/3 ROUNDS PASSED WITH 100% ACCURACY & ZERO DISCREPANCY!")
    print("=" * 80)

if __name__ == '__main__':
    run_multi_depot_3_rounds()
