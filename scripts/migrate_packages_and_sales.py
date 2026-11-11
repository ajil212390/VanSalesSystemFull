import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection

def run_migration():
    with connection.cursor() as cur:
        # 1. Add columns to Sales if not present
        cur.execute('''
            ALTER TABLE "Sales" 
            ADD COLUMN IF NOT EXISTS "IsApproved" BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS "IsEdited" BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS "EditedBy" VARCHAR(150) NULL,
            ADD COLUMN IF NOT EXISTS "EditedAt" TIMESTAMP WITH TIME ZONE NULL,
            ADD COLUMN IF NOT EXISTS "EditReason" VARCHAR(500) NULL;
        ''')
        
        # Mark existing completed/settled or office sales as approved
        cur.execute('''
            UPDATE "Sales"
            SET "IsApproved" = TRUE
            WHERE "Status" IN ('COMPLETED', 'SETTLED', 'APPROVED')
               OR "RouteVehicleDriverId" = 1
               OR "ApprovedById" IS NOT NULL;
        ''')

        # 2. Create SaleEditHistory table
        cur.execute('''
            CREATE TABLE IF NOT EXISTS "SaleEditHistory" (
                "EditId" BIGSERIAL PRIMARY KEY,
                "SalesId" BIGINT NOT NULL REFERENCES "Sales"("SalesId") ON DELETE CASCADE,
                "EditedBy" VARCHAR(150) NOT NULL,
                "EditedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                "OldGrandTotal" NUMERIC(18,2) DEFAULT 0,
                "NewGrandTotal" NUMERIC(18,2) DEFAULT 0,
                "OldPaymentMethod" VARCHAR(50) NULL,
                "NewPaymentMethod" VARCHAR(50) NULL,
                "Notes" VARCHAR(500) NULL,
                "CompanyId" BIGINT DEFAULT 1
            );
        ''')

        # 3. Create ConnectionPackage table
        cur.execute('''
            CREATE TABLE IF NOT EXISTS "ConnectionPackage" (
                "PackageId" BIGSERIAL PRIMARY KEY,
                "PackageName" VARCHAR(200) NOT NULL,
                "Description" TEXT NULL,
                "CylinderProductId" BIGINT NULL REFERENCES "Product"("ProductId") ON DELETE SET NULL,
                "CylinderQty" NUMERIC(10,2) DEFAULT 1,
                "CylinderRate" NUMERIC(18,2) DEFAULT 0,
                "LaborCharge" NUMERIC(18,2) DEFAULT 0,
                "LaborDescription" VARCHAR(200) DEFAULT 'Fitting / Installation Charge',
                "TotalAmount" NUMERIC(18,2) DEFAULT 0,
                "IsActive" BOOLEAN DEFAULT TRUE,
                "CompanyId" BIGINT DEFAULT 1,
                "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                "UpdatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        ''')

        # 4. Create ConnectionPackageItem table
        cur.execute('''
            CREATE TABLE IF NOT EXISTS "ConnectionPackageItem" (
                "PackageItemId" BIGSERIAL PRIMARY KEY,
                "PackageId" BIGINT NOT NULL REFERENCES "ConnectionPackage"("PackageId") ON DELETE CASCADE,
                "ProductId" BIGINT NOT NULL REFERENCES "Product"("ProductId") ON DELETE RESTRICT,
                "Quantity" NUMERIC(10,2) DEFAULT 1,
                "UnitPrice" NUMERIC(18,2) DEFAULT 0,
                "TaxPercent" NUMERIC(5,2) DEFAULT 0,
                "TotalAmount" NUMERIC(18,2) DEFAULT 0,
                "CompanyId" BIGINT DEFAULT 1
            );
        ''')

    print("SUCCESS: Database tables and columns created successfully!")

if __name__ == '__main__':
    run_migration()
