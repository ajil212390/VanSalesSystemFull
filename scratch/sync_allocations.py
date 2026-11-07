import os, sys, django
sys.path.insert(0, os.path.abspath('.'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from decimal import Decimal
from core.models import BillwiseAllocation, Payment, Sales, VoucherLine
from core.views import sync_sales_billwise_allocation

# 1. Update existing Payment allocations (e.g. Payment 18 for Super Gas)
for ba in BillwiseAllocation.objects.filter(PaymentLine__isnull=False):
    if not ba.ReferenceTable or not ba.ReferenceId:
        pmt = ba.PaymentLine.Payment
        if pmt:
            ba.ReferenceTable = 'Payment'
            ba.ReferenceId = pmt.PaymentId
            ba.save(update_fields=['ReferenceTable', 'ReferenceId'])
            print(f"Updated BillwiseAllocation #{ba.BillwiseAllocationId}: ReferenceTable='Payment', ReferenceId={pmt.PaymentId}")

# 2. Sync allocations for all completed sales that have customer payments
active_sales = Sales.objects.exclude(Status='CANCELLED').filter(PaidAmount__gt=0).order_by('SalesId')
print(f"Found {active_sales.count()} active sales with payments:")

for sale in active_sales:
    # Find matching customer voucher line if shift was settled
    cust_vl = None
    if sale.CustomerLedger_id:
        cust_vl = VoucherLine.objects.filter(
            Voucher__ReferenceTable='Sales',
            Voucher__ReferenceId=sale.SalesId,
            Ledger_id=sale.CustomerLedger_id,
            CreditAmount__gt=0
        ).first()

    sync_sales_billwise_allocation(sale, cust_vl)
    print(f"  Synced Sale #{sale.SalesId} ({sale.SalesNo}): GrandTotal={sale.GrandTotal}, PaidAmount={sale.PaidAmount}, CustVL={getattr(cust_vl, 'VoucherLineId', None)}")

print("\n--- Current All Rows in BillwiseAllocation ---")
all_bas = BillwiseAllocation.objects.all().order_by('BillwiseAllocationId')
for b in all_bas:
    print(f"ID={b.BillwiseAllocationId} | RefTable={b.ReferenceTable} | RefId={b.ReferenceId} | BillType={b.BillType} | BillRef={b.BillReference} | Date={b.BillDate} | Type={b.AllocationType} | Amt={b.AllocatedAmount} | PmtLine={b.PaymentLine_id} | RcptLine={b.ReceiptLineId}")

