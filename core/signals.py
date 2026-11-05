import logging
from django.db.models.signals import post_delete
from django.dispatch import receiver
from django.db.models import Q
from core.models import Purchase, PurchaseLine, DeliveryNote, EndRouteDriver, Sales, StockMovement, Voucher

logger = logging.getLogger(__name__)


@receiver(post_delete, sender=Purchase)
def handle_purchase_deleted(sender, instance, **kwargs):
    """
    When a Purchase invoice is deleted (via API, admin, or code):
    1. Reverses godown stock by deleting all associated StockMovement records.
    2. Cleans up any remaining PurchaseLine records.
    3. Cleans up accounting vouchers and updates ledger balances.
    """
    try:
        p_id = instance.PurchaseId
        p_no = instance.PurchaseNo
        company_id = instance.CompanyId

        # 1. Delete godown stock movements
        deleted_sm, _ = StockMovement.objects.filter(
            Q(TransactionType__iexact='PURCHASE') &
            (Q(ReferenceId=p_id) | Q(TransactionNo=p_no))
        ).delete()
        logger.info(f"Deleted {deleted_sm} StockMovement records for Purchase #{p_no} (ID: {p_id}) from Godown.")

        # 2. Delete purchase lines if any remain
        PurchaseLine.objects.filter(Purchase_id=p_id).delete()

        # 3. Clean up vouchers and ledger balances
        vouchers = Voucher.objects.filter(ReferenceTable='Purchase', ReferenceId=p_id)
        affected_ledgers = set()
        if instance.SupplierLedger_id:
            affected_ledgers.add(instance.SupplierLedger_id)

        for v in vouchers:
            for vl in v.lines.all():
                if vl.Ledger_id:
                    affected_ledgers.add(vl.Ledger_id)
            v.lines.all().delete()
        vouchers.delete()

        if affected_ledgers:
            try:
                from core.views import sync_ledger_balances
                sync_ledger_balances(*affected_ledgers)
            except Exception as e:
                logger.warning(f"Could not sync ledger balances for deleted Purchase #{p_no}: {e}")

    except Exception as e:
        logger.error(f"Error in handle_purchase_deleted for Purchase {getattr(instance, 'PurchaseId', None)}: {e}")


@receiver(post_delete, sender=DeliveryNote)
def handle_delivery_note_deleted(sender, instance, **kwargs):
    """
    When a Delivery Note is deleted:
    Reverses stock movements (restores Godown stock and removes Van load stock).
    """
    try:
        dn_id = instance.DeliveryNoteId
        dn_no = instance.DeliveryNoteNo
        deleted_sm, _ = StockMovement.objects.filter(
            Q(TransactionType__in=['DELIVERY_NOTE', 'RECEIPT_NOTE', 'RECEIPT_NOTE_RETURN']) &
            (Q(ReferenceId=dn_id) | Q(TransactionNo=dn_no))
        ).delete()
        logger.info(f"Deleted {deleted_sm} StockMovement records for DeliveryNote #{dn_no} (ID: {dn_id}).")
    except Exception as e:
        logger.error(f"Error in handle_delivery_note_deleted for DeliveryNote {getattr(instance, 'DeliveryNoteId', None)}: {e}")


@receiver(post_delete, sender=EndRouteDriver)
def handle_end_route_driver_deleted(sender, instance, **kwargs):
    """
    When an EndRouteDriver shift record is deleted/rejected:
    Reverses any shift unload stock movements (both full and empty returns to godown).
    """
    try:
        erd_id = instance.EndRouteDriverId
        deleted_sm, _ = StockMovement.objects.filter(
            ReferenceId=erd_id,
            TransactionType__in=['VAN_UNLOAD_EMPTY', 'GODOWN_RETURN_EMPTY', 'VAN_UNLOAD_FULL', 'GODOWN_RETURN_FULL']
        ).delete()
        logger.info(f"Deleted {deleted_sm} StockMovement records for EndRouteDriver #{erd_id}.")
    except Exception as e:
        logger.error(f"Error in handle_end_route_driver_deleted for EndRouteDriver {getattr(instance, 'EndRouteDriverId', None)}: {e}")


@receiver(post_delete, sender=Sales)
def handle_sales_deleted(sender, instance, **kwargs):
    """
    When a Sales record is deleted:
    Reverses sales stock movements and cancels vouchers.
    """
    try:
        t_no = instance.SalesNo
        s_id = instance.SalesId
        company_id = instance.CompanyId

        # 1. Reverse StockMovement
        StockMovement.objects.filter(
            CompanyId=company_id,
            TransactionNo=t_no
        ).delete()

        # 2. Cancel and clean up Vouchers
        vouchers = Voucher.objects.filter(
            CompanyId=company_id,
            ReferenceTable='Sales',
            ReferenceId=s_id
        )
        affected_ledgers = set()
        if instance.CustomerLedger_id:
            affected_ledgers.add(instance.CustomerLedger_id)

        for v in vouchers:
            for vl in v.lines.all():
                if vl.Ledger_id:
                    affected_ledgers.add(vl.Ledger_id)
            v.lines.all().delete()
        vouchers.delete()

        if affected_ledgers:
            try:
                from core.views import sync_ledger_balances
                sync_ledger_balances(*affected_ledgers)
            except Exception as e:
                logger.warning(f"Could not sync ledger balances for deleted Sale #{t_no}: {e}")

    except Exception as e:
        logger.error(f"Error in handle_sales_deleted for Sale {getattr(instance, 'SalesId', None)}: {e}")

