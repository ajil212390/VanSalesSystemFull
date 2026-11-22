from django.apps import AppConfig


class CoreConfig(AppConfig):
    name = 'core'

    def ready(self):
        import core.signals  # noqa
        try:
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("""
                    ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "PaymentNo" varchar(100);
                    ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "ReferenceNumber" varchar(100);
                    ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "Status" varchar(50) DEFAULT 'APPROVED';
                    ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "DeliveryNoteId" bigint;
                    UPDATE "Payment" SET "Status" = 'APPROVED' WHERE "Status" IS NULL;
                """)
        except Exception as e:
            pass
