import re
from typing import List

from ..schemas import Citation


IPC_PATTERN = re.compile(
    r"\b[Ss]ection\s+\d+[A-Z]?(?:\s*[-/]\s*\d+[A-Z]?)?\s*(?:of\s+the\s+)?(?:ipc|i\.p\.c\.|indian penal code)\b",
    re.IGNORECASE,
)

CRPC_PATTERN = re.compile(
    r"\b[Ss]ection\s+\d+[A-Z]?(?:\s*[-/]\s*\d+[A-Z]?)?\s*(?:of\s+the\s+)?(?:crpc|cr\.p\.c\.|code of criminal procedure)\b",
    re.IGNORECASE,
)

ARTICLE_PATTERN = re.compile(
    r"\b[Aa]rticle\s+\d+[A-Z]?\s*(?:of\s+the\s+constitution of india)?",
    re.IGNORECASE,
)

ACT_PATTERN = re.compile(
    r"\b[A-Z][A-Za-z&\s]+?\s+Act,\s*\d{4}\b",
)


def _unique_preserve_order(items: List[str]) -> List[str]:
    seen = set()
    result = []
    for it in items:
        key = it.strip()
        if key and key not in seen:
            result.append(key)
            seen.add(key)
    return result


def extract_citations(text: str) -> List[Citation]:
    """
    Extract common Indian-style legal citations using regex and simple rules.
    This is deliberately conservative to reduce false positives.
    """
    if not text:
        return []

    citations: List[Citation] = []

    ipc_matches = [m.group(0) for m in IPC_PATTERN.finditer(text)]
    crpc_matches = [m.group(0) for m in CRPC_PATTERN.finditer(text)]
    article_matches = [m.group(0) for m in ARTICLE_PATTERN.finditer(text)]
    act_matches = [m.group(0) for m in ACT_PATTERN.finditer(text)]

    for cit in _unique_preserve_order(ipc_matches):
        citations.append(Citation(text=cit, citation_type="IPC"))

    for cit in _unique_preserve_order(crpc_matches):
        citations.append(Citation(text=cit, citation_type="CrPC"))

    for cit in _unique_preserve_order(article_matches):
        citations.append(Citation(text=cit, citation_type="Constitutional Article"))

    for cit in _unique_preserve_order(act_matches):
        citations.append(Citation(text=cit, citation_type="Act"))

    return citations


