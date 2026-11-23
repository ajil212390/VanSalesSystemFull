import os
import io
import re
import html
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.pdfgen import canvas
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


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass ReportLab canvas to calculate total page count ('Page X of Y')
    and draw consistent running footer across all pages.
    """
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont('Helvetica', 7)
        self.setFillColor(colors.HexColor('#64748B'))
        # Bottom page footer
        text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(595.28 - 25, 14, text)
        self.drawString(25, 14, "Future Gas Cloud ERP • Official Ledger Register • Confidential Internal Record")
        self.setStrokeColor(colors.HexColor('#CBD5E1'))
        self.setLineWidth(0.5)
        self.line(25, 23, 595.28 - 25, 23)
        self.restoreState()


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


def extract_split_amounts(sale_obj):
    notes = sale_obj.Notes or ''
    c_m = re.search(r'Cash:\s*[₹Rs\.]*\s*([\d,]+\.?\d*)', notes, re.IGNORECASE)
    u_m = re.search(r'(?:UPI|Bank|Online):\s*[₹Rs\.]*\s*([\d,]+\.?\d*)', notes, re.IGNORECASE)
    c_val = Decimal(c_m.group(1).replace(',', '')) if c_m else Decimal('0.00')
    u_val = Decimal(u_m.group(1).replace(',', '')) if u_m else Decimal('0.00')

    if c_val <= Decimal('0.00') and u_val <= Decimal('0.00') and (sale_obj.PaymentMethod or '').upper() == 'SPLIT':
        try:
            from core.models import Payment
            from django.db.models import Q
            p_rec = Payment.objects.filter(
                Q(Narration__icontains=sale_obj.SalesNo) | (Q(Narration__icontains=sale_obj.InvoiceNo) if sale_obj.InvoiceNo else Q())
            ).first()
            if p_rec:
                for line in p_rec.lines.all():
                    pm = (line.PaymentMode or '').upper()
                    if 'CASH' in pm:
                        c_val = Decimal(str(line.Amount or 0))
                    elif 'BANK' in pm or 'UPI' in pm:
                        u_val = Decimal(str(line.Amount or 0))
        except Exception:
            pass

    return c_val, u_val


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
            c_split, u_split = extract_split_amounts(sale)
            c_str = f"Rs. {c_split:.2f}"
            u_str = f"Rs. {u_split:.2f}"
            payment_mode_display = f"<b>Payment Mode:</b> SPLIT (Cash: {c_str} | UPI: {u_str})<br/>"
        else:
            payment_mode_display = f"<b>Payment Mode:</b> {pm_upper}<br/>"
    else:
        doc_title = "TAX INVOICE"
        doc_no_label = "Invoice No:"
        if is_credit:
            payment_mode_display = f"<b>Payment Mode:</b> <font color='#92400E'><b>CREDIT (Rs. 0.00 Paid)</b></font><br/>"
        elif pm_upper == 'SPLIT':
            c_split, u_split = extract_split_amounts(sale)
            c_str = f"Rs. {c_split:.2f}"
            u_str = f"Rs. {u_split:.2f}"
            payment_mode_display = (
                f"<b>Payment Mode:</b> SPLIT (Cash + UPI)<br/>"
                f"&nbsp;&bull; Cash: {c_str} &nbsp;|&nbsp; UPI: {u_str}<br/>"
            )
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

    # Pre-fetch lines & calculate empty cylinder breakdown by weight (e.g. 19 KG: 2 NOS)
    lines = sale.lines.select_related('Product', 'Unit').all()
    empty_breakdown_parts = []
    for line in lines:
        eq = int(line.EmptyQuantity or 0)
        if eq <= 0 and is_empty_return:
            eq = int(line.Quantity or 0)
        if eq > 0:
            p_name = line.ProductName or (line.Product.ProductName if line.Product else '')
            kg_match = re.search(r'(\d+(?:\.\d+)?\s*(?:KG|kg))', p_name)
            if kg_match:
                lbl = f"{kg_match.group(1).upper()} ({eq} NOS)"
            elif p_name:
                lbl = f"{p_name} ({eq} NOS)"
            else:
                lbl = f"{eq} NOS"
            empty_breakdown_parts.append(lbl)

    if not empty_breakdown_parts and sale.Notes:
        note_empties = re.findall(r'(\d+(?:\.\d+)?\s*(?:KG|kg)[\s:]*\d+\s*(?:NOS|nos)?)', sale.Notes)
        if note_empties:
            empty_breakdown_parts.extend(note_empties)

    empty_breakdown_str = ", ".join(empty_breakdown_parts)
    empties_display_text = f"{int(sale.TotalEmptyQty or 0)} NOS"
    if empty_breakdown_str:
        empties_display_text += f"<br/><font size=7.5 color='#475569'>&bull; {empty_breakdown_str}</font>"

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
                f"<b>Empty Cylinders Collected:</b> {empties_display_text}",
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
    c_split, u_split = extract_split_amounts(sale)
    is_split = (sale.PaymentMethod or '').upper() == 'SPLIT' or (c_split > Decimal('0.00') and u_split > Decimal('0.00'))

    paid_amt = Decimal('0.00')
    pm_upper = (sale.PaymentMethod or 'CASH').upper()
    if pm_upper == 'CREDIT':
        paid_amt = Decimal('0.00')
    elif is_split and (c_split + u_split) > Decimal('0.00'):
        paid_amt = c_split + u_split
    elif getattr(sale, 'PaidAmount', None) is not None:
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

    # Advance adjusted on this sale:
    adv_adj = Decimal('0.00')
    if hasattr(sale, 'advance_adjustments'):
        try:
            adv_adj = sum(Decimal(str(a.AmountAdjusted)) for a in sale.advance_adjustments.all())
        except Exception:
            adv_adj = Decimal('0.00')
    if adv_adj == Decimal('0.00') and hasattr(sale, 'AdvanceAdjusted') and sale.AdvanceAdjusted:
        adv_adj = Decimal(str(sale.AdvanceAdjusted))

    # Determine Previous Pending and Closing Balance (Point-in-Time as of this invoice):
    if customer:
        op = customer.OpeningBalance or Decimal('0.00')
        op_net = op if (customer.OpeningBalanceType or 'DR').upper() == 'DR' else -op

        # Gather any payment ID or reference linked specifically to this sale
        from core.models import Sales, Payment, BillwiseAllocation
        sale_no = str(sale.SalesNo or '').strip()
        inv_no = str(sale.InvoiceNo or '').strip()

        this_sale_pmt_filter = Q()
        if sale_no:
            this_sale_pmt_filter |= Q(Narration__icontains=sale_no)
        if inv_no:
            this_sale_pmt_filter |= Q(Narration__icontains=inv_no)

        this_sale_alloc_pmt_ids = set()
        for ref in [sale_no, inv_no]:
            if ref:
                this_sale_alloc_pmt_ids.update(
                    BillwiseAllocation.objects.filter(
                        ReferenceTable__in=['Receipt', 'Payment'],
                        BillReference__iexact=ref
                    ).values_list('ReferenceId', flat=True)
                )
                this_sale_alloc_pmt_ids.update(
                    BillwiseAllocation.objects.filter(
                        PaymentLine__Payment__isnull=False,
                        BillReference__iexact=ref
                    ).values_list('PaymentLine__Payment_id', flat=True)
                )
        bwa_sales = BillwiseAllocation.objects.filter(ReferenceTable='Sales', ReferenceId=sale.SalesId)
        for b in bwa_sales:
            if b.PaymentLine and b.PaymentLine.Payment_id:
                this_sale_alloc_pmt_ids.add(b.PaymentLine.Payment_id)

        # 1. Prior Sales to this customer (Debit)
        prior_sales_qs = Sales.objects.filter(
            CustomerLedger=customer, CompanyId=sale.CompanyId
        ).exclude(Status='CANCELLED').exclude(SalesId=sale.SalesId)

        if getattr(sale, 'CreatedAt', None):
            prior_sales_qs = prior_sales_qs.filter(
                Q(CreatedAt__lt=sale.CreatedAt) |
                (Q(CreatedAt=sale.CreatedAt) & Q(SalesId__lt=sale.SalesId))
            )
        elif sale.SalesDate:
            prior_sales_qs = prior_sales_qs.filter(
                Q(SalesDate__lt=sale.SalesDate) |
                (Q(SalesDate=sale.SalesDate) & Q(SalesId__lt=sale.SalesId))
            )
        else:
            prior_sales_qs = prior_sales_qs.filter(SalesId__lt=sale.SalesId)

        prior_sales_total = prior_sales_qs.aggregate(s=Sum('GrandTotal'))['s'] or Decimal('0.00')

        # 2. Prior Payments from this customer (Credit)
        prior_payments_qs = Payment.objects.filter(
            PartyLedger=customer
        ).exclude(Status__in=['CANCELLED', 'REJECTED'])

        if this_sale_alloc_pmt_ids:
            prior_payments_qs = prior_payments_qs.exclude(PaymentId__in=this_sale_alloc_pmt_ids)
        if this_sale_pmt_filter:
            prior_payments_qs = prior_payments_qs.exclude(this_sale_pmt_filter)

        if getattr(sale, 'CreatedAt', None):
            prior_payments_qs = prior_payments_qs.filter(
                CreatedAt__lt=sale.CreatedAt
            )
        elif sale.SalesDate:
            prior_payments_qs = prior_payments_qs.filter(
                CreatedAt__date__lt=sale.SalesDate
            )

        prior_payments_total = prior_payments_qs.aggregate(s=Sum('Amount'))['s'] or Decimal('0.00')

        # 3. Any manual journal voucher adjustments for this customer (not Sales and not Payment)
        manual_vls = VoucherLine.objects.filter(
            Ledger=customer, Voucher__IsCancelled=False
        ).exclude(Voucher__ReferenceTable__in=['Sales', 'Payment', 'Receipt'])
        if sale.SalesDate:
            manual_vls = manual_vls.filter(Voucher__VoucherDate__lte=sale.SalesDate)
        manual_dr = manual_vls.aggregate(s=Sum('DebitAmount'))['s'] or Decimal('0.00')
        manual_cr = manual_vls.aggregate(s=Sum('CreditAmount'))['s'] or Decimal('0.00')
        manual_net = manual_dr - manual_cr

        net_prior = op_net + manual_net + prior_sales_total - prior_payments_total

        # net_prior > 0 means customer owes money (Dr)
        # net_prior < 0 means customer has advance credit (Cr)
        if net_prior >= Decimal('0.00'):
            previous_bill_pending = net_prior
            is_prev_advance = False
        else:
            previous_bill_pending = abs(net_prior)
            is_prev_advance = True

        if is_money_receipt:
            closing_net = net_prior - paid_amt
        elif is_empty_return:
            closing_net = net_prior
        else:
            closing_net = net_prior + current_bill_amount - adv_adj - paid_amt

        if closing_net >= Decimal('0.00'):
            closing_balance = closing_net
            is_closing_advance = False
        else:
            closing_balance = abs(closing_net)
            is_closing_advance = True
    else:
        # Walk-in customer
        previous_bill_pending = Decimal('0.00')
        is_prev_advance = False
        closing_net = current_bill_amount - adv_adj - paid_amt
        if closing_net >= Decimal('0.00'):
            closing_balance = closing_net
            is_closing_advance = False
        else:
            closing_balance = abs(closing_net)
            is_closing_advance = True

    # Empty cylinders return narration
    empty_qty_int = int(sale.TotalEmptyQty or 0)
    if empty_breakdown_str:
        narration_text = f"Empty Return: {empty_breakdown_str} [Total: {empty_qty_int} NOS]"
    elif empty_qty_int > 0:
        narration_text = f"{empty_qty_int} Return Qty."
    else:
        narration_text = "No Return Empties"

    if is_split:
        narration_text += f" (Split: Cash Rs.{c_split:.2f} + UPI Rs.{u_split:.2f})"
    elif sale.PaymentMethod:
        narration_text += f" (Payment: {sale.PaymentMethod.upper()})"

    empties_count_display = f"<b>{empty_qty_int} NOS</b>"
    if empty_breakdown_str:
        empties_count_display += f"<br/><font size=7 color='#64748B'>{empty_breakdown_str}</font>"

    # Left Box: Customer Account Summary (Handwritten layout)
    # Right Box: Tax Breakdown (Handwritten layout)
    if is_empty_return:
        cust_summary_rows = [
            [Paragraph("<b>CUSTOMER ACCOUNT SUMMARY</b>", section_title), Paragraph("", cell_norm)],
            [Paragraph("Previous Balance :" if not is_prev_advance else "Previous Advance :", cell_norm), Paragraph(f"Rs. {previous_bill_pending:.2f}" + (" Cr" if is_prev_advance else ""), cell_right_bold)],
            [Paragraph("Returned Cylinders :", cell_norm), Paragraph(empties_count_display, cell_right_bold)],
            [Paragraph("Amount Paid :", cell_norm), Paragraph("Rs. 0.00", cell_right)],
            [Paragraph("<b>Advance Balance :</b>" if is_closing_advance else "<b>Balance Due :</b>", cell_bold), Paragraph(f"<b>Rs. {closing_balance:.2f}" + (" Cr" if is_closing_advance else "") + "</b>", ParagraphStyle('BalR', parent=cell_right_bold, textColor=PRIMARY_COLOR, fontSize=9.5))],
            [Paragraph("<b>Narration :</b>", cell_bold), Paragraph(f"<i>{narration_text}</i>", cell_norm)],
        ]
    elif is_money_receipt:
        cust_summary_rows = [
            [Paragraph("<b>CUSTOMER ACCOUNT SUMMARY</b>", section_title), Paragraph("", cell_norm)],
            [Paragraph("Previous Balance :" if not is_prev_advance else "Previous Advance :", cell_norm), Paragraph(f"Rs. {previous_bill_pending:.2f}" + (" Cr" if is_prev_advance else ""), cell_right_bold)],
            [Paragraph("<b>Payment Received :</b>", cell_bold), Paragraph(f"<b>(-) Rs. {paid_amt:.2f}</b>", cell_right_bold)],
            [Paragraph("Payment Mode :", cell_muted), Paragraph(f"<b>{pm_upper}</b>", cell_right)],
            [Paragraph("<b>Remaining Advance :</b>" if is_closing_advance else "<b>Remaining Balance :</b>", cell_bold), Paragraph(f"<b>Rs. {closing_balance:.2f}" + (" Cr" if is_closing_advance else "") + "</b>", ParagraphStyle('BalR', parent=cell_right_bold, textColor=PRIMARY_COLOR, fontSize=9.5))],
            [Paragraph("<b>Narration :</b>", cell_bold), Paragraph(f"<i>{narration_text}</i>", cell_norm)],
        ]
    else:
        cust_summary_rows = [
            [Paragraph("<b>CUSTOMER ACCOUNT SUMMARY</b>", section_title), Paragraph("", cell_norm)],
        ]
        if is_prev_advance:
            cust_summary_rows.append([
                Paragraph("Previous Advance :", cell_norm),
                Paragraph(f"(-) Rs. {previous_bill_pending:.2f}", cell_right_bold)
            ])
        else:
            cust_summary_rows.append([
                Paragraph("Previous Bill Pending :", cell_norm),
                Paragraph(f"Rs. {previous_bill_pending:.2f}", cell_right_bold)
            ])
        cust_summary_rows.append([
            Paragraph("Current Bill :", cell_norm),
            Paragraph(f"(+) Rs. {current_bill_amount:.2f}", cell_right)
        ])
        if adv_adj > Decimal('0.00'):
            cust_summary_rows.append([
                Paragraph("Advance Adjusted :", cell_bold),
                Paragraph(f"(-) Rs. {adv_adj:.2f}", cell_right_bold)
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

        if is_closing_advance and closing_balance > Decimal('0.00'):
            cust_summary_rows.append([
                Paragraph("<b>Advance Remaining :</b>", cell_bold),
                Paragraph(f"<b>Rs. {closing_balance:.2f} Cr</b>", ParagraphStyle('BalAdv', parent=cell_right_bold, textColor=PRIMARY_COLOR, fontSize=9.5))
            ])
        else:
            cust_summary_rows.append([
                Paragraph("<b>Balance Due :</b>", cell_bold),
                Paragraph(f"<b>Rs. {closing_balance:.2f}</b>", ParagraphStyle('BalR', parent=cell_right_bold, textColor=PRIMARY_COLOR, fontSize=9.5))
            ])
        cust_summary_rows.append([
            Paragraph("<b>Narration :</b>", cell_bold),
            Paragraph(f"<i>{narration_text}</i>", cell_norm)
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
            [Paragraph("Empties Inward Qty :", cell_norm), Paragraph(empties_count_display, cell_right_bold)],
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
            [Paragraph("Empties Collected :", cell_muted), Paragraph(empties_count_display, cell_right)],
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
                    qr_img_flowable = RLImage(cand, width=90, height=90)
                    break
                except Exception:
                    qr_img_flowable = None

    if qr_img_flowable:
        bank_name_str = pg_obj.BankLedger.LedgerName if (pg_obj.BankLedger and pg_obj.BankLedger.LedgerName) else ""
        qr_box = [
            [Paragraph("<b>SCAN &amp; PAY</b>", ParagraphStyle('QrH', fontName=FONT_BOLD, fontSize=8, leading=10, alignment=1, textColor=PRIMARY_COLOR))],
            [qr_img_flowable],
            [Paragraph(f"<font size=7 color='#334155'><b>{pg_obj.PaymentGroupName}</b>{(' • ' + bank_name_str) if bank_name_str else ''}</font>", ParagraphStyle('QrF', fontName=FONT_NAME, fontSize=7, leading=8.5, alignment=1))],
        ]
        qr_table = Table(qr_box, colWidths=[120])
        qr_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOX', (0, 0), (-1, -1), 0.75, BORDER_COLOR),
            ('BACKGROUND', (0, 0), (-1, -1), LIGHT_BG),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
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
        footer_table = Table(footer_data, colWidths=[212, 121, 212])
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
            if (s.PaymentMethod or '').upper() == 'SPLIT':
                c_split, u_split = extract_split_amounts(s)
                if c_split <= Decimal('0.00') and u_split <= Decimal('0.00'):
                    c_split = (paid_amt / Decimal('2.00')).quantize(Decimal('0.01'))
                    u_split = paid_amt - c_split
                elif c_split > Decimal('0.00') and u_split <= Decimal('0.00') and paid_amt > c_split:
                    u_split = paid_amt - c_split
                elif u_split > Decimal('0.00') and c_split <= Decimal('0.00') and paid_amt > u_split:
                    c_split = paid_amt - u_split

                if c_split > 0:
                    raw_entries.append({
                        'date': s_date,
                        'ref': pay_ref,
                        'type': "Payment Received on Sale (Cash)",
                        'debit': Decimal('0.00'),
                        'credit': c_split,
                        'sort_key': f"{s_date}_1_paid_{s.SalesId}_1",
                    })
                if u_split > 0:
                    raw_entries.append({
                        'date': s_date,
                        'ref': pay_ref,
                        'type': "Payment Received on Sale (SBI / Bank)",
                        'debit': Decimal('0.00'),
                        'credit': u_split,
                        'sort_key': f"{s_date}_1_paid_{s.SalesId}_2",
                    })
            else:
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
        r_lines = list(r.lines.all()) if hasattr(r, 'lines') else []
        if len(r_lines) > 1:
            for l_idx, pl in enumerate(r_lines):
                pl_amt = Decimal(str(pl.Amount or 0))
                acc_name = pl.Ledger.LedgerName if pl.Ledger else (pl.PaymentMode or 'CASH')
                raw_entries.append({
                    'date': r_date,
                    'ref': format_short_ref(r_ref),
                    'type': f"Collection Receipt ({acc_name})",
                    'debit': Decimal('0.00'),
                    'credit': pl_amt,
                    'sort_key': f"{r_date}_2_{getattr(r, 'PaymentId', 0)}_{l_idx}",
                })
        else:
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
        Paragraph(f"Opening Balance: <b>Rs. {abs(effective_op):,.2f} {'Dr' if effective_op >= 0 else 'Cr'}</b>", meta_style),
        Paragraph(f"Total Billed (Debit): <b>Rs. {period_billed:,.2f}</b>", meta_style),
        Paragraph(f"Total Paid (Credit): <b>Rs. {period_paid:,.2f}</b>", meta_style),
        Spacer(1, 3),
        Paragraph(
            f"Net Balance Due: <font size=11 color='#800020'><b>Rs. {abs(running_bal):,.2f} {'Dr' if running_bal >= 0 else 'Cr'}</b></font>",
            meta_bold
        ),
    ]
    try:
        adv_bal = getattr(customer, 'advance_balance', None)
        if adv_bal is None and hasattr(customer, 'advances'):
            adv_bal = sum(a.RemainingBalance for a in customer.advances.filter(Status__in=['OPEN', 'PARTIAL']))
        if adv_bal and Decimal(str(adv_bal)) > Decimal('0.00'):
            kpi_box_content.append(
                Paragraph(f"Customer Advance Balance: <font color='#0D9488'><b>Rs. {Decimal(str(adv_bal)):,.2f}</b></font>", meta_style)
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
            Paragraph("<b>DEBIT</b>", cell_right_b),
            Paragraph("<b>CREDIT</b>", cell_right_b),
            Paragraph("<b>BALANCE</b>", cell_right_b),
        ]
    ]

    for e in final_entries:
        d_str = f"Rs. {e['debit']:,.2f}" if e['debit'] > 0 else "—"
        c_str = f"Rs. {e['credit']:,.2f}" if e['credit'] > 0 else "—"
        bal_str = f"Rs. {abs(e['balance']):,.2f} {'Dr' if e['balance'] >= 0 else 'Cr'}"
        tbl_data.append([
            Paragraph(e['date'] or '—', cell_norm),
            Paragraph(f"<b>{e['ref']}</b>", cell_norm),
            Paragraph(e['type'], cell_norm),
            Paragraph(d_str, cell_right),
            Paragraph(c_str, cell_right),
            Paragraph(bal_str, cell_right_burg if e['balance'] > 0 else cell_right),
        ])

    # Total Row
    final_bal_str = f"Rs. {abs(running_bal):,.2f} {'Dr' if running_bal >= 0 else 'Cr'}"
    tbl_data.append([
        Paragraph("<b>TOTALS</b>", cell_bold),
        Paragraph(f"<b>{len(final_entries)} Transactions</b>", cell_bold),
        Paragraph("", cell_norm),
        Paragraph(f"<b>Rs. {period_billed:,.2f}</b>", cell_right_b),
        Paragraph(f"<b>Rs. {period_paid:,.2f}</b>", cell_right_b),
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
        Paragraph(f"Opening Balance: <b>Rs. {abs(effective_op):,.2f} {'Cr' if effective_op >= 0 else 'Dr'}</b>", meta_style),
        Paragraph(f"Total Purchases (Credit): <b>Rs. {tot_credit:,.2f}</b>", meta_style),
        Paragraph(f"Total Payments (Debit): <b>Rs. {tot_debit:,.2f}</b>", meta_style),
        Spacer(1, 3),
        Paragraph(
            f"Net Balance Due: <font size=11 color='#800020'><b>Rs. {abs(running_bal):,.2f} {'Cr' if running_bal >= 0 else 'Dr'}</b></font>",
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
            Paragraph("<b>DEBIT</b>", cell_right_b),
            Paragraph("<b>CREDIT</b>", cell_right_b),
            Paragraph("<b>BALANCE</b>", cell_right_b),
        ]
    ]

    for e in final_entries:
        d_str = f"Rs. {e['debit']:,.2f}" if e['debit'] > 0 else "—"
        c_str = f"Rs. {e['credit']:,.2f}" if e['credit'] > 0 else "—"
        bal_str = f"Rs. {abs(e['balance']):,.2f} {'Cr' if e['balance'] >= 0 else 'Dr'}"
        tbl_data.append([
            Paragraph(e['date'] or '—', cell_norm),
            Paragraph(f"<b>{e['ref']}</b>", cell_norm),
            Paragraph(e['type'], cell_norm),
            Paragraph(d_str, cell_right),
            Paragraph(c_str, cell_right),
            Paragraph(bal_str, cell_right_burg if e['balance'] > 0 else cell_right),
        ])

    # Total Row
    final_bal_str = f"Rs. {abs(running_bal):,.2f} {'Cr' if running_bal >= 0 else 'Dr'}"
    tbl_data.append([
        Paragraph("<b>TOTALS</b>", cell_bold),
        Paragraph(f"<b>{len(final_entries)} Transactions</b>", cell_bold),
        Paragraph("", cell_norm),
        Paragraph(f"<b>Rs. {period_billed:,.2f}</b>", cell_right_b),
        Paragraph(f"<b>Rs. {period_paid:,.2f}</b>", cell_right_b),
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

    c1 = [Paragraph("TOTAL DEBTORS", kpi_label), Spacer(1, 2), Paragraph(str(total_debtors), kpi_val), Spacer(1, 1), Paragraph(f"Op: Rs. {abs(total_opening):,.2f} {op_suffix}", kpi_sub)]
    c2 = [Paragraph("TOTAL SALES BILLED", kpi_label), Spacer(1, 2), Paragraph(f"Rs. {total_billed:,.2f}", kpi_val), Spacer(1, 1), Paragraph("Delivery & Sales Bills", kpi_sub)]
    c3 = [Paragraph("COLLECTIONS RECEIVED", kpi_label), Spacer(1, 2), Paragraph(f"Rs. {total_received:,.2f}", kpi_val), Spacer(1, 1), Paragraph("Cash & Bank Receipts", kpi_sub)]
    c4 = [
        Paragraph("NET RECEIVABLE", ParagraphStyle('RecKpiLblB', parent=kpi_label, textColor=PRIMARY_COLOR)),
        Spacer(1, 2),
        Paragraph(f"Rs. {abs(total_receivable):,.2f} {rec_suffix}", kpi_val_burg),
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
        Paragraph("OPENING BAL (Rs.)", th_right),
        Paragraph("SALES BILLED (Rs.)", th_right),
        Paragraph("COLLECTIONS (Rs.)", th_right),
        Paragraph("NET RECEIVABLE (Rs.)", th_right),
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
            name_content.append(Paragraph(f"<font size=7 color='#800020'><b>[Advance Balance: Rs. {adv:,.2f}]</b></font>", cell_contact))
        if contact_str:
            name_content.append(Paragraph(contact_str, cell_contact))

        op_val = Decimal(str(d.get('openingBal', 0) or 0))
        op_t = (d.get('openingType', 'DR') or 'DR').upper()
        sales_val = Decimal(str(d.get('salesBilled', 0) or 0))
        coll_val = Decimal(str(d.get('collectionsReceived', 0) or 0))
        rec_val = Decimal(str(d.get('netReceivable', 0) or 0))

        table_rows.append([
            name_content,
            Paragraph(f"{op_val:,.2f} <font size=6.5 color='#64748B'>{op_t}</font>", cell_right),
            Paragraph(f"{sales_val:,.2f}", cell_right),
            Paragraph(f"{coll_val:,.2f}", cell_right),
            Paragraph(f"{abs(rec_val):,.2f} {'Dr' if rec_val >= 0 else 'Cr'}", cell_right_burg if abs(rec_val) > 0 else cell_right),
        ])

    # Summary Totals Row
    total_name = Paragraph(f"<b>TOTAL ({len(debtors_data)} DEBTORS)</b>", ParagraphStyle('RecTotLbl', fontName=FONT_BOLD, fontSize=8, leading=10, textColor=DARK_COLOR))
    table_rows.append([
        total_name,
        Paragraph(f"<b>Rs. {abs(total_opening):,.2f} {op_suffix}</b>", cell_right_bold),
        Paragraph(f"<b>Rs. {total_billed:,.2f}</b>", cell_right_bold),
        Paragraph(f"<b>Rs. {total_received:,.2f}</b>", cell_right_bold),
        Paragraph(f"<b>Rs. {abs(total_receivable):,.2f} {rec_suffix}</b>", cell_right_burg),
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

    c1 = [Paragraph("TOTAL CREDITORS", kpi_label), Spacer(1, 2), Paragraph(str(total_creditors), kpi_val), Spacer(1, 1), Paragraph(f"Op: Rs. {abs(total_opening):,.2f} {op_suffix}", kpi_sub)]
    c2 = [Paragraph("TOTAL PURCHASES", kpi_label), Spacer(1, 2), Paragraph(f"Rs. {total_purchases:,.2f}", kpi_val), Spacer(1, 1), Paragraph("Recorded Invoices", kpi_sub)]
    c3 = [Paragraph("PAYMENTS SETTLED", kpi_label), Spacer(1, 2), Paragraph(f"Rs. {total_paid:,.2f}", kpi_val), Spacer(1, 1), Paragraph("Disbursed Vouchers", kpi_sub)]
    c4 = [
        Paragraph("NET PAYABLE", ParagraphStyle('PayKpiLblB', parent=kpi_label, textColor=PRIMARY_COLOR)),
        Spacer(1, 2),
        Paragraph(f"Rs. {abs(total_payable):,.2f} {pay_suffix}", kpi_val_burg),
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
        Paragraph("OPENING BAL (Rs.)", th_right),
        Paragraph("PURCHASES (Rs.)", th_right),
        Paragraph("PAYMENTS (Rs.)", th_right),
        Paragraph("NET PAYABLE (Rs.)", th_right),
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
            Paragraph(f"Rs. {op_val:,.2f} <font size=6.5 color='#64748B'>{op_t}</font>", cell_right),
            Paragraph(f"Rs. {pur_val:,.2f}", cell_right),
            Paragraph(f"Rs. {paid_val:,.2f}", cell_right),
            Paragraph(f"Rs. {abs(due_val):,.2f} {'Cr' if due_val >= 0 else 'Dr'}", cell_right_burg if abs(due_val) > 0 else cell_right),
        ])

    # Summary Totals Row
    total_name = Paragraph(f"<b>TOTAL ({len(creditors_data)} CREDITORS)</b>", ParagraphStyle('PayTotLbl', fontName=FONT_BOLD, fontSize=8, leading=10, textColor=DARK_COLOR))
    table_rows.append([
        total_name,
        Paragraph(f"<b>Rs. {abs(total_opening):,.2f} {op_suffix}</b>", cell_right_bold),
        Paragraph(f"<b>Rs. {total_purchases:,.2f}</b>", cell_right_bold),
        Paragraph(f"<b>Rs. {total_paid:,.2f}</b>", cell_right_bold),
        Paragraph(f"<b>Rs. {abs(total_payable):,.2f} {pay_suffix}</b>", cell_right_burg),
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
        [Paragraph(f"<b>Rs. {cash_amt:,.2f}</b>", ParagraphStyle('KpiVal2', fontName=FONT_BOLD, fontSize=14, leading=17, textColor=DARK_COLOR))],
        [Paragraph(f"<font size=6.5 color='#64748B'>Direct cash inflow</font>", ParagraphStyle('KpiSub2', fontName=FONT_NAME, fontSize=6.5, leading=8, textColor=MUTED_COLOR))],
    ], colWidths=[130])
    kpi_2.setStyle(kpi_card_style)

    kpi_3 = Table([
        [Paragraph("UPI & BANK INFLOW", ParagraphStyle('KpiLbl3', fontName=FONT_BOLD, fontSize=7, leading=9, textColor=MUTED_COLOR))],
        [Paragraph(f"<b>Rs. {bank_amt:,.2f}</b>", ParagraphStyle('KpiVal3', fontName=FONT_BOLD, fontSize=14, leading=17, textColor=DARK_COLOR))],
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
        [Paragraph("TOTAL COLLECTED (Rs.)", ParagraphStyle('KpiLbl4', fontName=FONT_BOLD, fontSize=7, leading=9, textColor=PRIMARY_COLOR))],
        [Paragraph(f"<b>Rs. {tot_amt:,.2f}</b>", ParagraphStyle('KpiVal4', fontName=FONT_BOLD, fontSize=15, leading=18, textColor=PRIMARY_COLOR))],
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
        Paragraph("AMOUNT (Rs.)", hdr_cell_r),
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
            Paragraph(f"Rs. {r_amt:,.2f}", cell_right_bold),
        ])

    table_rows.append([
        Paragraph(f"<b>TOTAL ({len(records)} ENTRIES)</b>", cell_bold),
        Paragraph("", cell_norm),
        Paragraph("", cell_norm),
        Paragraph("", cell_norm),
        Paragraph(f"<b>Rs. {tot_amt:,.2f}</b>", cell_right_burg),
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
                    qr_img_flowable = RLImage(cand, width=90, height=90)
                    break
                except Exception:
                    qr_img_flowable = None

    if qr_img_flowable:
        bank_name_str = pg_obj.BankLedger.LedgerName if (pg_obj.BankLedger and pg_obj.BankLedger.LedgerName) else ""
        qr_box = [
            [Paragraph("<b>SCAN &amp; PAY</b>", ParagraphStyle('RnQrH', fontName=FONT_BOLD, fontSize=8, leading=10, alignment=1, textColor=PRIMARY_COLOR))],
            [qr_img_flowable],
            [Paragraph(f"<font size=7 color='#334155'><b>{pg_obj.PaymentGroupName}</b>{(' • ' + bank_name_str) if bank_name_str else ''}</font>", ParagraphStyle('RnQrF', fontName=FONT_NAME, fontSize=7, leading=8.5, alignment=1))],
        ]
        qr_table = Table(qr_box, colWidths=[120])
        qr_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOX', (0, 0), (-1, -1), 0.75, BORDER_COLOR),
            ('BACKGROUND', (0, 0), (-1, -1), LIGHT_BG),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
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
        sig_table = Table(sig_data, colWidths=[212, 121, 212])
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


def generate_ledger_report_pdf(
    ledgers_data,
    company_id=1,
    group_filter='ALL',
    route_filter='ALL',
    group_name='',
    route_name='',
    summary_stats=None,
    search_query=''
):
    """
    Generates a publication-grade, multi-page A4 PDF report for Chart of Accounts / Ledger Analysis.
    Supports dynamic titles (e.g. Sundry Debtors, Route filtering), KPI statistics strip,
    paginated table repeating header on every page, and running 'Page X of Y' footer.
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=25,
        rightMargin=25,
        topMargin=25,
        bottomMargin=32
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

    # Dynamic Title Construction based on Group & Route
    active_group = (group_name or '').strip()
    active_route = (route_name or '').strip()

    if active_group and active_route:
        report_main_title = f"{active_group.upper()} REPORT"
        report_sub_title = f"ROUTE: {active_route.upper()}"
    elif active_group:
        report_main_title = f"{active_group.upper()} LEDGER REPORT"
        report_sub_title = "ALL ROUTES &bull; ACTIVE ACCOUNTS"
    elif active_route:
        report_main_title = f"LEDGER REPORT — {active_route.upper()}"
        report_sub_title = "ALL ACCOUNT GROUPS"
    else:
        report_main_title = "CHART OF ACCOUNTS &amp; LEDGER REPORT"
        report_sub_title = "GENERAL TRIAL BALANCE &bull; ALL ACCOUNTS"

    title_company = ParagraphStyle('LdgCompT', fontName=FONT_BOLD, fontSize=17, leading=21, textColor=PRIMARY_COLOR)
    sub_company = ParagraphStyle('LdgCompS', fontName=FONT_BOLD, fontSize=8, leading=10, textColor=colors.HexColor('#334155'))
    meta_company = ParagraphStyle('LdgCompM', fontName=FONT_NAME, fontSize=7, leading=9.5, textColor=MUTED_COLOR)

    title_box_h = ParagraphStyle('LdgBoxH', fontName=FONT_BOLD, fontSize=13, leading=16, textColor=PRIMARY_COLOR, alignment=2)
    title_box_sub = ParagraphStyle('LdgBoxSub', fontName=FONT_BOLD, fontSize=8, leading=10, textColor=colors.HexColor('#475569'), alignment=2)
    title_box_m = ParagraphStyle('LdgBoxM', fontName=FONT_NAME, fontSize=7, leading=9, textColor=MUTED_COLOR, alignment=2)

    kpi_label = ParagraphStyle('LdgKpiLbl', fontName=FONT_BOLD, fontSize=6.5, leading=8.5, textColor=MUTED_COLOR, alignment=1)
    kpi_val = ParagraphStyle('LdgKpiVal', fontName=FONT_BOLD, fontSize=11.5, leading=13.5, textColor=DARK_COLOR, alignment=1)
    kpi_sub = ParagraphStyle('LdgKpiSub', fontName=FONT_NAME, fontSize=6.5, leading=8.5, textColor=MUTED_COLOR, alignment=1)
    kpi_val_burg = ParagraphStyle('LdgKpiValBurg', fontName=FONT_BOLD, fontSize=11.5, leading=13.5, textColor=PRIMARY_COLOR, alignment=1)

    th_left = ParagraphStyle('LdgThL', fontName=FONT_BOLD, fontSize=7.5, leading=9.5, textColor=colors.white)
    th_right = ParagraphStyle('LdgThR', fontName=FONT_BOLD, fontSize=7.5, leading=9.5, textColor=colors.white, alignment=2)
    th_center = ParagraphStyle('LdgThC', fontName=FONT_BOLD, fontSize=7.5, leading=9.5, textColor=colors.white, alignment=1)

    cell_num = ParagraphStyle('LdgCellNum', fontName=FONT_NAME, fontSize=7, leading=9, textColor=MUTED_COLOR, alignment=1)
    cell_name = ParagraphStyle('LdgCellName', fontName=FONT_BOLD, fontSize=7.5, leading=9.5, textColor=DARK_COLOR)
    cell_route = ParagraphStyle('LdgCellRoute', fontName=FONT_NAME, fontSize=6.5, leading=8, textColor=MUTED_COLOR)
    cell_group = ParagraphStyle('LdgCellGrp', fontName=FONT_BOLD, fontSize=7, leading=8.5, textColor=colors.HexColor('#334155'))
    cell_nature = ParagraphStyle('LdgCellNat', fontName=FONT_NAME, fontSize=6, leading=7.5, textColor=MUTED_COLOR)
    cell_right = ParagraphStyle('LdgCellR', fontName=FONT_NAME, fontSize=7.5, leading=9.5, textColor=DARK_COLOR, alignment=2)
    cell_right_bold = ParagraphStyle('LdgCellRB', fontName=FONT_BOLD, fontSize=7.5, leading=9.5, textColor=DARK_COLOR, alignment=2)
    cell_right_burg = ParagraphStyle('LdgCellRBurg', fontName=FONT_BOLD, fontSize=7.5, leading=9.5, textColor=PRIMARY_COLOR, alignment=2)

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
        Paragraph(report_main_title, title_box_h),
        Paragraph(report_sub_title, title_box_sub),
        Spacer(1, 2),
        Paragraph(f"Generated: <b>{now_str}</b>", title_box_m),
        Paragraph(f"Active Accounts Listed: <b>{len(ledgers_data)}</b>", title_box_m),
    ]

    hdr_table = Table([[header_left, header_right]], colWidths=[335, 210])
    hdr_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(hdr_table)
    story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY_COLOR, spaceBefore=4, spaceAfter=8))

    # Calculate Totals
    total_count = len(ledgers_data)
    net_opening = Decimal('0.00')
    tot_debit = Decimal('0.00')
    tot_credit = Decimal('0.00')
    tot_current = Decimal('0.00')

    for l in ledgers_data:
        op = Decimal(str(l.get('OpeningBalance', 0) or 0))
        op_type = (l.get('OpeningBalanceType', 'DR') or 'DR').upper()
        net_opening += (op if op_type == 'DR' else -op)
        tot_debit += Decimal(str(l.get('DebitBalance', 0) or 0))
        tot_credit += Decimal(str(l.get('CreditBalance', 0) or 0))
        tot_current += Decimal(str(l.get('CurrentBalance', 0) or 0))

    if summary_stats and isinstance(summary_stats, dict):
        if 'totDebit' in summary_stats:
            tot_debit = Decimal(str(summary_stats.get('totDebit', 0) or 0))
        if 'totCredit' in summary_stats:
            tot_credit = Decimal(str(summary_stats.get('totCredit', 0) or 0))
        if 'totCurrent' in summary_stats:
            tot_current = Decimal(str(summary_stats.get('totCurrent', 0) or 0))
        if 'netOpening' in summary_stats:
            net_opening = Decimal(str(summary_stats.get('netOpening', 0) or 0))

    op_suffix = 'Dr' if net_opening >= 0 else 'Cr'
    cur_suffix = 'Dr' if tot_current >= 0 else 'Cr'

    # 2. KPI Summary Strip (4 Cards)
    c1 = [
        Paragraph("TOTAL ACCOUNTS", kpi_label),
        Spacer(1, 2),
        Paragraph(f"{total_count} Ledgers", kpi_val),
        Spacer(1, 1),
        Paragraph(f"{active_group or 'All Groups'}", kpi_sub)
    ]
    c2 = [
        Paragraph("NET OPENING BAL", kpi_label),
        Spacer(1, 2),
        Paragraph(f"Rs. {abs(net_opening):,.2f} {op_suffix}", kpi_val),
        Spacer(1, 1),
        Paragraph("Initial Balance b/f", kpi_sub)
    ]
    c3 = [
        Paragraph("PERIOD TURNOVER", kpi_label),
        Spacer(1, 2),
        Paragraph(f"Dr: Rs. {tot_debit:,.0f} | Cr: Rs. {tot_credit:,.0f}", ParagraphStyle('LdgTurnover', parent=kpi_val, fontSize=9, leading=11)),
        Spacer(1, 1),
        Paragraph("Voucher Postings", kpi_sub)
    ]
    c4 = [
        Paragraph("NET CURRENT BALANCE", ParagraphStyle('LdgKpiLblB', parent=kpi_label, textColor=PRIMARY_COLOR)),
        Spacer(1, 2),
        Paragraph(f"Rs. {abs(tot_current):,.2f} {cur_suffix}", kpi_val_burg),
        Spacer(1, 1),
        Paragraph("Live Ledger Balance", ParagraphStyle('LdgKpiSubB', parent=kpi_sub, textColor=PRIMARY_COLOR))
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
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(kpi_table)
    story.append(Spacer(1, 8))

    # 3. Main Data Table
    # Widths: [22, 173, 85, 65, 65, 65, 70] = 545 pt
    th_row = [
        Paragraph("#", th_center),
        Paragraph("LEDGER ACCOUNT", th_left),
        Paragraph("GROUP", th_left),
        Paragraph("OPENING (Rs.)", th_right),
        Paragraph("DEBIT (Rs.)", th_right),
        Paragraph("CREDIT (Rs.)", th_right),
        Paragraph("CURRENT (Rs.)", th_right),
    ]

    table_rows = [th_row]

    for idx, l in enumerate(ledgers_data, start=1):
        name = l.get('LedgerName') or 'Unnamed Account'
        grp_name = l.get('group_name') or ''
        if not grp_name and isinstance(l.get('Group'), dict):
            grp_name = l.get('Group', {}).get('GroupName', '')
        grp_nature = l.get('group_nature') or ''
        if not grp_nature and isinstance(l.get('Group'), dict):
            grp_nature = l.get('Group', {}).get('Nature', '')

        route_label = l.get('route_name') or l.get('RouteName') or ''
        customer_code = l.get('CustomerCode') or ''

        # Account Details cell
        cell_acc_content = [Paragraph(f"<b>{name}</b>", cell_name)]
        sub_details = []
        if route_label:
            sub_details.append(f"Route: {route_label}")
        if customer_code:
            sub_details.append(f"Code: {customer_code}")
        if sub_details:
            cell_acc_content.append(Paragraph(" &bull; ".join(sub_details), cell_route))

        # Group cell
        cell_grp_content = [Paragraph(grp_name or 'General', cell_group)]
        if grp_nature:
            cell_grp_content.append(Paragraph(grp_nature, cell_nature))

        # Opening balance
        op_val = Decimal(str(l.get('OpeningBalance', 0) or 0))
        op_type = (l.get('OpeningBalanceType', 'DR') or 'DR').upper()
        op_str = f"{abs(op_val):,.2f} {op_type}" if op_val != 0 else "0.00"

        # Debit & Credit
        d_val = Decimal(str(l.get('DebitBalance', 0) or 0))
        c_val = Decimal(str(l.get('CreditBalance', 0) or 0))
        d_str = f"{d_val:,.2f}" if d_val > 0 else "—"
        c_str = f"{c_val:,.2f}" if c_val > 0 else "—"

        # Current balance
        cur_val = Decimal(str(l.get('CurrentBalance', 0) or 0))
        cur_sfx = 'Dr' if cur_val >= 0 else 'Cr'
        cur_str = f"{abs(cur_val):,.2f} {cur_sfx}"

        row = [
            Paragraph(str(idx), cell_num),
            cell_acc_content,
            cell_grp_content,
            Paragraph(op_str, cell_right),
            Paragraph(d_str, cell_right),
            Paragraph(c_str, cell_right),
            Paragraph(cur_str, cell_right_burg if cur_val != 0 else cell_right),
        ]
        table_rows.append(row)

    # Summary Totals Row at the end
    tot_row = [
        Paragraph("", cell_num),
        Paragraph("<b>GRAND TOTALS</b>", ParagraphStyle('LdgTotLbl', fontName=FONT_BOLD, fontSize=8, leading=10, textColor=PRIMARY_COLOR)),
        Paragraph(f"<b>{total_count} Accounts</b>", ParagraphStyle('LdgTotCnt', fontName=FONT_BOLD, fontSize=7.5, leading=9.5, textColor=DARK_COLOR)),
        Paragraph(f"Rs. {abs(net_opening):,.2f} {op_suffix}", cell_right_bold),
        Paragraph(f"Rs. {tot_debit:,.2f}", cell_right_bold),
        Paragraph(f"Rs. {tot_credit:,.2f}", cell_right_bold),
        Paragraph(f"Rs. {abs(tot_current):,.2f} {cur_suffix}", ParagraphStyle('LdgTotCur', fontName=FONT_BOLD, fontSize=8, leading=10, textColor=PRIMARY_COLOR, alignment=2)),
    ]
    table_rows.append(tot_row)

    data_table = Table(table_rows, colWidths=[22, 173, 85, 65, 65, 65, 70], repeatRows=1)

    t_style = [
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        # Totals row highlight
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#FDF2F4')),
        ('LINEABOVE', (0, -1), (-1, -1), 1.2, PRIMARY_COLOR),
        ('LINEBELOW', (0, -1), (-1, -1), 1.5, PRIMARY_COLOR),
        ('TOPPADDING', (0, -1), (-1, -1), 5),
        ('BOTTOMPADDING', (0, -1), (-1, -1), 5),
    ]

    # Alternate row backgrounds
    for i in range(1, len(ledgers_data) + 1):
        if i % 2 == 0:
            t_style.append(('BACKGROUND', (0, i), (-1, i), colors.HexColor('#F8FAFC')))

    data_table.setStyle(TableStyle(t_style))
    story.append(data_table)
    story.append(Spacer(1, 12))

    # 4. Signatory block (KeepTogether so it doesn't get orphaned)
    notes_content = [
        Paragraph("<b>Audit &amp; Reporting Compliance Notes:</b>", ParagraphStyle('LdgNtH', fontName=FONT_BOLD, fontSize=7, leading=9, textColor=DARK_COLOR)),
        Paragraph("&bull; Balances compiled from ledger transactions in compliance with Indian Accounting Standards.", ParagraphStyle('LdgNtB', fontName=FONT_NAME, fontSize=6.5, leading=8.5, textColor=MUTED_COLOR)),
        Paragraph("&bull; Dr indicates net receivable or asset balance; Cr indicates net advance or liability balance.", ParagraphStyle('LdgNtB2', fontName=FONT_NAME, fontSize=6.5, leading=8.5, textColor=MUTED_COLOR)),
    ]

    sig_content = [
        Spacer(1, 14),
        Paragraph("_______________________________________", ParagraphStyle('LdgSgL', fontName=FONT_NAME, fontSize=8, leading=10, textColor=colors.HexColor('#94A3B8'), alignment=2)),
        Paragraph("<b>Authorized Signatory / Accountant</b>", ParagraphStyle('LdgSgA', fontName=FONT_BOLD, fontSize=8, leading=10, textColor=PRIMARY_COLOR, alignment=2)),
        Paragraph(f"<font size=6.5 color='#64748B'>Date: {date_only}</font>", ParagraphStyle('LdgSgD', fontName=FONT_NAME, fontSize=6.5, leading=8, textColor=MUTED_COLOR, alignment=2)),
    ]

    bottom_table = Table([[notes_content, '', sig_content]], colWidths=[315, 20, 210])
    bottom_table.setStyle(TableStyle([
        ('BOX', (0, 0), (0, 0), 0.75, colors.HexColor('#CBD5E1')),
        ('BACKGROUND', (0, 0), (0, 0), colors.HexColor('#F8FAFC')),
        ('BOX', (2, 0), (2, 0), 0.75, colors.HexColor('#CBD5E1')),
        ('BACKGROUND', (2, 0), (2, 0), colors.white),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(KeepTogether(bottom_table))

    # Build document with NumberedCanvas for automatic multi-page page numbering
    doc.build(story, canvasmaker=NumberedCanvas)
    return buf.getvalue()


def generate_ledger_statement_pdf(
    ledger,
    entries_data,
    company_id=1,
    from_date=None,
    to_date=None,
    summary_stats=None,
    payment_mode='ALL'
):
    """
    Generates a publication-grade, branded A4 PDF Statement of Account for any ledger.
    Matches the system's royal burgundy theme, company header, customer details, and KPI summary,
    while featuring the 10-column Tally ERP structure:
    Date | Particulars | Item Name | Full Qty | Empty Qty | Vch Type | Vch No. | Debit | Credit | Balance
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=25,
        rightMargin=25,
        topMargin=25,
        bottomMargin=28
    )

    company = None
    try:
        from core.models import Company
        company = Company.objects.filter(CompanyId=company_id).first() or Company.objects.first()
    except Exception:
        pass

    company_name = (company.Name if company and company.Name else "FUTURE GAS").strip()
    company_subtitle = "LPG Cylinders & Industrial Gas Solutions"
    addr_parts = [p.strip() for p in [company.AddressLine1 if company else '', company.AddressLine2 if company else '', company.AddressLine3 if company else ''] if p and p.strip()]
    company_address = ", ".join(addr_parts) if addr_parts else "Kuttyaddi, Kozhikode, Kerala"
    if company and company.Pincode:
        company_address += f" - {company.Pincode}"
    company_phone = company.Phone if company and company.Phone else "9876543210"
    company_email = company.Email if company and company.Email else "info@futuregas.com"
    company_contact = f"Ph: {company_phone} | Email: {company_email}"
    company_gstin = company.GstNo if company and company.GstNo else "32ABCDE1234F1Z5" 

    # Ledger Information
    ledger_name = getattr(ledger, 'LedgerName', '') or ''
    group_obj = getattr(ledger, 'Group', None)
    group_name = getattr(group_obj, 'GroupName', '') if group_obj else 'General Ledger'
    group_nature = getattr(group_obj, 'Nature', '') if group_obj else 'Asset'
    customer_code = getattr(ledger, 'CustomerCode', '') or ''
    ledger_phone = getattr(ledger, 'PhoneNumber', '') or getattr(ledger, 'MobileNumber', '') or '—'
    ledger_address = getattr(ledger, 'Address', '') or getattr(ledger, 'AddressLine1', '') or '—'
    ledger_gstin = getattr(ledger, 'GSTIN', '') or 'Unregistered Consumer'
    ledger_route = getattr(ledger.Route, 'RouteName', '') if getattr(ledger, 'Route', None) else 'Direct / All Routes'

    is_dr_normal = (group_nature or '').lower() in ('asset', 'expense')

    # Date Period Formatting
    period_text = "All Records to Date"
    def format_short_date(val):
        if not val or val == '—':
            return ''
        try:
            if isinstance(val, (date, datetime)):
                dt = val
            else:
                dt = datetime.strptime(str(val).split('T')[0], '%Y-%m-%d')
            day = dt.day
            month = dt.strftime('%b')
            year = dt.strftime('%y')
            return f"{day}-{month}-{year}"
        except Exception:
            return str(val)

    if from_date and to_date:
        period_text = f"{format_short_date(from_date)} to {format_short_date(to_date)}"
    elif from_date:
        period_text = f"From {format_short_date(from_date)}"
    elif to_date:
        period_text = f"Up to {format_short_date(to_date)}"

    # Effective Opening Balance & Totals
    effective_op = None
    tot_debit = Decimal('0.00')
    tot_credit = Decimal('0.00')
    closing_bal = Decimal('0.00')

    if summary_stats and isinstance(summary_stats, dict):
        if 'effectiveOpening' in summary_stats:
            effective_op = Decimal(str(summary_stats.get('effectiveOpening') or 0))
        if 'totDebit' in summary_stats:
            tot_debit = Decimal(str(summary_stats.get('totDebit') or 0))
        if 'totCredit' in summary_stats:
            tot_credit = Decimal(str(summary_stats.get('totCredit') or 0))
        if 'closingBal' in summary_stats:
            closing_bal = Decimal(str(summary_stats.get('closingBal') or 0))

    if effective_op is None:
        op_bal = Decimal(str(getattr(ledger, 'OpeningBalance', 0) or 0))
        op_type = (getattr(ledger, 'OpeningBalanceType', 'DR') or 'DR').upper()
        init_dr = op_bal if op_type == 'DR' else Decimal('0.00')
        init_cr = op_bal if op_type == 'CR' else Decimal('0.00')
        effective_op = (init_dr - init_cr) if is_dr_normal else (init_cr - init_dr)

    # Styles
    title_style = ParagraphStyle('StmtBrandT', fontName=FONT_BOLD, fontSize=16, leading=20, textColor=PRIMARY_COLOR)
    hdr_right = ParagraphStyle('StmtBrandR', fontName=FONT_BOLD, fontSize=13, leading=16, textColor=PRIMARY_COLOR, alignment=2)
    meta_style = ParagraphStyle('StmtBrandM', fontName=FONT_NAME, fontSize=7.5, leading=10.5, textColor=DARK_COLOR)
    meta_bold = ParagraphStyle('StmtBrandMB', fontName=FONT_BOLD, fontSize=8, leading=11, textColor=DARK_COLOR)

    th_left = ParagraphStyle('ThL2', fontName=FONT_BOLD, fontSize=7, leading=9, textColor=colors.white, alignment=0)
    th_center = ParagraphStyle('ThC2', fontName=FONT_BOLD, fontSize=7, leading=9, textColor=colors.white, alignment=1)
    th_right = ParagraphStyle('ThR2', fontName=FONT_BOLD, fontSize=7, leading=9, textColor=colors.white, alignment=2)

    td_left = ParagraphStyle('TdL2', fontName=FONT_NAME, fontSize=6.5, leading=8.5, textColor=DARK_COLOR, alignment=0)
    td_left_bold = ParagraphStyle('TdLb2', fontName=FONT_BOLD, fontSize=6.5, leading=8.5, textColor=DARK_COLOR, alignment=0)
    td_center = ParagraphStyle('TdC2', fontName=FONT_NAME, fontSize=6.5, leading=8.5, textColor=DARK_COLOR, alignment=1)
    td_right = ParagraphStyle('TdR2', fontName=FONT_NAME, fontSize=6.5, leading=8.5, textColor=DARK_COLOR, alignment=2)
    td_right_bold = ParagraphStyle('TdRb2', fontName=FONT_BOLD, fontSize=6.5, leading=8.5, textColor=DARK_COLOR, alignment=2)
    td_right_burg = ParagraphStyle('TdRBg2', fontName=FONT_BOLD, fontSize=7, leading=9, textColor=PRIMARY_COLOR, alignment=2)

    story = []

    # 1. BRAND HEADER
    header_data = [
        [
            Paragraph(
                f"<b>{html.escape(company_name)}</b><br/>"
                f"<font size=7 color='#64748B'>{html.escape(company_subtitle)}</font><br/>"
                f"<font size=7 color='#64748B'>{html.escape(company_address)}</font><br/>"
                f"<font size=7 color='#64748B'>{html.escape(company_contact)} | GSTIN: <b>{html.escape(company_gstin)}</b></font>",
                title_style
            ),
            Paragraph(
                f"<b>STATEMENT OF ACCOUNT</b><br/>"
                f"<font size=7.5 color='#64748B'>Ledger Analysis &amp; Cylinder Audit</font><br/>"
                f"<font size=7.5 color='#64748B'>Period: <b>{html.escape(period_text)}</b></font><br/>"
                f"<font size=6.5 color='#64748B'>Generated: {datetime.now().strftime('%d-%b-%Y %I:%M %p')}</font>",
                hdr_right
            )
        ]
    ]
    hdr_table = Table(header_data, colWidths=[330, 215])
    hdr_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(hdr_table)
    story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY_COLOR, spaceBefore=2, spaceAfter=8))

    # 2. PARTY INFORMATION & SUMMARY KPI CARDS
    ldg_display_name = f"{customer_code} - {ledger_name}" if customer_code else ledger_name
    op_suffix = 'Dr' if effective_op >= 0 else 'Cr'
    if not is_dr_normal:
        op_suffix = 'Cr' if effective_op >= 0 else 'Dr'

    cust_box_content = [
        Paragraph("<b>ACCOUNT / PARTY DETAILS:</b>", meta_bold),
        Paragraph(f"<b>{html.escape(ldg_display_name)}</b>", ParagraphStyle('CN2', parent=meta_bold, fontSize=10, textColor=PRIMARY_COLOR)),
        Paragraph(f"Group: <b>{html.escape(group_name)}</b> ({html.escape(group_nature)})", meta_style),
        Paragraph(f"Phone: <b>{html.escape(ledger_phone)}</b> | Route: {html.escape(ledger_route)}", meta_style),
        Paragraph(f"Address: {html.escape(ledger_address)}", meta_style),
        Paragraph(f"GSTIN / Tax ID: <b>{html.escape(ledger_gstin)}</b>", meta_style),
    ]

    calc_run_bal = effective_op
    calc_tot_dr = Decimal('0.00')
    calc_tot_cr = Decimal('0.00')

    raw_entries = list(entries_data or [])
    has_op_row = any(str(e.get('ref') or '') == 'OP-BAL' for e in raw_entries)

    if not has_op_row:
        d_val = abs(effective_op) if ((effective_op > 0 and is_dr_normal) or (effective_op < 0 and not is_dr_normal)) else Decimal('0.00')
        c_val = abs(effective_op) if ((effective_op > 0 and not is_dr_normal) or (effective_op < 0 and is_dr_normal)) else Decimal('0.00')
        raw_entries.insert(0, {
            'date': from_date or '—',
            'ref': 'OP-BAL',
            'voucher_type': '',
            'particulars': 'To Opening Balance' if is_dr_normal else 'By Opening Balance',
            'item_name': '',
            'full_qty': None,
            'empty_qty': None,
            'debit': d_val,
            'credit': c_val,
            'runningBalance': effective_op,
        })

    for idx, e in enumerate(raw_entries):
        d = Decimal(str(e.get('debit', 0) or 0))
        c = Decimal(str(e.get('credit', 0) or 0))
        if str(e.get('ref') or '') != 'OP-BAL':
            calc_tot_dr += d
            calc_tot_cr += c
            if is_dr_normal:
                calc_run_bal += (d - c)
            else:
                calc_run_bal += (c - d)

    if not summary_stats:
        tot_debit = calc_tot_dr
        tot_credit = calc_tot_cr
        closing_bal = calc_run_bal

    # Calculate cylinder-only filled and empty totals for PERIOD TOTALS
    tot_full_qty = 0
    tot_empty_qty = 0

    if summary_stats and isinstance(summary_stats, dict):
        if 'totFullQty' in summary_stats and summary_stats.get('totFullQty') is not None:
            try:
                tot_full_qty = int(summary_stats['totFullQty'])
            except Exception:
                pass
        if 'totEmptyQty' in summary_stats and summary_stats.get('totEmptyQty') is not None:
            try:
                tot_empty_qty = int(summary_stats['totEmptyQty'])
            except Exception:
                pass

    def _is_cyl_row(e):
        if e.get('is_cylinder') is not None:
            return bool(e.get('is_cylinder'))
        item_raw = str(e.get('item_name') or '').upper()
        if not item_raw or item_raw == '—':
            return False
        if any(x in item_raw for x in ['REGULAT', 'PIPE', 'STOVE', 'BURNER', 'HOSE', 'SERVICE', 'OTHER']):
            return False
        return any(k in item_raw for k in ['04KG', '12KG', '17KG', '19KG', '47.5KG', '5KG', 'CYLINDER', 'LPG', 'KG'])

    if tot_full_qty == 0 and tot_empty_qty == 0:
        for e in raw_entries:
            if str(e.get('ref') or '') != 'OP-BAL' and _is_cyl_row(e):
                fq = e.get('full_qty')
                eq = e.get('empty_qty')
                if fq is not None and str(fq) != '' and str(fq) != '—':
                    try:
                        tot_full_qty += int(float(str(fq)))
                    except Exception:
                        pass
                if eq is not None and str(eq) != '' and str(eq) != '—':
                    try:
                        tot_empty_qty += int(float(str(eq)))
                    except Exception:
                        pass

    final_close_sfx = 'Dr' if closing_bal >= 0 else 'Cr'
    if not is_dr_normal:
        final_close_sfx = 'Cr' if closing_bal >= 0 else 'Dr'

    kpi_box_content = [
        Paragraph("<b>ACCOUNT SUMMARY &amp; BALANCE:</b>", meta_bold),
        Paragraph(f"Opening Balance: <b>Rs. {abs(effective_op):,.2f} {op_suffix}</b>", meta_style),
        Paragraph(f"Total Debits: <b>Rs. {tot_debit:,.2f}</b>", meta_style),
        Paragraph(f"Total Credits: <b>Rs. {tot_credit:,.2f}</b>", meta_style),
        Spacer(1, 2),
        Paragraph(
            f"Closing Balance: <font size=10 color='#800020'><b>Rs. {abs(closing_bal):,.2f} {final_close_sfx}</b></font>",
            meta_bold
        ),
    ]

    top_grid = Table([[cust_box_content, kpi_box_content]], colWidths=[320, 225])
    top_grid.setStyle(TableStyle([
        ('BOX', (0, 0), (0, 0), 0.5, BORDER_COLOR),
        ('BOX', (1, 0), (1, 0), 0.5, PRIMARY_COLOR),
        ('BACKGROUND', (0, 0), (0, 0), LIGHT_BG),
        ('BACKGROUND', (1, 0), (1, 0), CARD_BG),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 7),
        ('RIGHTPADDING', (0, 0), (-1, -1), 7),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(top_grid)
    story.append(Spacer(1, 8))

    # 3. 10-COLUMN STATEMENT TABLE (Sum = 545pt)
    # Widths: [46, 92, 74, 34, 38, 42, 46, 54, 54, 65] = 545pt
    col_widths = [46, 92, 74, 34, 38, 42, 46, 54, 54, 65]

    table_rows = [
        [
            Paragraph("<b>DATE</b>", th_left),
            Paragraph("<b>PARTICULARS</b>", th_left),
            Paragraph("<b>ITEM NAME</b>", th_left),
            Paragraph("<b>FULL QTY</b>", th_center),
            Paragraph("<b>EMPTY QTY</b>", th_center),
            Paragraph("<b>VCH TYPE</b>", th_left),
            Paragraph("<b>VCH NO.</b>", th_left),
            Paragraph("<b>DEBIT</b>", th_right),
            Paragraph("<b>CREDIT</b>", th_right),
            Paragraph("<b>BALANCE</b>", th_right),
        ]
    ]

    running_track = effective_op

    for idx, e in enumerate(raw_entries):
        date_raw = str(e.get('date') or '—')
        date_disp = format_short_date(date_raw)
        vtype_str = str(e.get('voucher_type') or e.get('type') or '')
        ref_raw = str(e.get('vch_no') or e.get('ref') or '—')
        if vtype_str.lower() == 'sales':
            ref_str = ref_raw if ref_raw.startswith('INV-') else f"INV-{ref_raw.replace('SALE-', '')}"
        elif vtype_str.lower() == 'receipt':
            clean_rec = ref_raw.replace('REC-VCH-', 'REC-')
            if 'INV-' in clean_rec:
                clean_rec = f"REC-{clean_rec.replace('REC-', '').replace('INV-', '')}"
            if clean_rec.startswith('REC-'):
                ref_str = clean_rec
            elif clean_rec != '—':
                ref_str = f"REC-{clean_rec.replace('INV-', '').replace('PAY-', '')}"
            else:
                ref_str = '—'
        else:
            ref_str = ref_raw
        part_str = str(e.get('particulars') or '—')
        raw_item_str = str(e.get('item_name') or '')
        item_str = raw_item_str.replace('LPG ', '').replace(' GAS CYLINDER', '').replace(' CYLINDER', '').strip()
        full_q = e.get('full_qty')
        empty_q = e.get('empty_qty')

        full_q_str = str(full_q) if full_q is not None and str(full_q) != '0' and str(full_q) != '' else ''
        empty_q_str = str(empty_q) if empty_q is not None and str(empty_q) != '0' and str(empty_q) != '' else ''

        d = Decimal(str(e.get('debit', 0) or 0))
        c = Decimal(str(e.get('credit', 0) or 0))

        is_op = str(e.get('ref') or '') == 'OP-BAL'
        if is_op:
            run_bal = effective_op
            ref_str = ''
            vtype_str = ''
            d_str = f"{abs(effective_op):,.2f}" if ((effective_op > 0 and is_dr_normal) or (effective_op < 0 and not is_dr_normal)) else ""
            c_str = f"{abs(effective_op):,.2f}" if ((effective_op > 0 and not is_dr_normal) or (effective_op < 0 and is_dr_normal)) else ""
        else:
            if 'runningBalance' in e and e.get('runningBalance') is not None:
                run_bal = Decimal(str(e.get('runningBalance') or 0))
            else:
                running_track += (d - c) if is_dr_normal else (c - d)
                run_bal = running_track
            d_str = f"{d:,.2f}" if d > 0 else ""
            c_str = f"{c:,.2f}" if c > 0 else ""

        bal_sfx = 'Dr' if run_bal >= 0 else 'Cr'
        if not is_dr_normal:
            bal_sfx = 'Cr' if run_bal >= 0 else 'Dr'
        bal_str = f"{abs(run_bal):,.2f} {bal_sfx}"

        is_bold_part = is_op or part_str.startswith('To')
        table_rows.append([
            Paragraph(html.escape(date_disp), td_left),
            Paragraph(html.escape(part_str), td_left_bold if is_bold_part else td_left),
            Paragraph(html.escape(item_str), td_left),
            Paragraph(html.escape(full_q_str), td_center),
            Paragraph(html.escape(empty_q_str), td_center),
            Paragraph(html.escape(vtype_str), td_left),
            Paragraph(html.escape(ref_str), td_left_bold if ref_str else td_left),
            Paragraph(d_str, td_right),
            Paragraph(c_str, td_right),
            Paragraph(bal_str, td_right_bold),
        ])

    full_tot_str = f"<b>{tot_full_qty}</b>" if tot_full_qty > 0 else ""
    empty_tot_str = f"<b>{tot_empty_qty}</b>" if tot_empty_qty > 0 else ""

    # Summary Row 1: Period Turnover Totals
    table_rows.append([
        Paragraph("<b>PERIOD TOTALS</b>", td_left_bold),
        Paragraph("", td_left),
        Paragraph("", td_left),
        Paragraph(full_tot_str, td_center),
        Paragraph(empty_tot_str, td_center),
        Paragraph("", td_left),
        Paragraph("", td_left),
        Paragraph(f"<b>Rs. {tot_debit:,.2f}</b>", td_right_bold),
        Paragraph(f"<b>Rs. {tot_credit:,.2f}</b>", td_right_bold),
        Paragraph("", td_right),
    ])

    # Summary Row 2: Closing Balance
    close_amt_str = f"Rs. {abs(closing_bal):,.2f} {final_close_sfx}"
    table_rows.append([
        Paragraph("<b>CLOSING BALANCE</b>", td_left_bold),
        Paragraph("", td_left),
        Paragraph("", td_left),
        Paragraph("", td_center),
        Paragraph("", td_center),
        Paragraph("", td_left),
        Paragraph("", td_left),
        Paragraph("", td_right),
        Paragraph("", td_right),
        Paragraph(f"<b>{close_amt_str}</b>", td_right_burg),
    ])

    stmt_table = Table(table_rows, colWidths=col_widths, repeatRows=1)
    n_rows = len(table_rows)

    t_style = [
        # Table Header Styling: Signature Royal Burgundy background with white bold headers
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        # Period Totals Row Styling: span cols 0..2 for label, leave col 3 (FULL QTY) and col 4 (EMPTY QTY) open, span cols 5..6
        ('SPAN', (0, n_rows - 2), (2, n_rows - 2)),
        ('SPAN', (5, n_rows - 2), (6, n_rows - 2)),
        ('BACKGROUND', (0, n_rows - 2), (-1, n_rows - 2), colors.HexColor('#F1F5F9')),
        ('LINEABOVE', (0, n_rows - 2), (-1, n_rows - 2), 1, PRIMARY_COLOR),
        # Closing Balance Row Styling: span cols 0..8 for label, leave col 9 (BALANCE) open
        ('SPAN', (0, n_rows - 1), (8, n_rows - 1)),
        ('BACKGROUND', (0, n_rows - 1), (-1, n_rows - 1), LIGHT_BG),
        ('LINEBELOW', (0, n_rows - 1), (-1, n_rows - 1), 1.5, PRIMARY_COLOR),
    ]

    # Alternating row colors for data rows
    for r_idx in range(1, n_rows - 2):
        if r_idx % 2 == 0:
            t_style.append(('BACKGROUND', (0, r_idx), (-1, r_idx), colors.HexColor('#F8FAFC')))

    stmt_table.setStyle(TableStyle(t_style))
    story.append(stmt_table)

    # 1. Note immediately below the main transaction table
    story.append(Spacer(1, 3))
    story.append(Paragraph(
        "<font size=6.5 color='#64748B'><b>* Note:</b> The <b>FULL QTY</b> and <b>EMPTY QTY</b> totals above reflect cylinder quantities only. Non-cylinder products are excluded from the cylinder total counts.</font>",
        td_left
    ))
    story.append(Spacer(1, 8))

    # 2. Product & Cylinder Delivery Summary (Left) + Account Financial Audit Card (Right)
    from collections import defaultdict
    cyl_summary = defaultdict(lambda: {'full': 0, 'empty': 0})
    other_summary = defaultdict(int)

    def _get_cyl_display_label(raw_name):
        clean = raw_name.replace('LPG ', '').replace(' GAS CYLINDER', '').replace(' CYLINDER', '').strip()
        if '04' in clean or '4KG' in clean or clean == '4':
            return '04KG'
        elif '12' in clean:
            return '12KG'
        elif '17' in clean:
            return '17KG'
        elif '19' in clean:
            return '19KG'
        elif '47.5' in clean:
            return '47.5KG'
        elif '5KG' in clean or clean == '5':
            return '5KG'
        elif '14.2' in clean:
            return '14.2KG'
        elif clean:
            return clean
        return 'CYLINDER'

    for e in raw_entries:
        if str(e.get('ref') or '') == 'OP-BAL':
            continue
        v_type = str(e.get('voucher_type') or e.get('type') or '').lower()
        if v_type != 'sales' and v_type != 'sale':
            continue

        is_cyl = _is_cyl_row(e)
        raw_name = str(e.get('item_name') or '').strip()
        if not raw_name or raw_name == '—':
            continue

        if is_cyl:
            ckey = _get_cyl_display_label(raw_name)
            fq = e.get('full_qty')
            eq = e.get('empty_qty')
            f_val = int(float(str(fq))) if fq is not None and str(fq) != '' and str(fq) != '—' else 0
            e_val = int(float(str(eq))) if eq is not None and str(eq) != '' and str(eq) != '—' else 0
            if f_val > 0 or e_val > 0:
                cyl_summary[ckey]['full'] += f_val
                cyl_summary[ckey]['empty'] += e_val
        else:
            q_val = e.get('qty') or e.get('full_qty') or 1
            try:
                q_num = int(float(str(q_val)))
            except Exception:
                q_num = 1
            other_summary[raw_name] += q_num

    th_sm_l = ParagraphStyle('ThSmL', fontName=FONT_BOLD, fontSize=7, leading=9, textColor=colors.white, alignment=0)
    th_sm_c = ParagraphStyle('ThSmC', fontName=FONT_BOLD, fontSize=7, leading=9, textColor=colors.white, alignment=1)
    td_sm_l = ParagraphStyle('TdSmL', fontName=FONT_NAME, fontSize=6.5, leading=8.5, textColor=DARK_COLOR, alignment=0)
    td_sm_lb = ParagraphStyle('TdSmLb', fontName=FONT_BOLD, fontSize=6.5, leading=8.5, textColor=DARK_COLOR, alignment=0)
    td_sm_c = ParagraphStyle('TdSmC', fontName=FONT_NAME, fontSize=6.5, leading=8.5, textColor=DARK_COLOR, alignment=1)
    td_sm_cb = ParagraphStyle('TdSmCb', fontName=FONT_BOLD, fontSize=6.5, leading=8.5, textColor=DARK_COLOR, alignment=1)
    sm_subhdr = ParagraphStyle('SmSubH', fontName=FONT_BOLD, fontSize=7, leading=9, textColor=PRIMARY_COLOR, alignment=0)

    sm_rows = [
        [
            Paragraph("<b>PRODUCT</b>", th_sm_l),
            Paragraph("<b>FILLED QTY</b>", th_sm_c),
            Paragraph("<b>EMPTY QTY</b>", th_sm_c),
        ],
        [
            Paragraph("<b>CYLINDERS</b>", sm_subhdr),
            Paragraph("", sm_subhdr),
            Paragraph("", sm_subhdr),
        ]
    ]
    sm_styles = [
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 2.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('SPAN', (0, 1), (2, 1)),
        ('BACKGROUND', (0, 1), (2, 1), colors.HexColor('#FDF2F4')),
    ]

    tot_sm_full = 0
    tot_sm_empty = 0

    sorted_cyl_keys = sorted(cyl_summary.keys(), key=lambda x: (int(re.search(r'\d+', x).group()) if re.search(r'\d+', x) else 999, x))
    for c_key in sorted_cyl_keys:
        c_vals = cyl_summary[c_key]
        f_q = c_vals['full']
        e_q = c_vals['empty']
        tot_sm_full += f_q
        tot_sm_empty += e_q
        sm_rows.append([
            Paragraph(html.escape(c_key), td_sm_lb),
            Paragraph(str(f_q), td_sm_c),
            Paragraph(str(e_q), td_sm_c),
        ])

    if not sorted_cyl_keys:
        sm_rows.append([
            Paragraph("No cylinder deliveries in period", td_sm_l),
            Paragraph("0", td_sm_c),
            Paragraph("0", td_sm_c),
        ])

    cyl_tot_row_idx = len(sm_rows)
    sm_rows.append([
        Paragraph("<b>TOTAL CYLINDERS</b>", td_sm_lb),
        Paragraph(f"<b>{tot_sm_full}</b>", td_sm_cb),
        Paragraph(f"<b>{tot_sm_empty}</b>", td_sm_cb),
    ])
    sm_styles.extend([
        ('BACKGROUND', (0, cyl_tot_row_idx), (-1, cyl_tot_row_idx), colors.HexColor('#F1F5F9')),
        ('LINEABOVE', (0, cyl_tot_row_idx), (-1, cyl_tot_row_idx), 1, PRIMARY_COLOR),
    ])

    if other_summary:
        oth_hdr_idx = len(sm_rows)
        sm_rows.append([
            Paragraph("<b>OTHER PRODUCTS</b>", sm_subhdr),
            Paragraph("", sm_subhdr),
            Paragraph("", sm_subhdr),
        ])
        sm_styles.extend([
            ('SPAN', (0, oth_hdr_idx), (2, oth_hdr_idx)),
            ('BACKGROUND', (0, oth_hdr_idx), (2, oth_hdr_idx), colors.HexColor('#FDF2F4')),
        ])
        for p_name, p_qty in sorted(other_summary.items()):
            row_idx = len(sm_rows)
            sm_rows.append([
                Paragraph(html.escape(p_name), td_sm_l),
                Paragraph(f"<b>{p_qty} Nos</b>", td_sm_cb),
                Paragraph("", td_sm_c),
            ])
            sm_styles.append(('SPAN', (1, row_idx), (2, row_idx)))

    sm_table = Table(sm_rows, colWidths=[135, 70, 70])
    sm_table.setStyle(TableStyle(sm_styles))

    # Right T-Balance Account Summary Container Card
    th_r_l = ParagraphStyle('ThRL', fontName=FONT_BOLD, fontSize=7.5, leading=9.5, textColor=PRIMARY_COLOR, alignment=0)
    th_r_r = ParagraphStyle('ThRR', fontName=FONT_BOLD, fontSize=7.5, leading=9.5, textColor=PRIMARY_COLOR, alignment=2)
    td_r_l = ParagraphStyle('TdRL', fontName=FONT_NAME, fontSize=7, leading=9, textColor=DARK_COLOR, alignment=0)
    td_r_lb = ParagraphStyle('TdRLb', fontName=FONT_BOLD, fontSize=7, leading=9, textColor=DARK_COLOR, alignment=0)
    td_r_r = ParagraphStyle('TdRR', fontName=FONT_NAME, fontSize=7, leading=9, textColor=DARK_COLOR, alignment=2)
    td_r_rb = ParagraphStyle('TdRRb', fontName=FONT_BOLD, fontSize=7.5, leading=9.5, textColor=PRIMARY_COLOR, alignment=2)

    op_is_dr = (effective_op >= 0 if is_dr_normal else effective_op < 0)
    op_dr = abs(effective_op) if op_is_dr else Decimal('0.00')
    op_cr = abs(effective_op) if not op_is_dr else Decimal('0.00')
    tx_dr = tot_debit
    tx_cr = tot_credit

    tot_dr_side = op_dr + tx_dr
    tot_cr_side = op_cr + tx_cr

    if tot_dr_side >= tot_cr_side:
        close_dr = Decimal('0.00')
        close_cr = tot_dr_side - tot_cr_side
        final_balanced_sum = tot_dr_side
    else:
        close_dr = tot_cr_side - tot_dr_side
        close_cr = Decimal('0.00')
        final_balanced_sum = tot_cr_side

    r_rows = [
        [
            Paragraph("<b>Particulars</b>", th_r_l),
            Paragraph("<b>Debit</b>", th_r_r),
            Paragraph("<b>Credit</b>", th_r_r),
        ],
        [
            Paragraph("Opening Balance", td_r_lb),
            Paragraph(f"{op_dr:,.2f}" if (op_dr > 0 or (op_dr == 0 and op_is_dr)) else "", td_r_r),
            Paragraph(f"{op_cr:,.2f}" if (op_cr > 0 or (op_cr == 0 and not op_is_dr)) else "", td_r_r),
        ],
        [
            Paragraph("", td_r_l),
            Paragraph(f"{tx_dr:,.2f}" if tx_dr > 0 else "", td_r_r),
            Paragraph(f"{tx_cr:,.2f}" if tx_cr > 0 else "", td_r_r),
        ],
        [
            Paragraph("Closing Balance", td_r_lb),
            Paragraph(f"{close_dr:,.2f}" if close_dr > 0 else "", td_r_r),
            Paragraph(f"{close_cr:,.2f}" if close_cr > 0 else "", td_r_r),
        ],
        [
            Paragraph("", td_r_l),
            Paragraph(f"<b>{final_balanced_sum:,.2f}</b>", td_r_rb),
            Paragraph(f"<b>{final_balanced_sum:,.2f}</b>", td_r_rb),
        ],
    ]

    r_style = [
        ('BOX', (0, 0), (-1, -1), 0.75, PRIMARY_COLOR),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#FDF2F4')),
        ('BACKGROUND', (0, 1), (-1, 3), colors.HexColor('#FFFFFF')),
        ('BACKGROUND', (0, 4), (-1, 4), colors.HexColor('#FFF8F9')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('LINEBELOW', (0, 0), (-1, 0), 0.5, colors.HexColor('#E2E8F0')),
        ('LINEABOVE', (0, 4), (-1, 4), 0.5, PRIMARY_COLOR),
    ]

    r_table = Table(r_rows, colWidths=[130, 70, 70])
    r_table.setStyle(TableStyle(r_style))

    # Section Banner Header
    gen_time_str = datetime.now().strftime('%d-%b-%Y %I:%M %p')
    rep_title = ParagraphStyle('RepT', fontName=FONT_BOLD, fontSize=8, leading=10, textColor=PRIMARY_COLOR, alignment=0)
    rep_meta = ParagraphStyle('RepM', fontName=FONT_NAME, fontSize=6.5, leading=8.5, textColor=DARK_COLOR, alignment=2)
    rep_hdr_table = Table([
        [
            Paragraph("<b>REPORT SUMMARY</b>", rep_title),
            Paragraph(f"Period: <b>{html.escape(period_text)}</b> &nbsp;|&nbsp; Generated: <b>{gen_time_str}</b>", rep_meta)
        ]
    ], colWidths=[180, 365])
    rep_hdr_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'BOTTOM'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
    ]))

    story.append(rep_hdr_table)
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY_COLOR, spaceBefore=2, spaceAfter=5))

    summary_grid = Table([[sm_table, r_table]], colWidths=[275, 270])
    summary_grid.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))

    story.append(summary_grid)
    story.append(Spacer(1, 10))

    # 4. FOOTER NOTE & SIGNATURE
    footer_data = [
        [
            Paragraph(
                "<b>Important Note:</b> This statement of account reflects all double-entry sales, cylinder quantities, "
                "recorded receipts, and running account balances. For any reconciliation or queries, please contact accounts within 7 days.<br/>"
                f"<font size=6.5 color='#64748B'>Thank you for your valued partnership with {html.escape(company_name)}.</font>",
                meta_style
            ),
            Paragraph(
                f"For <b>{html.escape(company_name)}</b><br/><br/><br/>"
                "<b>Authorized Signatory</b><br/>"
                "<font size=6.5 color='#64748B'>Accounts &amp; Audit Department</font>",
                ParagraphStyle('SigR3', parent=meta_style, alignment=2)
            )
        ]
    ]
    footer_table = Table(footer_data, colWidths=[320, 225])
    footer_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'BOTTOM'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(footer_table)

    doc.build(story, canvasmaker=NumberedCanvas)
    return buf.getvalue()


def generate_route_trip_sheet_pdf(route, details_data, company_id=1):
    """
    Generates a clean, professional Daily Route Trip Sheet PDF for a van distribution route.
    Details vehicle, driver, allocated cylinder stock, sales count, collections, expenses, and net cash.
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=25,
        rightMargin=25,
        topMargin=25,
        bottomMargin=32
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

    route_name = getattr(route, 'RouteName', '') if route else ''
    veh_data = details_data.get('vehicle', {}) if details_data else {}
    drv_data = details_data.get('driver', {}) if details_data else {}
    veh_num = veh_data.get('vehicle_number', 'Not Assigned')
    drv_name = drv_data.get('name', 'Not Assigned')
    status_str = str(details_data.get('status', 'idle')).upper()

    stock = details_data.get('stock', {}) if details_data else {}
    collection = details_data.get('collection', {}) if details_data else {}
    expense = details_data.get('expense', {}) if details_data else {}
    products = details_data.get('products', []) if details_data else []

    title_company = ParagraphStyle('RTSCompT', fontName=FONT_BOLD, fontSize=16, leading=20, textColor=PRIMARY_COLOR)
    hdr_right_title = ParagraphStyle('RTSHdrR', fontName=FONT_BOLD, fontSize=14, leading=18, textColor=PRIMARY_COLOR, alignment=2)
    box_label = ParagraphStyle('RTSBxLbl', fontName=FONT_BOLD, fontSize=7.5, leading=9.5, textColor=MUTED_COLOR)
    box_val_title = ParagraphStyle('RTSBxValT', fontName=FONT_BOLD, fontSize=11, leading=14, textColor=PRIMARY_COLOR)
    box_text = ParagraphStyle('RTSBxTxt', fontName=FONT_NAME, fontSize=8, leading=11, textColor=DARK_COLOR)
    box_text_bold = ParagraphStyle('RTSBxTxtB', fontName=FONT_BOLD, fontSize=8, leading=11, textColor=DARK_COLOR)

    cell_norm = ParagraphStyle('RTSCell', fontName=FONT_NAME, fontSize=7.5, leading=9.5, textColor=DARK_COLOR)
    cell_bold = ParagraphStyle('RTSCellB', fontName=FONT_BOLD, fontSize=7.5, leading=9.5, textColor=DARK_COLOR)
    cell_right = ParagraphStyle('RTSCellR', fontName=FONT_NAME, fontSize=7.5, leading=9.5, textColor=DARK_COLOR, alignment=2)
    cell_right_bold = ParagraphStyle('RTSCellRB', fontName=FONT_BOLD, fontSize=7.5, leading=9.5, textColor=DARK_COLOR, alignment=2)
    cell_right_burg = ParagraphStyle('RTSCellRBurg', fontName=FONT_BOLD, fontSize=8, leading=10, textColor=PRIMARY_COLOR, alignment=2)

    story = []

    # 1. Header
    header_data = [
        [
            Paragraph(
                f"<b>{html.escape(company_name)}</b><br/>"
                f"<font size=7 color='#64748B'>{html.escape(company_subtitle)}</font><br/>"
                f"<font size=7 color='#64748B'>{html.escape(company_address)}</font><br/>"
                f"<font size=7 color='#64748B'>{html.escape(company_contact)} | GSTIN: <b>{html.escape(company_gstin)}</b></font>",
                title_company
            ),
            Paragraph(
                f"<b>ROUTE TRIP SHEET</b><br/>"
                f"<font size=8 color='#64748B'>Daily Distribution &amp; Settlement</font><br/>"
                f"<font size=7.5 color='#64748B'>Route: <b>{html.escape(route_name.upper())}</b></font><br/>"
                f"<font size=7 color='#64748B'>Date: {datetime.now().strftime('%d-%b-%Y %I:%M %p')}</font>",
                hdr_right_title
            )
        ]
    ]
    hdr_table = Table(header_data, colWidths=[320, 225])
    hdr_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(hdr_table)
    story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY_COLOR, spaceBefore=2, spaceAfter=8))

    # 2. Operational Information Grid
    left_box = [
        Paragraph("ROUTE &amp; CREW ASSIGNMENT", box_label),
        Spacer(1, 2),
        Paragraph(f"<b>Route: {html.escape(route_name)}</b>", box_val_title),
        Paragraph(f"Vehicle: <b>{html.escape(veh_num)}</b>", box_text),
        Paragraph(f"Driver: <b>{html.escape(drv_name)}</b>", box_text),
        Paragraph(f"Status: <b>{html.escape(status_str)}</b>", box_text),
    ]

    tot_coll = Decimal(str(collection.get('total_collection', 0) or 0))
    cash_coll = Decimal(str(collection.get('cash_collection', 0) or 0))
    tot_exp = Decimal(str(expense.get('total_expense', 0) or 0))
    net_cash = Decimal(str(expense.get('net_cash', 0) or 0))

    right_box = [
        Paragraph("FINANCIAL SETTLEMENT", box_label),
        Spacer(1, 2),
        Paragraph(f"Total Collections: <b>Rs. {tot_coll:,.2f}</b> (Cash: Rs. {cash_coll:,.2f})", box_text),
        Paragraph(f"Total Expenses: <b>Rs. {tot_exp:,.2f}</b>", box_text),
        Spacer(1, 4),
        Paragraph("NET CASH TO HAND OVER", box_label),
        Paragraph(f"<font size=11 color='#800020'><b>Rs. {net_cash:,.2f}</b></font>", box_text_bold),
    ]

    top_grid = Table([[left_box, right_box]], colWidths=[310, 235])
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

    # 3. Product Breakdown Table
    col_widths = [165, 80, 75, 75, 75, 75]
    table_rows = [
        [
            Paragraph("<b>PRODUCT NAME</b>", cell_bold),
            Paragraph("<b>ALLOCATED</b>", cell_right_bold),
            Paragraph("<b>DELIVERED</b>", cell_right_bold),
            Paragraph("<b>BALANCE</b>", cell_right_bold),
            Paragraph("<b>EMPTY RET.</b>", cell_right_bold),
            Paragraph("<b>TOTAL ON VAN</b>", cell_right_bold),
        ]
    ]

    tot_alloc = 0
    tot_deliv = 0
    tot_bal = 0
    tot_empty = 0
    tot_van = 0

    for p in products:
        p_name = p.get('ProductName', '')
        p_code = p.get('ProductCode', '')
        if p_code and p_code != '—':
            p_display = f"<b>{html.escape(p_name)}</b> <font size=6 color='#64748B'>({html.escape(p_code)})</font>"
        else:
            p_display = f"<b>{html.escape(p_name)}</b>"

        alloc = int(p.get('AllocatedQty', 0) or 0)
        deliv = int(p.get('DeliveredQty', 0) or 0)
        bal = int(p.get('BalanceQty', 0) or 0)
        emp = int(p.get('EmptyQty', 0) or 0)
        qty = int(p.get('Qty', 0) or (bal + emp))

        tot_alloc += alloc
        tot_deliv += deliv
        tot_bal += bal
        tot_empty += emp
        tot_van += qty

        table_rows.append([
            Paragraph(p_display, cell_norm),
            Paragraph(str(alloc), cell_right),
            Paragraph(str(deliv), cell_right),
            Paragraph(str(bal), cell_right),
            Paragraph(str(emp), cell_right),
            Paragraph(str(qty), cell_right_bold),
        ])

    table_rows.append([
        Paragraph("<b>TOTAL CYLINDERS &amp; ITEMS</b>", cell_bold),
        Paragraph(f"<b>{tot_alloc}</b>", cell_right_bold),
        Paragraph(f"<b>{tot_deliv}</b>", cell_right_bold),
        Paragraph(f"<b>{tot_bal}</b>", cell_right_bold),
        Paragraph(f"<b>{tot_empty}</b>", cell_right_bold),
        Paragraph(f"<b>{tot_van}</b>", cell_right_burg),
    ])

    prod_table = Table(table_rows, colWidths=col_widths, repeatRows=1)
    t_style = [
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#FDF2F4')),
        ('LINEABOVE', (0, -1), (-1, -1), 1.2, PRIMARY_COLOR),
        ('LINEBELOW', (0, -1), (-1, -1), 1.5, PRIMARY_COLOR),
        ('TOPPADDING', (0, -1), (-1, -1), 5),
        ('BOTTOMPADDING', (0, -1), (-1, -1), 5),
    ]

    for i in range(1, len(products) + 1):
        if i % 2 == 0:
            t_style.append(('BACKGROUND', (0, i), (-1, i), colors.HexColor('#F8FAFC')))

    prod_table.setStyle(TableStyle(t_style))
    story.append(prod_table)
    story.append(Spacer(1, 14))

    # 4. Signatures
    sig_data = [
        [
            Paragraph("<b>Driver Signature:</b> ___________________", cell_norm),
            Paragraph("<b>Verified By (Dispatcher):</b> ___________________", cell_norm),
            Paragraph("<b>Accounts Signatory:</b> ___________________", cell_right),
        ]
    ]
    sig_table = Table(sig_data, colWidths=[180, 185, 180])
    sig_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(KeepTogether(sig_table))

    doc.build(story, canvasmaker=NumberedCanvas)
    return buf.getvalue()

