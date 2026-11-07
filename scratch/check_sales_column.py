import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    cursor.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'Sales'
        ORDER BY ordinal_position;
    """)
    rows = cursor.fetchall()
    print("Columns in PostgreSQL 'Sales' table:")
    for r in rows:
        print(f"  {r[0]} ({r[1]})")

    # Check if PaidAmount already exists
    col_names = [r[0] for r in rows]
    if 'PaidAmount' not in col_names:
        print("\nAdding PaidAmount column to Sales table via ALTER TABLE...")
        cursor.execute('ALTER TABLE "Sales" ADD COLUMN "PaidAmount" numeric(18,2) DEFAULT 0.00 NOT NULL;')
        print("Column 'PaidAmount' successfully added to 'Sales' table!")
    else:
        print("\nColumn 'PaidAmount' already exists in 'Sales' table.")

