import os, sys
sys.path.insert(0, 'd:/FUTUREGASBACKEND')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()
from django.db import connection

c = connection.cursor()
for t in ['Receipt', 'ReceiptLine']:
    c.execute(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name='{t}'")
    print(f"\n--- {t} ---")
    for col, dtype in c.fetchall():
        print(f"  {col}: {dtype}")

c.execute("SELECT COUNT(*) FROM \"Receipt\"")
print("\nReceipt count:", c.fetchone()[0])
c.execute("SELECT COUNT(*) FROM \"Payment\"")
print("Payment count:", c.fetchone()[0])
