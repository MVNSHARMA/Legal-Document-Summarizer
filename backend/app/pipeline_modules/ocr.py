from typing import List

from pdf2image import convert_from_bytes
import pytesseract


def extract_text_with_ocr(file_bytes: bytes) -> str:
    """
    Perform OCR on each page of the PDF and return combined text.

    This is a generic implementation using Tesseract. In production you may want
    to configure language packs and Tesseract path explicitly for your OS.
    """
    pages: List[str] = []
    images = convert_from_bytes(file_bytes)

    for img in images:
        text = pytesseract.image_to_string(img)
        pages.append(text)

    return "\n\n".join(pages).strip()


