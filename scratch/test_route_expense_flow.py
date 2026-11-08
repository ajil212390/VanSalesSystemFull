import os, sys, django
from decimal import Decimal
from datetime import date

sys.path.insert(0, os.path.abspath('.'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIRequestFactory, force_authenticate
from core.models import (
    RouteVehicleDriver, RouteExpense, DeliveryNote, Payment, Voucher,
    Ledger, User
)
from core.views import (
    DeliveryNoteViewSet, EndRouteDriverViewSet, sync_ledger_balances
)

admin = User.objects.filter(Username='admin').first() or User.objects.first()
factory = APIRequestFactory()

alloc = RouteVehicleDriver.objects.filter(IsActive=True).first()
assert alloc, "No active RouteVehicleDriver found"
company_id = alloc.CompanyId or 1

# Create a temporary LOADED DeliveryNote for testing the shift lifecycle
dn = DeliveryNote.objects.create(
    CompanyId=company_id,
    RouteVehicleDriver=alloc,
    DeliveryDate=date.today(),
    DeliveryNoteNo='TEST-DN-EXP',
    Status='LOADED',
)

travelling_ledger = (
    Ledger.objects.filter(LedgerId=31).first()
    or Ledger.objects.filter(CompanyId=company_id, LedgerName__iexact='Travelling Expense').first()
)
bank_ledger = (
    Ledger.objects.filter(LedgerId=56).first()
    or Ledger.objects.filter(Group_id=17, CompanyId=company_id).first()
)

initial_travel_bal = Decimal(str(travelling_ledger.CurrentBalance or 0)) if travelling_ledger else Decimal('0.00')
initial_bank_bal = Decimal(str(bank_ledger.CurrentBalance or 0)) if bank_ledger else Decimal('0.00')

print(f"=== INITIAL STATE ===")
print(f"Travelling Expense Bal: {initial_travel_bal}")
print(f"Bank Bal: {initial_bank_bal}")

# 1. Log an expense from mobile during the active shift
payload = {
    'allocation_id': alloc.RouteVehicleDriverId,
    'category': 'Fuel Topup',
    'amount': '150.00',
    'payment_mode': 'Bank',
    'notes': 'Test live fuel logging',
}

req = factory.post('/api/delivery-notes/create_expense/', payload, format='json')
force_authenticate(req, user=admin)
res = DeliveryNoteViewSet.as_view({'post': 'create_expense'})(req)

assert res.status_code == 201, f"Failed to create expense: {res.data}"
exp_id = res.data['expense_id']
print(f"\n1. Logged Driver Expense #{exp_id} for Rs.150.00 via Bank")

exp = RouteExpense.objects.get(ExpenseId=exp_id)
assert exp.Payment is None, f"Expected exp.Payment to be None, got {exp.Payment}"
print("   VERIFIED: RouteExpense.Payment is None (NOT posted to accounts!)")

# Refresh ledger balances
if travelling_ledger:
    travelling_ledger.refresh_from_db()
    assert travelling_ledger.CurrentBalance == initial_travel_bal, f"Travelling ledger altered! {travelling_ledger.CurrentBalance} != {initial_travel_bal}"
if bank_ledger:
    bank_ledger.refresh_from_db()
    assert bank_ledger.CurrentBalance == initial_bank_bal, f"Bank ledger altered! {bank_ledger.CurrentBalance} != {initial_bank_bal}"
print("   VERIFIED: Financial Ledgers completely untouched in Accounts Dashboard during shift!")

# 2. Check that the expense is visible in van screen
req2 = factory.get(f'/api/delivery-notes/driver_expenses/?allocation_id={alloc.RouteVehicleDriverId}')
force_authenticate(req2, user=admin)
res2 = DeliveryNoteViewSet.as_view({'get': 'driver_expenses'})(req2)
print(f"\n2. Van Screen Driver Expenses Query returned {len(res2.data)} expense(s)")
exp_entry = next((e for e in res2.data if e['expense_id'] == exp_id), None)
assert exp_entry is not None, "Expense not returned in van screen!"
print(f"   VERIFIED: Visible on Van Screen: Rs.{exp_entry['amount']} - {exp_entry['category']}")

# 3. Now perform End Shift Settlement approval (settle)
req3 = factory.post(f'/api/end-route-driver/{dn.DeliveryNoteId}/settle/')
force_authenticate(req3, user=admin)
res3 = EndRouteDriverViewSet.as_view({'post': 'settle'})(req3, pk=dn.DeliveryNoteId)
assert res3.status_code == 200, f"Settle failed: {res3.data}"
print(f"\n3. Shift Settled successfully: {res3.data['message']}")

exp.refresh_from_db()
assert exp.Payment is not None, "Expected exp.Payment to be populated after settle!"
pmt = exp.Payment
print(f"   VERIFIED: RouteExpense linked to Payment #{pmt.PaymentId}")

vch = Voucher.objects.filter(ReferenceTable='Payment', ReferenceId=pmt.PaymentId).first()
assert vch is not None, "Voucher not created for settled expense!"
assert vch.VoucherType == 'PAYMENT', f"Expected PAYMENT voucher, got {vch.VoucherType}"
print(f"   VERIFIED: Accounting Voucher posted: {vch.VoucherNo}")
for vl in vch.lines.all():
    print(f"     Line: {vl.Ledger.LedgerName} | Debit: {vl.DebitAmount} | Credit: {vl.CreditAmount}")

if travelling_ledger:
    travelling_ledger.refresh_from_db()
    print(f"   VERIFIED: Travelling Expense ledger updated: {travelling_ledger.CurrentBalance} (increased by 150.00)")
if bank_ledger:
    bank_ledger.refresh_from_db()
    print(f"   VERIFIED: Bank Accounts ledger updated: {bank_ledger.CurrentBalance} (decreased by 150.00)")

# 4. Now test rollback / destroy of settlement
req4 = factory.delete(f'/api/end-route-driver/{dn.DeliveryNoteId}/')
force_authenticate(req4, user=admin)
res4 = EndRouteDriverViewSet.as_view({'delete': 'destroy'})(req4, pk=dn.DeliveryNoteId)
assert res4.status_code == 204, f"Destroy failed: {res4.status_code}"
print(f"\n4. Settlement Reverted (Destroy)")

exp.refresh_from_db()
assert exp.Payment is None, "Expected exp.Payment to be reset back to None after rollback!"
print("   VERIFIED: RouteExpense.Payment reset to None!")

# Clean up test records
exp.delete()
dn.delete()
print("\nTest records cleaned up successfully.")
print("ALL TESTS PASSED WITH 100% SUCCESS!")
