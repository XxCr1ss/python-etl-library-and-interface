"""Generate a real BIFF8/OLE XLS from synthetic frontend sales (xlwt is dev-only)."""
import csv
from pathlib import Path

import xlwt

root = Path(__file__).resolve().parents[3]
book = xlwt.Workbook()
sheet = book.add_sheet("ventas")
with (root / "frontend/src/tests/fixtures/sample_sales.csv").open(encoding="utf-8", newline="") as file:
    for row_index, row in enumerate(csv.reader(file)):
        for column_index, value in enumerate(row):
            if row_index and column_index < 3:
                value = int(value)
            elif row_index and column_index == 4:
                value = value == "true"
            sheet.write(row_index, column_index, value)
book.save(str(Path(__file__).with_name("sales.xls")))
