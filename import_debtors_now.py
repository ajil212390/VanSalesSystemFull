import os
import sys
import csv
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Ledger, Route, Group
from decimal import Decimal

def import_debtors():
    csv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sundry_debtors_import.csv')
    if not os.path.exists(csv_path):
        print(f"File not found: {csv_path}")
        return

    group = Group.objects.filter(GroupId=21).first()
    if not group:
        group = Group.objects.filter(GroupName__iexact='Sundry Debtors').first()
    
    print(f"Target Group: {group.GroupName} (ID: {group.GroupId})")

    created_count = 0
    updated_count = 0

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            code = (row.get('CustomerCode') or '').strip()
            name = (row.get('LedgerName') or '').strip()
            op_bal = Decimal(row.get('OpeningBalance') or '0.00')
            op_type = (row.get('OpeningBalanceType') or 'DR').strip().upper()
            curr_bal = Decimal(row.get('CurrentBalance') or '0.00')
            route_id = int(row.get('RouteId')) if row.get('RouteId') else None

            # Check if ledger already exists by CustomerCode or LedgerName
            existing = None
            if code:
                existing = Ledger.objects.filter(CustomerCode=code).first()
            if not existing:
                existing = Ledger.objects.filter(LedgerName=name, Group_id=group.GroupId).first()

            if existing:
                # Update details & opening balance
                existing.CustomerCode = code
                existing.OpeningBalance = op_bal
                existing.OpeningBalanceType = op_type
                existing.CurrentBalance = curr_bal
                existing.Route_id = route_id
                existing.save()
                updated_count += 1
            else:
                # Create new
                Ledger.objects.create(
                    LedgerName=name,
                    CustomerCode=code,
                    Group=group,
                    OpeningBalance=op_bal,
                    OpeningBalanceType=op_type,
                    DebitBalance=Decimal('0.00'),
                    CreditBalance=Decimal('0.00'),
                    CurrentBalance=curr_bal,
                    IsBillWise=False,
                    CreditPeriodDays=0,
                    CreditLimit=Decimal('0.00'),
                    EmptyStockLimit=Decimal('0.00'),
                    IsActive=True,
                    IsSystem=False,
                    CompanyId=1,
                    DeliveryFrequencyDays=15,
                    Route_id=route_id
                )
                created_count += 1

    print(f"\nImport Completed Successfully!")
    print(f" - Created new ledgers: {created_count}")
    print(f" - Updated existing ledgers: {updated_count}")
    print(f" - Total processed: {created_count + updated_count}")

if __name__ == '__main__':
    import_debtors()
