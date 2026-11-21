from django.db import migrations


def add_customercode_to_ledger(apps, schema_editor):
    with schema_editor.connection.cursor() as cursor:
        # Add CustomerCode column to Ledger table if not exists (nullable by default)
        cursor.execute('''
            ALTER TABLE "Ledger" ADD COLUMN IF NOT EXISTS "CustomerCode" VARCHAR(50);
        ''')


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_advanceadjustment_billwiseallocation_and_more'),
    ]

    operations = [
        migrations.RunPython(add_customercode_to_ledger, reverse_code=migrations.RunPython.noop),
    ]
