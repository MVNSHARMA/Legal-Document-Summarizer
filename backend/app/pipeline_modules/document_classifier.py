import re


def classify_document_type(text: str) -> str:
    """
    Heuristic document type classifier using keyword and structural cues.

    Returns one of:
    - 'court_judgment'
    - 'contract'
    - 'fir_or_notice'
    - 'other'
    """
    lowered = text.lower()

    # Court judgment cues
    court_patterns = [
        r"in the high court of",
        r"in the supreme court of",
        r"before the hon'?ble",
        r"judgment",
        r"appellant",
        r"respondent",
        r"criminal appeal",
        r"civil appeal",
    ]
    if any(re.search(pat, lowered) for pat in court_patterns):
        return "court_judgment"

    # Contract cues
    contract_patterns = [
        r"this agreement is made",
        r"this deed",
        r"party of the first part",
        r"party of the second part",
        r"hereinafter referred to as",
        r"term and termination",
        r"indemnity",
    ]
    if any(re.search(pat, lowered) for pat in contract_patterns):
        return "contract"

    # FIR / legal notice cues
    fir_patterns = [
        r"first information report",
        r"fir no\.",
        r"to,\s*the station house officer",
        r"legal notice",
        r"whereas you have",
    ]
    if any(re.search(pat, lowered) for pat in fir_patterns):
        return "fir_or_notice"

    return "other"


