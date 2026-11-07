import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIRequestFactory, force_authenticate
from core.views import DeliveryNoteViewSet, RouteViewSet, User

admin = User.objects.filter(Username='admin').first() or User.objects.first()
factory = APIRequestFactory()

# 1. Stock Analysis
req1 = factory.get('/api/delivery-notes/stock-analysis/')
force_authenticate(req1, user=admin)
res1 = DeliveryNoteViewSet.as_view({'get': 'stock_analysis'})(req1)
print('=== 1. STOCK ANALYSIS (ALL 3 PRODUCTS INVENTORY) ===')
for row in res1.data.get('products', []):
    print(f"Code {row.get('ProductCode')} - {row.get('ProductName')}: Godown Full={row.get('GodownFilledQty')}, Godown Empty={row.get('GodownEmptyQty')}, Van Onboard={row.get('AllocatedQty')}, Total Full={row.get('FilledQty')}, Total Empty={row.get('EmptyQty')}, Grand Total={row.get('TotalQty')}")

# 2. Van Management List
req2 = factory.get('/api/routes/van-management/')
force_authenticate(req2, user=admin)
res2 = RouteViewSet.as_view({'get': 'van_management'})(req2)
print('\n=== 2. VAN MANAGEMENT FLEET OPERATIONS ===')
for route in res2.data.get('routes', []):
    stk = route.get('stock', {})
    coll = route.get('collection', {})
    print(f"Route: {route.get('route_name')} (ID: {route.get('allocation_id')}) - Status: {route.get('status')}, Filled: {stk.get('filled_quantity')}, Delivered: {stk.get('delivered_quantity')}, Gross Coll: Rs.{coll.get('total_collection')}")

# 3. Van Stock Breakdown (KL48K5255 / RVD 11)
rvd_id = 11
req3 = factory.get(f'/api/delivery-notes/van-stock/?allocation_id={rvd_id}')
force_authenticate(req3, user=admin)
res3 = DeliveryNoteViewSet.as_view({'get': 'van_stock'})(req3)
print(f'\n=== 3. VAN STOCK BREAKDOWN (Allocation {rvd_id}) ===')
for item in res3.data:
    print(f"  Code {item.get('ProductCode')} - {item.get('ProductName')}: Allocated={item.get('AllocatedQty')}, Delivered={item.get('DeliveredQty')}, Balance={item.get('BalanceQty')}, Empty={item.get('EmptyQty')}")
