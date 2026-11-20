from django.db import migrations


def add_qr_and_drop_unique_bank(apps, schema_editor):
    with schema_editor.connection.cursor() as cursor:
        # 1. Add QRCodeLocation column if not exists
        cursor.execute('''
            ALTER TABLE "PaymentGroup" ADD COLUMN IF NOT EXISTS "QRCodeLocation" VARCHAR(500);
        ''')

        # 2. Drop any unique constraint on BankLedgerId if it exists
        cursor.execute('''
            DO $$
            DECLARE
                r RECORD;
            BEGIN
                FOR r IN (
                    SELECT conname 
                    FROM pg_constraint c
                    JOIN pg_class t ON c.conrelid = t.oid
                    WHERE t.relname = 'PaymentGroup' AND c.contype = 'u'
                    AND EXISTS (
                        SELECT 1 FROM pg_attribute a 
                        WHERE a.attrelid = t.oid AND a.attnum = ANY(c.conkey) AND a.attname = 'BankLedgerId'
                    )
                ) LOOP
                    EXECUTE 'ALTER TABLE "PaymentGroup" DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
                END LOOP;

                FOR r IN (
                    SELECT indexname 
                    FROM pg_indexes 
                    WHERE tablename = 'PaymentGroup' AND indexdef LIKE '%BankLedgerId%' AND indexdef LIKE '%UNIQUE%'
                ) LOOP
                    EXECUTE 'DROP INDEX IF EXISTS ' || quote_ident(r.indexname);
                END LOOP;
            END $$;
        ''')


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(add_qr_and_drop_unique_bank, reverse_code=migrations.RunPython.noop),
    ]
