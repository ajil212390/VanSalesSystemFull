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

PRIMARY_COLOR = colors.HexColor('#800020')     # Future Gas Burgundy
DARK_COLOR = colors.HexColor('#0F172A')        # Dark Slate
MUTED_COLOR = colors.HexColor('#64748B')       # Muted Slate
LIGHT_BG = colors.HexColor('#F8FAFC')          # Clean off-white
BORDER_COLOR = colors.HexColor('#CBD5E1')      # Subtle border
HEADER_BG = colors.HexColor('#800020')


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

    amt = float(amount)
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
    Generates a professional GST Tax Invoice PDF for a Sales model instance.
    Includes full tax-inclusive breakdown (Taxable Value, CGST, SGST, Total GST, and Gross Total).
    """
    from core.models import Company

    company = Company.objects.filter(CompanyId=sale.CompanyId).first() or Company.objects.first()
    company_name = company.Name if company else "FUTURE GAS"
    company_addr = f"{company.AddressLine1 or ''}, {company.AddressLine2 or ''}, {company.AddressLine3 or ''} - {company.Pincode or ''}".strip(', -')
    company_gstin = company.GstNo or "32ABCDE1234F1Z5"
    company_phone = company.Phone or "9876543210"
    company_email = company.Email or "info@futuregas.com"

    customer = sale.CustomerLedger
    cust_name = customer.LedgerName if customer else (sale.Notes or "Direct Customer").replace("Customer: ", "")
    cust_phone = customer.Phone if customer and hasattr(customer, 'Phone') and customer.Phone else (sale.CustomerPhone if hasattr(sale, 'CustomerPhone') else '')
    cust_addr = customer.Address if customer and hasattr(customer, 'Address') and customer.Address else "Kozhikode, Kerala"
    cust_gstin = customer.GSTIN if customer and hasattr(customer, 'GSTIN') and customer.GSTIN else "Unregistered / Consumer"

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=24,
        rightMargin=24,
        topMargin=20,
        bottomMargin=20
    )

    story = []

    # Typography styles
    styles = getSampleStyleSheet()

    c_title = ParagraphStyle(
        'CompanyTitle',
        parent=styles['Normal'],
        fontName=FONT_BOLD,
        fontSize=18,
        leading=22,
        textColor=PRIMARY_COLOR
    )
    c_sub = ParagraphStyle(
        'CompanySub',
        parent=styles['Normal'],
        fontName=FONT_NAME,
        fontSize=8.5,
        leading=11.5,
        textColor=MUTED_COLOR
    )
    inv_title = ParagraphStyle(
        'InvoiceTitle',
        parent=styles['Normal'],
        fontName=FONT_BOLD,
        fontSize=13,
        leading=16,
        alignment=2,  # Right aligned
        textColor=PRIMARY_COLOR
    )
    inv_meta = ParagraphStyle(
        'InvoiceMeta',
        parent=styles['Normal'],
        fontName=FONT_NAME,
        fontSize=8.5,
        leading=12,
        alignment=2,
        textColor=DARK_COLOR
    )
    cell_bold = ParagraphStyle(
        'CellBold',
        parent=styles['Normal'],
        fontName=FONT_BOLD,
        fontSize=8,
        leading=10.5,
        textColor=DARK_COLOR
    )
    cell_norm = ParagraphStyle(
        'CellNorm',
        parent=styles['Normal'],
        fontName=FONT_NAME,
        fontSize=8,
        leading=10.5,
        textColor=DARK_COLOR
    )
    cell_muted = ParagraphStyle(
        'CellMuted',
        parent=styles['Normal'],
        fontName=FONT_NAME,
        fontSize=7.5,
        leading=9.5,
        textColor=MUTED_COLOR
    )
    th_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName=FONT_BOLD,
        fontSize=8,
        leading=10,
        alignment=1,  # Center
        textColor=colors.white
    )

    # 1. Header Table (Company Branding on Left, Tax Invoice Title & Meta on Right)
    date_formatted = sale.SalesDate.strftime('%d/%m/%Y') if sale.SalesDate else datetime.now().strftime('%d/%m/%Y')
    header_data = [
        [
            Paragraph(f"<b>{company_name}</b>", c_title),
            Paragraph("<b>TAX INVOICE</b>", inv_title)
        ],
        [
            Paragraph(
                f"LPG Cylinders & Industrial Gas Solutions<br/>"
                f"{company_addr}<br/>"
                f"<b>GSTIN:</b> {company_gstin} &nbsp;|&nbsp; <b>State:</b> Kerala (32)<br/>"
                f"Phone: {company_phone} &nbsp;|&nbsp; Email: {company_email}",
                c_sub
            ),
            Paragraph(
                f"<b>Invoice No:</b> {sale.SalesNo}<br/>"
                f"<b>Date:</b> {date_formatted}<br/>"
                f"<b>Payment:</b> {sale.PaymentMethod.upper()}<br/>"
                f"<b>Vehicle:</b> {sale.VehicleName or 'Van Delivery'}<br/>"
                f"<b>Route:</b> {sale.RouteName or 'Local Route'}",
                inv_meta
            )
        ]
    ]
    header_table = Table(header_data, colWidths=[330, 215])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 1),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 8))

    # Divider Line
    story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY_COLOR, spaceAfter=8))

    # 2. Customer & Delivery Info Card
    cust_box = [
        [
            Paragraph(f"<b>BILLED TO (CUSTOMER DETAILS)</b>", ParagraphStyle('BilledHdr', parent=styles['Normal'], fontName=FONT_BOLD, fontSize=8.5, textColor=PRIMARY_COLOR)),
            Paragraph(f"<b>DELIVERY & DISPATCH DETAILS</b>", ParagraphStyle('DelivHdr', parent=styles['Normal'], fontName=FONT_BOLD, fontSize=8.5, textColor=PRIMARY_COLOR)),
        ],
        [
            Paragraph(
                f"<b>Customer Name:</b> {cust_name}<br/>"
                f"<b>Address:</b> {cust_addr}<br/>"
                f"<b>Phone:</b> {cust_phone or 'N/A'}<br/>"
                f"<b>GSTIN / UIN:</b> {cust_gstin}<br/>"
                f"<b>Place of Supply:</b> Kerala (32)",
                cell_norm
            ),
            Paragraph(
                f"<b>Driver Name:</b> {sale.DriverName or 'Van Driver'}<br/>"
                f"<b>Dispatched From:</b> Central Godown, Kuttyaddi<br/>"
                f"<b>Delivery Mode:</b> Direct Van Delivery<br/>"
                f"<b>Total Delivered Cylinders:</b> {int(sale.TotalDeliveredQty or 0)}<br/>"
                f"<b>Empty Cylinders Returned:</b> {int(sale.TotalEmptyQty or 0)}",
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

    # 3. Itemized GST Line Items Table
    # Columns:
    # # | Description | HSN | Qty | Gross Price | Taxable Value | CGST (2.5%) | SGST (2.5%) | Total (₹)
    col_widths = [22, 138, 48, 36, 60, 65, 58, 58, 60]

    th_cells = [
        Paragraph("#", th_style),
        Paragraph("Item Description", th_style),
        Paragraph("HSN/SAC", th_style),
        Paragraph("Qty", th_style),
        Paragraph("Gross Rate", th_style),
        Paragraph("Taxable Val", th_style),
        Paragraph("CGST", th_style),
        Paragraph("SGST", th_style),
        Paragraph("Total (Rs.)", th_style),
    ]

    table_rows = [th_cells]

    total_taxable_sum = Decimal('0.00')
    total_cgst_sum = Decimal('0.00')
    total_sgst_sum = Decimal('0.00')
    total_gross_sum = Decimal('0.00')

    lines = sale.lines.select_related('Product', 'Unit').all()
    if not lines.exists():
        # Fallback if lines not yet created: construct synthetic line from sale totals
        gross_val = Decimal(str(sale.GrandTotal or 0))
        tax_pct = Decimal('5.00')
        tax_fac = Decimal('1.00') + (tax_pct / Decimal('100.00'))
        taxable_val = (gross_val / tax_fac).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        tot_tax = gross_val - taxable_val
        cgst_val = (tot_tax / Decimal('2.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        sgst_val = tot_tax - cgst_val

        table_rows.append([
            Paragraph("1", cell_norm),
            Paragraph("Commercial / Domestic Gas Supply", cell_bold),
            Paragraph("271109", cell_muted),
            Paragraph(f"{int(sale.TotalDeliveredQty or 1)} NOS", cell_norm),
            Paragraph(f"{gross_val:.2f}", cell_norm),
            Paragraph(f"{taxable_val:.2f}", cell_norm),
            Paragraph(f"{cgst_val:.2f}<br/><font size=6 color='#64748B'>@2.5%</font>", cell_norm),
            Paragraph(f"{sgst_val:.2f}<br/><font size=6 color='#64748B'>@2.5%</font>", cell_norm),
            Paragraph(f"<b>{gross_val:.2f}</b>", cell_bold),
        ])
        total_taxable_sum += taxable_val
        total_cgst_sum += cgst_val
        total_sgst_sum += sgst_val
        total_gross_sum += gross_val
    else:
        for idx, line in enumerate(lines, 1):
            prod = line.Product
            hsn = prod.HSNCode if prod and prod.HSNCode else "271119"
            qty = Decimal(str(line.Quantity or 0))
            if qty == 0 and line.EmptyQuantity > 0:
                continue

            # Compute Tax-inclusive breakdown:
            # Gross Line Total = line.Total (or line.SalesPrice * qty)
            gross_total = Decimal(str(line.Total or 0))
            if gross_total == 0 and qty > 0:
                gross_total = (qty * Decimal(str(line.SalesPrice or 0))).quantize(Decimal('0.01'))

            gst_rate = Decimal(str(line.TaxPercent or prod.GSTPercentage if prod else '5.00'))
            if gst_rate <= 0:
                gst_rate = Decimal('5.00')

            tax_factor = Decimal('1.00') + (gst_rate / Decimal('100.00'))
            taxable_amount = (gross_total / tax_factor).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            tax_amount = gross_total - taxable_amount

            half_rate = gst_rate / Decimal('2.00')
            cgst_amount = (tax_amount / Decimal('2.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            sgst_amount = tax_amount - cgst_amount

            gross_unit_rate = (gross_total / qty).quantize(Decimal('0.01')) if qty > 0 else Decimal('0.00')

            total_taxable_sum += taxable_amount
            total_cgst_sum += cgst_amount
            total_sgst_sum += sgst_amount
            total_gross_sum += gross_total

            table_rows.append([
                Paragraph(str(idx), cell_norm),
                Paragraph(f"<b>{line.ProductName}</b>", cell_bold),
                Paragraph(hsn, cell_muted),
                Paragraph(f"{int(qty)} NOS", cell_norm),
                Paragraph(f"{gross_unit_rate:.2f}", cell_norm),
                Paragraph(f"{taxable_amount:.2f}", cell_norm),
                Paragraph(f"{cgst_amount:.2f}<br/><font size=6 color='#64748B'>@{half_rate:.1f}%</font>", cell_norm),
                Paragraph(f"{sgst_amount:.2f}<br/><font size=6 color='#64748B'>@{half_rate:.1f}%</font>", cell_norm),
                Paragraph(f"<b>{gross_total:.2f}</b>", cell_bold),
            ])

    items_table = Table(table_rows, colWidths=col_widths)
    t_style = [
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_BG),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (2, 0), (2, -1), 'CENTER'),
        ('ALIGN', (3, 0), (-1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOX', (0, 0), (-1, -1), 1, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]
    # Alternating row colors
    for r in range(1, len(table_rows)):
        bg = LIGHT_BG if r % 2 == 1 else colors.white
        t_style.append(('BACKGROUND', (0, r), (-1, r), bg))

    items_table.setStyle(TableStyle(t_style))
    story.append(items_table)
    story.append(Spacer(1, 10))

    # 4. Summary & Calculations Block
    total_gst_sum = total_cgst_sum + total_sgst_sum
    words_total = amount_to_words(total_gross_sum)

    # Empty cylinders returned banner if any
    empty_note = ""
    if (sale.TotalEmptyQty or 0) > 0:
        empty_note = f"<b>Empty Cylinders Return Voucher:</b> {int(sale.TotalEmptyQty)} Units verified & collected into vehicle stock.<br/>"

    summary_box_data = [
        [
            Paragraph(
                f"{empty_note}"
                f"<b>Amount in Words:</b><br/>"
                f"<i>{words_total}</i><br/><br/>"
                f"<b>Declaration & Terms:</b><br/>"
                f"<font size=7 color='#64748B'>"
                f"1. Goods received in sound condition & correct cylinder weight.<br/>"
                f"2. Cylinders remain the property of Future Gas and must be returned.<br/>"
                f"3. Subject to Kozhikode jurisdiction."
                f"</font>",
                cell_norm
            ),
            Table([
                [Paragraph("Taxable SubTotal:", cell_bold), Paragraph(f"Rs. {total_taxable_sum:.2f}", ParagraphStyle('R1', parent=cell_bold, alignment=2))],
                [Paragraph("Central GST (CGST):", cell_norm), Paragraph(f"Rs. {total_cgst_sum:.2f}", ParagraphStyle('R2', parent=cell_norm, alignment=2))],
                [Paragraph("State GST (SGST):", cell_norm), Paragraph(f"Rs. {total_sgst_sum:.2f}", ParagraphStyle('R3', parent=cell_norm, alignment=2))],
                [Paragraph("<b>Total GST:</b>", cell_bold), Paragraph(f"<b>Rs. {total_gst_sum:.2f}</b>", ParagraphStyle('R4', parent=cell_bold, alignment=2, textColor=PRIMARY_COLOR))],
                [Paragraph("Round Off:", cell_muted), Paragraph("Rs. 0.00", ParagraphStyle('R5', parent=cell_muted, alignment=2))],
                [Paragraph("<b>GRAND TOTAL:</b>", ParagraphStyle('R6', parent=cell_bold, fontSize=10, textColor=PRIMARY_COLOR)),
                 Paragraph(f"<b>Rs. {total_gross_sum:.2f}</b>", ParagraphStyle('R7', parent=cell_bold, fontSize=11, alignment=2, textColor=PRIMARY_COLOR))],
            ], colWidths=[120, 100])
        ]
    ]

    summary_table = Table(summary_box_data, colWidths=[315, 230])
    summary_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (1, 0), (1, 0), LIGHT_BG),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 16))

    # 5. Signatory & Authenticity Footer
    footer_data = [
        [
            Paragraph(
                f"<b>Receiver's Signature:</b> ___________________<br/>"
                f"<font size=7 color='#64748B'>Signature & Customer Stamp</font>",
                cell_norm
            ),
            Paragraph(
                f"For <b>{company_name}</b><br/><br/><br/>"
                f"<b>Authorized Signatory</b><br/>"
                f"<font size=7 color='#64748B'>Digitally generated delivery note</font>",
                ParagraphStyle('SigRight', parent=cell_norm, alignment=2)
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

    # Build Document
    doc.build(story)
    return buf.getvalue()
