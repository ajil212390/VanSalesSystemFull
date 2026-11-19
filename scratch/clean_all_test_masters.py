import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from django.db import transaction
from core.models import (
    Godown, RouteVehicleDriver, Route, Vehicle, Driver,
    Ledger, Product, VoucherLine
)
from django.db.models import Sum
from decimal import Decimal

with transaction.atomic():
    print('Starting cleanup of all test entities added for testing...')

    # 1. Test Godowns
    test_godowns = Godown.objects.filter(GodownId__in=[3, 4])
    print(f'Deleting {test_godowns.count()} test godowns...')
    for g in test_godowns:
        print(f'  - Godown: {g.GodownId} {g.GodownName}')
    test_godowns.delete()

    # 2. Test RVDs
    test_rvds = RouteVehicleDriver.objects.filter(RouteVehicleDriverId__in=range(30, 44))
    print(f'Deleting {test_rvds.count()} test RouteVehicleDriver records...')
    test_rvds.delete()

    # 3. Test Routes
    test_routes = Route.objects.filter(RouteId__in=range(13, 25))
    print(f'Deleting {test_routes.count()} test routes...')
    for r in test_routes:
        print(f'  - Route: {r.RouteId} {r.RouteName}')
    test_routes.delete()

    # 4. Test Vehicles
    test_vehicles = Vehicle.objects.filter(VehicleId__in=range(13, 25))
    print(f'Deleting {test_vehicles.count()} test vehicles...')
    for v in test_vehicles:
        print(f'  - Vehicle: {v.VehicleId} {v.VehicleNumber}')
    test_vehicles.delete()

    # 5. Test Drivers
    test_drivers = Driver.objects.filter(DriverId__in=range(16, 28))
    print(f'Deleting {test_drivers.count()} test drivers...')
    for d in test_drivers:
        print(f'  - Driver: {d.DriverId} {d.DriverName}')
    test_drivers.delete()

    # 6. Test Ledgers (Debtors and Creditors added for audit and scale tests)
    test_ledgers = Ledger.objects.filter(LedgerId__in=range(99, 154))
    print(f'Deleting {test_ledgers.count()} test ledgers...')
    for l in test_ledgers:
        print(f'  - Ledger: {l.LedgerId} {l.LedgerName}')
    test_ledgers.delete()

    # 7. Test Products
    test_prods = Product.objects.filter(ProductCode='HOSE-SCALE')
    print(f'Deleting {test_prods.count()} test products...')
    test_prods.delete()

    # Verification
    print('\n--- VERIFICATION OF REMAINING MASTER DATA ---')
    print('Remaining Routes:')
    for r in Route.objects.all().order_by('RouteId'):
        print(f'  - [{r.RouteId}] {r.RouteName}')

    print('Remaining Vehicles:')
    for v in Vehicle.objects.all().order_by('VehicleId'):
        print(f'  - [{v.VehicleId}] {v.VehicleNumber} ({v.VehicleName})')

    print('Remaining Drivers:')
    for d in Driver.objects.all().order_by('DriverId'):
        print(f'  - [{d.DriverId}] {d.DriverName}')

    print('Remaining Godowns:')
    for g in Godown.objects.all().order_by('GodownId'):
        print(f'  - [{g.GodownId}] {g.GodownName} ({g.GodownCode})')

    print('Remaining Sundry Debtors:')
    for l in Ledger.objects.filter(Group__GroupName='Sundry Debtors').order_by('LedgerId'):
        print(f'  - [{l.LedgerId}] {l.LedgerName}')

    dr = VoucherLine.objects.filter(Voucher__CompanyId=1).aggregate(s=Sum('DebitAmount'))['s'] or Decimal('0.00')
    cr = VoucherLine.objects.filter(Voucher__CompanyId=1).aggregate(s=Sum('CreditAmount'))['s'] or Decimal('0.00')
    print(f'General Ledger Balance -> Total Debit: {dr}, Total Credit: {cr}, Discrepancy: {abs(dr - cr)}')

    print('\nCleanup successfully completed!')
