import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIRequestFactory, force_authenticate
from django.contrib.auth import get_user_model
from core.models import Ledger, Sales, RouteVehicleDriver, DeliveryNote
from core.views import (
    RouteViewSet, DeliveryNoteViewSet, EndRouteDriverViewSet,
    SalesViewSet, LedgerViewSet, PaymentViewSet
)

user = get_user_model().objects.filter(Username='admin').first() or get_user_model().objects.first()
factory = APIRequestFactory()

print("Auditing with User:", user.Username)

# 1. Van Management Overview
req = factory.get('/api/routes/van-management/')
force_authenticate(req, user=user)
res = RouteViewSet.as_view({'get': 'van_management'})(req)
print("\n=== 1. VAN MANAGEMENT OVERVIEW ===")
print("Total routes:", res.data.get('total_route_count'))
for r in res.data.get('routes', []):
    stk = r.get('stock', {})
    col = r.get('collection', {})
    exp = r.get('expense', {})
    print(f"  Route: {r.get('route_name', ''):<20} | Veh: {r.get('vehicle_number', ''):<10} | Driver: {r.get('driver_name', ''):<10} | Status: {r.get('status', ''):<15} | Filled: {stk.get('filled_quantity')} | Deliv: {stk.get('delivered_quantity')} | Empties: {stk.get('empty_quantity')} | Net Coll: {exp.get('net_collection')}")

# 2. Stock Analysis Overview
req = factory.get('/api/delivery-notes/stock-analysis/')
force_authenticate(req, user=user)
res = DeliveryNoteViewSet.as_view({'get': 'stock_analysis'})(req)
print("\n=== 2. STOCK ANALYSIS OVERVIEW ===")
print("Summary:", res.data.get('summary'))
print("Products Breakdown:")
for p in res.data.get('products', []):
    print(f"  {p.get('ProductName'):<25} | GodownFilled: {p.get('GodownFilledQty')} | GodownEmpty: {p.get('GodownEmptyQty')} | Allocated: {p.get('AllocatedQty')} | Total: {p.get('TotalQty')} | IsCyl: {p.get('IsCylinder')}")
print("Active Vans:")
for v in res.data.get('active_vans', []):
    print(f"  Van {v.get('VehicleNumber')} ({v.get('RouteName')}): TotalCyls={v.get('TotalCylinders')}, Balance={v.get('BalanceCylinders')}, Empty={v.get('EmptyCylinders')}")

# 3. Godown Stock
req = factory.get('/api/delivery-notes/godown-stock/')
force_authenticate(req, user=user)
res = DeliveryNoteViewSet.as_view({'get': 'godown_stock'})(req)
print("\n=== 3. GODOWN STOCK ===")
for p in res.data:
    print(f"  {p.get('ProductName'):<25} | AvailableFilled: {p.get('AvailableGodownQty')} | Empty: {p.get('EmptyGodownQty')} | Total: {p.get('TotalGodownQty')}")

# 4. Van Stock (Allocation 11)
req = factory.get('/api/delivery-notes/van-stock/?allocation_id=11')
force_authenticate(req, user=user)
res = DeliveryNoteViewSet.as_view({'get': 'van_stock'})(req)
print("\n=== 4. VAN STOCK (ALLOC 11) ===")
if isinstance(res.data, list):
    for p in res.data:
        print(f"  {p.get('ProductName'):<25} | Alloc: {p.get('AllocatedQty')} | Deliv: {p.get('DeliveredQty')} | Bal: {p.get('BalanceQty')} | Empty: {p.get('EmptyQty')}")
else:
    print("  Data:", res.data)

# 5. Customers List & Outstanding
req = factory.get('/api/ledgers/customers/')
force_authenticate(req, user=user)
res = LedgerViewSet.as_view({'get': 'customers'})(req)
print("\n=== 5. CUSTOMERS LIST & OUTSTANDING ===")
custs = res.data.get('results', res.data) if isinstance(res.data, dict) else res.data
for c in custs:
    print(f"  Customer: {c.get('LedgerName'):<15} (ID: {c.get('LedgerId')}) | Balance: {c.get('CurrentBalance')} (Dr: {c.get('DebitBalance')}, Cr: {c.get('CreditBalance')}) | State: {c.get('StateId')}")

# 6. Driver Sales for Van 11
req = factory.get('/api/delivery-notes/driver_sales/?allocation_id=11')
force_authenticate(req, user=user)
res = DeliveryNoteViewSet.as_view({'get': 'driver_sales'})(req)
print("\n=== 6. DRIVER SALES FOR VAN 11 ===")
for s in (res.data if isinstance(res.data, list) else []):
    print(f"  Ticket: {s.get('ticket_id'):<15} | Customer: {s.get('customer_name'):<15} | Method: {s.get('payment_method'):<8} | Delivered: {s.get('totalCylinders')} | Empties: {s.get('totalEmpties')}")

# 7. Shift Status for Van 11
req = factory.get('/api/end-route-drivers/shift_status/?allocation_id=11')
force_authenticate(req, user=user)
res = EndRouteDriverViewSet.as_view({'get': 'shift_status'})(req)
print("\n=== 7. SHIFT STATUS FOR VAN 11 ===")
print("  Status:", res.data.get('shift_status'), "| Has Active Load:", res.data.get('has_active_load'), "| Can Sell:", res.data.get('can_sell'))
