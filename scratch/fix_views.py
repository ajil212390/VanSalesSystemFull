with open('core/views.py', 'r', encoding='utf-8') as f:
    text = f.read()

block1 = """    def perform_update(self, serializer):
        sale = serializer.save()
        if sale.Status == 'CANCELLED':
            BillwiseAllocation.objects.filter(ReferenceTable='Sales', ReferenceId=sale.SalesId).delete()
        elif sale.PaidAmount and sale.PaidAmount > 0 and sale.CustomerLedger:
            sync_sales_billwise_allocation(sale, None)

    def perform_destroy(self, instance):
        BillwiseAllocation.objects.filter(ReferenceTable='Sales', ReferenceId=instance.SalesId).delete()
        instance.delete().order_by('-PurchaseDate', '-PurchaseId')"""

target1 = "        return qs\n\n" + block1
replacement1 = "        return qs.order_by('-PurchaseDate', '-PurchaseId')"

block2 = """    def perform_update(self, serializer):
        sale = serializer.save()
        if sale.Status == 'CANCELLED':
            BillwiseAllocation.objects.filter(ReferenceTable='Sales', ReferenceId=sale.SalesId).delete()
        elif sale.PaidAmount and sale.PaidAmount > 0 and sale.CustomerLedger:
            sync_sales_billwise_allocation(sale, None)

    def perform_destroy(self, instance):
        BillwiseAllocation.objects.filter(ReferenceTable='Sales', ReferenceId=instance.SalesId).delete()
        instance.delete().order_by('-PaymentId')"""

target2 = "        return qs\n\n" + block2
replacement2 = "        return qs.order_by('-PaymentId')"

block3 = """    def perform_update(self, serializer):
        sale = serializer.save()
        if sale.Status == 'CANCELLED':
            BillwiseAllocation.objects.filter(ReferenceTable='Sales', ReferenceId=sale.SalesId).delete()
        elif sale.PaidAmount and sale.PaidAmount > 0 and sale.CustomerLedger:
            sync_sales_billwise_allocation(sale, None)

    def perform_destroy(self, instance):
        BillwiseAllocation.objects.filter(ReferenceTable='Sales', ReferenceId=instance.SalesId).delete()
        instance.delete().order_by('BillDate', 'LedgerLineId')"""

target3 = "        return qs\n\n" + block3
replacement3 = "        return qs.order_by('BillDate', 'LedgerLineId')"

print('block1 in text:', block1 in text)
print('block2 in text:', block2 in text)
print('block3 in text:', block3 in text)

if block1 in text:
    text = text.replace(target1 if target1 in text else block1, replacement1)
if block2 in text:
    text = text.replace(target2 if target2 in text else block2, replacement2)
if block3 in text:
    text = text.replace(target3 if target3 in text else block3, replacement3)

with open('core/views.py', 'w', encoding='utf-8') as f:
    f.write(text)

print('Done fixing!')

