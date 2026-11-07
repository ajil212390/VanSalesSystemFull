import os, sys, django
sys.path.insert(0, os.path.abspath('.'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django.db import connection

with connection.cursor() as cursor:
    cursor.execute('ALTER TABLE "BillwiseAllocation" ADD COLUMN IF NOT EXISTS "ReferenceTable" character varying(50);')
    cursor.execute('ALTER TABLE "BillwiseAllocation" ADD COLUMN IF NOT EXISTS "ReferenceId" bigint;')
    print('Columns ReferenceTable and ReferenceId added successfully!')
    
    cursor.execute('''
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'BillwiseAllocation'
        ORDER BY ordinal_position;
    ''')
    for row in cursor.fetchall():
        print(' ', row)
