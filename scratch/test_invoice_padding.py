import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Sales
from core.invoice_generator import generate_tax_invoice_pdf
from pypdf import PdfReader
import io

sale = Sales.objects.first()

code = open('core/invoice_generator.py', 'r', encoding='utf-8').read()
replacement = """    min_rows = 10
    current_count = len(table_rows) - 1
    for empty_idx in range(current_count + 1, min_rows + 1):
        table_rows.append([
            Paragraph(f"<font color='#CBD5E1'>{empty_idx}</font>", ParagraphStyle('C1E', parent=cell_muted, alignment=1)),
            Paragraph("&nbsp;", cell_norm),
            Paragraph("&nbsp;", cell_norm),
            Paragraph("&nbsp;", cell_norm),
            Paragraph("&nbsp;", cell_norm),
            Paragraph("&nbsp;", cell_norm),
        ])
    items_table = Table(table_rows, colWidths=col_widths)"""

code_test = code.replace('items_table = Table(table_rows, colWidths=col_widths)', replacement)
with open('scratch/temp_invoice_gen.py', 'w', encoding='utf-8') as f:
    f.write(code_test)

from scratch.temp_invoice_gen import generate_tax_invoice_pdf as gen_test
pdf_bytes = gen_test(sale)
reader = PdfReader(io.BytesIO(pdf_bytes))
print('Page count with 10 rows:', len(reader.pages))
os.remove('scratch/temp_invoice_gen.py')

