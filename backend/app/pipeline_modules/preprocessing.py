import re
from collections import Counter
from typing import List


def _remove_boilerplate_lines(lines: List[str], min_repetitions: int = 3) -> List[str]:
    """
    Remove lines that repeat too often across the document – typical of headers/footers.
    """
    counter = Counter(line.strip() for line in lines if line.strip())
    boilerplate = {line for line, cnt in counter.items() if cnt >= min_repetitions}
    if not boilerplate:
        return lines
    cleaned = [ln for ln in lines if ln.strip() not in boilerplate]
    return cleaned


def clean_extracted_text(text: str) -> str:
    """
    Basic cleaning:
    - remove obvious page numbers (e.g., 'Page 1 of 12', '12')
    - collapse multiple blank lines
    - drop repeated boilerplate lines (headers/footers)
    """
    if not text:
        return ""

    lines = text.splitlines()
    cleaned_lines: List[str] = []

    page_number_pattern = re.compile(
        r"^\s*(page\s+\d+(\s+of\s+\d+)?.*|\d{1,3})\s*$",
        re.IGNORECASE,
    )

    for line in lines:
        # Skip pure page numbers and trivial markers
        if page_number_pattern.match(line.strip()):
            continue
        cleaned_lines.append(line)

    cleaned_lines = _remove_boilerplate_lines(cleaned_lines)

    cleaned_text = "\n".join(cleaned_lines)
    # Normalize multiple blank lines
    cleaned_text = re.sub(r"\n\s*\n\s*\n+", "\n\n", cleaned_text)

    return cleaned_text.strip()


