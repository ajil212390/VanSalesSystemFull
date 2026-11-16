import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import django
from decimal import Decimal
from datetime import date

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import transaction
from rest_framework.test import APIRequestFactory, force_authenticate
from core.models import (
    Company, Godown, Product, RouteVehicleDriver, StockMovement,
    DeliveryNote, DeliveryNoteLine, User
)
from core.views import DeliveryNoteViewSet

def run_test():
    print("=== STARTING SECONDARY GODOWN STOCK SIMULATION ===")
    user = User.objects.first()
    company = Company.objects.first()
    factory = APIRequestFactory()

    with transaction.atomic():
        sid = transaction.savepoint()
        try:
            # 1. Fetch Central Godown & Secondary Godown
            central_godown = Godown.objects.filter(CompanyId=company.CompanyId, IsCentral=True).first()
            secondary_godown = Godown.objects.filter(CompanyId=company.CompanyId, IsCentral=False).first()
            assert central_godown is not None, "Central Godown must exist"
            assert secondary_godown is not None, "Secondary Godown must exist"
            print(f"Central Godown: ID={central_godown.GodownId}, Name={central_godown.GodownName}, RVD={central_godown.RouteVehicleDriver_id}")
            print(f"Secondary Godown: ID={secondary_godown.GodownId}, Name={secondary_godown.GodownName}, RVD={secondary_godown.RouteVehicleDriver_id}")

            product = Product.objects.filter(CompanyId=company.CompanyId, IsActive=True).first()
            assert product is not None, "Product must exist"
            print(f"Testing with Product: {product.ProductName} (ID={product.ProductId})")

            # 2. Add 100 cylinders opening stock into Central Godown (RVD=1)
            sm_opening = StockMovement.objects.create(
                CompanyId=company.CompanyId,
                Product=product,
                Unit_id=product.Unit_id or 17,
                RouteVehicleDriverId=central_godown.RouteVehicleDriver_id,
                TransactionType='OPENING_STOCK',
                ReferenceId=product.ProductId,
                TransactionNo='TEST-OPN-100',
                TransactionDate=date.today(),
                InQty=Decimal('100.00'),
                OutQty=Decimal('0.00'),
                InCostRate=product.PurchasePrice or Decimal('1000.00'),
                InCostAmount=Decimal('100.00') * (product.PurchasePrice or Decimal('1000.00')),
                Narration="Test Opening Stock"
            )

            # Check Central Godown Stock API
            view = DeliveryNoteViewSet.as_view({'get': 'godown_stock'})
            req1 = factory.get(f'/api/v1/delivery-notes/godown-stock/?godown_id={central_godown.GodownId}')
            force_authenticate(req1, user=user)
            res1 = view(req1)
            p_stock_central = next((p for p in res1.data if p['ProductId'] == product.ProductId), None)
            print(f"Initial Central Godown Stock: {p_stock_central['AvailableGodownQty']}")
            assert Decimal(str(p_stock_central['AvailableGodownQty'])) == Decimal('100.00'), "Expected 100 in Central"

            # Check Secondary Godown Stock API (should be 0)
            req2 = factory.get(f'/api/v1/delivery-notes/godown-stock/?godown_id={secondary_godown.GodownId}')
            force_authenticate(req2, user=user)
            res2 = view(req2)
            p_stock_sec = next((p for p in res2.data if p['ProductId'] == product.ProductId), None)
            print(f"Initial Secondary Godown Stock: {p_stock_sec['AvailableGodownQty']}")
            assert Decimal(str(p_stock_sec['AvailableGodownQty'])) == Decimal('0.00'), "Expected 0 in Secondary"

            # 3. Transfer 40 cylinders from Central Godown -> Secondary Godown via DeliveryNote
            view_create = DeliveryNoteViewSet.as_view({'post': 'create'})
            transfer_payload = {
                'RouteVehicleDriver': secondary_godown.RouteVehicleDriver_id,
                'DeliveryDate': str(date.today()),
                'Remarks': 'Transfer to Thalassery Godown',
                'godown_id': central_godown.GodownId,
                'lines': [{
                    'ProductId': product.ProductId,
                    'UnitId': product.Unit_id or 17,
                    'Quantity': 40,
                    'Rate': float(product.PurchasePrice or 1000),
                }]
            }
            req_tr = factory.post('/api/v1/delivery-notes/', transfer_payload, format='json')
            force_authenticate(req_tr, user=user)
            res_tr = view_create(req_tr)
            print(f"Transfer DeliveryNote Created: {res_tr.status_code}, DN: {res_tr.data.get('DeliveryNoteNo')}")
            assert res_tr.status_code == 201, f"Expected 201, got {res_tr.status_code}: {res_tr.data}"

            # 4. Check Stock after transfer
            # Central Godown should now have 60
            req_g1 = factory.get(f'/api/v1/delivery-notes/godown-stock/?godown_id={central_godown.GodownId}')
            force_authenticate(req_g1, user=user)
            res_g1 = view(req_g1)
            p_g1 = next((p for p in res_g1.data if p['ProductId'] == product.ProductId), None)
            print(f"Central Godown Available after Transfer: {p_g1['AvailableGodownQty']}")
            assert Decimal(str(p_g1['AvailableGodownQty'])) == Decimal('60.00'), "Expected 60 in Central"

            # Secondary Godown should now have 40!
            req_g2 = factory.get(f'/api/v1/delivery-notes/godown-stock/?godown_id={secondary_godown.GodownId}')
            force_authenticate(req_g2, user=user)
            res_g2 = view(req_g2)
            p_g2 = next((p for p in res_g2.data if p['ProductId'] == product.ProductId), None)
            print(f"Secondary Godown Available after Transfer: {p_g2['AvailableGodownQty']}")
            assert Decimal(str(p_g2['AvailableGodownQty'])) == Decimal('40.00'), "Expected 40 in Secondary!"

            # 5. Check stock_analysis endpoint
            view_analysis = DeliveryNoteViewSet.as_view({'get': 'stock_analysis'})
            req_an = factory.get('/api/v1/delivery-notes/stock-analysis/')
            force_authenticate(req_an, user=user)
            res_an = view_analysis(req_an)
            godowns_res = res_an.data.get('godowns', [])
            g1_sum = next((g for g in godowns_res if g['GodownId'] == central_godown.GodownId), None)
            g2_sum = next((g for g in godowns_res if g['GodownId'] == secondary_godown.GodownId), None)
            print(f"Stock Analysis Central Godown Filled: {g1_sum['FilledQty']}")
            print(f"Stock Analysis Secondary Godown Filled: {g2_sum['FilledQty']}")
            assert Decimal(str(g1_sum['FilledQty'])) == Decimal('60.00'), "Stock analysis should show 60 in Central"
            assert Decimal(str(g2_sum['FilledQty'])) == Decimal('40.00'), "Stock analysis should show 40 in Secondary"

            # 6. Now load 15 cylinders from SECONDARY GODOWN into a Van (RouteVehicleDriver != 1 and != 18)
            van_allocation = RouteVehicleDriver.objects.filter(
                CompanyId=company.CompanyId, IsActive=True
            ).exclude(RouteVehicleDriverId__in=[central_godown.RouteVehicleDriver_id, secondary_godown.RouteVehicleDriver_id]).first()
            assert van_allocation is not None, "A delivery van allocation must exist"
            print(f"Target Van Allocation: ID={van_allocation.RouteVehicleDriverId}, Vehicle={van_allocation.Vehicle}")

            load_payload = {
                'RouteVehicleDriver': van_allocation.RouteVehicleDriverId,
                'DeliveryDate': str(date.today()),
                'Remarks': 'Load from Thalassery Godown into Van',
                'godown_id': secondary_godown.GodownId, # LOAD FROM SECONDARY GODOWN!
                'lines': [{
                    'ProductId': product.ProductId,
                    'UnitId': product.Unit_id or 17,
                    'Quantity': 15,
                    'Rate': float(product.PurchasePrice or 1000),
                }]
            }
            req_load = factory.post('/api/v1/delivery-notes/', load_payload, format='json')
            force_authenticate(req_load, user=user)
            res_load = view_create(req_load)
            print(f"Van Load from Secondary Godown Created: {res_load.status_code}, DN: {res_load.data.get('DeliveryNoteNo')}")
            assert res_load.status_code == 201, f"Expected 201, got {res_load.status_code}: {res_load.data}"

            # 7. Check Secondary Godown Stock after Van Load (40 - 15 = 25)
            req_g2_after = factory.get(f'/api/v1/delivery-notes/godown-stock/?godown_id={secondary_godown.GodownId}')
            force_authenticate(req_g2_after, user=user)
            res_g2_after = view(req_g2_after)
            p_g2_after = next((p for p in res_g2_after.data if p['ProductId'] == product.ProductId), None)
            print(f"Secondary Godown Available after Van Load: {p_g2_after['AvailableGodownQty']}")
            assert Decimal(str(p_g2_after['AvailableGodownQty'])) == Decimal('25.00'), "Expected 25 in Secondary after van load!"

            # 8. Check Van Onboard Stock in stock_analysis
            req_an2 = factory.get('/api/v1/delivery-notes/stock-analysis/')
            force_authenticate(req_an2, user=user)
            res_an2 = view_analysis(req_an2)
            active_vans = res_an2.data.get('active_vans', [])
            van_info = next((v for v in active_vans if v['RouteVehicleDriverId'] == van_allocation.RouteVehicleDriverId), None)
            print(f"Van Onboard Cylinders: {van_info['BalanceCylinders']}")
            assert Decimal(str(van_info['BalanceCylinders'])) == Decimal('15.00'), "Expected 15 cylinders onboard the van"

            print("=== ALL SECONDARY GODOWN TESTS PASSED 100% PERFECTLY! ===")
        finally:
            transaction.savepoint_rollback(sid)
            print("=== SAVEPOINT ROLLED BACK CLEANLY — DB IS PRISTINE ===")

if __name__ == '__main__':
    run_test()
