import os
import sys
from pathlib import Path
from decimal import Decimal
from datetime import date

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import transaction
from core.models import (
    Company, State, Product, Unit, Driver, Vehicle, Route,
    RouteVehicleDriver, Group, Ledger, LedgerLine,
    StockMovement, DeliveryNote, DeliveryNoteLine,
    Sales, SalesLine, Purchase, PurchaseLine,
    BillwiseAllocation, Payment, PaymentLine,
    Voucher, VoucherLine, RouteExpense
)
from core.views import sync_ledger_balances

def seed_data_from_zero():
    print("=== Seeding Fresh Data Starting From 001 ===")
    company = Company.objects.first()
    company_id = company.CompanyId if company else 1

    with transaction.atomic():
        # 1. Opening Balances on Ledgers
        print("1. Setting Clean Opening Balances...")
        ledger_map = {l.LedgerName: l for l in Ledger.objects.all()}

        # Debits
        cash_led = ledger_map['Cash']
        cash_led.OpeningBalance = Decimal('10000.00')
        cash_led.OpeningBalanceType = 'DR'
        cash_led.save()

        sbi_led = ledger_map['SBI']
        sbi_led.OpeningBalance = Decimal('50000.00')
        sbi_led.OpeningBalanceType = 'DR'
        sbi_led.save()

        cust1 = ledger_map['Customer-1']
        cust1.OpeningBalance = Decimal('2000.00')
        cust1.OpeningBalanceType = 'DR'
        cust1.save()

        cust2 = ledger_map['Customer-2']
        cust2.OpeningBalance = Decimal('1000.00')
        cust2.OpeningBalanceType = 'DR'
        cust2.save()

        # Credits
        super_gas = ledger_map['Super Gas']
        super_gas.OpeningBalance = Decimal('15000.00')
        super_gas.OpeningBalanceType = 'CR'
        super_gas.save()

        capital_led = ledger_map["Partner's Capital Account"]
        capital_led.OpeningBalance = Decimal('48000.00')
        capital_led.OpeningBalanceType = 'CR'
        capital_led.save()

        # Total DR: 10000 + 50000 + 2000 + 1000 = 63000
        # Total CR: 15000 + 48000 = 63000
        # Perfect double-entry trial balance at opening!

        # 2. Central Godown Opening Stock (RVD 1)
        print("2. Populating Initial Godown Stock for all 3 products...")
        unit = Unit.objects.filter(UnitName__icontains='CYL').first() or Unit.objects.first()
        products = list(Product.objects.all().order_by('ProductId'))

        for p in products:
            # Filled Opening Stock: 50 cylinders
            StockMovement.objects.create(
                CompanyId=company_id,
                Product=p,
                Unit=unit,
                RouteVehicleDriverId=1,
                TransactionType='OPENING_STOCK',
                ReferenceId=p.ProductId,
                TransactionNo='OP-GODOWN-001',
                TransactionDate=date.today(),
                InQty=Decimal('50.00'),
                InCostRate=p.PurchasePrice or Decimal('500.00'),
                InCostAmount=Decimal('50.00') * (p.PurchasePrice or Decimal('500.00')),
                Narration=f"Opening Filled Stock - {p.ProductName}"
            )
            # Empty Opening Stock: 10 cylinders
            StockMovement.objects.create(
                CompanyId=company_id,
                Product=p,
                Unit=unit,
                RouteVehicleDriverId=1,
                TransactionType='OPENING_EMPTY',
                ReferenceId=p.ProductId,
                TransactionNo='OP-GODOWN-EMPTY-001',
                TransactionDate=date.today(),
                InQty=Decimal('10.00'),
                InCostRate=Decimal('0.00'),
                InCostAmount=Decimal('0.00'),
                Narration=f"Opening Empty Stock - {p.ProductName}"
            )

        # 3. Delivery Note #DN-0001 (Loading Van KL48K5255 / Ajil, RVD 11)
        print("3. Creating Delivery Note #DN-0001 (Van Loading)...")
        rvd = RouteVehicleDriver.objects.filter(RouteVehicleDriverId=11).first() or RouteVehicleDriver.objects.exclude(RouteVehicleDriverId=1).first()
        dn = DeliveryNote.objects.create(
            DeliveryNoteNo='DN-0001',
            DeliveryDate=date.today(),
            RouteVehicleDriver=rvd,
            CompanyId=company_id,
            Remarks='Morning Van Stock Loading',
            Status='LOADED'
        )

        for p in products:
            qty = Decimal('10.00')
            rate = p.SalesPrice or Decimal('700.00')
            line = DeliveryNoteLine.objects.create(
                DeliveryNote=dn,
                Product=p,
                Unit=unit,
                Quantity=qty,
                Rate=rate,
                Amount=qty * rate
            )
            # Out from Central Godown (RouteVehicleDriverId=1)
            StockMovement.objects.create(
                CompanyId=company_id,
                Product=p,
                Unit=unit,
                RouteVehicleDriverId=1,
                TransactionType='DELIVERY_NOTE',
                ReferenceId=dn.DeliveryNoteId,
                ReferenceLineId=line.DeliveryNoteLineId,
                TransactionNo=dn.DeliveryNoteNo,
                TransactionDate=date.today(),
                InQty=Decimal('0.00'),
                OutQty=qty,
                OutCostRate=rate,
                OutCostAmount=qty * rate,
                Narration=f"Van Load Out from Central Godown - {dn.DeliveryNoteNo}"
            )
            # In to Van Allocation (RouteVehicleDriverId=rvd.RouteVehicleDriverId)
            StockMovement.objects.create(
                CompanyId=company_id,
                Product=p,
                Unit=unit,
                RouteVehicleDriverId=rvd.RouteVehicleDriverId,
                TransactionType='DELIVERY_NOTE',
                ReferenceId=dn.DeliveryNoteId,
                ReferenceLineId=line.DeliveryNoteLineId,
                TransactionNo=dn.DeliveryNoteNo,
                TransactionDate=date.today(),
                InQty=qty,
                OutQty=Decimal('0.00'),
                Narration=f"Van Load In to {rvd.Vehicle.VehicleNumber} - {dn.DeliveryNoteNo}"
            )

        # 4. Route Sale #DT-261106-001 to Customer-1 (Matches user's handwritten bill!)
        print("4. Creating Route Sale #DT-261106-001 (Matching Handwritten Bill)...")
        p_17kg = Product.objects.filter(ProductName__icontains='17').first() or products[0]
        today_str = date.today().strftime('%y%m%d')
        sales_no = f"DT-{today_str}-001"

        sale = Sales.objects.create(
            SalesNo=sales_no,
            InvoiceNo=sales_no,
            SalesDate=date.today(),
            CustomerLedger=cust1,
            RouteVehicleDriver=rvd,
            SubTotal=Decimal('666.67'),
            TaxAmount=Decimal('33.34'),
            GrandTotal=Decimal('700.00'),
            PaidAmount=Decimal('1000.00'),
            RoundOff=Decimal('-0.01'),
            TotalDeliveredQty=Decimal('1.00'),
            TotalEmptyQty=Decimal('1.00'),
            PaymentMethod='Cash',
            Status='APPROVED',
            CompanyId=company_id,
            RouteName=rvd.Route.RouteName if rvd.Route else '',
            VehicleName=rvd.Vehicle.VehicleNumber if rvd.Vehicle else '',
            DriverName=rvd.Driver.DriverName if rvd.Driver else '',
            Notes='1 Return Qty. (Payment: CASH)'
        )

        SalesLine.objects.create(
            Sales=sale,
            LineNo=1,
            Product=p_17kg,
            ProductName=p_17kg.ProductName,
            Unit=unit,
            Quantity=Decimal('1.00'),
            EmptyQuantity=Decimal('1.00'),
            SalesPrice=Decimal('666.67'),
            TaxPercent=Decimal('5.00'),
            TaxAmount=Decimal('33.34'),
            Total=Decimal('700.00'),
            CompanyId=company_id
        )

        # Van Sale Stock Movement (Delivered full out of van, empty into van)
        StockMovement.objects.create(
            CompanyId=company_id,
            Product=p_17kg,
            Unit=unit,
            RouteVehicleDriverId=rvd.RouteVehicleDriverId,
            TransactionType='VAN_SALE',
            ReferenceId=sale.SalesId,
            TransactionNo=sale.SalesNo,
            TransactionDate=date.today(),
            OutQty=Decimal('1.00'),
            Narration=f"Van Delivery to {cust1.LedgerName}"
        )
        StockMovement.objects.create(
            CompanyId=company_id,
            Product=p_17kg,
            Unit=unit,
            RouteVehicleDriverId=rvd.RouteVehicleDriverId,
            TransactionType='VAN_EMPTY_RETURN',
            ReferenceId=sale.SalesId,
            TransactionNo=sale.SalesNo,
            TransactionDate=date.today(),
            InQty=Decimal('1.00'),
            Narration=f"Empty Return from {cust1.LedgerName}"
        )

        # Double-entry Vouchers for Sale:
        # A) Sales Invoice Voucher:
        #    Debit Customer-1: 700.00
        #    Credit Sales: 666.67
        #    Credit CGST Output: 16.67
        #    Credit SGST Output: 16.67
        #    Debit Round Off: 0.01 (or credit)
        sales_led = ledger_map['Sales']
        cgst_out = ledger_map['CGST Output']
        sgst_out = ledger_map['SGST Output']

        vch_sale = Voucher.objects.create(
            VoucherNo=f"SALE-VCH-{sale.SalesId}",
            VoucherType='SALES',
            VoucherDate=date.today(),
            ReferenceId=sale.SalesId,
            ReferenceTable='Sales',
            CompanyId=company_id,
            Narration=f"Sales Bill {sale.SalesNo} to {cust1.LedgerName}"
        )
        VoucherLine.objects.create(Voucher=vch_sale, LineNo=1, Ledger=cust1, DebitAmount=Decimal('700.00'), CreditAmount=Decimal('0.00'))
        VoucherLine.objects.create(Voucher=vch_sale, LineNo=2, Ledger=sales_led, DebitAmount=Decimal('0.00'), CreditAmount=Decimal('666.67'))
        VoucherLine.objects.create(Voucher=vch_sale, LineNo=3, Ledger=cgst_out, DebitAmount=Decimal('0.00'), CreditAmount=Decimal('16.67'))
        VoucherLine.objects.create(Voucher=vch_sale, LineNo=4, Ledger=sgst_out, DebitAmount=Decimal('0.00'), CreditAmount=Decimal('16.66'))

        # B) Cash Collection Receipt: Customer paid 1,000 cash!
        #    Debit Cash: 1000.00
        #    Credit Customer-1: 1000.00
        pay_sale = Payment.objects.create(
            PartyLedger=cust1,
            Amount=Decimal('1000.00'),
            Narration=f"Route cash collection for {sale.SalesNo}"
        )
        PaymentLine.objects.create(
            Payment=pay_sale,
            LineNo=1,
            Ledger=cash_led,
            Amount=Decimal('1000.00'),
            PaymentMode='CASH'
        )
        vch_rec = Voucher.objects.create(
            VoucherNo=f"REC-VCH-{pay_sale.PaymentId}",
            VoucherType='RECEIPT',
            VoucherDate=date.today(),
            ReferenceId=pay_sale.PaymentId,
            ReferenceTable='Payment',
            CompanyId=company_id,
            Narration=f"Receipt from {cust1.LedgerName} for {sale.SalesNo}"
        )
        VoucherLine.objects.create(Voucher=vch_rec, LineNo=1, Ledger=cash_led, DebitAmount=Decimal('1000.00'), CreditAmount=Decimal('0.00'))
        VoucherLine.objects.create(Voucher=vch_rec, LineNo=2, Ledger=cust1, DebitAmount=Decimal('0.00'), CreditAmount=Decimal('1000.00'))

        # 5. Purchase #PUR-0001 (Godown Replenishment from Kerala IOCL Depot)
        print("5. Creating Purchase #PUR-0001 (Godown Stock Purchase)...")
        iocl_depot = ledger_map['Kerala IOCL Depot']
        pur_led = ledger_map['Purchase']
        cgst_in = ledger_map['CGST Input']
        sgst_in = ledger_map['SGST Input']

        purchase = Purchase.objects.create(
            PurchaseNo='PUR-0001',
            InvoiceNo='IOCL-INV-101',
            PurchaseDate=date.today(),
            SupplierLedger=iocl_depot,
            PartyName=iocl_depot.LedgerName,
            PartyState='Kerala',
            SubTotal=Decimal('12000.00'),
            TaxAmount=Decimal('2160.00'),
            GrandTotal=Decimal('14160.00'),
            RoundOff=Decimal('0.00'),
            CompanyId=company_id,
            Notes='Initial Godown Stock Purchase'
        )

        PurchaseLine.objects.create(
            Purchase=purchase,
            LineNo=1,
            Product=p_17kg,
            ProductName=p_17kg.ProductName,
            Unit=unit,
            Quantity=Decimal('20.00'),
            CostPrice=Decimal('600.00'),
            TaxPercent=Decimal('18.00'),
            TaxAmount=Decimal('2160.00'),
            Total=Decimal('14160.00'),
            CompanyId=company_id
        )

        # Godown Inwards Stock
        StockMovement.objects.create(
            CompanyId=company_id,
            Product=p_17kg,
            Unit=unit,
            RouteVehicleDriverId=1,
            TransactionType='PURCHASE',
            ReferenceId=purchase.PurchaseId,
            TransactionNo=purchase.PurchaseNo,
            TransactionDate=date.today(),
            InQty=Decimal('20.00'),
            InCostRate=Decimal('600.00'),
            InCostAmount=Decimal('12000.00'),
            Narration=f"Purchase from {iocl_depot.LedgerName}"
        )

        # Purchase Voucher:
        # Debit Purchase: 12000.00
        # Debit CGST Input: 1080.00
        # Debit SGST Input: 1080.00
        # Credit Kerala IOCL Depot: 14160.00
        vch_pur = Voucher.objects.create(
            VoucherNo=f"PUR-VCH-{purchase.PurchaseId}",
            VoucherType='PURCHASE',
            VoucherDate=date.today(),
            ReferenceId=purchase.PurchaseId,
            ReferenceTable='Purchase',
            CompanyId=company_id,
            Narration=f"Purchase Invoice {purchase.PurchaseNo} from {iocl_depot.LedgerName}"
        )
        VoucherLine.objects.create(Voucher=vch_pur, LineNo=1, Ledger=iocl_depot, DebitAmount=Decimal('0.00'), CreditAmount=Decimal('14160.00'))
        VoucherLine.objects.create(Voucher=vch_pur, LineNo=2, Ledger=pur_led, DebitAmount=Decimal('12000.00'), CreditAmount=Decimal('0.00'))
        VoucherLine.objects.create(Voucher=vch_pur, LineNo=3, Ledger=cgst_in, DebitAmount=Decimal('1080.00'), CreditAmount=Decimal('0.00'))
        VoucherLine.objects.create(Voucher=vch_pur, LineNo=4, Ledger=sgst_in, DebitAmount=Decimal('1080.00'), CreditAmount=Decimal('0.00'))

        # 6. Supplier Payment #PMT-0001 to Super Gas from SBI
        print("6. Creating Bank Payment #PMT-0001 (Settling Super Gas Opening Balance)...")
        pmt_sup = Payment.objects.create(
            PartyLedger=super_gas,
            Amount=Decimal('15000.00'),
            Narration="Settling opening balance via SBI Cheque"
        )
        PaymentLine.objects.create(
            Payment=pmt_sup,
            LineNo=1,
            Ledger=sbi_led,
            Amount=Decimal('15000.00'),
            PaymentMode='CHEQUE',
            BankName='State Bank of India',
            InstrumentNumber='CHQ-980112'
        )
        vch_sup = Voucher.objects.create(
            VoucherNo=f"PMT-VCH-{pmt_sup.PaymentId}",
            VoucherType='PAYMENT',
            VoucherDate=date.today(),
            ReferenceId=pmt_sup.PaymentId,
            ReferenceTable='Payment',
            CompanyId=company_id,
            Narration=f"Payment to {super_gas.LedgerName}"
        )
        VoucherLine.objects.create(Voucher=vch_sup, LineNo=1, Ledger=super_gas, DebitAmount=Decimal('15000.00'), CreditAmount=Decimal('0.00'))
        VoucherLine.objects.create(Voucher=vch_sup, LineNo=2, Ledger=sbi_led, DebitAmount=Decimal('0.00'), CreditAmount=Decimal('15000.00'))

        # 7. Sync all ledger balances
        print("7. Recalculating and Synchronizing Ledger Balances...")
        sync_ledger_balances()

    print("\n=== Fresh Data Seeding Completed Successfully! ===")

if __name__ == '__main__':
    seed_data_from_zero()
