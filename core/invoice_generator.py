import os
import io
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
        closing_balance = previous_bill_pending + current_bill_amount - paid_amt
    else:
        # Walk-in customer
        previous_bill_pending = Decimal('0.00')
        closing_balance = max(Decimal('0.00'), current_bill_amount - paid_amt)

    # Empty cylinders return narration
    empty_qty_int = int(sale.TotalEmptyQty or 0)
    narration_text = f"{empty_qty_int} Return Qty." if empty_qty_int > 0 else "No Return Empties"
    if sale.PaymentMethod:
        narration_text += f" (Payment: {sale.PaymentMethod.upper()})"

    # Left Box: Customer Account Summary (Handwritten layout)
    # Right Box: Tax Breakdown (Handwritten layout)
    cust_summary_table = Table([
        [Paragraph("<b>CUSTOMER ACCOUNT SUMMARY</b>", section_title), Paragraph("", cell_norm)],
        [Paragraph("Previous Bill pending :", cell_norm), Paragraph(f"Rs. {previous_bill_pending:.2f}", cell_right_bold)],
        [Paragraph("Current Bill :", cell_norm), Paragraph(f"(+) Rs. {current_bill_amount:.2f}", cell_right)],
        [Paragraph("Paid Amount :", cell_norm), Paragraph(f"(-) Rs. {paid_amt:.2f}", cell_right)],
        [Paragraph("<b>Balance Due :</b>", cell_bold), Paragraph(f"<b>Rs. {closing_balance:.2f}</b>", ParagraphStyle('BalR', parent=cell_right_bold, textColor=PRIMARY_COLOR, fontSize=9.5))],
        [Paragraph("<b>Narration :</b>", cell_bold), Paragraph(f"<i>{narration_text}</i>", cell_norm)],
    ], colWidths=[130, 125])
    cust_summary_table.setStyle(TableStyle([
        ('LINEBELOW', (0, 0), (-1, 0), 1, PRIMARY_COLOR),
        ('LINEBELOW', (0, 3), (-1, 3), 1, BORDER_COLOR),
        ('LINEBELOW', (0, 4), (-1, 4), 1, BORDER_COLOR),
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
