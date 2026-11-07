import os
import sys
from pathlib import Path
from decimal import Decimal

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection
from core.models import (
    Ledger, StockMovement, DeliveryNote, DeliveryNoteLine,
    Sales, SalesLine, Purchase, PurchaseLine,
    BillwiseAllocation, Payment, PaymentLine,
    Voucher, VoucherLine, RouteExpense, LedgerLine,
    ReceiptNote, ReceiptNoteLine, ProductPriceAudit
)

def clear_all_test_data(reset_ledger_opening_to_zero=True):
    print("--- 1. Truncating Transactional Tables with RESTART IDENTITY CASCADE ---")
    tables = [
        'StockMovement', 'DeliveryNoteLine', 'DeliveryNote',
        'SalesLine', 'Sales', 'PurchaseLine', 'Purchase',
        'BillwiseAllocation', 'PaymentLine', 'Payment',
        'VoucherLine', 'Voucher', 'RouteExpense', 'LedgerLine',
        'ReceiptNoteLine', 'ReceiptNote', 'ProductPriceAudit'
    ]

    sql = 'TRUNCATE TABLE ' + ', '.join(f'"{t}"' for t in tables) + ' RESTART IDENTITY CASCADE;'
    with connection.cursor() as cursor:
        cursor.execute(sql)
        # Also restart standard sequences explicitly if any exist
        cursor.execute('''
            SELECT sequence_name FROM information_schema.sequences
            WHERE sequence_schema = 'public';
        ''')
        seqs = cursor.fetchall()
        for s in seqs:
            seq_name = s[0]
            cursor.execute(f'ALTER SEQUENCE "{seq_name}" RESTART WITH 1;')
            print(f"Restarted sequence {seq_name} to 1")

    print("--- 2. Resetting Ledger Balances ---")
    update_kwargs = {
        'DebitBalance': Decimal('0.00'),
        'CreditBalance': Decimal('0.00'),
        'CurrentBalance': Decimal('0.00')
    }
    if reset_ledger_opening_to_zero:
        update_kwargs['OpeningBalance'] = Decimal('0.00')
        update_kwargs['OpeningBalanceType'] = 'DR'
    
    updated_count = Ledger.objects.all().update(**update_kwargs)
    print(f"Updated {updated_count} ledgers to clean zero balances.")

    print("--- 3. Verifying Zero Counts ---")
    models = [
        StockMovement, DeliveryNote, DeliveryNoteLine,
        Sales, SalesLine, Purchase, PurchaseLine,
        BillwiseAllocation, Payment, PaymentLine,
        Voucher, VoucherLine, RouteExpense, LedgerLine,
        ReceiptNote, ReceiptNoteLine, ProductPriceAudit
    ]
    for m in models:
        c = m.objects.count()
        print(f"  {m.__name__}: {c} rows")
        assert c == 0, f"Expected 0 rows in {m.__name__}, got {c}"

    print("--- 4. Ledger Summary ---")
    for l in Ledger.objects.all().order_by('LedgerId'):
        print(f"  Ledger #{l.LedgerId} ({l.LedgerName}): OP={l.OpeningBalance} {l.OpeningBalanceType}, Cur={l.CurrentBalance}")

    print("\nSUCCESS: All transactional data cleared and sequences reset to 1 (001)!")

if __name__ == '__main__':
    clear_all_test_data(reset_ledger_opening_to_zero=True)
