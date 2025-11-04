import requests
from io import BytesIO
from PyPDF2 import PdfReader

def extract_text_from_pdf(pdf_url: str) -> str:
    try:
        response = requests.get(pdf_url)
        response.raise_for_status()
        pdf_data = BytesIO(response.content)
        reader = PdfReader(pdf_data)

        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return text[:15000]
    except Exception as e:
        print(f"Error reading PDF: {e}")
        return ""
