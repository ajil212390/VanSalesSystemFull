from django.db import migrations


def add_routeid_to_ledger(apps, schema_editor):
    with schema_editor.connection.cursor() as cursor:
        # Add RouteId column to Ledger table if not exists
        cursor.execute('''
            ALTER TABLE "Ledger" ADD COLUMN IF NOT EXISTS "RouteId" BIGINT;
        ''')
        # Add foreign key constraint to Route table if not already added
        cursor.execute('''
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'fk_ledger_route'
                ) THEN
                    BEGIN
                        ALTER TABLE "Ledger" ADD CONSTRAINT fk_ledger_route FOREIGN KEY ("RouteId") REFERENCES "Route"("RouteId") ON DELETE SET NULL;
                    EXCEPTION
                        WHEN duplicate_object THEN NULL;
                    END;
                END IF;
            END $$;
        ''')


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_paymentgroup_qr_and_unique_bank'),
    ]

    operations = [
        migrations.RunPython(add_routeid_to_ledger, reverse_code=migrations.RunPython.noop),
    ]
