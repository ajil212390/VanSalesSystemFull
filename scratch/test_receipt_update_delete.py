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
from core.models import Ledger, Payment, Voucher, VoucherLine, Sales
from core.views import PaymentViewSet, sync_ledger_balances

def test_receipt_lifecycle():
    print("Testing Customer Receipt Update & Delete Lifecycle...")
    factory = APIRequestFactory()
    user = get_user_model().objects.filter(Username='admin').first() or get_user_model().objects.first()

    # Take customer 3 (balance 450 Dr)
    cust3 = Ledger.objects.get(LedgerId=62)
    sbi = Ledger.objects.get(LedgerId=56)
    init_cust3_bal = cust3.CurrentBalance
    init_sbi_bal = sbi.CurrentBalance
    print(f"Initial: Customer-3={init_cust3_bal} Dr, SBI={init_sbi_bal}")

    # 1. Create Receipt of 450 against Customer-3
    pay_view = PaymentViewSet.as_view({'post': 'create', 'put': 'update', 'delete': 'destroy'})
    create_payload = {
        "PartyLedgerId": cust3.LedgerId,
        "Amount": "450.00",
        "Narration": "Initial receipt",
        "lines": [{"LineNo": 1, "PaymentMode": "Bank", "LedgerId": 56, "Amount": "450.00"}],
        "allocations": [{"BillReference": "DT-261106-003", "BillType": "SALES", "BillDate": "2026-11-06", "BillAmount": 450.0, "AllocatedAmount": "450.00"}]
    }
    req = factory.post('/api/payments/', create_payload, format='json')
    force_authenticate(req, user=user)
    res = pay_view(req)
    assert res.status_code == 201, f"Create failed: {res.data}"
    p_id = res.data['PaymentId']
    print(f"Created Receipt #{p_id}")

    cust3.refresh_from_db()
    assert cust3.CurrentBalance == Decimal('0.00'), f"Expected 0.00, got {cust3.CurrentBalance}"

    # 2. Update Receipt to 200 (Partial)
    update_payload = {
        "PartyLedgerId": cust3.LedgerId,
        "Amount": "200.00",
        "Narration": "Updated to partial receipt",
        "lines": [{"LineNo": 1, "PaymentMode": "Bank", "LedgerId": 56, "Amount": "200.00"}],
        "allocations": [{"BillReference": "DT-261106-003", "BillType": "SALES", "BillDate": "2026-11-06", "BillAmount": 450.0, "AllocatedAmount": "200.00"}]
    }
    req = factory.put(f'/api/payments/{p_id}/', update_payload, format='json')
    force_authenticate(req, user=user)
    res = pay_view(req, pk=p_id)
    assert res.status_code == 200, f"Update failed: {res.data}"
    print(f"Updated Receipt #{p_id} to 200.00")

    cust3.refresh_from_db()
    assert cust3.CurrentBalance == Decimal('250.00'), f"Expected 250.00 remaining debt, got {cust3.CurrentBalance}"

    vch = Voucher.objects.filter(ReferenceTable='Payment', ReferenceId=p_id).first()
    assert vch.VoucherType == 'RECEIPT', f"Expected VoucherType RECEIPT, got {vch.VoucherType}"
    print(f"Verified Voucher is still RECEIPT: {vch.VoucherNo}")

    # 3. Delete Receipt
    req = factory.delete(f'/api/payments/{p_id}/')
    force_authenticate(req, user=user)
    res = pay_view(req, pk=p_id)
    assert res.status_code == 204, f"Delete failed: {res.status_code}"
    print(f"Deleted Receipt #{p_id}")

    cust3.refresh_from_db()
    sbi.refresh_from_db()
    assert cust3.CurrentBalance == init_cust3_bal, f"Expected {init_cust3_bal}, got {cust3.CurrentBalance}"
    assert sbi.CurrentBalance == init_sbi_bal, f"Expected {init_sbi_bal}, got {sbi.CurrentBalance}"
    print(f"Balances cleanly restored: Customer-3={cust3.CurrentBalance}, SBI={sbi.CurrentBalance}")

    # Trial Balance check
    total_debits = sum(Decimal(str(l.DebitBalance or 0)) for l in Ledger.objects.all())
    total_credits = sum(Decimal(str(l.CreditBalance or 0)) for l in Ledger.objects.all())
    diff = total_debits - total_credits
    assert abs(diff) == Decimal('0.00'), f"Trial Balance unequal! Diff={diff}"
    print(f"Trial balance verified balanced: Delta = {diff}")
    print("ALL RECEIPT LIFECYCLE TESTS PASSED PERFECTLY!\n")

if __name__ == '__main__':
    test_receipt_lifecycle()

