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
    date_formatted = sale.SalesDate.strftime('%d/%m/%Y') if hasattr(sale.SalesDate, 'strftime') else (str(sale.SalesDate) if sale.SalesDate else datetime.now().strftime('%d/%m/%Y'))
    pm_upper = (sale.PaymentMethod or 'CASH').upper()
    is_credit = pm_upper == 'CREDIT' or getattr(sale, 'PaidAmount', None) == Decimal('0.00')

    s_no = str(sale.SalesNo or sale.InvoiceNo or '')
    is_empty_return = s_no.startswith('EMTRTN-') or (int(sale.TotalDeliveredQty or 0) == 0 and int(sale.TotalEmptyQty or 0) > 0 and Decimal(str(sale.GrandTotal or 0)) <= Decimal('0.00') and Decimal(str(sale.PaidAmount or 0)) <= Decimal('0.00'))
    is_money_receipt = s_no.startswith('RCPT-') or (int(sale.TotalDeliveredQty or 0) == 0 and int(sale.TotalEmptyQty or 0) > 0 and Decimal(str(sale.PaidAmount or 0)) > Decimal('0.00'))

    if is_empty_return:
        doc_title = "EMPTY RETURN VOUCHER"
        doc_no_label = "Voucher No:"
        payment_mode_display = "<b>Status:</b> <font color='#1D4ED8'><b>EMPTY RETURN (Rs. 0.00)</b></font><br/>"
    elif is_money_receipt:
        doc_title = "OFFICIAL RECEIPT"
        doc_no_label = "Receipt No:"
        if pm_upper == 'SPLIT':
            c_m = re.search(r'Cash:\s*[₹Rs\.]*\s*([\d,]+\.?\d*)', sale.Notes or '')
            u_m = re.search(r'UPI:\s*[₹Rs\.]*\s*([\d,]+\.?\d*)', sale.Notes or '')
            c_str = f"Rs. {float(c_m.group(1).replace(',', '')):.2f}" if c_m else ''
            u_str = f"Rs. {float(u_m.group(1).replace(',', '')):.2f}" if u_m else ''
            payment_mode_display = f"<b>Payment Mode:</b> SPLIT (Cash: {c_str} | UPI: {u_str})<br/>"
        else:
            payment_mode_display = f"<b>Payment Mode:</b> {pm_upper}<br/>"
    else:
        doc_title = "TAX INVOICE"
        doc_no_label = "Invoice No:"
        if is_credit:
            payment_mode_display = f"<b>Payment Mode:</b> <font color='#92400E'><b>CREDIT (Rs. 0.00 Paid)</b></font><br/>"
        elif pm_upper == 'SPLIT':
            c_m = re.search(r'Cash:\s*[₹Rs\.]*\s*([\d,]+\.?\d*)', sale.Notes or '')
            u_m = re.search(r'UPI:\s*[₹Rs\.]*\s*([\d,]+\.?\d*)', sale.Notes or '')
            c_str = f"Rs. {float(c_m.group(1).replace(',', '')):.2f}" if c_m else ''
            u_str = f"Rs. {float(u_m.group(1).replace(',', '')):.2f}" if u_m else ''
            if c_str or u_str:
                payment_mode_display = (
                    f"<b>Payment Mode:</b> SPLIT (Cash + UPI)<br/>"
                    f"&nbsp;&bull; Cash: {c_str} &nbsp;|&nbsp; UPI: {u_str}<br/>"
                )
            else:
                payment_mode_display = f"<b>Payment Mode:</b> SPLIT (Cash + UPI)<br/>"
        else:
            payment_mode_display = f"<b>Payment Mode:</b> {pm_upper}<br/>"

    rev_display = ""
    if getattr(sale, 'IsEdited', False):
        rev_dt = sale.EditedAt.strftime('%d/%m/%Y %I:%M %p') if getattr(sale, 'EditedAt', None) else ''
        rev_by = getattr(sale, 'EditedBy', '') or 'Driver/Admin'
        rev_display = f"<font color='#B91C1C'><b>[REVISED INVOICE]</b></font><br/>"
        if rev_dt:
            rev_display += f"<font size='7' color='#64748B'>Rev Date: {rev_dt}</font><br/>"

    header_data = [
        [
            Paragraph(f"<b>{company_name}</b>", c_title),
            Paragraph(f"<b>{doc_title}</b>", inv_badge)
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
                f"<b>{doc_no_label}</b> {sale.SalesNo}<br/>"
                f"{rev_display}"
                f"<b>Date:</b> {date_formatted}<br/>"
                f"{payment_mode_display}"
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

    # Determine Paid Amount early for line item generation & summaries
    paid_amt = Decimal('0.00')
    if pm_upper == 'CREDIT':
        paid_amt = Decimal('0.00')
    elif hasattr(sale, 'PaidAmount') and sale.PaidAmount is not None:
        paid_amt = Decimal(str(sale.PaidAmount))
    else:
        vl = VoucherLine.objects.filter(
            Voucher__ReferenceTable='Sales',
            Voucher__ReferenceId=sale.SalesId,
            CreditAmount__gt=0,
            Ledger=customer
        ).first() if customer else None
        if vl:
            paid_amt = vl.CreditAmount
        elif pm_upper in ['CASH', 'UPI', 'BANK', 'ONLINE']:
            paid_amt = Decimal(str(sale.GrandTotal or 0))

    total_taxable_sum = Decimal('0.00')
    total_cgst_sum = Decimal('0.00')
    total_sgst_sum = Decimal('0.00')
    total_igst_sum = Decimal('0.00')
    total_gross_sum = Decimal('0.00')

    lines = sale.lines.select_related('Product', 'Unit').all()
    is_intra_customer = (not customer or not customer.StateId or customer.StateId in [12, 32])

    if is_empty_return:
        for idx, line in enumerate(lines, 1):
            prod = line.Product
            hsn = prod.HSNCode if prod and prod.HSNCode else "271109"
            eqty = Decimal(str(line.EmptyQuantity or line.Quantity or 0))
            if eqty <= 0:
                eqty = Decimal(str(sale.TotalEmptyQty or 1))
            table_rows.append([
                Paragraph(str(idx), ParagraphStyle('C1', parent=cell_norm, alignment=1)),
                Paragraph(f"<b>{line.ProductName} (Empty Cylinder Return)</b>", cell_bold),
                Paragraph(hsn, ParagraphStyle('C2', parent=cell_muted, alignment=1)),
                Paragraph(f"{int(eqty)} NOS", ParagraphStyle('C3', parent=cell_norm, alignment=1)),
                Paragraph("0.00", cell_right),
                Paragraph("0.00", cell_right_bold),
            ])
        if len(table_rows) == 1:
            table_rows.append([
                Paragraph("1", ParagraphStyle('C1', parent=cell_norm, alignment=1)),
                Paragraph("<b>Empty LPG Cylinder Return</b>", cell_bold),
                Paragraph("271109", ParagraphStyle('C2', parent=cell_muted, alignment=1)),
                Paragraph(f"{int(sale.TotalEmptyQty or 1)} NOS", ParagraphStyle('C3', parent=cell_norm, alignment=1)),
                Paragraph("0.00", cell_right),
                Paragraph("0.00", cell_right_bold),
            ])
    elif is_money_receipt:
        table_rows.append([
            Paragraph("1", ParagraphStyle('C1', parent=cell_norm, alignment=1)),
            Paragraph("<b>Payment on Account / Customer Outstanding Settlement</b>", cell_bold),
            Paragraph("997159", ParagraphStyle('C2', parent=cell_muted, alignment=1)),
            Paragraph("1 NOS", ParagraphStyle('C3', parent=cell_norm, alignment=1)),
            Paragraph(f"{paid_amt:.2f}", cell_right),
            Paragraph(f"{paid_amt:.2f}", cell_right_bold),
        ])
        total_taxable_sum = paid_amt
        total_gross_sum = paid_amt
        line_idx = 2
        for line in lines:
            if line.EmptyQuantity > 0:
                prod = line.Product
                hsn = prod.HSNCode if prod and prod.HSNCode else "271109"
                table_rows.append([
                    Paragraph(str(line_idx), ParagraphStyle('C1', parent=cell_norm, alignment=1)),
                    Paragraph(f"<b>{line.ProductName} (Empty Return)</b>", cell_bold),
                    Paragraph(hsn, ParagraphStyle('C2', parent=cell_muted, alignment=1)),
                    Paragraph(f"{int(line.EmptyQuantity)} NOS", ParagraphStyle('C3', parent=cell_norm, alignment=1)),
                    Paragraph("0.00", cell_right),
                    Paragraph("0.00", cell_right_bold),
                ])
                line_idx += 1
    elif not lines.exists():
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

            # Fetch the actual sales amount added in the products
            gross_total = Decimal(str(line.Total or 0))
            if gross_total <= Decimal('0.00') and qty > 0:
                gross_unit_rate = Decimal(str(line.SalesPrice or (prod.SalesPrice if prod else 0) or 0))
                gross_total = (qty * gross_unit_rate).quantize(Decimal('0.01'))

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
    paid_amt = Decimal('0.00')
    pm_upper = (sale.PaymentMethod or 'CASH').upper()
    if pm_upper == 'CREDIT':
        paid_amt = Decimal('0.00')
    elif hasattr(sale, 'PaidAmount') and sale.PaidAmount is not None:
        paid_amt = Decimal(str(sale.PaidAmount))
    else:
        vl = VoucherLine.objects.filter(
            Voucher__ReferenceTable='Sales',
            Voucher__ReferenceId=sale.SalesId,
            CreditAmount__gt=0,
            Ledger=customer
        ).first() if customer else None

        if vl:
            paid_amt = vl.CreditAmount
        elif pm_upper in ['CASH', 'UPI', 'BANK', 'ONLINE']:
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
            prior_agg = prior_vl_qs.aggregate(
                dr=Sum('DebitAmount'), cr=Sum('CreditAmount')
            )
            prior_dr = prior_agg['dr'] or Decimal('0.00')
            prior_cr = prior_agg['cr'] or Decimal('0.00')
            previous_bill_pending = max(Decimal('0.00'), op_net + prior_dr - prior_cr)
        else:
            from core.models import Sales, Payment
            prior_sales_qs = Sales.objects.filter(
                CustomerLedger=customer, CompanyId=sale.CompanyId
            ).exclude(Status='CANCELLED').exclude(SalesId=sale.SalesId)
            if sale.SalesDate:
                prior_sales_qs = prior_sales_qs.filter(
                    Q(SalesDate__lt=sale.SalesDate) |
                    Q(SalesDate=sale.SalesDate, SalesId__lt=sale.SalesId)
                )
            prior_sales_total = prior_sales_qs.aggregate(s=Sum('GrandTotal'))['s'] or Decimal('0.00')

            prior_payments_qs = Payment.objects.filter(PartyLedger=customer)
            if sale.SalesDate:
                prior_payments_qs = prior_payments_qs.filter(CreatedAt__date__lte=sale.SalesDate)
            prior_payments_total = prior_payments_qs.aggregate(s=Sum('Amount'))['s'] or Decimal('0.00')

            previous_bill_pending = max(Decimal('0.00'), op_net + prior_sales_total - prior_payments_total)

        if is_money_receipt:
            closing_balance = max(Decimal('0.00'), previous_bill_pending - paid_amt)
        elif is_empty_return:
            closing_balance = previous_bill_pending
        else:
            closing_balance = max(Decimal('0.00'), previous_bill_pending + current_bill_amount - adv_adj - paid_amt)
    else:
        # Walk-in customer
        previous_bill_pending = Decimal('0.00')
        closing_balance = max(Decimal('0.00'), current_bill_amount - adv_adj - paid_amt)

    # Parse split amounts if payment mode is SPLIT
    c_m = re.search(r'Cash:\s*[₹Rs\.]*\s*([\d,]+\.?\d*)', sale.Notes or '')
    u_m = re.search(r'UPI:\s*[₹Rs\.]*\s*([\d,]+\.?\d*)', sale.Notes or '')
    c_split = Decimal(c_m.group(1).replace(',', '')) if c_m else Decimal('0.00')
    u_split = Decimal(u_m.group(1).replace(',', '')) if u_m else Decimal('0.00')
    is_split = (sale.PaymentMethod or '').upper() == 'SPLIT' or (c_split > Decimal('0.00') and u_split > Decimal('0.00'))

    # Empty cylinders return narration
    empty_qty_int = int(sale.TotalEmptyQty or 0)
    narration_text = f"{empty_qty_int} Return Qty." if empty_qty_int > 0 else "No Return Empties"
    if is_split:
        narration_text += f" (Split: Cash Rs.{c_split:.2f} + UPI Rs.{u_split:.2f})"
    elif sale.PaymentMethod:
        narration_text += f" (Payment: {sale.PaymentMethod.upper()})"

    # Left Box: Customer Account Summary (Handwritten layout)
    # Right Box: Tax Breakdown (Handwritten layout)
    if is_empty_return:
        cust_summary_rows = [
            [Paragraph("<b>CUSTOMER ACCOUNT SUMMARY</b>", section_title), Paragraph("", cell_norm)],
            [Paragraph("Previous Balance :", cell_norm), Paragraph(f"Rs. {previous_bill_pending:.2f}", cell_right_bold)],
            [Paragraph("Returned Cylinders :", cell_norm), Paragraph(f"<b>{empty_qty_int} NOS</b>", cell_right_bold)],
            [Paragraph("Amount Paid :", cell_norm), Paragraph("Rs. 0.00", cell_right)],
            [Paragraph("<b>Balance Due :</b>", cell_bold), Paragraph(f"<b>Rs. {closing_balance:.2f}</b>", ParagraphStyle('BalR', parent=cell_right_bold, textColor=PRIMARY_COLOR, fontSize=9.5))],
            [Paragraph("<b>Narration :</b>", cell_bold), Paragraph(f"<i>{narration_text}</i>", cell_norm)],
        ]
    elif is_money_receipt:
        cust_summary_rows = [
            [Paragraph("<b>CUSTOMER ACCOUNT SUMMARY</b>", section_title), Paragraph("", cell_norm)],
            [Paragraph("Previous Balance :", cell_norm), Paragraph(f"Rs. {previous_bill_pending:.2f}", cell_right_bold)],
            [Paragraph("<b>Payment Received :</b>", cell_bold), Paragraph(f"<b>(-) Rs. {paid_amt:.2f}</b>", ParagraphStyle('RcvAmt', parent=cell_right_bold, textColor=colors.HexColor('#047857')))],
            [Paragraph("Payment Mode :", cell_muted), Paragraph(f"<b>{pm_upper}</b>", cell_right)],
            [Paragraph("<b>Remaining Balance :</b>", cell_bold), Paragraph(f"<b>Rs. {closing_balance:.2f}</b>", ParagraphStyle('BalR', parent=cell_right_bold, textColor=PRIMARY_COLOR, fontSize=9.5))],
            [Paragraph("<b>Narration :</b>", cell_bold), Paragraph(f"<i>{narration_text}</i>", cell_norm)],
        ]
    else:
        cust_summary_rows = [
            [Paragraph("<b>CUSTOMER ACCOUNT SUMMARY</b>", section_title), Paragraph("", cell_norm)],
            [Paragraph("Previous Bill Pending :", cell_norm), Paragraph(f"Rs. {previous_bill_pending:.2f}", cell_right_bold)],
            [Paragraph("Current Bill :", cell_norm), Paragraph(f"(+) Rs. {current_bill_amount:.2f}", cell_right)],
        ]
        if adv_adj > Decimal('0.00'):
            cust_summary_rows.append([
                Paragraph("Advance Adjusted :", ParagraphStyle('AdvLbl', parent=cell_bold, textColor=colors.HexColor('#0D9488'))),
                Paragraph(f"(-) Rs. {adv_adj:.2f}", ParagraphStyle('AdvVal', parent=cell_right_bold, textColor=colors.HexColor('#0D9488')))
            ])
        if is_split:
            cust_summary_rows.append([
                Paragraph("<b>Paid Amount (Split) :</b>", cell_bold),
                Paragraph(f"(-) Rs. {paid_amt:.2f}", cell_right_bold)
            ])
            cust_summary_rows.append([
                Paragraph("&nbsp;&nbsp;&bull; Cash Paid :", ParagraphStyle('CshLbl', parent=cell_muted, fontSize=8)),
                Paragraph(f"Rs. {c_split:.2f}", ParagraphStyle('CshVal', parent=cell_right, fontSize=8))
            ])
            cust_summary_rows.append([
                Paragraph("&nbsp;&nbsp;&bull; UPI / Bank :", ParagraphStyle('UpiLbl', parent=cell_muted, fontSize=8)),
                Paragraph(f"Rs. {u_split:.2f}", ParagraphStyle('UpiVal', parent=cell_right, fontSize=8))
            ])
        elif is_credit or paid_amt == Decimal('0.00'):
            cust_summary_rows.append([
                Paragraph("<b>Paid Amount :</b>", cell_bold),
                Paragraph("<font color='#92400E'><b>Rs. 0.00 (CREDIT)</b></font>", cell_right_bold)
            ])
        else:
            cust_summary_rows.append([
                Paragraph("Paid Amount :", cell_norm),
                Paragraph(f"(-) Rs. {paid_amt:.2f}", cell_right)
            ])
        cust_summary_rows.extend([
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

    if is_empty_return:
        tax_summary_table = Table([
            [Paragraph("<b>EMPTY RETURN VERIFICATION</b>", section_title), Paragraph("", cell_norm)],
            [Paragraph("Empties Inward Qty :", cell_norm), Paragraph(f"<b>{int(sale.TotalEmptyQty or 0)} NOS</b>", cell_right_bold)],
            [Paragraph("Bill Amount :", cell_muted), Paragraph("Rs. 0.00", cell_right)],
            [Paragraph("Amount Collected :", cell_muted), Paragraph("Rs. 0.00", cell_right)],
            [Paragraph("Stock Destination :", cell_muted), Paragraph("Van Stock", cell_right)],
            [Paragraph("<b>Inspection Status :</b>", cell_bold), Paragraph("<b>VERIFIED</b>", cell_right_bold)],
            [Paragraph("<b>Total Collected :</b>", ParagraphStyle('NetLbl', parent=cell_bold, fontSize=10, textColor=PRIMARY_COLOR)),
             Paragraph("<b>Rs. 0.00</b>", ParagraphStyle('NetVal', parent=cell_right_bold, fontSize=11, textColor=PRIMARY_COLOR))],
        ], colWidths=[140, 130])
    elif is_money_receipt:
        tax_summary_table = Table([
            [Paragraph("<b>PAYMENT RECEIPT BREAKDOWN</b>", section_title), Paragraph("", cell_norm)],
            [Paragraph("Amount Received :", cell_norm), Paragraph(f"<b>Rs. {paid_amt:.2f}</b>", cell_right_bold)],
            [Paragraph("Payment Mode :", cell_muted), Paragraph(f"<b>{pm_upper}</b>", cell_right)],
            [Paragraph("Empties Collected :", cell_muted), Paragraph(f"{int(sale.TotalEmptyQty or 0)} NOS", cell_right)],
            [Paragraph("Current Bill :", cell_muted), Paragraph("Rs. 0.00", cell_right)],
            [Paragraph("<b>Credited To :</b>", cell_bold), Paragraph("<b>Customer Account</b>", cell_right_bold)],
            [Paragraph("<b>Net Amount Paid :</b>", ParagraphStyle('NetLbl', parent=cell_bold, fontSize=10, textColor=PRIMARY_COLOR)),
             Paragraph(f"<b>Rs. {paid_amt:.2f}</b>", ParagraphStyle('NetVal', parent=cell_right_bold, fontSize=11, textColor=PRIMARY_COLOR))],
        ], colWidths=[140, 130])
    else:
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
    if is_empty_return:
        words_total = "Zero Rupees Only"
        terms_text = "<b>Empty Cylinders Return Voucher:</b> The returned empty cylinder(s) detailed above have been physically inspected and accepted into van inventory. No monetary payment was collected for this transaction."
    elif is_money_receipt:
        words_total = amount_to_words(paid_amt)
        terms_text = "<b>Official Payment Receipt:</b> Received with thanks the amount mentioned above towards customer account ledger balance. This receipt confirms valid payment settlement."
    else:
        words_total = amount_to_words(current_bill_amount)
        terms_text = "<b>Terms & Conditions:</b> Goods received in good order and sound condition. LPG Cylinders remain the property of Future Gas and must be returned on demand. Subject to Kozhikode Jurisdiction."

    terms_box = Table([
        [
            Paragraph(
                f"<b>Net Amount in Words:</b> <i>{words_total}</i><br/>"
                f"<font size=7 color='#64748B'>{terms_text}</font>",
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
    # 6. SIGNATURE FOOTER & PAYMENT GROUP QR CODE
    # -------------------------------------------------------------
    pg_obj = None
    if sale.RouteVehicleDriver and sale.RouteVehicleDriver.PaymentGroup:
        pg_obj = sale.RouteVehicleDriver.PaymentGroup
    elif sale.DriverName:
        from core.models import RouteVehicleDriver
        rvd_cand = RouteVehicleDriver.objects.filter(Driver__DriverName=sale.DriverName, IsActive=True).first()
        if rvd_cand and rvd_cand.PaymentGroup:
            pg_obj = rvd_cand.PaymentGroup

    qr_img_flowable = None
    if pg_obj and pg_obj.QRCodeLocation:
        from reportlab.platypus import Image as RLImage
        from django.conf import settings
        loc = str(pg_obj.QRCodeLocation).replace('\\', '/').lstrip('/')
        candidates = [
            os.path.join(settings.MEDIA_ROOT, loc),
            os.path.join(settings.BASE_DIR, 'media', loc),
            os.path.join(settings.BASE_DIR, loc),
        ]
        if os.path.isabs(str(pg_obj.QRCodeLocation)):
            candidates.insert(0, str(pg_obj.QRCodeLocation))
        for cand in candidates:
            if os.path.exists(cand) and os.path.isfile(cand):
                try:
                    qr_img_flowable = RLImage(cand, width=60, height=60)
                    break
                except Exception:
                    qr_img_flowable = None

    if qr_img_flowable:
        bank_name_str = pg_obj.BankLedger.LedgerName if (pg_obj.BankLedger and pg_obj.BankLedger.LedgerName) else ""
        qr_box = [
            [Paragraph("<b>SCAN &amp; PAY</b>", ParagraphStyle('QrH', fontName=FONT_BOLD, fontSize=7, leading=8.5, alignment=1, textColor=PRIMARY_COLOR))],
            [qr_img_flowable],
            [Paragraph(f"<font size=5.5 color='#475569'><b>{pg_obj.PaymentGroupName}</b>{(' • ' + bank_name_str) if bank_name_str else ''}</font>", ParagraphStyle('QrF', fontName=FONT_NAME, fontSize=5.5, leading=7, alignment=1))],
        ]
        qr_table = Table(qr_box, colWidths=[90])
        qr_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('BACKGROUND', (0, 0), (-1, -1), LIGHT_BG),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('LEFTPADDING', (0, 0), (-1, -1), 2),
            ('RIGHTPADDING', (0, 0), (-1, -1), 2),
        ]))

        footer_data = [
            [
                Paragraph(
                    f"<b>Customer / Receiver's Signature:</b> ___________________<br/>"
                    f"<font size=7 color='#64748B'>I accept goods and cylinder return count as noted above</font>",
                    cell_norm
                ),
                qr_table,
                Paragraph(
                    f"For <b>{company_name}</b><br/><br/><br/>"
                    f"<b>Authorized Signatory</b><br/>"
                    f"<font size=7 color='#64748B'>Computer generated official tax invoice</font>",
                    ParagraphStyle('SigR', parent=cell_norm, alignment=2)
                )
            ]
        ]
        footer_table = Table(footer_data, colWidths=[225, 95, 225])
        footer_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'BOTTOM'),
            ('ALIGN', (1, 0), (1, 0), 'CENTER'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ]))
    else:
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
    if re.match(r'^(?:DT|BT)-', s, re.I):
        nums = re.findall(r'\d+', s)
        if nums:
            return f"INV-{nums[-1]}"
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

    doc.build(story)
    return buf.getvalue()


def generate_collections_statement_pdf(records, source_type='ALL', period_text='All Records to Date', company_id=1, summary_stats=None):
    """
    Generates a clean commercial PDF for Collections & Cash Inflow Register.
    """
    from core.models import Company
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=25,
        rightMargin=25,
        topMargin=25,
        bottomMargin=20,
    )

    company = Company.objects.filter(CompanyId=company_id).first()
    company_name = company.Name if company else "FUTURE GAS"
    phone_str = company.Phone if company and company.Phone else "+91 98470 12345"
    email_str = company.Email if company and company.Email else "accounts@futuregas.in"
    gstin_str = company.GstNo if company and company.GstNo else "32AABCF1234F1Z8"
    address_str = company.AddressLine1 if company and company.AddressLine1 else "Civil Station, Kozhikode, Kerala - 673020"

    now = datetime.now()
    now_str = now.strftime('%d-%b-%Y %I:%M %p')
    date_only = now.strftime('%d-%b-%Y')

    story = []

    # 1. Header Box
    hdr_left = [
        Paragraph(f"<b>{company_name}</b>", ParagraphStyle('ColHdrCo', fontName=FONT_BOLD, fontSize=16, leading=19, textColor=PRIMARY_COLOR)),
        Paragraph("LPG Commercial & Domestic Distribution Network", ParagraphStyle('ColHdrSub', fontName=FONT_NAME, fontSize=7.5, leading=10, textColor=MUTED_COLOR)),
        Spacer(1, 4),
        Paragraph(address_str, ParagraphStyle('ColHdrAddr', fontName=FONT_NAME, fontSize=7.5, leading=10, textColor=DARK_COLOR)),
        Paragraph(f"Ph: {phone_str} | Email: {email_str} | GSTIN: {gstin_str}", ParagraphStyle('ColHdrMeta', fontName=FONT_NAME, fontSize=7, leading=9.5, textColor=MUTED_COLOR)),
    ]

    title_suffix = "ALL COLLECTIONS & RECEIPTS"
    if source_type == 'SALE':
        title_suffix = "SALES COUNTER COLLECTIONS"
    elif source_type == 'RECEIPT':
        title_suffix = "RECEIPT VOUCHERS / DIRECT COLLECTIONS"

    hdr_right = [
        Paragraph("<b>COLLECTIONS STATEMENT</b>", ParagraphStyle('ColHdrTitle', fontName=FONT_BOLD, fontSize=14, leading=17, textColor=PRIMARY_COLOR, alignment=2)),
        Paragraph(f"<font size=8 color='#64748B'>{title_suffix}</font>", ParagraphStyle('ColHdrType', fontName=FONT_NAME, fontSize=8, leading=11, textColor=MUTED_COLOR, alignment=2)),
        Spacer(1, 4),
        Paragraph(f"Period: <b>{period_text}</b>", ParagraphStyle('ColHdrPrd', fontName=FONT_NAME, fontSize=7.5, leading=10, textColor=DARK_COLOR, alignment=2)),
        Paragraph(f"Generated: {now_str}", ParagraphStyle('ColHdrGen', fontName=FONT_NAME, fontSize=7, leading=9.5, textColor=MUTED_COLOR, alignment=2)),
    ]

    header_table = Table([[hdr_left, hdr_right]], colWidths=[310, 235])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LINEBELOW', (0, 0), (-1, -1), 1.5, PRIMARY_COLOR),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 10))

    # 2. KPI Summary Cards
    tot_count = len(records)
    tot_amt = sum(Decimal(str(r.get('amount') or 0)) for r in records)
    cash_amt = sum(Decimal(str(r.get('amount') or 0)) for r in records if str(r.get('paymentMode') or r.get('payment_mode') or '').upper() == 'CASH')
    bank_amt = tot_amt - cash_amt

    if summary_stats:
        try:
            tot_count = int(summary_stats.get('totalCount') or tot_count)
            tot_amt = Decimal(str(summary_stats.get('totalAmount') or tot_amt))
            cash_amt = Decimal(str(summary_stats.get('cashTotal') or cash_amt))
            bank_amt = Decimal(str(summary_stats.get('bankTotal') or bank_amt))
        except Exception:
            pass

    kpi_card_style = TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#E2E8F0')),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#FFFFFF')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ])

    kpi_1 = Table([
        [Paragraph("TOTAL TRANSACTIONS", ParagraphStyle('KpiLbl1', fontName=FONT_BOLD, fontSize=7, leading=9, textColor=MUTED_COLOR))],
        [Paragraph(f"<b>{tot_count}</b>", ParagraphStyle('KpiVal1', fontName=FONT_BOLD, fontSize=15, leading=18, textColor=DARK_COLOR))],
        [Paragraph(f"<font size=6.5 color='#64748B'>Entries recorded</font>", ParagraphStyle('KpiSub1', fontName=FONT_NAME, fontSize=6.5, leading=8, textColor=MUTED_COLOR))],
    ], colWidths=[125])
    kpi_1.setStyle(kpi_card_style)

    kpi_2 = Table([
        [Paragraph("CASH COLLECTIONS", ParagraphStyle('KpiLbl2', fontName=FONT_BOLD, fontSize=7, leading=9, textColor=MUTED_COLOR))],
        [Paragraph(f"<b>₹{cash_amt:,.2f}</b>", ParagraphStyle('KpiVal2', fontName=FONT_BOLD, fontSize=14, leading=17, textColor=DARK_COLOR))],
        [Paragraph(f"<font size=6.5 color='#64748B'>Direct cash inflow</font>", ParagraphStyle('KpiSub2', fontName=FONT_NAME, fontSize=6.5, leading=8, textColor=MUTED_COLOR))],
    ], colWidths=[130])
    kpi_2.setStyle(kpi_card_style)

    kpi_3 = Table([
        [Paragraph("UPI & BANK INFLOW", ParagraphStyle('KpiLbl3', fontName=FONT_BOLD, fontSize=7, leading=9, textColor=MUTED_COLOR))],
        [Paragraph(f"<b>₹{bank_amt:,.2f}</b>", ParagraphStyle('KpiVal3', fontName=FONT_BOLD, fontSize=14, leading=17, textColor=DARK_COLOR))],
        [Paragraph(f"<font size=6.5 color='#64748B'>Digital / Bank transfers</font>", ParagraphStyle('KpiSub3', fontName=FONT_NAME, fontSize=6.5, leading=8, textColor=MUTED_COLOR))],
    ], colWidths=[130])
    kpi_3.setStyle(kpi_card_style)

    kpi_card_burgundy_style = TableStyle([
        ('BOX', (0, 0), (-1, -1), 1.25, PRIMARY_COLOR),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#FFFFFF')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ])

    kpi_4 = Table([
        [Paragraph("TOTAL COLLECTED (₹)", ParagraphStyle('KpiLbl4', fontName=FONT_BOLD, fontSize=7, leading=9, textColor=PRIMARY_COLOR))],
        [Paragraph(f"<b>₹{tot_amt:,.2f}</b>", ParagraphStyle('KpiVal4', fontName=FONT_BOLD, fontSize=15, leading=18, textColor=PRIMARY_COLOR))],
        [Paragraph(f"<font size=6.5 color='#64748B'>Net collected revenue</font>", ParagraphStyle('KpiSub4', fontName=FONT_NAME, fontSize=6.5, leading=8, textColor=MUTED_COLOR))],
    ], colWidths=[135])
    kpi_4.setStyle(kpi_card_burgundy_style)

    kpi_grid = Table([[kpi_1, kpi_2, kpi_3, kpi_4]], colWidths=[132, 137, 137, 139])
    kpi_grid.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(kpi_grid)
    story.append(Spacer(1, 12))

    # 3. Table Header
    hdr_cell = ParagraphStyle('ColTh', fontName=FONT_BOLD, fontSize=7.5, leading=9.5, textColor=colors.white)
    hdr_cell_r = ParagraphStyle('ColThR', fontName=FONT_BOLD, fontSize=7.5, leading=9.5, textColor=colors.white, alignment=2)
    cell_norm = ParagraphStyle('ColTd', fontName=FONT_NAME, fontSize=7.5, leading=10, textColor=DARK_COLOR)
    cell_bold = ParagraphStyle('ColTdB', fontName=FONT_BOLD, fontSize=7.5, leading=10, textColor=DARK_COLOR)
    cell_right = ParagraphStyle('ColTdR', fontName=FONT_NAME, fontSize=7.5, leading=10, textColor=DARK_COLOR, alignment=2)
    cell_right_bold = ParagraphStyle('ColTdRB', fontName=FONT_BOLD, fontSize=7.5, leading=10, textColor=DARK_COLOR, alignment=2)
    cell_right_burg = ParagraphStyle('ColTdRBg', fontName=FONT_BOLD, fontSize=8, leading=10.5, textColor=PRIMARY_COLOR, alignment=2)

    table_rows = [[
        Paragraph("DATE &amp; REF", hdr_cell),
        Paragraph("CUSTOMER / PARTY", hdr_cell),
        Paragraph("ROUTE / VEHICLE", hdr_cell),
        Paragraph("MODE", hdr_cell),
        Paragraph("AMOUNT (₹)", hdr_cell_r),
    ]]

    for rec in records:
        r_date = str(rec.get('date') or '')
        r_ref = str(rec.get('ref') or '')
        r_party = str(rec.get('partyName') or rec.get('party_name') or 'Customer')
        r_mobile = str(rec.get('partyMobile') or rec.get('party_mobile') or '')
        r_route = str(rec.get('routeName') or rec.get('route_name') or 'Office')
        r_mode = str(rec.get('paymentMode') or rec.get('payment_mode') or 'CASH').upper()
        r_amt = Decimal(str(rec.get('amount') or 0))

        date_ref_p = [
            Paragraph(f"<b>{r_ref}</b>", cell_bold),
            Paragraph(f"<font size=6.5 color='#64748B'>{r_date}</font>", cell_norm),
        ]

        party_p = [
            Paragraph(f"<b>{r_party}</b>", cell_bold),
        ]
        if r_mobile and r_mobile != '—':
            party_p.append(Paragraph(f"<font size=6.5 color='#64748B'>{r_mobile}</font>", cell_norm))

        table_rows.append([
            date_ref_p,
            party_p,
            Paragraph(r_route, cell_norm),
            Paragraph(f"<b>{r_mode}</b>", cell_norm),
            Paragraph(f"₹{r_amt:,.2f}", cell_right_bold),
        ])

    table_rows.append([
        Paragraph(f"<b>TOTAL ({len(records)} ENTRIES)</b>", cell_bold),
        Paragraph("", cell_norm),
        Paragraph("", cell_norm),
        Paragraph("", cell_norm),
        Paragraph(f"<b>₹{tot_amt:,.2f}</b>", cell_right_burg),
    ])

    col_widths = [95, 175, 125, 60, 90]
    report_table = Table(table_rows, colWidths=col_widths, repeatRows=1)
    t_style = [
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0, 0), (-1, -2), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#F1F5F9')),
        ('LINEABOVE', (0, -1), (-1, -1), 1.25, PRIMARY_COLOR),
    ]

    for r in range(1, len(table_rows) - 1):
        bg = LIGHT_BG if r % 2 == 1 else colors.white
        t_style.append(('BACKGROUND', (0, r), (-1, r), bg))

    report_table.setStyle(TableStyle(t_style))
    story.append(report_table)
    story.append(Spacer(1, 16))

    # 4. Signature & Running Footer
    notes_content = [
        Paragraph("<b>COLLECTIONS AUDIT &amp; CASH DESK NOTES:</b>", ParagraphStyle('ColNtH', fontName=FONT_BOLD, fontSize=7.5, leading=10, textColor=PRIMARY_COLOR)),
        Spacer(1, 3),
        Paragraph("&bull; This register accounts for cash counter collections, delivery sales remittances, and bank receipt allocations.", ParagraphStyle('ColNtB1', fontName=FONT_NAME, fontSize=7, leading=9.5, textColor=DARK_COLOR)),
        Paragraph("&bull; All collections are posted to respective cash/bank ledgers and party account statements in real time.", ParagraphStyle('ColNtB2', fontName=FONT_NAME, fontSize=7, leading=9.5, textColor=DARK_COLOR)),
        Paragraph("&bull; Official system register generated via Future Gas Cloud ERP.", ParagraphStyle('ColNtB3', fontName=FONT_NAME, fontSize=7, leading=9.5, textColor=MUTED_COLOR)),
    ]

    sig_content = [
        Paragraph(f"For <b>{company_name}</b>", ParagraphStyle('ColSgC', fontName=FONT_BOLD, fontSize=8, leading=10, textColor=DARK_COLOR, alignment=2)),
        Paragraph("<font size=7 color='#64748B'>Cash &amp; Banking Department</font>", ParagraphStyle('ColSgC2', fontName=FONT_NAME, fontSize=7, leading=9, textColor=MUTED_COLOR, alignment=2)),
        Spacer(1, 26),
        Paragraph("_______________________________________", ParagraphStyle('ColSgL', fontName=FONT_NAME, fontSize=8, leading=10, textColor=colors.HexColor('#94A3B8'), alignment=2)),
        Paragraph("<b>Authorized Cashier / Accounts Signatory</b>", ParagraphStyle('ColSgA', fontName=FONT_BOLD, fontSize=8, leading=10, textColor=PRIMARY_COLOR, alignment=2)),
        Paragraph(f"<font size=6.5 color='#64748B'>Date: {date_only}</font>", ParagraphStyle('ColSgD', fontName=FONT_NAME, fontSize=6.5, leading=8, textColor=MUTED_COLOR, alignment=2)),
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

    ftr_data = [[
        Paragraph(f"<font size=6.5 color='#64748B'>Future Gas Cloud ERP &bull; Collections &amp; Inflow Register &bull; Printed on {now_str}</font>", ParagraphStyle('ColFtrL', fontName=FONT_NAME, fontSize=6.5, leading=8, textColor=MUTED_COLOR)),
        Paragraph("<font size=6.5 color='#64748B'>Internal Financial Reconciliation Record</font>", ParagraphStyle('ColFtrR', fontName=FONT_NAME, fontSize=6.5, leading=8, textColor=MUTED_COLOR, alignment=2))
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


def generate_receipt_note_pdf(receipt_note, company_id=1):
    """
    Generates an official Receipt Note / Empty Cylinder Delivery Challan PDF.
    Accommodates:
    1. Empty Cylinder Movements sent to Suppliers for Refilling
    2. Godown and Van returns & inward movements
    3. Godown-to-Godown transfers
    """
    from core.models import Company, Product
    company = Company.objects.filter(CompanyId=company_id).first() or Company.objects.first()
    company_name = company.Name if company else "FUTURE GAS"
    company_addr = f"{company.AddressLine1 or ''}, {company.AddressLine2 or ''}, {company.AddressLine3 or ''} - {company.Pincode or ''}".strip(', -')
    company_gstin = company.GstNo or "32ABCDE1234F1Z5"
    company_phone = company.Phone or "9876543210"
    company_email = company.Email or "info@futuregas.com"

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

    alloc = getattr(receipt_note, 'RouteVehicleDriver', None)
    veh_num = alloc.Vehicle.VehicleNumber if alloc and alloc.Vehicle else 'Fleet Transport'
    driver_name = alloc.Driver.DriverName if alloc and alloc.Driver else 'Driver / Dispatcher'
    route_name = alloc.Route.RouteName if alloc and alloc.Route else 'General Route'

    remarks = receipt_note.Remarks or ''
    is_supplier_refill = any(k in remarks.lower() for k in ['supplier', 'refill', 'refilling', 'bottling plant'])
    title_text = "EMPTY CYLINDER REFILL CHALLAN" if is_supplier_refill else "STOCK RECEIPT NOTE / INWARD CHALLAN"
    badge_bg = colors.HexColor('#9A3412') if is_supplier_refill else PRIMARY_COLOR

    c_title = ParagraphStyle('RnTitle', fontName=FONT_BOLD, fontSize=17, leading=21, textColor=PRIMARY_COLOR)
    c_sub = ParagraphStyle('RnSub', fontName=FONT_NAME, fontSize=8, leading=11, textColor=MUTED_COLOR)
    rn_badge = ParagraphStyle('RnBadge', fontName=FONT_BOLD, fontSize=11, leading=14, alignment=2, textColor=badge_bg)
    rn_meta = ParagraphStyle('RnMeta', fontName=FONT_NAME, fontSize=8.5, leading=12, alignment=2, textColor=DARK_COLOR)
    th_style = ParagraphStyle('RnPth', fontName=FONT_BOLD, fontSize=8.5, leading=11, textColor=colors.white, alignment=1)
    cell_norm = ParagraphStyle('RnCell', fontName=FONT_NAME, fontSize=8.5, leading=11.5, textColor=DARK_COLOR)
    cell_bold = ParagraphStyle('RnCellB', fontName=FONT_BOLD, fontSize=8.5, leading=11.5, textColor=DARK_COLOR)
    cell_center = ParagraphStyle('RnCellC', fontName=FONT_BOLD, fontSize=8.5, leading=11.5, alignment=1, textColor=DARK_COLOR)
    cell_right = ParagraphStyle('RnCellR', fontName=FONT_NAME, fontSize=8.5, leading=11.5, alignment=2, textColor=DARK_COLOR)
    cell_right_bold = ParagraphStyle('RnCellRB', fontName=FONT_BOLD, fontSize=8.5, leading=11.5, alignment=2, textColor=DARK_COLOR)

    date_str = receipt_note.ReceiptDate.strftime('%d/%m/%Y') if receipt_note.ReceiptDate else datetime.now().strftime('%d/%m/%Y')

    # Top Header
    header_data = [
        [
            Paragraph(f"<b>{company_name}</b>", c_title),
            Paragraph(f"<b>{title_text}</b>", rn_badge)
        ],
        [
            Paragraph(
                f"LPG Cylinders &amp; Logistics Infrastructure<br/>"
                f"{company_addr}<br/>"
                f"<b>GSTIN:</b> {company_gstin} &nbsp;|&nbsp; <b>State:</b> Kerala (Code: 32)<br/>"
                f"<b>Phone:</b> {company_phone} &nbsp;|&nbsp; <b>Email:</b> {company_email}",
                c_sub
            ),
            Paragraph(
                f"<b>Challan / Note No:</b> {receipt_note.ReceiptNoteNo}<br/>"
                f"<b>Date:</b> {date_str}<br/>"
                f"<b>Status:</b> {(receipt_note.Status or 'SETTLED').upper()}<br/>"
                f"<b>Vehicle:</b> {veh_num}<br/>"
                f"<b>In-Charge / Driver:</b> {driver_name}",
                rn_meta
            )
        ]
    ]
    hdr_table = Table(header_data, colWidths=[330, 215])
    hdr_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    story.append(hdr_table)
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY_COLOR, spaceAfter=8))

    # Location Details Card
    from core.models import Godown
    src_text = f"<b>Dispatching Unit / Source:</b> {veh_num} • {driver_name} ({route_name})"
    dest_name = "Central Main Godown"
    if receipt_note.GodownId:
        g_dest = Godown.objects.filter(GodownId=receipt_note.GodownId).first()
        if g_dest:
            dest_name = g_dest.GodownName
    if receipt_note.SourceGodownId:
        g_src = Godown.objects.filter(GodownId=receipt_note.SourceGodownId).first()
        if g_src:
            src_text = f"<b>Source:</b> {g_src.GodownName} (Van {veh_num} • {driver_name})"

    if "From:" in remarks and not receipt_note.SourceGodownId:
        try:
            src_text = "<b>Source:</b> " + remarks.split("From:")[1].split("•")[0].split("|")[0].strip()
        except:
            pass
    if "To:" in remarks and not receipt_note.GodownId:
        try:
            dest_name = remarks.split("To:")[1].split("•")[0].split("|")[0].strip()
        except:
            pass
    elif is_supplier_refill:
        dest_name = "Refilling Supplier"

    dest_text = f"<b>Receiving Destination:</b> {dest_name}"

    loc_box = [
        [
            Paragraph("<b>DISPATCH / MOVEMENT SUMMARY</b>", ParagraphStyle('LsTitle', fontName=FONT_BOLD, fontSize=9, textColor=PRIMARY_COLOR)),
            Paragraph(f"<b>Category:</b> {'Supplier Refill Outward' if is_supplier_refill else 'Van Return & Godown Inward'}", ParagraphStyle('LsCat', fontName=FONT_BOLD, fontSize=8.5, alignment=2, textColor=DARK_COLOR))
        ],
        [
            Paragraph(f"{src_text}<br/>{dest_text}", cell_norm),
            Paragraph(f"<b>Associated Route:</b> {route_name}<br/><b>Purpose:</b> {'Empty Cylinders Outward for Refill' if is_supplier_refill else 'Stock Inward / Unsold & Empties'}", cell_norm)
        ]
    ]
    loc_table = Table(loc_box, colWidths=[340, 205])
    loc_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_BG),
        ('BOX', (0, 0), (-1, -1), 1, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(loc_table)
    story.append(Spacer(1, 10))

    # Parse filled and empty cylinder counts from remarks audit trail if present
    f_by_prod = {}
    e_by_prod = {}
    if 'Filled:' in remarks and 'Empty:' in remarks:
        try:
            f_m = re.search(r'Filled:\s*([^•|]+)', remarks)
            if f_m:
                f_sec = f_m.group(1).strip()
                if f_sec and f_sec != '0':
                    for part in f_sec.split(','):
                        if 'x' in part:
                            p_nm, q_s = part.split('x')
                            f_by_prod[p_nm.strip().lower()] = int(float(q_s.strip()))
            e_m = re.search(r'Empty:\s*([^•|]+)', remarks)
            if e_m:
                e_sec = e_m.group(1).strip()
                if e_sec and e_sec != '0':
                    for part in e_sec.split(','):
                        if 'x' in part:
                            p_nm, q_s = part.split('x')
                            e_by_prod[p_nm.strip().lower()] = int(float(q_s.strip()))
        except Exception:
            pass

    # Items Table with Stock Quantity, Purchase Rate (excl. GST) and Total Amount
    col_widths = [32, 228, 85, 100, 100]
    th_cells = [
        Paragraph("Sl no.", th_style),
        Paragraph("Item / Cylinder Description", ParagraphStyle('ThLeft', parent=th_style, alignment=0)),
        Paragraph("Stock Qty", th_style),
        Paragraph("Purchase Rate (excl. GST)", ParagraphStyle('ThR1', parent=th_style, alignment=2)),
        Paragraph("Total Amount", ParagraphStyle('ThR2', parent=th_style, alignment=2)),
    ]
    table_rows = [th_cells]

    lines = list(receipt_note.lines.select_related('Product', 'Unit').all())
    tot_full = 0
    tot_empty = 0
    tot_units = 0
    tot_valuation = 0.0

    if not lines:
        table_rows.append([
            Paragraph("1", cell_center),
            Paragraph("Commercial / Domestic Gas Cylinders", cell_bold),
            Paragraph("0 NOS", cell_center),
            Paragraph("Rs. 0.00", cell_right),
            Paragraph("Rs. 0.00", cell_right_bold),
        ])
    else:
        for idx, ln in enumerate(lines, 1):
            p_name = ln.Product.ProductName if ln.Product else f"Product #{ln.Product_id}"
            qty = int(ln.Quantity or 0)
            p_key = p_name.strip().lower()
            f_qty = f_by_prod.get(p_key, 0)
            e_qty = e_by_prod.get(p_key, 0)
            if f_qty == 0 and e_qty == 0:
                if "filled" in p_key:
                    f_qty = qty
                else:
                    e_qty = qty
            line_tot = (f_qty + e_qty) if (f_qty + e_qty) > 0 else qty
            tot_full += f_qty
            tot_empty += e_qty
            tot_units += line_tot

            p_rate = float(ln.Product.PurchasePrice if (ln.Product and ln.Product.PurchasePrice) else (ln.Rate or 0))
            line_total = line_tot * p_rate
            tot_valuation += line_total

            breakdown_sub = ""
            if f_qty > 0 or e_qty > 0:
                parts = []
                if f_qty > 0:
                    parts.append(f"Full: {f_qty}")
                if e_qty > 0:
                    parts.append(f"Empty: {e_qty}")
                breakdown_sub = f"<br/><font size=7 color='#64748B'>({' • '.join(parts)})</font>"

            table_rows.append([
                Paragraph(str(idx), cell_center),
                Paragraph(f"{p_name}{breakdown_sub}", cell_bold),
                Paragraph(f"<b>{line_tot} NOS</b>", cell_center),
                Paragraph(f"Rs. {p_rate:,.2f}", cell_right),
                Paragraph(f"<b>Rs. {line_total:,.2f}</b>", cell_right_bold),
            ])

    # Totals Row
    table_rows.append([
        Paragraph("", cell_center),
        Paragraph("<b>GRAND TOTAL RECEIVED QUANTITY &amp; VALUATION</b>", cell_bold),
        Paragraph(f"<b>{tot_units} NOS</b>", cell_center),
        Paragraph("<b>TOTAL (Excl. GST)</b>", cell_right_bold),
        Paragraph(f"<b>Rs. {tot_valuation:,.2f}</b>", cell_right_bold),
    ])

    items_table = Table(table_rows, colWidths=col_widths)
    t_style = [
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOX', (0, 0), (-1, -1), 1, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('BACKGROUND', (0, -1), (-1, -1), LIGHT_BG),
    ]
    for r in range(1, len(table_rows) - 1):
        bg = LIGHT_BG if r % 2 == 1 else colors.white
        t_style.append(('BACKGROUND', (0, r), (-1, r), bg))

    items_table.setStyle(TableStyle(t_style))
    story.append(items_table)
    story.append(Spacer(1, 10))

    # Notes & Remarks
    notes_box = [
        [
            Paragraph(f"<b>Remarks &amp; Audit Trail:</b> {remarks or 'Stock movement recorded successfully.'}", cell_norm)
        ]
    ]
    nt_table = Table(notes_box, colWidths=[545])
    nt_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_BG),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(nt_table)
    story.append(Spacer(1, 15))

    # Dual Signatures & Payment Group QR (if configured)
    pg_obj = None
    if alloc and alloc.PaymentGroup:
        pg_obj = alloc.PaymentGroup

    qr_img_flowable = None
    if pg_obj and pg_obj.QRCodeLocation:
        from reportlab.platypus import Image as RLImage
        from django.conf import settings
        loc = str(pg_obj.QRCodeLocation).replace('\\', '/').lstrip('/')
        candidates = [
            os.path.join(settings.MEDIA_ROOT, loc),
            os.path.join(settings.BASE_DIR, 'media', loc),
            os.path.join(settings.BASE_DIR, loc),
        ]
        if os.path.isabs(str(pg_obj.QRCodeLocation)):
            candidates.insert(0, str(pg_obj.QRCodeLocation))
        for cand in candidates:
            if os.path.exists(cand) and os.path.isfile(cand):
                try:
                    qr_img_flowable = RLImage(cand, width=60, height=60)
                    break
                except Exception:
                    qr_img_flowable = None

    if qr_img_flowable:
        bank_name_str = pg_obj.BankLedger.LedgerName if (pg_obj.BankLedger and pg_obj.BankLedger.LedgerName) else ""
        qr_box = [
            [Paragraph("<b>SCAN &amp; PAY</b>", ParagraphStyle('RnQrH', fontName=FONT_BOLD, fontSize=7, leading=8.5, alignment=1, textColor=PRIMARY_COLOR))],
            [qr_img_flowable],
            [Paragraph(f"<font size=5.5 color='#475569'><b>{pg_obj.PaymentGroupName}</b>{(' • ' + bank_name_str) if bank_name_str else ''}</font>", ParagraphStyle('RnQrF', fontName=FONT_NAME, fontSize=5.5, leading=7, alignment=1))],
        ]
        qr_table = Table(qr_box, colWidths=[90])
        qr_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('BACKGROUND', (0, 0), (-1, -1), LIGHT_BG),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('LEFTPADDING', (0, 0), (-1, -1), 2),
            ('RIGHTPADDING', (0, 0), (-1, -1), 2),
        ]))

        sig_data = [
            [
                Paragraph("<b>DISPATCHED / HANDED OVER BY:</b>", cell_bold),
                qr_table,
                Paragraph("<b>RECEIVED &amp; ACKNOWLEDGED BY:</b>", cell_bold)
            ],
            [
                Paragraph(f"<br/><br/>____________________________________<br/>Driver / Store In-Charge<br/><font size=7 color='#64748B'>{driver_name} &bull; {veh_num}</font>", cell_norm),
                Paragraph("", cell_norm),
                Paragraph(f"<br/><br/>____________________________________<br/>Authorized Recipient / Supplier Rep<br/><font size=7 color='#64748B'>Date: {date_str}</font>", cell_norm)
            ]
        ]
        sig_table = Table(sig_data, colWidths=[225, 95, 225])
        sig_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (1, 0), (1, 0), 'CENTER'),
            ('SPAN', (1, 0), (1, 1)),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ]))
    else:
        sig_data = [
            [
                Paragraph("<b>DISPATCHED / HANDED OVER BY:</b>", cell_bold),
                Paragraph("<b>RECEIVED &amp; ACKNOWLEDGED BY:</b>", cell_bold)
            ],
            [
                Paragraph(f"<br/><br/>____________________________________<br/>Driver / Store In-Charge<br/><font size=7 color='#64748B'>{driver_name} &bull; {veh_num}</font>", cell_norm),
                Paragraph(f"<br/><br/>____________________________________<br/>Authorized Recipient / Supplier Rep<br/><font size=7 color='#64748B'>Date: {date_str}</font>", cell_norm)
            ]
        ]
        sig_table = Table(sig_data, colWidths=[272, 273])
        sig_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ]))
    story.append(KeepTogether(sig_table))
    story.append(Spacer(1, 15))

    # Footer
    now_time = datetime.now().strftime('%d/%m/%Y %I:%M %p')
    ftr_data = [[
        Paragraph(f"<font size=6 color='#64748B'>Future Gas Cloud ERP &bull; Official Receipt Note / Transfer Challan &bull; Generated {now_time}</font>", ParagraphStyle('RnFtrL', fontName=FONT_NAME, fontSize=6, textColor=MUTED_COLOR)),
        Paragraph("<font size=6 color='#64748B'>Physical Stock Verification Document</font>", ParagraphStyle('RnFtrR', fontName=FONT_NAME, fontSize=6, textColor=MUTED_COLOR, alignment=2))
    ]]
    ftr_table = Table(ftr_data, colWidths=[345, 200])
    ftr_table.setStyle(TableStyle([
        ('LINEABOVE', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(ftr_table)

    doc.build(story)
    return buf.getvalue()


def generate_delivery_note_pdf(delivery_note, company_id=1):
    """
    Generates an official Delivery Note / Van Stock Loading Challan PDF.
    Accommodates:
    1. Morning Van Stock Allocations (Loading Notes)
    2. Inter-depot / Inter-godown transfers (Transfer Delivery Notes - TDN)
    3. Bulk delivery dispatches
    """
    from core.models import Company, Product, Godown
    company = Company.objects.filter(CompanyId=company_id).first() or Company.objects.first()
    company_name = company.Name if company else "FUTURE GAS"
    company_addr = f"{company.AddressLine1 or ''}, {company.AddressLine2 or ''}, {company.AddressLine3 or ''} - {company.Pincode or ''}".strip(', -')
    company_gstin = company.GstNo or "32ABCDE1234F1Z5"
    company_phone = company.Phone or "9876543210"
    company_email = company.Email or "info@futuregas.com"

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

    alloc = getattr(delivery_note, 'RouteVehicleDriver', None)
    veh_num = alloc.Vehicle.VehicleNumber if alloc and alloc.Vehicle else 'Fleet Transport'
    driver_name = alloc.Driver.DriverName if alloc and alloc.Driver else 'Driver / Dispatcher'
    route_name = alloc.Route.RouteName if alloc and alloc.Route else 'General Route'

    godown = Godown.objects.filter(GodownId=delivery_note.GodownId).first() if delivery_note.GodownId else None
    godown_name = godown.GodownName if godown else "Central Godown"

    remarks = delivery_note.Remarks or ''
    title_text = "DELIVERY NOTE / VAN LOADING CHALLAN"
    badge_bg = PRIMARY_COLOR

    c_title = ParagraphStyle('DnTitle', fontName=FONT_BOLD, fontSize=17, leading=21, textColor=PRIMARY_COLOR)
    c_sub = ParagraphStyle('DnSub', fontName=FONT_NAME, fontSize=8, leading=11, textColor=MUTED_COLOR)
    dn_badge = ParagraphStyle('DnBadge', fontName=FONT_BOLD, fontSize=11, leading=14, alignment=2, textColor=badge_bg)
    dn_meta = ParagraphStyle('DnMeta', fontName=FONT_NAME, fontSize=8.5, leading=12, alignment=2, textColor=DARK_COLOR)
    th_style = ParagraphStyle('DnPth', fontName=FONT_BOLD, fontSize=8.5, leading=11, textColor=colors.white, alignment=1)
    cell_norm = ParagraphStyle('DnCell', fontName=FONT_NAME, fontSize=8.5, leading=11.5, textColor=DARK_COLOR)
    cell_bold = ParagraphStyle('DnCellB', fontName=FONT_BOLD, fontSize=8.5, leading=11.5, textColor=DARK_COLOR)
    cell_center = ParagraphStyle('DnCellC', fontName=FONT_BOLD, fontSize=8.5, leading=11.5, alignment=1, textColor=DARK_COLOR)
    cell_right = ParagraphStyle('DnCellR', fontName=FONT_NAME, fontSize=8.5, leading=11.5, alignment=2, textColor=DARK_COLOR)
    cell_right_bold = ParagraphStyle('DnCellRB', fontName=FONT_BOLD, fontSize=8.5, leading=11.5, alignment=2, textColor=DARK_COLOR)

    date_str = delivery_note.DeliveryDate.strftime('%d/%m/%Y') if delivery_note.DeliveryDate else datetime.now().strftime('%d/%m/%Y')

    # Top Header
    header_data = [
        [
            Paragraph(f"<b>{company_name}</b>", c_title),
            Paragraph(f"<b>{title_text}</b>", dn_badge)
        ],
        [
            Paragraph(
                f"LPG Cylinders &amp; Logistics Infrastructure<br/>"
                f"{company_addr}<br/>"
                f"<b>GSTIN:</b> {company_gstin} &nbsp;|&nbsp; <b>State:</b> Kerala (Code: 32)<br/>"
                f"<b>Phone:</b> {company_phone} &nbsp;|&nbsp; <b>Email:</b> {company_email}",
                c_sub
            ),
            Paragraph(
                f"<b>Challan / Note No:</b> {delivery_note.DeliveryNoteNo}<br/>"
                f"<b>Date:</b> {date_str}<br/>"
                f"<b>Status:</b> {(delivery_note.Status or 'COMPLETED').upper()}<br/>"
                f"<b>Vehicle:</b> {veh_num}<br/>"
                f"<b>Route / Van:</b> {route_name}",
                dn_meta
            )
        ]
    ]
    hdr_table = Table(header_data, colWidths=[330, 215])
    hdr_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    story.append(hdr_table)
    story.append(Spacer(1, 10))

    # Location Details Card
    src_text = f"<b>Dispatching Depot / Godown:</b> {godown_name}"
    dest_text = f"<b>Assigned Vehicle &amp; Driver:</b> {veh_num} &bull; {driver_name}"
    if "From:" in remarks:
        try:
            src_text = "<b>Source:</b> " + remarks.split("From:")[1].split("•")[0].split("|")[0].strip()
        except:
            pass
    if "To:" in remarks:
        try:
            dest_text = "<b>Destination:</b> " + remarks.split("To:")[1].split("•")[0].split("|")[0].strip()
        except:
            pass

    loc_box = [
        [
            Paragraph("<b>DISPATCH / MOVEMENT SUMMARY</b>", ParagraphStyle('DnTitleCard', fontName=FONT_BOLD, fontSize=9, textColor=PRIMARY_COLOR)),
            Paragraph("<b>Category:</b> Delivery Note", ParagraphStyle('DnCat', fontName=FONT_BOLD, fontSize=8.5, alignment=2, textColor=DARK_COLOR))
        ],
        [
            Paragraph(f"{src_text}<br/>{dest_text}", cell_norm),
            Paragraph(f"<b>Associated Route:</b> {route_name}<br/><b>Purpose:</b> Daily Distribution &amp; Customer Deliveries", cell_norm)
        ]
    ]
    loc_table = Table(loc_box, colWidths=[340, 205])
    loc_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_BG),
        ('BOX', (0, 0), (-1, -1), 1, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(loc_table)
    story.append(Spacer(1, 10))

    # Items Table with Stock Quantity, Purchase Rate and Total Amount
    col_widths = [35, 230, 80, 100, 100]
    th_cells = [
        Paragraph("Sl no.", th_style),
        Paragraph("Item / Cylinder Description", ParagraphStyle('ThLeftDn', parent=th_style, alignment=0)),
        Paragraph("Quantity", th_style),
        Paragraph("Rate", ParagraphStyle('ThR1', parent=th_style, alignment=2)),
        Paragraph("Total Amount", ParagraphStyle('ThR2', parent=th_style, alignment=2)),
    ]
    table_rows = [th_cells]

    lines = list(delivery_note.lines.select_related('Product', 'Unit').all())
    tot_qty = 0
    tot_valuation = 0.0

    if not lines:
        table_rows.append([
            Paragraph("1", cell_center),
            Paragraph("Commercial / Domestic Gas Cylinders", cell_bold),
            Paragraph("0 NOS", cell_center),
            Paragraph("Rs. 0.00", cell_right),
            Paragraph("Rs. 0.00", cell_right_bold),
        ])
    else:
        for idx, ln in enumerate(lines, 1):
            p_name = ln.Product.ProductName if ln.Product else f"Product #{ln.Product_id}"
            qty = int(ln.Quantity or 0)
            tot_qty += qty

            # Purchase rate
            p_rate = float(ln.Product.PurchasePrice if (ln.Product and ln.Product.PurchasePrice) else (ln.Rate or 0))
            line_total = qty * p_rate
            tot_valuation += line_total

            table_rows.append([
                Paragraph(str(idx), cell_center),
                Paragraph(p_name, cell_bold),
                Paragraph(f"<b>{qty} NOS</b>", cell_center),
                Paragraph(f"Rs. {p_rate:,.2f}", cell_right),
                Paragraph(f"<b>Rs. {line_total:,.2f}</b>", cell_right_bold),
            ])

    # Totals Row
    table_rows.append([
        Paragraph("", cell_center),
        Paragraph("<b>GRAND TOTAL DISPATCH QUANTITY &amp; VALUATION</b>", cell_bold),
        Paragraph(f"<b>{tot_qty} NOS</b>", cell_center),
        Paragraph("<b>TOTAL</b>", cell_right_bold),
        Paragraph(f"<b>Rs. {tot_valuation:,.2f}</b>", cell_right_bold),
    ])

    items_table = Table(table_rows, colWidths=col_widths)
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOX', (0, 0), (-1, -1), 1, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('BACKGROUND', (0, -1), (-1, -1), LIGHT_BG),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 10))

    # Remarks / Operational Notes
    notes_box = [
        [
            Paragraph("<b>OPERATIONAL NOTES &amp; INSTRUCTIONS:</b>", ParagraphStyle('DnNtT', fontName=FONT_BOLD, fontSize=8, textColor=PRIMARY_COLOR)),
        ],
        [
            Paragraph(
                f"&bull; <b>Remarks:</b> {remarks or 'Stock dispatched from depot to vehicle as morning route inventory allocation.'}<br/>"
                "&bull; Driver must verify physical serial seals, net weight, and safety caps before vehicle departs gate.<br/>"
                "&bull; Any leakage, tare-weight deficit, or seal tampering must be reported immediately before accepting dispatch.",
                cell_norm
            )
        ]
    ]
    nt_table = Table(notes_box, colWidths=[545])
    nt_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_BG),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(nt_table)
    story.append(Spacer(1, 15))

    # Dual Signatures: Dispatched By & Received By
    sig_data = [
        [
            Paragraph("<b>DISPATCHED / ISSUED BY:</b>", cell_bold),
            Paragraph("<b>LOADED &amp; RECEIVED BY:</b>", cell_bold)
        ],
        [
            Paragraph("<br/><br/>", cell_norm),
            Paragraph("<br/><br/>", cell_norm)
        ],
        [
            Paragraph(f"<b>Warehouse Supervisor / Storekeeper</b><br/><font size=7.5 color='#64748B'>{godown_name} &bull; Gate Outward</font>", cell_norm),
            Paragraph(f"<b>Route Driver / Fleet In-Charge</b><br/><font size=7.5 color='#64748B'>{driver_name} &bull; {veh_num}</font>", cell_norm)
        ]
    ]
    sig_table = Table(sig_data, colWidths=[245, 245])
    sig_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 25),
        ('LINEABOVE', (0, 2), (0, 2), 0.8, DARK_COLOR),
        ('LINEABOVE', (1, 2), (1, 2), 0.8, DARK_COLOR),
        ('TOPPADDING', (0, 2), (-1, 2), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    story.append(KeepTogether(sig_table))
    story.append(Spacer(1, 15))

    # Footer
    now_time = datetime.now().strftime('%d/%m/%Y %I:%M %p')
    ftr_data = [[
        Paragraph(f"<font size=6 color='#64748B'>Future Gas Cloud ERP &bull; Official Delivery Note / Van Stock Loading Challan &bull; Generated {now_time}</font>", ParagraphStyle('DnFtrL', fontName=FONT_NAME, fontSize=6, textColor=MUTED_COLOR)),
        Paragraph("<font size=6 color='#64748B'>Outward Stock Verification Document</font>", ParagraphStyle('DnFtrR', fontName=FONT_NAME, fontSize=6, textColor=MUTED_COLOR, alignment=2))
    ]]
    ftr_table = Table(ftr_data, colWidths=[345, 200])
    ftr_table.setStyle(TableStyle([
        ('LINEABOVE', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(ftr_table)

    doc.build(story)
    return buf.getvalue()
