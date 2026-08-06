import pdfplumber
import pprint

PDF_PATH = "/home/i4yush/.gemini/antigravity-ide/brain/59f94748-6ff5-4292-9b12-697be00cb90d/media__1786048729757.pdf"

with pdfplumber.open(PDF_PATH) as pdf:
    first_page = pdf.pages[0]
    table = first_page.extract_table()
    if table:
        print("TABLE FOUND!")
        pprint.pprint(table[:5])
    else:
        print("NO TABLE DETECTED. Trying to extract text...")
        print(first_page.extract_text()[:500])
