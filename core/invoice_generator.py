import os
import io
import re
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Register TrueType font if available for crisp rendering
FONT_NAME = 'Helvetica'
FONT_BOLD = 'Helvetica-Bold'
try:
    windows_arial = r'C:\Windows\Fonts\arial.ttf'
    windows_arial_bold = r'C:\Windows\Fonts\arialbd.ttf'
    if os.path.exists(windows_arial) and os.path.exists(windows_arial_bold):
        pdfmetrics.registerFont(TTFont('AppArial', windows_arial))
        pdfmetrics.registerFont(TTFont('AppArialBold', windows_arial_bold))
        FONT_NAME = 'AppArial'
        FONT_BOLD = 'AppArialBold'
except Exception:
    pass

# Theme Colors (Future Gas Burgundy Palette)
PRIMARY_COLOR = colors.HexColor('#800020')     # Burgundy
DARK_COLOR = colors.HexColor('#0F172A')        # Dark Slate
MUTED_COLOR = colors.HexColor('#64748B')       # Muted Slate
LIGHT_BG = colors.HexColor('#F8FAFC')          # Clean off-white
CARD_BG = colors.HexColor('#FDF2F4')           # Soft burgundy tint
BORDER_COLOR = colors.HexColor('#CBD5E1')      # Subtle border
SUCCESS_COLOR = colors.HexColor('#166534')     # Dark Green


def amount_to_words(amount):
    """Converts a numeric amount to Indian Currency words."""
    ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
            "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
    tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

    def num_to_words_below_1000(n):
        if n == 0:
            return ""
        elif n < 20:
            return ones[n]
        elif n < 100:
            return tens[n // 10] + (" " + ones[n % 10] if n % 10 != 0 else "")
        else:
            return ones[n // 100] + " Hundred" + (" and " + num_to_words_below_1000(n % 100) if n % 100 != 0 else "")

    try:
        amt = float(amount)
    except (ValueError, TypeError):
        amt = 0.0

    rupees = int(amt)
    paise = int(round((amt - rupees) * 100))

    if rupees == 0 and paise == 0:
        return "Zero Rupees Only"

    parts = []
    crore = rupees // 10000000
    rupees %= 10000000
    lakh = rupees // 100000
    rupees %= 100000
    thousand = rupees // 1000
    rupees %= 1000

    if crore > 0:
        parts.append(f"{num_to_words_below_1000(crore)} Crore")
    if lakh > 0:
        parts.append(f"{num_to_words_below_1000(lakh)} Lakh")
    if thousand > 0:
        parts.append(f"{num_to_words_below_1000(thousand)} Thousand")
    if rupees > 0:
        parts.append(num_to_words_below_1000(rupees))

    res = " ".join(parts).strip() + " Rupees"
    if paise > 0:
        res += f" and {num_to_words_below_1000(paise)} Paise"
    return res + " Only"


def generate_tax_invoice_pdf(sale):
    """
    Generates a professional GST Tax Invoice PDF for a Sales model instance,
    strictly adhering to the requested layout:
    1. Header: Company & Tax Invoice title with metadata.
    2. Items Table: Sl no. | Particular | HSN | Qty | Rate | Amount.
    3. Tax Breakdown: Gross Amount (Taxable SubTotal), GST (CGST, SGST, IGST, Total GST), Net Amount.
    4. Customer Outstanding Ledger Summary: Previous Bill pending, Current, Paid, Balance.
    5. Narration: Return Qty & payment remarks.
    6. Footer: Terms & Authorized Signatory.
    """
    from core.models import Company, Voucher, VoucherLine, State
    from django.db.models import Q, Sum

    # Company Information
    company = Company.objects.filter(CompanyId=sale.CompanyId).first() or Company.objects.first()
    company_name = company.Name if company else "FUTURE GAS"
    company_addr = f"{company.AddressLine1 or ''}, {company.AddressLine2 or ''}, {company.AddressLine3 or ''} - {company.Pincode or ''}".strip(', -')
    company_gstin = company.GstNo or "32ABCDE1234F1Z5"
    company_phone = company.Phone or "9876543210"
    company_email = company.Email or "info@futuregas.com"

    # Customer Information
    customer = sale.CustomerLedger
    state_obj = State.objects.filter(StateId=customer.StateId).first() if (customer and customer.StateId) else None
    state_name = state_obj.StateName if state_obj else 'Kerala'
    state_code = state_obj.GSTStateCode if (state_obj and state_obj.GSTStateCode) else (customer.StateId if (customer and customer.StateId) else 32)
    cust_name = customer.LedgerName if customer else "Direct Customer"
    if sale.Notes and "Customer: " in sale.Notes and not customer:
        cust_name = sale.Notes.split("Customer: ")[-1].strip()

    cust_phone = ""
    if customer and hasattr(customer, 'Phone') and customer.Phone:
        cust_phone = str(customer.Phone)
    elif hasattr(sale, 'CustomerPhone') and sale.CustomerPhone:
        cust_phone = str(sale.CustomerPhone)

    cust_addr = "Kozhikode, Kerala"
    if customer and hasattr(customer, 'Address') and customer.Address:
        cust_addr = str(customer.Address)

    cust_gstin = "Unregistered / Consumer"
    if customer and hasattr(customer, 'GSTIN') and customer.GSTIN:
        cust_gstin = str(customer.GSTIN)

    # Document setup: A4 with 25pt margins (Printable width: 545pt)
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=25,
        rightMargin=25,
        topMargin=22,
        bottomMargin=22
    )

    story = []
    styles = getSampleStyleSheet()

    # Typography Styles
    c_title = ParagraphStyle(
        'CompanyTitle', parent=styles['Normal'],
        fontName=FONT_BOLD, fontSize=18, leading=22, textColor=PRIMARY_COLOR
    )
    c_sub = ParagraphStyle(
        'CompanySub', parent=styles['Normal'],
        fontName=FONT_NAME, fontSize=8.5, leading=12, textColor=MUTED_COLOR
    )
    inv_badge = ParagraphStyle(
        'InvoiceBadge', parent=styles['Normal'],
        fontName=FONT_BOLD, fontSize=12, leading=15, alignment=2, textColor=PRIMARY_COLOR
    )
    inv_meta = ParagraphStyle(
        'InvoiceMeta', parent=styles['Normal'],
        fontName=FONT_NAME, fontSize=8.5, leading=12.5, alignment=2, textColor=DARK_COLOR
    )
    cell_bold = ParagraphStyle(
        'CellBold', parent=styles['Normal'],
        fontName=FONT_BOLD, fontSize=8.5, leading=11, textColor=DARK_COLOR
    )
    cell_norm = ParagraphStyle(
        'CellNorm', parent=styles['Normal'],
        fontName=FONT_NAME, fontSize=8.5, leading=11, textColor=DARK_COLOR
    )
    cell_right = ParagraphStyle(
        'CellRight', parent=styles['Normal'],
        fontName=FONT_NAME, fontSize=8.5, leading=11, alignment=2, textColor=DARK_COLOR
    )
    cell_right_bold = ParagraphStyle(
        'CellRightBold', parent=styles['Normal'],
        fontName=FONT_BOLD, fontSize=8.5, leading=11, alignment=2, textColor=DARK_COLOR
    )
    cell_muted = ParagraphStyle(
        'CellMuted', parent=styles['Normal'],
        fontName=FONT_NAME, fontSize=8, leading=10, textColor=MUTED_COLOR
    )
    th_style = ParagraphStyle(
        'TableHeader', parent=styles['Normal'],
        fontName=FONT_BOLD, fontSize=8.5, leading=11, alignment=1, textColor=colors.white
    )
    section_title = ParagraphStyle(
        'SectionTitle', parent=styles['Normal'],
        fontName=FONT_BOLD, fontSize=9, leading=12, textColor=PRIMARY_COLOR
    )

    # -------------------------------------------------------------
    # 1. HEADER (Company Branding on Left, Tax Invoice Title on Right)
    # -------------------------------------------------------------
    date_formatted = sale.SalesDate.strftime('%d/%m/%Y') if sale.SalesDate else datetime.now().strftime('%d/%m/%Y')
    header_data = [
        [
            Paragraph(f"<b>{company_name}</b>", c_title),
            Paragraph("<b>TAX INVOICE</b>", inv_badge)
        ],
        [
            Paragraph(
                f"LPG Cylinders & Industrial Gas Solutions<br/>"
                f"{company_addr}<br/>"
                f"<b>GSTIN:</b> {company_gstin} &nbsp;|&nbsp; <b>State:</b> Kerala (Code: 32)<br/>"
                f"<b>Phone:</b> {company_phone} &nbsp;|&nbsp; <b>Email:</b> {company_email}",
                c_sub
            ),
            Paragraph(
                f"<b>Invoice No:</b> {sale.SalesNo}<br/>"
                f"<b>Date:</b> {date_formatted}<br/>"
                f"<b>Payment Mode:</b> {sale.PaymentMethod.upper()}<br/>"
                f"<b>Vehicle No:</b> {sale.VehicleName or 'Van Delivery'}<br/>"
                f"<b>Driver:</b> {sale.DriverName or 'Van Driver'}",
                inv_meta
            )
        ]
    ]
    header_table = Table(header_data, colWidths=[335, 210])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 6))

    story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY_COLOR, spaceAfter=8))

    # -------------------------------------------------------------
    # 2. CUSTOMER & DELIVERY INFO CARDS
    # -------------------------------------------------------------
    cust_box = [
        [
            Paragraph("<b>BILLED TO (CUSTOMER DETAILS)</b>", section_title),
            Paragraph("<b>DISPATCH & ROUTE DETAILS</b>", section_title),
        ],
        [
            Paragraph(
                f"<b>Customer Name:</b> {cust_name}<br/>"
                f"<b>Address:</b> {cust_addr}<br/>"
                f"<b>Contact:</b> {cust_phone or 'N/A'}<br/>"
                f"<b>GSTIN / UIN:</b> {cust_gstin}<br/>"
                f"<b>Place of Supply:</b> {state_name} (Code: {state_code})",
                cell_norm
            ),
            Paragraph(
                f"<b>Route Name:</b> {sale.RouteName or 'Local Route'}<br/>"
                f"<b>Driver Name:</b> {sale.DriverName or 'Driver'}<br/>"
                f"<b>Vehicle Number:</b> {sale.VehicleName or 'Delivery Van'}<br/>"
                f"<b>Full Cylinders Delivered:</b> {int(sale.TotalDeliveredQty or 0)} NOS<br/>"
                f"<b>Empty Cylinders Collected:</b> {int(sale.TotalEmptyQty or 0)} NOS",
                cell_norm
            )
        ]
    ]
    cust_table = Table(cust_box, colWidths=[275, 270])
    cust_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_BG),
        ('BOX', (0, 0), (-1, -1), 1, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(cust_table)
    story.append(Spacer(1, 10))

    # -------------------------------------------------------------
    # 3. ITEMS TABLE: Sl no. | Particular | HSN | Qty | Rate | Amount
    # -------------------------------------------------------------
    # Widths sum to exactly 545 pt
    col_widths = [32, 215, 68, 55, 85, 90]

    th_cells = [
        Paragraph("Sl no.", th_style),
        Paragraph("Particular", ParagraphStyle('ThLeft', parent=th_style, alignment=0)),
        Paragraph("HSN/SAC", th_style),
        Paragraph("Qty", th_style),
        Paragraph("Rate (Rs.)", ParagraphStyle('ThR1', parent=th_style, alignment=2)),
        Paragraph("Amount (Rs.)", ParagraphStyle('ThR2', parent=th_style, alignment=2)),
    ]

    table_rows = [th_cells]

    total_taxable_sum = Decimal('0.00')
    total_cgst_sum = Decimal('0.00')
    total_sgst_sum = Decimal('0.00')
    total_igst_sum = Decimal('0.00')
    total_gross_sum = Decimal('0.00')

    lines = sale.lines.select_related('Product', 'Unit').all()
    is_intra_customer = (not customer or not customer.StateId or customer.StateId in [12, 32])

    if not lines.exists():
        # Synthetic single line fallback
        gross_val = Decimal(str(sale.GrandTotal or 0))
        taxable_val = Decimal(str(sale.SubTotal or gross_val))
        tot_tax = Decimal(str(sale.TaxAmount or (gross_val - taxable_val)))
        if tot_tax < Decimal('0.00'):
            tot_tax = Decimal('0.00')

        if is_intra_customer:
            cgst_val = (tot_tax / Decimal('2.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            sgst_val = tot_tax - cgst_val
            igst_val = Decimal('0.00')
        else:
            cgst_val = Decimal('0.00')
            sgst_val = Decimal('0.00')
            igst_val = tot_tax

        table_rows.append([
            Paragraph("1", cell_norm),
            Paragraph("Commercial / Domestic Gas Cylinder", cell_bold),
            Paragraph("271109", cell_muted),
            Paragraph(f"{int(sale.TotalDeliveredQty or 1)} NOS", cell_norm),
            Paragraph(f"{taxable_val:.2f}", cell_right),
            Paragraph(f"{taxable_val:.2f}", cell_right_bold),
        ])
        total_taxable_sum += taxable_val
        total_cgst_sum += cgst_val
        total_sgst_sum += sgst_val
        total_igst_sum += igst_val
        total_gross_sum += gross_val
    else:
        for idx, line in enumerate(lines, 1):
            prod = line.Product
            hsn = prod.HSNCode if prod and prod.HSNCode else "271109"
            qty = Decimal(str(line.Quantity or 0))
            if qty == 0 and line.EmptyQuantity > 0:
                continue

            gross_total = Decimal(str(line.Total or 0))
            if gross_total == 0 and qty > 0:
                gross_total = (qty * Decimal(str(line.SalesPrice or 0))).quantize(Decimal('0.01'))

            # Resolve GST rate: explicitly respect line.TaxPercent (even if 0.00) or product GSTPercentage
            gst_rate_raw = line.TaxPercent if line.TaxPercent is not None else (prod.GSTPercentage if prod else Decimal('0.00'))
            try:
                gst_rate = Decimal(str(gst_rate_raw or '0.00'))
            except Exception:
                gst_rate = Decimal('0.00')

            if gst_rate < Decimal('0.00'):
                gst_rate = Decimal('0.00')

            if gst_rate > Decimal('0.00') and gross_total > Decimal('0.00'):
                tax_factor = Decimal('1.00') + (gst_rate / Decimal('100.00'))
                taxable_amount = (gross_total / tax_factor).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                tax_amount = gross_total - taxable_amount
            else:
                taxable_amount = gross_total
                tax_amount = Decimal('0.00')

            if is_intra_customer:
                cgst_amount = (tax_amount / Decimal('2.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                sgst_amount = tax_amount - cgst_amount
                igst_amount = Decimal('0.00')
            else:
                cgst_amount = Decimal('0.00')
                sgst_amount = Decimal('0.00')
                igst_amount = tax_amount
            unit_taxable_rate = (taxable_amount / qty).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP) if qty > 0 else taxable_amount

            total_taxable_sum += taxable_amount
            total_cgst_sum += cgst_amount
            total_sgst_sum += sgst_amount
            total_igst_sum += igst_amount
            total_gross_sum += gross_total

            table_rows.append([
                Paragraph(str(idx), ParagraphStyle('C1', parent=cell_norm, alignment=1)),
                Paragraph(f"<b>{line.ProductName}</b>", cell_bold),
                Paragraph(hsn, ParagraphStyle('C2', parent=cell_muted, alignment=1)),
                Paragraph(f"{int(qty)} NOS", ParagraphStyle('C3', parent=cell_norm, alignment=1)),
                Paragraph(f"{unit_taxable_rate:.2f}", cell_right),
                Paragraph(f"{taxable_amount:.2f}", cell_right_bold),
            ])

    # Ensure a 10-line space for product rows (standard ERP invoice format)
    # If fewer than 10 rows, pad with empty rows so the footer always appears after consistent spacing
    min_product_rows = 10
    current_product_count = len(table_rows) - 1  # excluding header
    if current_product_count < min_product_rows:
        for empty_idx in range(current_product_count + 1, min_product_rows + 1):
            table_rows.append([
                Paragraph(f"<font color='#CBD5E1'>{empty_idx}</font>", ParagraphStyle('C1E', parent=cell_muted, alignment=1)),
                Paragraph("&nbsp;", cell_norm),
                Paragraph("&nbsp;", cell_norm),
                Paragraph("&nbsp;", cell_norm),
                Paragraph("&nbsp;", cell_norm),
                Paragraph("&nbsp;", cell_norm),
            ])

    items_table = Table(table_rows, colWidths=col_widths)
    t_style = [
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOX', (0, 0), (-1, -1), 1, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]
    for r in range(1, len(table_rows)):
        bg = LIGHT_BG if r % 2 == 1 else colors.white
        t_style.append(('BACKGROUND', (0, r), (-1, r), bg))

    items_table.setStyle(TableStyle(t_style))
    story.append(items_table)
    story.append(Spacer(1, 10))

    # -------------------------------------------------------------
    # 4. TAX & CUSTOMER LEDGER BREAKDOWN (Matching Handwritten Template)
    # -------------------------------------------------------------
    total_gst_sum = total_cgst_sum + total_sgst_sum + total_igst_sum
    current_bill_amount = total_gross_sum if total_gross_sum > 0 else Decimal(str(sale.GrandTotal or 0))

    # Determine Paid Amount:
    # If payment was Cash/UPI/Bank or recorded via VoucherLine
    paid_amt = Decimal('0.00')
    vl = VoucherLine.objects.filter(
        Voucher__ReferenceTable='Sales',
        Voucher__ReferenceId=sale.SalesId,
        CreditAmount__gt=0,
        Ledger=customer
    ).first() if customer else None

    if vl:
        paid_amt = vl.CreditAmount
    elif hasattr(sale, 'PaidAmount') and sale.PaidAmount is not None and (sale.PaymentMethod or '').upper() != 'CREDIT':
        paid_amt = Decimal(str(sale.PaidAmount))
    elif (sale.PaymentMethod or '').upper() in ['CASH', 'UPI', 'BANK', 'ONLINE']:
        paid_amt = Decimal(str(sale.GrandTotal or current_bill_amount))

    # Determine Previous Pending and Closing Balance (Point-in-Time as of this invoice):
    adv_adj = Decimal('0.00')
    if hasattr(sale, 'advance_adjustments'):
        try:
            adv_adj = sum(Decimal(str(a.AmountAdjusted)) for a in sale.advance_adjustments.all())
        except Exception:
            adv_adj = Decimal('0.00')
    if adv_adj == Decimal('0.00') and hasattr(sale, 'AdvanceAdjusted') and sale.AdvanceAdjusted:
        adv_adj = Decimal(str(sale.AdvanceAdjusted))

    if customer:
        op = customer.OpeningBalance or Decimal('0.00')
        op_net = op if (customer.OpeningBalanceType or 'DR').upper() == 'DR' else -op

        this_vch = Voucher.objects.filter(
            ReferenceTable='Sales', ReferenceId=sale.SalesId, IsCancelled=False
        ).first()

        prior_vl_qs = VoucherLine.objects.filter(
            Ledger=customer, Voucher__IsCancelled=False
        )
        if this_vch:
            prior_vl_qs = prior_vl_qs.filter(
                Q(Voucher__VoucherDate__lt=this_vch.VoucherDate) |
                Q(Voucher__VoucherDate=this_vch.VoucherDate, Voucher_id__lt=this_vch.VoucherId)
            )
        else:
            prior_vl_qs = prior_vl_qs.filter(
                Voucher__VoucherDate__lte=sale.SalesDate
            )

        prior_agg = prior_vl_qs.aggregate(
            dr=Sum('DebitAmount'), cr=Sum('CreditAmount')
        )
        prior_dr = prior_agg['dr'] or Decimal('0.00')
        prior_cr = prior_agg['cr'] or Decimal('0.00')

        previous_bill_pending = max(Decimal('0.00'), op_net + prior_dr - prior_cr)
        closing_balance = max(Decimal('0.00'), previous_bill_pending + current_bill_amount - adv_adj - paid_amt)
    else:
        # Walk-in customer
        previous_bill_pending = Decimal('0.00')
        closing_balance = max(Decimal('0.00'), current_bill_amount - adv_adj - paid_amt)

    # Empty cylinders return narration
    empty_qty_int = int(sale.TotalEmptyQty or 0)
    narration_text = f"{empty_qty_int} Return Qty." if empty_qty_int > 0 else "No Return Empties"
    if sale.PaymentMethod:
        narration_text += f" (Payment: {sale.PaymentMethod.upper()})"

    # Left Box: Customer Account Summary (Handwritten layout)
    # Right Box: Tax Breakdown (Handwritten layout)
    cust_summary_rows = [
        [Paragraph("<b>CUSTOMER ACCOUNT SUMMARY</b>", section_title), Paragraph("", cell_norm)],
        [Paragraph("Previous Bill pending :", cell_norm), Paragraph(f"Rs. {previous_bill_pending:.2f}", cell_right_bold)],
        [Paragraph("Current Bill :", cell_norm), Paragraph(f"(+) Rs. {current_bill_amount:.2f}", cell_right)],
    ]
    if adv_adj > Decimal('0.00'):
        cust_summary_rows.append([
            Paragraph("Advance Adjusted :", ParagraphStyle('AdvLbl', parent=cell_bold, textColor=colors.HexColor('#0D9488'))),
            Paragraph(f"(-) Rs. {adv_adj:.2f}", ParagraphStyle('AdvVal', parent=cell_right_bold, textColor=colors.HexColor('#0D9488')))
        ])
    cust_summary_rows.extend([
        [Paragraph("Paid Amount :", cell_norm), Paragraph(f"(-) Rs. {paid_amt:.2f}", cell_right)],
        [Paragraph("<b>Balance Due :</b>", cell_bold), Paragraph(f"<b>Rs. {closing_balance:.2f}</b>", ParagraphStyle('BalR', parent=cell_right_bold, textColor=PRIMARY_COLOR, fontSize=9.5))],
        [Paragraph("<b>Narration :</b>", cell_bold), Paragraph(f"<i>{narration_text}</i>", cell_norm)],
    ])

    cust_summary_table = Table(cust_summary_rows, colWidths=[130, 125])
    cust_summary_table.setStyle(TableStyle([
        ('LINEBELOW', (0, 0), (-1, 0), 1, PRIMARY_COLOR),
        ('LINEBELOW', (0, -3), (-1, -3), 1, BORDER_COLOR),
        ('LINEBELOW', (0, -2), (-1, -2), 1, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))

    tax_summary_table = Table([
        [Paragraph("<b>TAX & INVOICE BREAKDOWN</b>", section_title), Paragraph("", cell_norm)],
        [Paragraph("Gross Amount (Taxable) :", cell_norm), Paragraph(f"Rs. {total_taxable_sum:.2f}", cell_right_bold)],
        [Paragraph("CGST :", cell_muted), Paragraph(f"Rs. {total_cgst_sum:.2f}", cell_right)],
        [Paragraph("SGST :", cell_muted), Paragraph(f"Rs. {total_sgst_sum:.2f}", cell_right)],
        [Paragraph("IGST :", cell_muted), Paragraph(f"Rs. {total_igst_sum:.2f}", cell_right)],
        [Paragraph("<b>Total GST :</b>", cell_bold), Paragraph(f"<b>Rs. {total_gst_sum:.2f}</b>", cell_right_bold)],
        [Paragraph("<b>Net Amount :</b>", ParagraphStyle('NetLbl', parent=cell_bold, fontSize=10, textColor=PRIMARY_COLOR)),
         Paragraph(f"<b>Rs. {current_bill_amount:.2f}</b>", ParagraphStyle('NetVal', parent=cell_right_bold, fontSize=11, textColor=PRIMARY_COLOR))],
    ], colWidths=[140, 130])
    tax_summary_table.setStyle(TableStyle([
        ('LINEBELOW', (0, 0), (-1, 0), 1, PRIMARY_COLOR),
        ('LINEBELOW', (0, 5), (-1, 5), 1, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))

    combined_summary_table = Table([
        [cust_summary_table, tax_summary_table]
    ], colWidths=[270, 275])
    combined_summary_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('BACKGROUND', (0, 0), (0, 0), LIGHT_BG),
        ('BACKGROUND', (1, 0), (1, 0), CARD_BG),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(combined_summary_table)
    story.append(Spacer(1, 8))

    # -------------------------------------------------------------
    # 5. AMOUNT IN WORDS & TERMS
    # -------------------------------------------------------------
    words_total = amount_to_words(current_bill_amount)
    terms_box = Table([
        [
            Paragraph(
                f"<b>Net Amount in Words:</b> <i>{words_total}</i><br/>"
                f"<font size=7 color='#64748B'>"
                f"<b>Terms & Conditions:</b> Goods received in good order and sound condition. "
                f"LPG Cylinders remain the property of Future Gas and must be returned on demand. "
                f"Subject to Kozhikode Jurisdiction.</font>",
                cell_norm
            )
        ]
    ], colWidths=[545])
    terms_box.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_BG),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(terms_box)
    story.append(Spacer(1, 14))

    # -------------------------------------------------------------
    # 6. SIGNATURE FOOTER
    # -------------------------------------------------------------
    footer_data = [
        [
            Paragraph(
                f"<b>Customer / Receiver's Signature:</b> ___________________<br/>"
                f"<font size=7 color='#64748B'>I accept goods and cylinder return count as noted above</font>",
                cell_norm
            ),
            Paragraph(
                f"For <b>{company_name}</b><br/><br/><br/>"
                f"<b>Authorized Signatory</b><br/>"
                f"<font size=7 color='#64748B'>Computer generated official tax invoice</font>",
                ParagraphStyle('SigR', parent=cell_norm, alignment=2)
            )
        ]
    ]
    footer_table = Table(footer_data, colWidths=[275, 270])
    footer_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'BOTTOM'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(footer_table)

    # Build PDF
    doc.build(story)
    return buf.getvalue()


def format_short_ref(val):
    """
    Formats long or repetitive references into clean, concise numbers.
    e.g.:
      SAL-20261111-0001 -> INV-0001
      PAY-SAL-20261111-0001 -> PAY-0001
      INV-20261111-0001 -> INV-0001
      DT-20261111-001 -> DT-001
      PUR-20261111-0001 -> PUR-0001
    """
    if not val:
        return '—'
    s = str(val).strip()
    if s.upper().startswith('PAY-'):
        nums = re.findall(r'\d+', s)
        if nums:
            return f"PAY-{nums[-1]}"
        return s
    if re.match(r'^(?:SAL|INV)-', s, re.I):
        nums = re.findall(r'\d+', s)
        if nums:
            return f"INV-{nums[-1]}"
        return s
    if re.match(r'^DT-', s, re.I):
        nums = re.findall(r'\d+', s)
        if nums:
            return f"DT-{nums[-1]}"
        return s
    if re.match(r'^PUR-', s, re.I):
        nums = re.findall(r'\d+', s)
        if nums:
            return f"PUR-{nums[-1]}"
        return s
    return s


def generate_customer_statement_pdf(customer, sales_qs, receipts_qs, company_id=1, from_date=None, to_date=None):
    """
    Generates a clean, professional PDF statement of accounts for a customer.
    Lists all sales invoices, payments/receipts, opening balance, and the net outstanding balance.
    Supports optional from_date and to_date filtering with rolling opening balance.
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=25,
        rightMargin=25,
        topMargin=25,
        bottomMargin=25
    )

    styles = getSampleStyleSheet()

    # Company Details
    company_name = "FUTURE GAS"
    company_subtitle = "LPG Commercial & Domestic Distribution Network"
    company_address = "Civil Station, Kozhikode, Kerala - 673020"
    company_contact = "Ph: +91 98470 12345 | Email: accounts@futuregas.in"
    company_gstin = "32AABCF1234F1Z8"

    try:
        from core.models import Company
        co = Company.objects.filter(CompanyId=company_id).first()
        if co:
            company_name = co.CompanyName or company_name
            company_address = co.Address or company_address
            company_gstin = co.GSTIN or company_gstin
            company_contact = f"Ph: {co.PhoneNumber or co.MobileNumber or '+91 98470 12345'}"
    except Exception:
        pass

    title_style = ParagraphStyle('StmtTitle', fontName=FONT_BOLD, fontSize=16, leading=20, textColor=PRIMARY_COLOR)
    sub_style = ParagraphStyle('StmtSub', fontName=FONT_NAME, fontSize=8, leading=11, textColor=MUTED_COLOR)
    hdr_right = ParagraphStyle('StmtHdrR', fontName=FONT_BOLD, fontSize=14, leading=18, textColor=PRIMARY_COLOR, alignment=2)
    meta_style = ParagraphStyle('StmtMeta', fontName=FONT_NAME, fontSize=8, leading=11, textColor=DARK_COLOR)
    meta_bold = ParagraphStyle('StmtMetaB', fontName=FONT_BOLD, fontSize=8.5, leading=12, textColor=DARK_COLOR)
    cell_norm = ParagraphStyle('StmtCell', fontName=FONT_NAME, fontSize=8, leading=10, textColor=DARK_COLOR)
    cell_bold = ParagraphStyle('StmtCellB', fontName=FONT_BOLD, fontSize=8, leading=10, textColor=DARK_COLOR)
    cell_right = ParagraphStyle('StmtCellR', fontName=FONT_NAME, fontSize=8, leading=10, textColor=DARK_COLOR, alignment=2)
    cell_right_b = ParagraphStyle('StmtCellRB', fontName=FONT_BOLD, fontSize=8, leading=10, textColor=DARK_COLOR, alignment=2)
    cell_right_burg = ParagraphStyle('StmtCellRBurg', fontName=FONT_BOLD, fontSize=8.5, leading=11, textColor=PRIMARY_COLOR, alignment=2)

    story = []

    # 1. HEADER
    period_text = "All Records to Date"
    if from_date and to_date:
        period_text = f"{from_date} to {to_date}"
    elif from_date:
        period_text = f"From {from_date}"
    elif to_date:
        period_text = f"Up to {to_date}"

    header_data = [
        [
            Paragraph(
                f"<b>{company_name}</b><br/>"
                f"<font size=7.5 color='#64748B'>{company_subtitle}</font><br/>"
                f"<font size=7.5 color='#64748B'>{company_address}</font><br/>"
                f"<font size=7.5 color='#64748B'>{company_contact} | GSTIN: <b>{company_gstin}</b></font>",
                title_style
            ),
            Paragraph(
                f"<b>STATEMENT OF ACCOUNT</b><br/>"
                f"<font size=8 color='#64748B'>Customer Outstanding Statement</font><br/>"
                f"<font size=7.5 color='#64748B'>Period: <b>{period_text}</b></font><br/>"
                f"<font size=7 color='#64748B'>Generated: {datetime.now().strftime('%d-%b-%Y %I:%M %p')}</font>",
                hdr_right
            )
        ]
    ]
    hdr_table = Table(header_data, colWidths=[330, 215])
    hdr_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(hdr_table)
    story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY_COLOR, spaceBefore=2, spaceAfter=8))

    # 2. CUSTOMER INFO & SUMMARY CARDS
    cust_name = customer.LedgerName if customer else "Direct Customer"
    cust_phone = getattr(customer, 'PhoneNumber', '') or getattr(customer, 'MobileNumber', '') or '—'
    cust_city = getattr(customer, 'City', '') or '—'
    cust_address = getattr(customer, 'Address', '') or getattr(customer, 'AddressLine1', '') or '—'
    cust_gstin = getattr(customer, 'GSTIN', '') or 'Unregistered Consumer'

    # Build raw transaction entries
    raw_entries = []

    # Opening balance
    op_bal = Decimal(str(getattr(customer, 'OpeningBalance', 0) or 0))
    op_type = (getattr(customer, 'OpeningBalanceType', 'DR') or 'DR').upper()
    init_dr = op_bal if op_type == 'DR' else Decimal('0.00')
    init_cr = op_bal if op_type == 'CR' else Decimal('0.00')

    # Sales Invoices
    for s in sales_qs:
        gt = Decimal(str(s.GrandTotal or 0))
        s_date = str(s.SalesDate or '')
        s_ref = format_short_ref(s.InvoiceNo or s.SalesNo or f"INV-{s.SalesId}")
        raw_entries.append({
            'date': s_date,
            'ref': s_ref,
            'type': f"Sales Invoice ({s.PaymentMethod or 'CASH'})",
            'debit': gt,
            'credit': Decimal('0.00'),
            'sort_key': f"{s_date}_1_{s.SalesId}",
        })

        paid_amt = Decimal(str(s.PaidAmount or 0))
        if paid_amt > 0:
            pay_ref = format_short_ref(f"PAY-{s.InvoiceNo or s.SalesNo or s.SalesId}")
            raw_entries.append({
                'date': s_date,
                'ref': pay_ref,
                'type': f"Payment Received on Sale ({s.PaymentMethod or 'CASH'})",
                'debit': Decimal('0.00'),
                'credit': paid_amt,
                'sort_key': f"{s_date}_1_paid_{s.SalesId}",
            })

    # Receipts / Payments
    for r in receipts_qs:
        amt = Decimal(str(getattr(r, 'Amount', 0) or 0))
        if getattr(r, 'CreatedAt', None):
            r_date = r.CreatedAt.strftime('%Y-%m-%d')
        else:
            r_date = str(getattr(r, 'PaymentDate', '') or getattr(r, 'VoucherDate', '') or '')
        r_ref = getattr(r, 'PaymentNo', '') or getattr(r, 'VoucherNo', '') or f"REC-{getattr(r, 'PaymentId', '')}"
        raw_entries.append({
            'date': r_date,
            'ref': format_short_ref(r_ref),
            'type': f"Collection Receipt ({getattr(r, 'PaymentMode', 'CASH') or 'CASH'})",
            'debit': Decimal('0.00'),
            'credit': amt,
            'sort_key': f"{r_date}_2_{getattr(r, 'PaymentId', 0)}",
        })

    raw_entries.sort(key=lambda x: x['sort_key'])

    # Filter by date range with rolling opening balance
    prior_dr = init_dr
    prior_cr = init_cr
    period_entries = []

    for e in raw_entries:
        if from_date and e['date'] and e['date'] < from_date:
            prior_dr += e['debit']
            prior_cr += e['credit']
        elif to_date and e['date'] and e['date'] > to_date:
            continue
        else:
            period_entries.append(e)

    effective_op = prior_dr - prior_cr
    final_entries = []

    if from_date or op_bal > 0 or effective_op != 0:
        op_date = from_date or (getattr(customer, 'CreatedAt', datetime.now()).strftime('%Y-%m-%d') if hasattr(customer, 'CreatedAt') and customer.CreatedAt else '')
        final_entries.append({
            'date': op_date,
            'ref': 'OP-BAL',
            'type': 'Opening Balance (b/f)',
            'debit': effective_op if effective_op > 0 else Decimal('0.00'),
            'credit': abs(effective_op) if effective_op < 0 else Decimal('0.00'),
            'sort_key': '0000-00-00',
        })

    final_entries.extend(period_entries)

    # Calculate Running Balance & Totals
    running_bal = Decimal('0.00')
    tot_debit = Decimal('0.00')
    tot_credit = Decimal('0.00')
    for e in final_entries:
        tot_debit += e['debit']
        tot_credit += e['credit']
        running_bal += (e['debit'] - e['credit'])
        e['balance'] = running_bal

    period_billed = sum(e['debit'] for e in period_entries)
    period_paid = sum(e['credit'] for e in period_entries)

    # Customer Box & KPI Box Table
    cust_box_content = [
        Paragraph(f"<b>BILL TO / CUSTOMER:</b>", meta_bold),
        Paragraph(f"<b>{cust_name}</b>", ParagraphStyle('CN', parent=meta_bold, fontSize=11, textColor=PRIMARY_COLOR)),
        Paragraph(f"Phone: <b>{cust_phone}</b> | City: {cust_city}", meta_style),
        Paragraph(f"Address: {cust_address}", meta_style),
        Paragraph(f"GSTIN / Tax ID: <b>{cust_gstin}</b>", meta_style),
    ]

    kpi_box_content = [
        Paragraph(f"<b>OUTSTANDING SUMMARY</b>", meta_bold),
        Paragraph(f"Opening Balance: <b>₹{abs(effective_op):,.2f} {'Dr' if effective_op >= 0 else 'Cr'}</b>", meta_style),
        Paragraph(f"Total Billed (Debit): <b>₹{period_billed:,.2f}</b>", meta_style),
        Paragraph(f"Total Paid (Credit): <b>₹{period_paid:,.2f}</b>", meta_style),
        Spacer(1, 3),
        Paragraph(
            f"Net Balance Due: <font size=11 color='#800020'><b>₹{abs(running_bal):,.2f} {'Dr' if running_bal >= 0 else 'Cr'}</b></font>",
            meta_bold
        ),
    ]
    try:
        adv_bal = getattr(customer, 'advance_balance', None)
        if adv_bal is None and hasattr(customer, 'advances'):
            adv_bal = sum(a.RemainingBalance for a in customer.advances.filter(Status__in=['OPEN', 'PARTIAL']))
        if adv_bal and Decimal(str(adv_bal)) > Decimal('0.00'):
            kpi_box_content.append(
                Paragraph(f"Customer Advance Balance: <font color='#0D9488'><b>₹{Decimal(str(adv_bal)):,.2f}</b></font>", meta_style)
            )
    except Exception:
        pass

    top_grid = Table([
        [cust_box_content, kpi_box_content]
    ], colWidths=[310, 235])
    top_grid.setStyle(TableStyle([
        ('BOX', (0, 0), (0, 0), 0.5, BORDER_COLOR),
        ('BOX', (1, 0), (1, 0), 0.5, PRIMARY_COLOR),
        ('BACKGROUND', (0, 0), (0, 0), LIGHT_BG),
        ('BACKGROUND', (1, 0), (1, 0), CARD_BG),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(top_grid)
    story.append(Spacer(1, 10))

    # 3. TRANSACTIONS TABLE
    col_widths = [65, 100, 140, 80, 80, 80]
    tbl_data = [
        [
            Paragraph("<b>DATE</b>", cell_bold),
            Paragraph("<b>REF / INVOICE #</b>", cell_bold),
            Paragraph("<b>PARTICULARS</b>", cell_bold),
            Paragraph("<b>DEBIT (₹)</b>", cell_right_b),
            Paragraph("<b>CREDIT (₹)</b>", cell_right_b),
            Paragraph("<b>BALANCE (₹)</b>", cell_right_b),
        ]
    ]

    for e in final_entries:
        d_str = f"₹{e['debit']:,.2f}" if e['debit'] > 0 else "—"
        c_str = f"₹{e['credit']:,.2f}" if e['credit'] > 0 else "—"
        bal_str = f"₹{abs(e['balance']):,.2f} {'Dr' if e['balance'] >= 0 else 'Cr'}"
        tbl_data.append([
            Paragraph(e['date'] or '—', cell_norm),
            Paragraph(f"<b>{e['ref']}</b>", cell_norm),
            Paragraph(e['type'], cell_norm),
            Paragraph(d_str, cell_right),
            Paragraph(c_str, cell_right),
            Paragraph(bal_str, cell_right_burg if e['balance'] > 0 else cell_right),
        ])

    # Total Row
    final_bal_str = f"₹{abs(running_bal):,.2f} {'Dr' if running_bal >= 0 else 'Cr'}"
    tbl_data.append([
        Paragraph("<b>TOTALS</b>", cell_bold),
        Paragraph(f"<b>{len(final_entries)} Transactions</b>", cell_bold),
        Paragraph("", cell_norm),
        Paragraph(f"<b>₹{period_billed:,.2f}</b>", cell_right_b),
        Paragraph(f"<b>₹{period_paid:,.2f}</b>", cell_right_b),
        Paragraph(f"<b>{final_bal_str}</b>", cell_right_burg),
    ])

    stmt_table = Table(tbl_data, colWidths=col_widths, repeatRows=1)
    stmt_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), CARD_BG),
        ('TEXTCOLOR', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('LINEBELOW', (0, 0), (-1, 0), 1, PRIMARY_COLOR),
        ('LINEABOVE', (0, -1), (-1, -1), 1.5, PRIMARY_COLOR),
        ('BACKGROUND', (0, -1), (-1, -1), LIGHT_BG),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(stmt_table)
    story.append(Spacer(1, 14))

    # 4. FOOTER NOTE & SIGNATURE
    footer_data = [
        [
            Paragraph(
                f"<b>Important Note:</b> This statement reflects opening balance, invoiced delivery bills and recorded receipts. "
                f"For any discrepancies or queries, kindly contact accounts within 7 days.<br/>"
                f"<font size=7 color='#64748B'>Thank you for your business with Future Gas.</font>",
                cell_norm
            ),
            Paragraph(
                f"For <b>{company_name}</b><br/><br/><br/>"
                f"<b>Authorized Signatory</b><br/>"
                f"<font size=7 color='#64748B'>Verified Commercial Accounts Department</font>",
                ParagraphStyle('SigR2', parent=cell_norm, alignment=2)
            )
        ]
    ]
    footer_table = Table(footer_data, colWidths=[310, 235])
    footer_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'BOTTOM'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(footer_table)

    doc.build(story)
    return buf.getvalue()


def generate_supplier_statement_pdf(supplier, purchases_qs, payments_qs, company_id=1, from_date=None, to_date=None):
    """
    Generates a clean, professional PDF statement of accounts for a supplier (Sundry Creditor).
    Lists all purchase invoices, payments disbursed, opening balance, and the net outstanding payable balance.
    Supports optional from_date and to_date filtering with rolling opening balance.
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=25,
        rightMargin=25,
        topMargin=25,
        bottomMargin=25
    )

    # Company Details
    company_name = "FUTURE GAS"
    company_subtitle = "LPG Commercial & Domestic Distribution Network"
    company_address = "Civil Station, Kozhikode, Kerala - 673020"
    company_contact = "Ph: +91 98470 12345 | Email: accounts@futuregas.in"
    company_gstin = "32AABCF1234F1Z8"

    try:
        from core.models import Company
        co = Company.objects.filter(CompanyId=company_id).first()
        if co:
            company_name = co.CompanyName or company_name
            company_address = co.Address or company_address
            company_gstin = co.GSTIN or company_gstin
            company_contact = f"Ph: {co.PhoneNumber or co.MobileNumber or '+91 98470 12345'}"
    except Exception:
        pass

    title_style = ParagraphStyle('SuppStmtTitle', fontName=FONT_BOLD, fontSize=16, leading=20, textColor=PRIMARY_COLOR)
    hdr_right = ParagraphStyle('SuppStmtHdrR', fontName=FONT_BOLD, fontSize=14, leading=18, textColor=PRIMARY_COLOR, alignment=2)
    meta_style = ParagraphStyle('SuppStmtMeta', fontName=FONT_NAME, fontSize=8, leading=11, textColor=DARK_COLOR)
    meta_bold = ParagraphStyle('SuppStmtMetaB', fontName=FONT_BOLD, fontSize=8.5, leading=12, textColor=DARK_COLOR)
    cell_norm = ParagraphStyle('SuppStmtCell', fontName=FONT_NAME, fontSize=8, leading=10, textColor=DARK_COLOR)
    cell_bold = ParagraphStyle('SuppStmtCellB', fontName=FONT_BOLD, fontSize=8, leading=10, textColor=DARK_COLOR)
    cell_right = ParagraphStyle('SuppStmtCellR', fontName=FONT_NAME, fontSize=8, leading=10, textColor=DARK_COLOR, alignment=2)
    cell_right_b = ParagraphStyle('SuppStmtCellRB', fontName=FONT_BOLD, fontSize=8, leading=10, textColor=DARK_COLOR, alignment=2)
    cell_right_burg = ParagraphStyle('SuppStmtCellRBurg', fontName=FONT_BOLD, fontSize=8.5, leading=11, textColor=PRIMARY_COLOR, alignment=2)

    story = []

    # 1. HEADER
    period_text = "All Records to Date"
    if from_date and to_date:
        period_text = f"{from_date} to {to_date}"
    elif from_date:
        period_text = f"From {from_date}"
    elif to_date:
        period_text = f"Up to {to_date}"

    header_data = [
        [
            Paragraph(
                f"<b>{company_name}</b><br/>"
                f"<font size=7.5 color='#64748B'>{company_subtitle}</font><br/>"
                f"<font size=7.5 color='#64748B'>{company_address}</font><br/>"
                f"<font size=7.5 color='#64748B'>{company_contact} | GSTIN: <b>{company_gstin}</b></font>",
                title_style
            ),
            Paragraph(
                f"<b>STATEMENT OF ACCOUNT</b><br/>"
                f"<font size=8 color='#64748B'>Supplier Payables Statement</font><br/>"
                f"<font size=7.5 color='#64748B'>Period: <b>{period_text}</b></font><br/>"
                f"<font size=7 color='#64748B'>Generated: {datetime.now().strftime('%d-%b-%Y %I:%M %p')}</font>",
                hdr_right
            )
        ]
    ]
    hdr_table = Table(header_data, colWidths=[330, 215])
    hdr_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(hdr_table)
    story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY_COLOR, spaceBefore=2, spaceAfter=8))

    # 2. SUPPLIER INFO & SUMMARY CARDS
    supp_name = supplier.LedgerName if supplier else "Direct Supplier"
    supp_phone = getattr(supplier, 'PhoneNumber', '') or getattr(supplier, 'MobileNumber', '') or '—'
    supp_city = getattr(supplier, 'City', '') or '—'
    supp_address = getattr(supplier, 'Address', '') or getattr(supplier, 'AddressLine1', '') or '—'
    supp_gstin = getattr(supplier, 'GSTIN', '') or 'Unregistered Vendor'

    raw_entries = []

    # Initial Opening balance
    op_bal = Decimal(str(getattr(supplier, 'OpeningBalance', 0) or 0))
    op_type = (getattr(supplier, 'OpeningBalanceType', 'CR') or 'CR').upper()
    init_cr = op_bal if op_type == 'CR' else Decimal('0.00')
    init_dr = op_bal if op_type == 'DR' else Decimal('0.00')

    # Purchases
    for p in purchases_qs:
        gt = Decimal(str(p.GrandTotal or 0))
        p_date = str(p.PurchaseDate or '')
        raw_entries.append({
            'date': p_date,
            'ref': format_short_ref(p.InvoiceNo or p.PurchaseNo or f"PUR-{p.PurchaseId}"),
            'type': f"Purchase Bill (#{p.InvoiceNo or p.PurchaseNo})",
            'debit': Decimal('0.00'),
            'credit': gt,
            'sort_key': f"{p_date}_1_{p.PurchaseId}",
        })

    # Payments
    for pm in payments_qs:
        amt = Decimal(str(getattr(pm, 'Amount', 0) or 0))
        if getattr(pm, 'CreatedAt', None):
            pm_date = pm.CreatedAt.strftime('%Y-%m-%d')
        else:
            pm_date = str(getattr(pm, 'PaymentDate', '') or getattr(pm, 'VoucherDate', '') or '')
        pm_ref = getattr(pm, 'PaymentNo', '') or getattr(pm, 'VoucherNo', '') or f"PAY-{getattr(pm, 'PaymentId', '')}"
        raw_entries.append({
            'date': pm_date,
            'ref': format_short_ref(pm_ref),
            'type': f"Payment Disbursed ({getattr(pm, 'PaymentMode', 'CASH') or 'CASH'})",
            'debit': amt,
            'credit': Decimal('0.00'),
            'sort_key': f"{pm_date}_2_{getattr(pm, 'PaymentId', 0)}",
        })

    raw_entries.sort(key=lambda x: x['sort_key'])

    # Date filter with rolling opening balance
    prior_dr = init_dr
    prior_cr = init_cr
    period_entries = []

    for e in raw_entries:
        if from_date and e['date'] and e['date'] < from_date:
            prior_dr += e['debit']
            prior_cr += e['credit']
        elif to_date and e['date'] and e['date'] > to_date:
            continue
        else:
            period_entries.append(e)

    effective_op = prior_cr - prior_dr  # Positive is Credit (payable)
    final_entries = []

    if from_date or op_bal > 0 or effective_op != 0:
        op_date = from_date or (getattr(supplier, 'CreatedAt', datetime.now()).strftime('%Y-%m-%d') if hasattr(supplier, 'CreatedAt') and supplier.CreatedAt else '')
        final_entries.append({
            'date': op_date,
            'ref': 'OP-BAL',
            'type': 'Opening Balance (b/f)',
            'debit': abs(effective_op) if effective_op < 0 else Decimal('0.00'),
            'credit': effective_op if effective_op > 0 else Decimal('0.00'),
            'sort_key': '0000-00-00',
        })

    final_entries.extend(period_entries)

    # Calculate Running Balance & Totals
    running_bal = Decimal('0.00')
    tot_debit = Decimal('0.00')
    tot_credit = Decimal('0.00')
    for e in final_entries:
        tot_debit += e['debit']
        tot_credit += e['credit']
        running_bal += (e['credit'] - e['debit'])
        e['balance'] = running_bal

    period_billed = sum(e['credit'] for e in period_entries)
    period_paid = sum(e['debit'] for e in period_entries)

    supp_box_content = [
        Paragraph(f"<b>SUPPLIER / CREDITOR:</b>", meta_bold),
        Paragraph(f"<b>{supp_name}</b>", ParagraphStyle('SN', parent=meta_bold, fontSize=11, textColor=PRIMARY_COLOR)),
        Paragraph(f"Phone: <b>{supp_phone}</b> | City: {supp_city}", meta_style),
        Paragraph(f"Address: {supp_address}", meta_style),
        Paragraph(f"GSTIN / Tax ID: <b>{supp_gstin}</b>", meta_style),
    ]

    kpi_box_content = [
        Paragraph(f"<b>OUTSTANDING LIABILITY SUMMARY</b>", meta_bold),
        Paragraph(f"Opening Balance: <b>₹{abs(effective_op):,.2f} {'Cr' if effective_op >= 0 else 'Dr'}</b>", meta_style),
        Paragraph(f"Total Purchases (Credit): <b>₹{tot_credit:,.2f}</b>", meta_style),
        Paragraph(f"Total Payments (Debit): <b>₹{tot_debit:,.2f}</b>", meta_style),
        Spacer(1, 3),
        Paragraph(
            f"Net Balance Due: <font size=11 color='#800020'><b>₹{abs(running_bal):,.2f} {'Cr' if running_bal >= 0 else 'Dr'}</b></font>",
            meta_bold
        ),
    ]

    top_grid = Table([
        [supp_box_content, kpi_box_content]
    ], colWidths=[310, 235])
    top_grid.setStyle(TableStyle([
        ('BOX', (0, 0), (0, 0), 0.5, BORDER_COLOR),
        ('BOX', (1, 0), (1, 0), 0.5, PRIMARY_COLOR),
        ('BACKGROUND', (0, 0), (0, 0), LIGHT_BG),
        ('BACKGROUND', (1, 0), (1, 0), CARD_BG),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(top_grid)
    story.append(Spacer(1, 10))

    # 3. TRANSACTIONS TABLE
    col_widths = [65, 100, 140, 80, 80, 80]
    tbl_data = [
        [
            Paragraph("<b>DATE</b>", cell_bold),
            Paragraph("<b>REF / BILL #</b>", cell_bold),
            Paragraph("<b>PARTICULARS</b>", cell_bold),
            Paragraph("<b>DEBIT (₹)</b>", cell_right_b),
            Paragraph("<b>CREDIT (₹)</b>", cell_right_b),
            Paragraph("<b>BALANCE (₹)</b>", cell_right_b),
        ]
    ]

    for e in final_entries:
        d_str = f"₹{e['debit']:,.2f}" if e['debit'] > 0 else "—"
        c_str = f"₹{e['credit']:,.2f}" if e['credit'] > 0 else "—"
        bal_str = f"₹{abs(e['balance']):,.2f} {'Cr' if e['balance'] >= 0 else 'Dr'}"
        tbl_data.append([
            Paragraph(e['date'] or '—', cell_norm),
            Paragraph(f"<b>{e['ref']}</b>", cell_norm),
            Paragraph(e['type'], cell_norm),
            Paragraph(d_str, cell_right),
            Paragraph(c_str, cell_right),
            Paragraph(bal_str, cell_right_burg if e['balance'] > 0 else cell_right),
        ])

    # Total Row
    final_bal_str = f"₹{abs(running_bal):,.2f} {'Cr' if running_bal >= 0 else 'Dr'}"
    tbl_data.append([
        Paragraph("<b>TOTALS</b>", cell_bold),
        Paragraph(f"<b>{len(final_entries)} Transactions</b>", cell_bold),
        Paragraph("", cell_norm),
        Paragraph(f"<b>₹{period_billed:,.2f}</b>", cell_right_b),
        Paragraph(f"<b>₹{period_paid:,.2f}</b>", cell_right_b),
        Paragraph(f"<b>{final_bal_str}</b>", cell_right_burg),
    ])

    stmt_table = Table(tbl_data, colWidths=col_widths, repeatRows=1)
    stmt_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), CARD_BG),
        ('TEXTCOLOR', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('LINEBELOW', (0, 0), (-1, 0), 1, PRIMARY_COLOR),
        ('LINEABOVE', (0, -1), (-1, -1), 1.5, PRIMARY_COLOR),
        ('BACKGROUND', (0, -1), (-1, -1), LIGHT_BG),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(stmt_table)
    story.append(Spacer(1, 14))

    # 4. FOOTER NOTE & SIGNATURE
    footer_data = [
        [
            Paragraph(
                f"<b>Important Note:</b> This statement reflects opening balance, purchase invoices recorded and payment vouchers disbursed. "
                f"For any discrepancies or queries, kindly contact accounts within 7 days.<br/>"
                f"<font size=7 color='#64748B'>Future Gas &bull; Commercial Accounts Department</font>",
                cell_norm
            ),
            Paragraph(
                f"For <b>{company_name}</b><br/><br/><br/>"
                f"<b>Authorized Signatory</b><br/>"
                f"<font size=7 color='#64748B'>Verified Commercial Accounts Department</font>",
                ParagraphStyle('SigSuppR2', parent=cell_norm, alignment=2)
            )
        ]
    ]
    footer_table = Table(footer_data, colWidths=[310, 235])
    footer_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'BOTTOM'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(footer_table)

    doc.build(story)
    return buf.getvalue()


def generate_receivables_summary_pdf(debtors_data, company_id=1, summary_stats=None, search_query=''):
    """
    Generates a complete, publication-quality A4 PDF summary of customer receivables (Sundry Debtors).
    Displays executive letterhead, 4 floating KPI summary cards,
    a structured tabular breakdown of all debtors with contacts, opening balance, sales billed,
    collections received, net outstanding balance, audit notes, and an official authorization signature block.
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=25,
        rightMargin=25,
        topMargin=25,
        bottomMargin=25
    )

    company_name = "FUTURE GAS"
    company_subtitle = "LPG Commercial & Domestic Distribution Network"
    company_address = "Civil Station, Kozhikode, Kerala - 673020"
    company_contact = "Ph: +91 98470 12345 | Email: accounts@futuregas.in"
    company_gstin = "32AABCF1234F1Z8"

    try:
        from core.models import Company
        co = Company.objects.filter(CompanyId=company_id).first()
        if co:
            company_name = co.CompanyName or company_name
            company_address = co.Address or company_address
            company_gstin = co.GSTIN or company_gstin
            company_contact = f"Ph: {co.PhoneNumber or co.MobileNumber or '+91 98470 12345'}"
    except Exception:
        pass

    title_company = ParagraphStyle('RecCompT', fontName=FONT_BOLD, fontSize=18, leading=22, textColor=PRIMARY_COLOR)
    sub_company = ParagraphStyle('RecCompS', fontName=FONT_BOLD, fontSize=8.5, leading=11, textColor=colors.HexColor('#334155'))
    meta_company = ParagraphStyle('RecCompM', fontName=FONT_NAME, fontSize=7.5, leading=10, textColor=MUTED_COLOR)

    title_box_h = ParagraphStyle('RecBoxH', fontName=FONT_BOLD, fontSize=14, leading=17, textColor=PRIMARY_COLOR, alignment=2)
    title_box_sub = ParagraphStyle('RecBoxSub', fontName=FONT_BOLD, fontSize=8, leading=10, textColor=colors.HexColor('#475569'), alignment=2)
    title_box_m = ParagraphStyle('RecBoxM', fontName=FONT_NAME, fontSize=7, leading=9, textColor=MUTED_COLOR, alignment=2)

    kpi_label = ParagraphStyle('RecKpiLbl', fontName=FONT_BOLD, fontSize=7, leading=9, textColor=MUTED_COLOR, alignment=1)
    kpi_val = ParagraphStyle('RecKpiVal', fontName=FONT_BOLD, fontSize=13, leading=15, textColor=DARK_COLOR, alignment=1)
    kpi_sub = ParagraphStyle('RecKpiSub', fontName=FONT_NAME, fontSize=7, leading=9, textColor=MUTED_COLOR, alignment=1)
    kpi_val_burg = ParagraphStyle('RecKpiValBurg', fontName=FONT_BOLD, fontSize=13, leading=15, textColor=PRIMARY_COLOR, alignment=1)

    th_left = ParagraphStyle('RecThL', fontName=FONT_BOLD, fontSize=7.5, leading=9, textColor=colors.white)
    th_right = ParagraphStyle('RecThR', fontName=FONT_BOLD, fontSize=7.5, leading=9, textColor=colors.white, alignment=2)
    cell_name = ParagraphStyle('RecCellName', fontName=FONT_BOLD, fontSize=8.5, leading=11, textColor=DARK_COLOR)
    cell_contact = ParagraphStyle('RecCellCont', fontName=FONT_NAME, fontSize=7, leading=9, textColor=MUTED_COLOR)
    cell_right = ParagraphStyle('RecCellR', fontName=FONT_NAME, fontSize=8, leading=10, textColor=DARK_COLOR, alignment=2)
    cell_right_bold = ParagraphStyle('RecCellRB', fontName=FONT_BOLD, fontSize=8, leading=10, textColor=DARK_COLOR, alignment=2)
    cell_right_burg = ParagraphStyle('RecCellRBurg', fontName=FONT_BOLD, fontSize=8.5, leading=11, textColor=PRIMARY_COLOR, alignment=2)

    story = []

    # 1. Header Block
    now_str = datetime.now().strftime('%d-%b-%Y %I:%M %p')
    date_only = datetime.now().strftime('%d-%b-%Y')

    header_left = [
        Paragraph(company_name, title_company),
        Paragraph(company_subtitle, sub_company),
        Paragraph(company_address, meta_company),
        Paragraph(f"{company_contact} &bull; GSTIN: <b>{company_gstin}</b>", meta_company),
    ]

    header_right = [
        Paragraph("RECEIVABLES REPORT", title_box_h),
        Paragraph("Sundry Debtors Summary Register", title_box_sub),
        Spacer(1, 2),
        Paragraph(f"Generated: <b>{now_str}</b>", title_box_m),
        Paragraph("Period: <b>All Records to Date</b>", title_box_m),
    ]

    hdr_table = Table([[header_left, header_right]], colWidths=[335, 210])
    hdr_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(hdr_table)
    story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY_COLOR, spaceBefore=4, spaceAfter=10))

    # Summary Stats computation
    total_debtors = len(debtors_data)
    total_opening = Decimal('0.00')
    total_billed = Decimal('0.00')
    total_received = Decimal('0.00')
    total_receivable = Decimal('0.00')
    total_advance = Decimal('0.00')

    if summary_stats and isinstance(summary_stats, dict):
        total_debtors = int(summary_stats.get('totalDebtors', total_debtors))
        total_opening = Decimal(str(summary_stats.get('totalOpeningSum', 0) or 0))
        total_billed = Decimal(str(summary_stats.get('totalBilledSum', 0) or 0))
        total_received = Decimal(str(summary_stats.get('totalReceivedSum', 0) or 0))
        total_receivable = Decimal(str(summary_stats.get('totalReceivableSum', 0) or 0))
        total_advance = Decimal(str(summary_stats.get('totalAdvanceSum', 0) or 0))
    else:
        for d in debtors_data:
            op = Decimal(str(d.get('openingBal', 0) or 0))
            op_type = (d.get('openingType', 'DR') or 'DR').upper()
            total_opening += (op if op_type == 'DR' else -op)
            total_billed += Decimal(str(d.get('salesBilled', 0) or 0))
            total_received += Decimal(str(d.get('collectionsReceived', 0) or 0))
            total_receivable += Decimal(str(d.get('netReceivable', 0) or 0))
            total_advance += Decimal(str(d.get('advanceBalance', 0) or 0))

    # 2. KPI Dashboard Cards (4 distinct floating cards)
    op_suffix = 'Dr' if total_opening >= 0 else 'Cr'
    rec_suffix = 'Dr' if total_receivable >= 0 else 'Cr'

    c1 = [Paragraph("TOTAL DEBTORS", kpi_label), Spacer(1, 2), Paragraph(str(total_debtors), kpi_val), Spacer(1, 1), Paragraph(f"Op: ₹{abs(total_opening):,.2f} {op_suffix}", kpi_sub)]
    c2 = [Paragraph("TOTAL SALES BILLED", kpi_label), Spacer(1, 2), Paragraph(f"₹{total_billed:,.2f}", kpi_val), Spacer(1, 1), Paragraph("Delivery & Sales Bills", kpi_sub)]
    c3 = [Paragraph("COLLECTIONS RECEIVED", kpi_label), Spacer(1, 2), Paragraph(f"₹{total_received:,.2f}", kpi_val), Spacer(1, 1), Paragraph("Cash & Bank Receipts", kpi_sub)]
    c4 = [
        Paragraph("NET RECEIVABLE", ParagraphStyle('RecKpiLblB', parent=kpi_label, textColor=PRIMARY_COLOR)),
        Spacer(1, 2),
        Paragraph(f"₹{abs(total_receivable):,.2f} {rec_suffix}", kpi_val_burg),
        Spacer(1, 1),
        Paragraph("Current Outstanding", ParagraphStyle('RecKpiSubB', parent=kpi_sub, textColor=PRIMARY_COLOR))
    ]

    kpi_data = [[c1, '', c2, '', c3, '', c4]]
    kpi_table = Table(kpi_data, colWidths=[130, 8, 130, 8, 130, 8, 131])
    kpi_table.setStyle(TableStyle([
        ('BOX', (0, 0), (0, 0), 0.75, colors.HexColor('#CBD5E1')),
        ('BACKGROUND', (0, 0), (0, 0), LIGHT_BG),
        ('BOX', (2, 0), (2, 0), 0.75, colors.HexColor('#CBD5E1')),
        ('BACKGROUND', (2, 0), (2, 0), LIGHT_BG),
        ('BOX', (4, 0), (4, 0), 0.75, colors.HexColor('#CBD5E1')),
        ('BACKGROUND', (4, 0), (4, 0), LIGHT_BG),
        ('BOX', (6, 0), (6, 0), 1.25, PRIMARY_COLOR),
        ('BACKGROUND', (6, 0), (6, 0), CARD_BG),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(kpi_table)
    story.append(Spacer(1, 10))

    # 3. Section Subheader Bar
    filter_desc = f"Showing <b>{len(debtors_data)}</b> Active Customer Accounts"
    if search_query:
        filter_desc = f'Filter: "{search_query}" (<b>{len(debtors_data)}</b> accounts listed)'

    sub_bar_data = [[
        Paragraph("<b>LIST OF CUSTOMER / DEBTOR ACCOUNTS</b>", ParagraphStyle('RecSbL', fontName=FONT_BOLD, fontSize=8, leading=10, textColor=PRIMARY_COLOR)),
        Paragraph(filter_desc, ParagraphStyle('RecSbR', fontName=FONT_NAME, fontSize=7.5, leading=10, textColor=MUTED_COLOR, alignment=2))
    ]]
    sub_bar = Table(sub_bar_data, colWidths=[345, 200])
    sub_bar.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(sub_bar)
    story.append(Spacer(1, 4))

    # 4. Data Table (Col Widths: [165, 90, 95, 95, 100] = 545 pt)
    th_row = [
        Paragraph("CUSTOMER NAME &amp; CONTACT", th_left),
        Paragraph("OPENING BAL (₹)", th_right),
        Paragraph("SALES BILLED (₹)", th_right),
        Paragraph("COLLECTIONS (₹)", th_right),
        Paragraph("NET RECEIVABLE (₹)", th_right),
    ]

    table_rows = [th_row]

    for d in debtors_data:
        c_name = d.get('name') or d.get('LedgerName') or 'Customer'
        c_phone = d.get('phone') or d.get('PhoneNumber') or d.get('MobileNumber') or ''
        c_city = d.get('city') or d.get('City') or ''
        adv = Decimal(str(d.get('advanceBalance', 0) or 0))

        sub_details = []
        if c_phone and str(c_phone) != '—':
            sub_details.append(str(c_phone))
        if c_city and str(c_city) != '—':
            sub_details.append(str(c_city))
        contact_str = " &bull; ".join(sub_details)

        name_content = [Paragraph(c_name, cell_name)]
        if adv > 0:
            name_content.append(Paragraph(f"<font size=7 color='#800020'><b>[Advance Balance: ₹{adv:,.2f}]</b></font>", cell_contact))
        if contact_str:
            name_content.append(Paragraph(contact_str, cell_contact))

        op_val = Decimal(str(d.get('openingBal', 0) or 0))
        op_t = (d.get('openingType', 'DR') or 'DR').upper()
        sales_val = Decimal(str(d.get('salesBilled', 0) or 0))
        coll_val = Decimal(str(d.get('collectionsReceived', 0) or 0))
        rec_val = Decimal(str(d.get('netReceivable', 0) or 0))

        table_rows.append([
            name_content,
            Paragraph(f"₹{op_val:,.2f} <font size=6.5 color='#64748B'>{op_t}</font>", cell_right),
            Paragraph(f"₹{sales_val:,.2f}", cell_right),
            Paragraph(f"₹{coll_val:,.2f}", cell_right),
            Paragraph(f"₹{abs(rec_val):,.2f} {'Dr' if rec_val >= 0 else 'Cr'}", cell_right_burg if abs(rec_val) > 0 else cell_right),
        ])

    # Summary Totals Row
    total_name = Paragraph(f"<b>TOTAL ({len(debtors_data)} DEBTORS)</b>", ParagraphStyle('RecTotLbl', fontName=FONT_BOLD, fontSize=8, leading=10, textColor=DARK_COLOR))
    table_rows.append([
        total_name,
        Paragraph(f"<b>₹{abs(total_opening):,.2f} {op_suffix}</b>", cell_right_bold),
        Paragraph(f"<b>₹{total_billed:,.2f}</b>", cell_right_bold),
        Paragraph(f"<b>₹{total_received:,.2f}</b>", cell_right_bold),
        Paragraph(f"<b>₹{abs(total_receivable):,.2f} {rec_suffix}</b>", cell_right_burg),
    ])

    report_table = Table(table_rows, colWidths=[165, 90, 95, 95, 100], repeatRows=1)
    t_style = [
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0, 0), (-1, -2), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 1), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 7),
        # Total row styling
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#F1F5F9')),
        ('LINEABOVE', (0, -1), (-1, -1), 1.25, PRIMARY_COLOR),
    ]

    for r in range(1, len(table_rows) - 1):
        bg = LIGHT_BG if r % 2 == 1 else colors.white
        t_style.append(('BACKGROUND', (0, r), (-1, r), bg))

    report_table.setStyle(TableStyle(t_style))
    story.append(report_table)
    story.append(Spacer(1, 18))

    # 5. Bottom Panel: Audit Notes (Left) & Signature (Right)
    notes_content = [
        Paragraph("<b>STATEMENT RECONCILIATION &amp; AUDIT NOTES:</b>", ParagraphStyle('RecNtH', fontName=FONT_BOLD, fontSize=7.5, leading=10, textColor=PRIMARY_COLOR)),
        Spacer(1, 3),
        Paragraph("&bull; This report reflects cumulative customer balances, sales invoices billed, and collections received.", ParagraphStyle('RecNtB1', fontName=FONT_NAME, fontSize=7, leading=9.5, textColor=DARK_COLOR)),
        Paragraph("&bull; Net Receivable Due is calculated on standard accrual accounting: (Opening Balance + Sales - Collections).", ParagraphStyle('RecNtB2', fontName=FONT_NAME, fontSize=7, leading=9.5, textColor=DARK_COLOR)),
        Paragraph("&bull; Customer advances are held on account and automatically FIFO-adjusted against subsequent delivery bills.", ParagraphStyle('RecNtB3', fontName=FONT_NAME, fontSize=7, leading=9.5, textColor=DARK_COLOR)),
        Paragraph("&bull; Generated automatically via Future Gas Cloud ERP. Official commercial financial record.", ParagraphStyle('RecNtB4', fontName=FONT_NAME, fontSize=7, leading=9.5, textColor=MUTED_COLOR)),
    ]

    sig_content = [
        Paragraph(f"For <b>{company_name}</b>", ParagraphStyle('RecSgC', fontName=FONT_BOLD, fontSize=8, leading=10, textColor=DARK_COLOR, alignment=2)),
        Paragraph("<font size=7 color='#64748B'>Commercial Accounts Department</font>", ParagraphStyle('RecSgC2', fontName=FONT_NAME, fontSize=7, leading=9, textColor=MUTED_COLOR, alignment=2)),
        Spacer(1, 28),
        Paragraph("_______________________________________", ParagraphStyle('RecSgL', fontName=FONT_NAME, fontSize=8, leading=10, textColor=colors.HexColor('#94A3B8'), alignment=2)),
        Paragraph("<b>Authorized Signatory</b>", ParagraphStyle('RecSgA', fontName=FONT_BOLD, fontSize=8, leading=10, textColor=PRIMARY_COLOR, alignment=2)),
        Paragraph(f"<font size=6.5 color='#64748B'>Date: {date_only}</font>", ParagraphStyle('RecSgD', fontName=FONT_NAME, fontSize=6.5, leading=8, textColor=MUTED_COLOR, alignment=2)),
    ]

    bottom_table = Table([[notes_content, '', sig_content]], colWidths=[315, 20, 210])
    bottom_table.setStyle(TableStyle([
        ('BOX', (0, 0), (0, 0), 0.75, colors.HexColor('#CBD5E1')),
        ('BACKGROUND', (0, 0), (0, 0), colors.HexColor('#F8FAFC')),
        ('BOX', (2, 0), (2, 0), 0.75, colors.HexColor('#CBD5E1')),
        ('BACKGROUND', (2, 0), (2, 0), colors.white),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(KeepTogether(bottom_table))
    story.append(Spacer(1, 14))

    # 6. Running Footer Bar
    ftr_data = [[
        Paragraph(f"<font size=6.5 color='#64748B'>Future Gas Cloud ERP &bull; Official Receivables Register &bull; Printed on {now_str}</font>", ParagraphStyle('RecFtrL', fontName=FONT_NAME, fontSize=6.5, leading=8, textColor=MUTED_COLOR)),
        Paragraph("<font size=6.5 color='#64748B'>Confidential &bull; Internal &amp; Regulatory Financial Record</font>", ParagraphStyle('RecFtrR', fontName=FONT_NAME, fontSize=6.5, leading=8, textColor=MUTED_COLOR, alignment=2))
    ]]
    ftr_table = Table(ftr_data, colWidths=[345, 200])
    ftr_table.setStyle(TableStyle([
        ('LINEABOVE', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(ftr_table)

    doc.build(story)
    return buf.getvalue()


def generate_payables_summary_pdf(creditors_data, company_id=1, summary_stats=None, search_query=''):
    """
    Generates a complete, publication-quality A4 PDF summary of supplier payables (Sundry Creditors).
    Displays executive letterhead, 4 floating KPI summary cards,
    a structured tabular breakdown of all creditors with contacts, opening balance, purchases billed,
    payments settled, net outstanding liability, audit notes, and an official authorization signature block.
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=25,
        rightMargin=25,
        topMargin=25,
        bottomMargin=25
    )

    company_name = "FUTURE GAS"
    company_subtitle = "LPG Commercial & Domestic Distribution Network"
    company_address = "Civil Station, Kozhikode, Kerala - 673020"
    company_contact = "Ph: +91 98470 12345 | Email: accounts@futuregas.in"
    company_gstin = "32AABCF1234F1Z8"

    try:
        from core.models import Company
        co = Company.objects.filter(CompanyId=company_id).first()
        if co:
            company_name = co.CompanyName or company_name
            company_address = co.Address or company_address
            company_gstin = co.GSTIN or company_gstin
            company_contact = f"Ph: {co.PhoneNumber or co.MobileNumber or '+91 98470 12345'}"
    except Exception:
        pass

    title_company = ParagraphStyle('PayCompT', fontName=FONT_BOLD, fontSize=18, leading=22, textColor=PRIMARY_COLOR)
    sub_company = ParagraphStyle('PayCompS', fontName=FONT_BOLD, fontSize=8.5, leading=11, textColor=colors.HexColor('#334155'))
    meta_company = ParagraphStyle('PayCompM', fontName=FONT_NAME, fontSize=7.5, leading=10, textColor=MUTED_COLOR)

    title_box_h = ParagraphStyle('PayBoxH', fontName=FONT_BOLD, fontSize=14, leading=17, textColor=PRIMARY_COLOR, alignment=2)
    title_box_sub = ParagraphStyle('PayBoxSub', fontName=FONT_BOLD, fontSize=8, leading=10, textColor=colors.HexColor('#475569'), alignment=2)
    title_box_m = ParagraphStyle('PayBoxM', fontName=FONT_NAME, fontSize=7, leading=9, textColor=MUTED_COLOR, alignment=2)

    kpi_label = ParagraphStyle('PayKpiLbl', fontName=FONT_BOLD, fontSize=7, leading=9, textColor=MUTED_COLOR, alignment=1)
    kpi_val = ParagraphStyle('PayKpiVal', fontName=FONT_BOLD, fontSize=13, leading=15, textColor=DARK_COLOR, alignment=1)
    kpi_sub = ParagraphStyle('PayKpiSub', fontName=FONT_NAME, fontSize=7, leading=9, textColor=MUTED_COLOR, alignment=1)
    kpi_val_burg = ParagraphStyle('PayKpiValBurg', fontName=FONT_BOLD, fontSize=13, leading=15, textColor=PRIMARY_COLOR, alignment=1)

    th_left = ParagraphStyle('PayThL', fontName=FONT_BOLD, fontSize=7.5, leading=9, textColor=colors.white)
    th_right = ParagraphStyle('PayThR', fontName=FONT_BOLD, fontSize=7.5, leading=9, textColor=colors.white, alignment=2)
    cell_name = ParagraphStyle('PayCellName', fontName=FONT_BOLD, fontSize=8.5, leading=11, textColor=DARK_COLOR)
    cell_contact = ParagraphStyle('PayCellCont', fontName=FONT_NAME, fontSize=7, leading=9, textColor=MUTED_COLOR)
    cell_right = ParagraphStyle('PayCellR', fontName=FONT_NAME, fontSize=8, leading=10, textColor=DARK_COLOR, alignment=2)
    cell_right_bold = ParagraphStyle('PayCellRB', fontName=FONT_BOLD, fontSize=8, leading=10, textColor=DARK_COLOR, alignment=2)
    cell_right_burg = ParagraphStyle('PayCellRBurg', fontName=FONT_BOLD, fontSize=8.5, leading=11, textColor=PRIMARY_COLOR, alignment=2)

    story = []

    # 1. Header Block
    now_str = datetime.now().strftime('%d-%b-%Y %I:%M %p')
    date_only = datetime.now().strftime('%d-%b-%Y')

    header_left = [
        Paragraph(company_name, title_company),
        Paragraph(company_subtitle, sub_company),
        Paragraph(company_address, meta_company),
        Paragraph(f"{company_contact} &bull; GSTIN: <b>{company_gstin}</b>", meta_company),
    ]

    header_right = [
        Paragraph("PAYABLES REPORT", title_box_h),
        Paragraph("Sundry Creditors Summary Register", title_box_sub),
        Spacer(1, 2),
        Paragraph(f"Generated: <b>{now_str}</b>", title_box_m),
        Paragraph("Period: <b>All Records to Date</b>", title_box_m),
    ]

    hdr_table = Table([[header_left, header_right]], colWidths=[335, 210])
    hdr_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(hdr_table)
    story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY_COLOR, spaceBefore=4, spaceAfter=10))

    # Summary Stats computation
    total_creditors = len(creditors_data)
    total_opening = Decimal('0.00')
    total_purchases = Decimal('0.00')
    total_paid = Decimal('0.00')
    total_payable = Decimal('0.00')

    if summary_stats and isinstance(summary_stats, dict):
        total_creditors = int(summary_stats.get('totalCreditors', total_creditors))
        total_opening = Decimal(str(summary_stats.get('totalOpeningSum', 0) or 0))
        total_purchases = Decimal(str(summary_stats.get('totalPurchasesSum', 0) or 0))
        total_paid = Decimal(str(summary_stats.get('totalPaidSum', 0) or 0))
        total_payable = Decimal(str(summary_stats.get('totalPayableSum', 0) or 0))
    else:
        for c in creditors_data:
            op = Decimal(str(c.get('openingBal', 0) or 0))
            op_type = (c.get('openingType', 'CR') or 'CR').upper()
            total_opening += (op if op_type == 'CR' else -op)
            total_purchases += Decimal(str(c.get('purchasesBilled', 0) or 0))
            total_paid += Decimal(str(c.get('paymentsPaid', 0) or 0))
            total_payable += Decimal(str(c.get('payableBalance', 0) or 0))

    # 2. KPI Dashboard Cards (4 distinct floating cards)
    op_suffix = 'Cr' if total_opening >= 0 else 'Dr'
    pay_suffix = 'Cr' if total_payable >= 0 else 'Dr'

    c1 = [Paragraph("TOTAL CREDITORS", kpi_label), Spacer(1, 2), Paragraph(str(total_creditors), kpi_val), Spacer(1, 1), Paragraph(f"Op: ₹{abs(total_opening):,.2f} {op_suffix}", kpi_sub)]
    c2 = [Paragraph("TOTAL PURCHASES", kpi_label), Spacer(1, 2), Paragraph(f"₹{total_purchases:,.2f}", kpi_val), Spacer(1, 1), Paragraph("Recorded Invoices", kpi_sub)]
    c3 = [Paragraph("PAYMENTS SETTLED", kpi_label), Spacer(1, 2), Paragraph(f"₹{total_paid:,.2f}", kpi_val), Spacer(1, 1), Paragraph("Disbursed Vouchers", kpi_sub)]
    c4 = [
        Paragraph("NET PAYABLE", ParagraphStyle('PayKpiLblB', parent=kpi_label, textColor=PRIMARY_COLOR)),
        Spacer(1, 2),
        Paragraph(f"₹{abs(total_payable):,.2f} {pay_suffix}", kpi_val_burg),
        Spacer(1, 1),
        Paragraph("Current Liability", ParagraphStyle('PayKpiSubB', parent=kpi_sub, textColor=PRIMARY_COLOR))
    ]

    kpi_data = [[c1, '', c2, '', c3, '', c4]]
    kpi_table = Table(kpi_data, colWidths=[130, 8, 130, 8, 130, 8, 131])
    kpi_table.setStyle(TableStyle([
        ('BOX', (0, 0), (0, 0), 0.75, colors.HexColor('#CBD5E1')),
        ('BACKGROUND', (0, 0), (0, 0), LIGHT_BG),
        ('BOX', (2, 0), (2, 0), 0.75, colors.HexColor('#CBD5E1')),
        ('BACKGROUND', (2, 0), (2, 0), LIGHT_BG),
        ('BOX', (4, 0), (4, 0), 0.75, colors.HexColor('#CBD5E1')),
        ('BACKGROUND', (4, 0), (4, 0), LIGHT_BG),
        ('BOX', (6, 0), (6, 0), 1.25, PRIMARY_COLOR),
        ('BACKGROUND', (6, 0), (6, 0), CARD_BG),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(kpi_table)
    story.append(Spacer(1, 10))

    # 3. Section Subheader Bar
    filter_desc = f"Showing <b>{len(creditors_data)}</b> Active Supplier Accounts"
    if search_query:
        filter_desc = f'Filter: "{search_query}" (<b>{len(creditors_data)}</b> accounts listed)'

    sub_bar_data = [[
        Paragraph("<b>LIST OF SUPPLIER / CREDITOR ACCOUNTS</b>", ParagraphStyle('PaySbL', fontName=FONT_BOLD, fontSize=8, leading=10, textColor=PRIMARY_COLOR)),
        Paragraph(filter_desc, ParagraphStyle('PaySbR', fontName=FONT_NAME, fontSize=7.5, leading=10, textColor=MUTED_COLOR, alignment=2))
    ]]
    sub_bar = Table(sub_bar_data, colWidths=[345, 200])
    sub_bar.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(sub_bar)
    story.append(Spacer(1, 4))

    # 4. Data Table (Col Widths: [165, 90, 95, 95, 100] = 545 pt)
    th_row = [
        Paragraph("SUPPLIER NAME &amp; CONTACT", th_left),
        Paragraph("OPENING BAL (₹)", th_right),
        Paragraph("PURCHASES (₹)", th_right),
        Paragraph("PAYMENTS (₹)", th_right),
        Paragraph("NET PAYABLE (₹)", th_right),
    ]

    table_rows = [th_row]

    for c in creditors_data:
        s_name = c.get('name') or c.get('LedgerName') or 'Supplier'
        s_phone = c.get('phone') or c.get('PhoneNumber') or c.get('MobileNumber') or ''
        s_city = c.get('city') or c.get('City') or ''

        sub_details = []
        if s_phone and str(s_phone) != '—':
            sub_details.append(str(s_phone))
        if s_city and str(s_city) != '—':
            sub_details.append(str(s_city))
        contact_str = " &bull; ".join(sub_details)

        name_content = [Paragraph(s_name, cell_name)]
        if contact_str:
            name_content.append(Paragraph(contact_str, cell_contact))

        op_val = Decimal(str(c.get('openingBal', 0) or 0))
        op_t = (c.get('openingType', 'CR') or 'CR').upper()
        pur_val = Decimal(str(c.get('purchasesBilled', 0) or 0))
        paid_val = Decimal(str(c.get('paymentsPaid', 0) or 0))
        due_val = Decimal(str(c.get('payableBalance', 0) or 0))

        table_rows.append([
            name_content,
            Paragraph(f"₹{op_val:,.2f} <font size=6.5 color='#64748B'>{op_t}</font>", cell_right),
            Paragraph(f"₹{pur_val:,.2f}", cell_right),
            Paragraph(f"₹{paid_val:,.2f}", cell_right),
            Paragraph(f"₹{abs(due_val):,.2f} {'Cr' if due_val >= 0 else 'Dr'}", cell_right_burg if abs(due_val) > 0 else cell_right),
        ])

    # Summary Totals Row
    total_name = Paragraph(f"<b>TOTAL ({len(creditors_data)} CREDITORS)</b>", ParagraphStyle('PayTotLbl', fontName=FONT_BOLD, fontSize=8, leading=10, textColor=DARK_COLOR))
    table_rows.append([
        total_name,
        Paragraph(f"<b>₹{abs(total_opening):,.2f} {op_suffix}</b>", cell_right_bold),
        Paragraph(f"<b>₹{total_purchases:,.2f}</b>", cell_right_bold),
        Paragraph(f"<b>₹{total_paid:,.2f}</b>", cell_right_bold),
        Paragraph(f"<b>₹{abs(total_payable):,.2f} {pay_suffix}</b>", cell_right_burg),
    ])

    report_table = Table(table_rows, colWidths=[165, 90, 95, 95, 100], repeatRows=1)
    t_style = [
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0, 0), (-1, -2), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 1), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 7),
        # Total row styling
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#F1F5F9')),
        ('LINEABOVE', (0, -1), (-1, -1), 1.25, PRIMARY_COLOR),
    ]

    for r in range(1, len(table_rows) - 1):
        bg = LIGHT_BG if r % 2 == 1 else colors.white
        t_style.append(('BACKGROUND', (0, r), (-1, r), bg))

    report_table.setStyle(TableStyle(t_style))
    story.append(report_table)
    story.append(Spacer(1, 18))

    # 5. Bottom Panel: Audit Notes (Left) & Signature (Right)
    notes_content = [
        Paragraph("<b>STATEMENT RECONCILIATION &amp; AUDIT NOTES:</b>", ParagraphStyle('PayNtH', fontName=FONT_BOLD, fontSize=7.5, leading=10, textColor=PRIMARY_COLOR)),
        Spacer(1, 3),
        Paragraph("&bull; This report reflects cumulative balances, recorded purchase bills, and settled payment vouchers.", ParagraphStyle('PayNtB1', fontName=FONT_NAME, fontSize=7, leading=9.5, textColor=DARK_COLOR)),
        Paragraph("&bull; Net Balance Due is calculated on standard accrual accounting: (Opening Balance + Purchases - Payments).", ParagraphStyle('PayNtB2', fontName=FONT_NAME, fontSize=7, leading=9.5, textColor=DARK_COLOR)),
        Paragraph("&bull; For statement reconciliation or voucher discrepancy, submit supporting bills to accounts within 7 business days.", ParagraphStyle('PayNtB3', fontName=FONT_NAME, fontSize=7, leading=9.5, textColor=DARK_COLOR)),
        Paragraph("&bull; Generated automatically via Future Gas Cloud ERP. Official commercial financial record.", ParagraphStyle('PayNtB4', fontName=FONT_NAME, fontSize=7, leading=9.5, textColor=MUTED_COLOR)),
    ]

    sig_content = [
        Paragraph(f"For <b>{company_name}</b>", ParagraphStyle('PaySgC', fontName=FONT_BOLD, fontSize=8, leading=10, textColor=DARK_COLOR, alignment=2)),
        Paragraph("<font size=7 color='#64748B'>Commercial Accounts Department</font>", ParagraphStyle('PaySgC2', fontName=FONT_NAME, fontSize=7, leading=9, textColor=MUTED_COLOR, alignment=2)),
        Spacer(1, 28),
        Paragraph("_______________________________________", ParagraphStyle('PaySgL', fontName=FONT_NAME, fontSize=8, leading=10, textColor=colors.HexColor('#94A3B8'), alignment=2)),
        Paragraph("<b>Authorized Signatory</b>", ParagraphStyle('PaySgA', fontName=FONT_BOLD, fontSize=8, leading=10, textColor=PRIMARY_COLOR, alignment=2)),
        Paragraph(f"<font size=6.5 color='#64748B'>Date: {date_only}</font>", ParagraphStyle('PaySgD', fontName=FONT_NAME, fontSize=6.5, leading=8, textColor=MUTED_COLOR, alignment=2)),
    ]

    bottom_table = Table([[notes_content, '', sig_content]], colWidths=[315, 20, 210])
    bottom_table.setStyle(TableStyle([
        ('BOX', (0, 0), (0, 0), 0.75, colors.HexColor('#CBD5E1')),
        ('BACKGROUND', (0, 0), (0, 0), colors.HexColor('#F8FAFC')),
        ('BOX', (2, 0), (2, 0), 0.75, colors.HexColor('#CBD5E1')),
        ('BACKGROUND', (2, 0), (2, 0), colors.white),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(KeepTogether(bottom_table))
    story.append(Spacer(1, 14))

    # 6. Running Footer Bar
    ftr_data = [[
        Paragraph(f"<font size=6.5 color='#64748B'>Future Gas Cloud ERP &bull; Official Payables Register &bull; Printed on {now_str}</font>", ParagraphStyle('PayFtrL', fontName=FONT_NAME, fontSize=6.5, leading=8, textColor=MUTED_COLOR)),
        Paragraph("<font size=6.5 color='#64748B'>Confidential &bull; Internal &amp; Regulatory Financial Record</font>", ParagraphStyle('PayFtrR', fontName=FONT_NAME, fontSize=6.5, leading=8, textColor=MUTED_COLOR, alignment=2))
    ]]
    ftr_table = Table(ftr_data, colWidths=[345, 200])
    ftr_table.setStyle(TableStyle([
        ('LINEABOVE', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(ftr_table)

    doc.build(story)
    return buf.getvalue()
