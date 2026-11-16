import os
import sys
import django
from decimal import Decimal
from datetime import date, datetime

# Setup Django Environment
sys.path.insert(0, os.path.abspath('.'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import transaction
from django.db.models import Sum, Q
from rest_framework.test import APIRequestFactory, force_authenticate

from core.models import (
    Godown, RouteVehicleDriver, Product, StockMovement, DeliveryNote,
    DeliveryNoteLine, Sales, SalesLine, Voucher, VoucherLine, Ledger,
    ConnectionPackage, User, Vehicle, Route, Driver
)
from core.views import (
    DeliveryNoteViewSet, EndRouteDriverViewSet
)

def run_test():
    print("=" * 75)
    print("🚀 STARTING FULL-FLEDGED STOCK MOVEMENT & MULTI-GODOWN AUDIT TEST")
    print("=" * 75)

    factory = APIRequestFactory()
    admin_user = User.objects.filter(Username='admin').first() or User.objects.first()
    assert admin_user, "No admin user found for authentication."
    company_id = getattr(admin_user, 'CompanyId', 1) or 1

    # Execute inside an atomic transaction block that will roll back at the end
    with transaction.atomic():
        savepoint = transaction.savepoint()
        try:
            # -------------------------------------------------------------
            # STEP 0: LOCATE OR SETUP TEST ENTITIES
            # -------------------------------------------------------------
            print("\n📌 STEP 0: Identifying Master Entities...")
            central_godown = Godown.objects.filter(CompanyId=company_id, IsCentral=True).first()
            if not central_godown:
                central_godown = Godown.objects.first()
            sub_godown = Godown.objects.filter(CompanyId=company_id, IsCentral=False).first()
            if not sub_godown:
                sub_godown = Godown.objects.filter(GodownId=2).first()

            print(f"   • Central Godown: {central_godown.GodownName} (ID: {central_godown.GodownId}, RVD: {central_godown.RouteVehicleDriver_id})")
            print(f"   • Sub-Godown:     {sub_godown.GodownName} (ID: {sub_godown.GodownId}, RVD: {sub_godown.RouteVehicleDriver_id})")

            # Delivery Van Allocation
            van_rvd = RouteVehicleDriver.objects.filter(
                CompanyId=company_id, IsActive=True
            ).exclude(RouteVehicleDriverId__in=[central_godown.RouteVehicleDriver_id, sub_godown.RouteVehicleDriver_id, 1]).first()
            assert van_rvd, "No active van RouteVehicleDriver found."
            print(f"   • Delivery Van:   {van_rvd.Vehicle.VehicleNumber if van_rvd.Vehicle else 'Van'} (RVD ID: {van_rvd.RouteVehicleDriverId}, Driver: {van_rvd.Driver.DriverName if van_rvd.Driver else 'Driver'})")

            # Cylinder Product
            product = Product.objects.filter(CompanyId=company_id, IsActive=True, ProductName__icontains='21KG').first()
            if not product:
                product = Product.objects.filter(CompanyId=company_id, IsActive=True).first()
            assert product, "No active product found."
            print(f"   • Test Product:   {product.ProductName} (ID: {product.ProductId}, Unit: {product.Unit_id}, Price: ₹{product.SalesPrice})")

            # Customer Ledger
            customer = Ledger.objects.filter(CompanyId=company_id, Group__GroupName__icontains='Debtor').first() or Ledger.objects.first()
            print(f"   • Test Customer:  {customer.LedgerName} (ID: {customer.LedgerId})")

            today = date.today()

            # Helper functions for querying stock
            def get_godown_stock(rvd_id, prod):
                movs = StockMovement.objects.filter(CompanyId=company_id, Product=prod, RouteVehicleDriverId=rvd_id)
                f_in = movs.filter(TransactionType__in=['PURCHASE', 'GODOWN_RETURN_FULL', 'RECEIPT_NOTE_RETURN', 'OPENING_STOCK', 'ADJUSTMENT_IN', 'GODOWN_TRANSFER_IN']).aggregate(s=Sum('InQty'))['s'] or Decimal('0.00')
                f_out = movs.filter(TransactionType__in=['DELIVERY_NOTE', 'PURCHASE_RETURN', 'ADJUSTMENT_OUT', 'DIRECT_SALE', 'VAN_SALE', 'SALE', 'GODOWN_TRANSFER_OUT']).aggregate(s=Sum('OutQty'))['s'] or Decimal('0.00')
                filled = max(Decimal('0.00'), f_in - f_out)
                e_in = movs.filter(TransactionType__in=['GODOWN_RETURN_EMPTY', 'VAN_UNLOAD_EMPTY', 'RECEIPT_NOTE_EMPTY_RETURN', 'VAN_EMPTY_RETURN', 'OPENING_EMPTY', 'ADJUSTMENT_EMPTY_IN']).aggregate(s=Sum('InQty'))['s'] or Decimal('0.00')
                e_out = movs.filter(TransactionType__in=['PURCHASE_EMPTY_RETURN', 'FACTORY_EMPTY_RETURN', 'ADJUSTMENT_EMPTY_OUT']).aggregate(s=Sum('OutQty'))['s'] or Decimal('0.00')
                empty = max(Decimal('0.00'), e_in - e_out)
                return filled, empty

            def get_van_stock(rvd_id, prod, start_dn_id):
                movs = StockMovement.objects.filter(CompanyId=company_id, Product=prod, RouteVehicleDriverId=rvd_id)
                first_sm = movs.filter(TransactionType='DELIVERY_NOTE', ReferenceId=start_dn_id).order_by('StockMovementId').first()
                if first_sm:
                    movs = movs.filter(StockMovementId__gte=first_sm.StockMovementId)
                dn_in = movs.filter(TransactionType='DELIVERY_NOTE').aggregate(s=Sum('InQty'))['s'] or Decimal('0.00')
                s_out = movs.filter(TransactionType='VAN_SALE').aggregate(s=Sum('OutQty'))['s'] or Decimal('0.00')
                u_full = movs.filter(TransactionType='VAN_UNLOAD_FULL').aggregate(s=Sum('OutQty'))['s'] or Decimal('0.00')
                bal_full = max(Decimal('0.00'), dn_in - s_out - u_full)

                e_in = movs.filter(TransactionType='VAN_EMPTY_RETURN').aggregate(s=Sum('InQty'))['s'] or Decimal('0.00')
                e_out = movs.filter(TransactionType='VAN_UNLOAD_EMPTY').aggregate(s=Sum('OutQty'))['s'] or Decimal('0.00')
                bal_empty = max(Decimal('0.00'), e_in - e_out)
                return bal_full, bal_empty

            # -------------------------------------------------------------
            # STEP 1: INITIAL PURCHASE INTAKE TO CENTRAL GODOWN
            # -------------------------------------------------------------
            print("\n📦 STEP 1: Intake 50 Fresh Filled Cylinders to Central Godown...")
            cg_filled_start, cg_empty_start = get_godown_stock(central_godown.RouteVehicleDriver_id, product)
            sg_filled_start, sg_empty_start = get_godown_stock(sub_godown.RouteVehicleDriver_id, product)

            StockMovement.objects.create(
                CompanyId=company_id,
                Product=product,
                Unit_id=product.Unit_id or 1,
                RouteVehicleDriverId=central_godown.RouteVehicleDriver_id,
                TransactionType='PURCHASE',
                ReferenceId=99901,
                TransactionNo='PUR-TEST-001',
                TransactionDate=today,
                InQty=Decimal('50.00'),
                OutQty=Decimal('0.00'),
                InCostRate=Decimal('2500.00'),
                InCostAmount=Decimal('125000.00'),
                Narration="Factory Direct Bulk Purchase intake"
            )

            cg_filled_now, _ = get_godown_stock(central_godown.RouteVehicleDriver_id, product)
            print(f"   ✓ Central Godown Stock: {cg_filled_start} ➜ {cg_filled_now} (+50.00)")
            assert cg_filled_now == cg_filled_start + Decimal('50.00'), "Central Godown did not receive 50 cylinders."

            # -------------------------------------------------------------
            # STEP 2: INTER-GODOWN TRANSFER (Central Godown -> Thalassery Sub-Godown)
            # -------------------------------------------------------------
            print("\n🚚 STEP 2: Inter-Godown Stock Transfer (20 Cylinders: Central -> Thalassery)...")
            transfer_qty = Decimal('20.00')

            # Outflow from Central
            StockMovement.objects.create(
                CompanyId=company_id,
                Product=product,
                Unit_id=product.Unit_id or 1,
                RouteVehicleDriverId=central_godown.RouteVehicleDriver_id,
                TransactionType='GODOWN_TRANSFER_OUT',
                ReferenceId=99902,
                TransactionNo='TRF-TEST-001',
                TransactionDate=today,
                InQty=Decimal('0.00'),
                OutQty=transfer_qty,
                OutCostRate=Decimal('2500.00'),
                OutCostAmount=Decimal('50000.00'),
                Narration=f"Inter-Godown Transfer to {sub_godown.GodownName}"
            )
            # Inflow into Thalassery
            StockMovement.objects.create(
                CompanyId=company_id,
                Product=product,
                Unit_id=product.Unit_id or 1,
                RouteVehicleDriverId=sub_godown.RouteVehicleDriver_id,
                TransactionType='GODOWN_TRANSFER_IN',
                ReferenceId=99902,
                TransactionNo='TRF-TEST-001',
                TransactionDate=today,
                InQty=transfer_qty,
                OutQty=Decimal('0.00'),
                InCostRate=Decimal('2500.00'),
                InCostAmount=Decimal('50000.00'),
                Narration=f"Inter-Godown Transfer received from {central_godown.GodownName}"
            )

            cg_filled_after_trf, _ = get_godown_stock(central_godown.RouteVehicleDriver_id, product)
            sg_filled_after_trf, _ = get_godown_stock(sub_godown.RouteVehicleDriver_id, product)

            print(f"   ✓ Central Godown Stock:    {cg_filled_now} ➜ {cg_filled_after_trf} (-{transfer_qty})")
            print(f"   ✓ Thalassery Godown Stock: {sg_filled_start} ➜ {sg_filled_after_trf} (+{transfer_qty})")
            assert cg_filled_after_trf == cg_filled_now - transfer_qty, "Central godown transfer deduction failed."
            assert sg_filled_after_trf == sg_filled_start + transfer_qty, "Thalassery godown transfer intake failed."

            # -------------------------------------------------------------
            # STEP 3: VAN DISPATCH VIA DELIVERY NOTE (Thalassery Godown -> Van)
            # -------------------------------------------------------------
            print("\n📋 STEP 3: Van Morning Loading / Delivery Note Dispatch (15 Cylinders: Thalassery -> Van)...")
            dispatch_qty = Decimal('15.00')

            dn_payload = {
                'RouteVehicleDriver': van_rvd.RouteVehicleDriverId,
                'DeliveryDate': str(today),
                'Remarks': 'Morning test delivery load from Thalassery Godown',
                'lines': [
                    {
                        'ProductId': product.ProductId,
                        'UnitId': product.Unit_id or 1,
                        'Quantity': float(dispatch_qty),
                        'Rate': float(product.SalesPrice or 3160.00),
                    }
                ],
                'godown_id': sub_godown.GodownId
            }

            dn_create_view = DeliveryNoteViewSet.as_view({'post': 'create'})
            req = factory.post('/api/v1/delivery-notes/', dn_payload, format='json')
            force_authenticate(req, user=admin_user)
            resp = dn_create_view(req)
            assert resp.status_code == 201, f"Delivery Note creation failed: {resp.data}"
            created_dn = DeliveryNote.objects.get(DeliveryNoteId=resp.data['DeliveryNoteId'])
            print(f"   ✓ Created Delivery Note #{created_dn.DeliveryNoteNo} (ID: {created_dn.DeliveryNoteId})")

            sg_filled_after_dn, _ = get_godown_stock(sub_godown.RouteVehicleDriver_id, product)
            van_filled_now, van_empty_now = get_van_stock(van_rvd.RouteVehicleDriverId, product, created_dn.DeliveryNoteId)

            print(f"   ✓ Thalassery Godown Stock: {sg_filled_after_trf} ➜ {sg_filled_after_dn} (-{dispatch_qty})")
            print(f"   ✓ Van Onboard Stock:       {van_filled_now} Full Cylinders, {van_empty_now} Empties")
            assert sg_filled_after_dn == sg_filled_after_trf - dispatch_qty, "Thalassery godown deduction failed."
            assert van_filled_now == dispatch_qty, "Van onboard stock mismatch."

            # -------------------------------------------------------------
            # STEP 4: SALES TRANSACTION (Standard Cash Sale)
            # -------------------------------------------------------------
            print("\n💳 STEP 4A: Mobile Delivery Sale 1 (Standard Cash: 5 Full Delivered, 4 Empties Collected)...")
            sale1_payload = {
                'allocation_id': van_rvd.RouteVehicleDriverId,
                'customer_ledger_id': customer.LedgerId,
                'items': [
                    {
                        'product_id': product.ProductId,
                        'qty': 5,
                        'empty_qty': 4,
                        'rate': float(product.SalesPrice or 3160.00),
                    }
                ],
                'payment_method': 'Cash',
                'amount_collected': float(Decimal('5.00') * Decimal(str(product.SalesPrice or 3160.00))),
                'ticket_id': f'DT-TEST-{int(datetime.now().timestamp()) % 100000:05d}-1'
            }

            sale_create_view = DeliveryNoteViewSet.as_view({'post': 'create_sale'})
            req1 = factory.post('/api/v1/delivery-notes/create_sale/', sale1_payload, format='json')
            force_authenticate(req1, user=admin_user)
            resp1 = sale_create_view(req1)
            assert resp1.status_code == 201, f"Sale 1 creation failed: {resp1.data}"
            sale1 = Sales.objects.get(SalesId=resp1.data['sales_id'])
            print(f"   ✓ Sale 1 #{sale1.SalesNo} Logged: Total ₹{sale1.GrandTotal}, Delivered: 5, Empties: 4")

            van_f_s1, van_e_s1 = get_van_stock(van_rvd.RouteVehicleDriverId, product, created_dn.DeliveryNoteId)
            print(f"   ✓ Van Remaining Stock: {van_f_s1} Full (15-5), {van_e_s1} Empties (+4)")
            assert van_f_s1 == Decimal('10.00'), "Van full stock error after sale 1"
            assert van_e_s1 == Decimal('4.00'), "Van empty stock error after sale 1"

            # -------------------------------------------------------------
            # STEP 4B: SALES TRANSACTION (Split Payment Sale: Cash + UPI)
            # -------------------------------------------------------------
            print("\n💸 STEP 4B: Mobile Delivery Sale 2 (Split Payment: 5 Full Delivered, 5 Empties Collected)...")
            gross2 = Decimal('5.00') * Decimal(str(product.SalesPrice or 3160.00))
            half_cash = gross2 / Decimal('2.00')
            half_upi = gross2 - half_cash

            sale2_payload = {
                'allocation_id': van_rvd.RouteVehicleDriverId,
                'customer_ledger_id': customer.LedgerId,
                'items': [
                    {
                        'product_id': product.ProductId,
                        'qty': 5,
                        'empty_qty': 5,
                        'rate': float(product.SalesPrice or 3160.00),
                    }
                ],
                'payment_method': 'SPLIT',
                'amount_collected': float(gross2),
                'cash_amount': float(half_cash),
                'upi_amount': float(half_upi),
                'ticket_id': f'DT-TEST-{int(datetime.now().timestamp()) % 100000:05d}-2'
            }

            req2 = factory.post('/api/v1/delivery-notes/create_sale/', sale2_payload, format='json')
            force_authenticate(req2, user=admin_user)
            resp2 = sale_create_view(req2)
            assert resp2.status_code == 201, f"Sale 2 creation failed: {resp2.data}"
            sale2 = Sales.objects.get(SalesId=resp2.data['sales_id'])
            print(f"   ✓ Sale 2 #{sale2.SalesNo} Logged: Total ₹{sale2.GrandTotal} [Cash: ₹{half_cash}, UPI: ₹{half_upi}]")
            assert 'SPLIT' in sale2.Notes, "Split details missing from Notes"

            van_f_s2, van_e_s2 = get_van_stock(van_rvd.RouteVehicleDriverId, product, created_dn.DeliveryNoteId)
            print(f"   ✓ Van Remaining Stock: {van_f_s2} Full (10-5), {van_e_s2} Empties (4+5)")
            assert van_f_s2 == Decimal('5.00'), "Van full stock error after sale 2"
            assert van_e_s2 == Decimal('9.00'), "Van empty stock error after sale 2"

            # -------------------------------------------------------------
            # STEP 4C: CONNECTION PACKAGE SALE (1 Cylinder + Accessories)
            # -------------------------------------------------------------
            print("\n📦 STEP 4C: Mobile Delivery Sale 3 (New Connection Package: 1 Cylinder Delivered)...")
            pkg_gross = Decimal(str(product.SalesPrice or 3160.00))
            sale3_payload = {
                'allocation_id': van_rvd.RouteVehicleDriverId,
                'customer_ledger_id': customer.LedgerId,
                'items': [
                    {
                        'product_id': product.ProductId,
                        'qty': 1,
                        'empty_qty': 0,
                        'rate': float(pkg_gross),
                    }
                ],
                'payment_method': 'UPI',
                'amount_collected': float(pkg_gross),
                'ticket_id': f'DT-TEST-{int(datetime.now().timestamp()) % 100000:05d}-3'
            }

            req3 = factory.post('/api/v1/delivery-notes/create_sale/', sale3_payload, format='json')
            force_authenticate(req3, user=admin_user)
            resp3 = sale_create_view(req3)
            assert resp3.status_code == 201, f"Sale 3 creation failed: {resp3.data}"
            sale3 = Sales.objects.get(SalesId=resp3.data['sales_id'])
            print(f"   ✓ Sale 3 #{sale3.SalesNo} Logged: Package Sale ₹{sale3.GrandTotal} (UPI)")

            van_f_s3, van_e_s3 = get_van_stock(van_rvd.RouteVehicleDriverId, product, created_dn.DeliveryNoteId)
            print(f"   ✓ Van Remaining Stock: {van_f_s3} Full (5-1), {van_e_s3} Empties (9+0)")
            assert van_f_s3 == Decimal('4.00'), "Van full stock error after sale 3"
            assert van_e_s3 == Decimal('9.00'), "Van empty stock error after sale 3"

            # -------------------------------------------------------------
            # STEP 5: END-SHIFT UNLOAD & SETTLEMENT TO THALASSERY GODOWN
            # -------------------------------------------------------------
            print("\n🏁 STEP 5: Shift End Settlement & Van Unloading into Thalassery Godown...")
            erd_settle_view = EndRouteDriverViewSet.as_view({'post': 'settle'})

            # Settle endpoint: unloads unsold fulls (4) and collected empties (9) to target godown
            settle_payload = {
                'godown_id': sub_godown.GodownId,
                'shift_date': str(today),
            }

            req_settle = factory.post(f'/api/v1/end-route-drivers/{created_dn.DeliveryNoteId}/settle/', settle_payload, format='json')
            force_authenticate(req_settle, user=admin_user)
            resp_settle = erd_settle_view(req_settle, pk=created_dn.DeliveryNoteId)
            assert resp_settle.status_code == 200, f"Settlement failed: {resp_settle.data}"
            print(f"   ✓ Shift Approved & Settled! Response: {resp_settle.data.get('message')}")

            # Check post-settlement Van Stock (must be 0.00)
            van_f_final, van_e_final = get_van_stock(van_rvd.RouteVehicleDriverId, product, created_dn.DeliveryNoteId)
            sg_filled_final, sg_empty_final = get_godown_stock(sub_godown.RouteVehicleDriver_id, product)

            print(f"   ✓ Van Final Balance:        {van_f_final} Full Cylinders, {van_e_final} Empties")
            print(f"   ✓ Thalassery Godown Final:  {sg_filled_final} Full Cylinders, {sg_empty_final} Empties")

            assert van_f_final == Decimal('0.00'), "Van did not clear all full cylinders on settlement."
            assert van_e_final == Decimal('0.00'), "Van did not clear all empty cylinders on settlement."
            assert sg_filled_final == sg_filled_after_dn + Decimal('4.00'), "Thalassery Godown did not receive 4 unsold fulls."
            assert sg_empty_final == sg_empty_start + Decimal('9.00'), "Thalassery Godown did not receive 9 customer empties."

            # -------------------------------------------------------------
            # STEP 6: ACCOUNTING & FINANCIAL DOUBLE-ENTRY AUDIT
            # -------------------------------------------------------------
            print("\n📑 STEP 6: Auditing Financial Vouchers & Split Double-Entry Integrity...")
            sales_to_audit = [sale1, sale2, sale3]
            for s in sales_to_audit:
                s.refresh_from_db()
                vch = Voucher.objects.filter(CompanyId=company_id, ReferenceTable='Sales', ReferenceId=s.SalesId).first()
                assert vch, f"Missing voucher for Sale #{s.SalesNo}"
                vlines = list(vch.lines.all())
                tot_debit = sum(vl.DebitAmount for vl in vlines)
                tot_credit = sum(vl.CreditAmount for vl in vlines)
                print(f"   ✓ Voucher #{vch.VoucherNo} (Bill #{s.SalesNo}):")
                print(f"     Notes: {s.Notes}")
                for vl in vlines:
                    print(f"       Line {vl.LineNo}: {vl.Ledger.LedgerName} | Dr: ₹{vl.DebitAmount} | Cr: ₹{vl.CreditAmount} | {vl.Narration}")
                print(f"     Total Debits: ₹{tot_debit:,.2f}  |  Total Credits: ₹{tot_credit:,.2f}")
                assert tot_debit == tot_credit, f"Unbalanced double-entry in voucher #{vch.VoucherNo}: {tot_debit} != {tot_credit}"

                # Specifically verify Split Voucher debits both Cash and Bank
                if s.PaymentMethod == 'SPLIT':
                    has_cash = any('cash' in vl.Ledger.LedgerName.lower() for vl in vlines if vl.DebitAmount > 0)
                    has_bank = any(('bank' in vl.Ledger.LedgerName.lower() or 'sbi' in vl.Ledger.LedgerName.lower()) for vl in vlines if vl.DebitAmount > 0)
                    print(f"     Split Payment Verified: Cash Debit Present? {has_cash} | Bank Debit Present? {has_bank}")
                    assert has_cash, "Split voucher missing Cash debit"
                    assert has_bank, "Split voucher missing Bank debit"

            # -------------------------------------------------------------
            # STEP 7: SYSTEM-WIDE INVENTORY CONSERVATION AUDIT
            # -------------------------------------------------------------
            print("\n⚖️ STEP 7: Verifying System-wide Cylinder Conservation (No Leaks)...")
            cg_final, _ = get_godown_stock(central_godown.RouteVehicleDriver_id, product)
            sg_final, sg_emp_final = get_godown_stock(sub_godown.RouteVehicleDriver_id, product)
            sold_qty = Decimal('11.00')

            print(f"   • Initial Intake to Central:   50 Cylinders")
            print(f"   • Current Central Godown:      {cg_final} Cylinders (50 - 20 Transferred = 30)")
            print(f"   • Current Thalassery Godown:   {sg_final} Cylinders (20 Transferred - 15 Dispatched + 4 Unloaded = 9)")
            print(f"   • Sold to Customers:           {sold_qty} Cylinders (5 + 5 + 1 = 11)")
            print(f"   • Onboard Fleet Balance:       {van_f_final} Cylinders (Shift complete)")
            print(f"   -------------------------------------------------")
            total_accounted = cg_final + sg_final + sold_qty + van_f_final
            print(f"   • Total Accounted Cylinders:   {total_accounted} / 50.00")
            assert total_accounted == cg_filled_start + Decimal('50.00'), f"Conservation failure: {total_accounted} != {cg_filled_start + 50}"

            print("\n" + "=" * 75)
            print("🎉 ALL FULL-FLEDGED STOCK MOVEMENT & MULTI-GODOWN TESTS PASSED 100%!")
            print("=" * 75)

        finally:
            # Clean rollback to leave production database unaffected
            transaction.savepoint_rollback(savepoint)
            print("\n🛡️ Transaction successfully rolled back: Database state restored cleanly.")

if __name__ == '__main__':
    run_test()
