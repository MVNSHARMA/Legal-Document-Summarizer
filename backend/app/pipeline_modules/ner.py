"""
ner.py — Legal-focused named entity extraction for Indian legal documents.

Extracts: JUDGE, LAWYER, COURT, CASE_NUMBER, SECTION, DATE

BUG FIXES applied:
  BUG 1 — Judges extracted only from first 5% of document (bench declaration zone)
  BUG 3 — Added Supreme Court / "OF YEAR" style case number patterns
"""

from __future__ import annotations

import re
from typing import Dict, List

try:
    import spacy
except ImportError:
    spacy = None


# ─── Judge patterns ───────────────────────────────────────────────────────────
# Judges are ALWAYS declared at the very top of Indian judgments.
# We search only the first 5% of the document to avoid picking up
# judge names mentioned inside cited cases.

_JUDGE_PATTERNS: List[re.Pattern] = [
    # Hon'ble (Mr.|Ms.|Mrs.|Dr.)? Justice [Name]
    re.compile(
        r"Hon'?ble\s+(?:Mr\.|Ms\.|Mrs\.|Dr\.)?\s*Justice\s+"
        r"([A-Z][A-Za-z.'\s-]{2,50}?)(?=\s*[,\n\r]|\s+J\.|\s+C\.J\.|\s*$)",
        re.IGNORECASE,
    ),
    # THE HON'BLE [Name]
    re.compile(
        r"THE\s+HON'?BLE\s+(?:MR\.|MS\.|MRS\.|DR\.)?\s*"
        r"([A-Z][A-Za-z.'\s-]{2,50}?)(?=\s*[,\n\r]|\s*$)",
        re.IGNORECASE,
    ),
    # Before: Hon'ble [Name]
    re.compile(
        r"Before\s*:\s*Hon'?ble\s+([A-Z][A-Za-z.'\s-]{2,50}?)(?=\s*[,\n\r]|\s*$)",
        re.IGNORECASE,
    ),
    # CORAM: [Name], J. or [Name], C.J.
    re.compile(
        r"CORAM\s*:\s*([A-Z][A-Za-z.'\s-]{2,50}?)(?=\s*,\s*(?:J\.|C\.J\.)|\s*\n|\s*$)",
        re.IGNORECASE,
    ),
    # [Name], J. or [Name], C.J. (standalone)
    re.compile(
        r"\b([A-Z][A-Za-z.'\s-]{4,40}?),\s*(?:C\.J\.|J\.)\b",
    ),
    # [NAME] AND [NAME], JJ.  (Supreme Court bench format)
    re.compile(
        r"\b([A-Z][A-Z\s.'-]{4,40}?)\s+AND\s+([A-Z][A-Z\s.'-]{4,40}?),\s*JJ\.",
    ),
    # J.B. PARDIWALA & R. MAHADEVAN, JJ.  (initials + surname, all-caps)
    re.compile(
        r"\b([A-Z][A-Z.\s]{2,30}?)\s*[&,]\s*([A-Z][A-Z.\s]{2,30}?),\s*JJ\.",
    ),
    # Presiding Officer: [Name]
    re.compile(
        r"Presiding\s+Officer\s*:\s*([A-Z][A-Za-z.'\s-]{2,50}?)(?=\s*[,\n\r]|\s*$)",
        re.IGNORECASE,
    ),
    # Additional Sessions Judge / CJM / Metropolitan Magistrate [Name]
    re.compile(
        r"(?:Additional\s+Sessions\s+Judge|Chief\s+Judicial\s+Magistrate|Metropolitan\s+Magistrate)"
        r"\s+([A-Z][A-Za-z.'\s-]{2,50}?)(?=\s*[,\n\r]|\s*$)",
        re.IGNORECASE,
    ),
]


# ─── Lawyer patterns ──────────────────────────────────────────────────────────
# Each pattern captures a PROPER NAME in group(1) only.
# Context (role/title) is in the surrounding regex, never in the capture group.

_NAME = r"([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})"   # 2-4 properly capitalised words

_LAWYER_CONTEXT_PATTERNS: List[re.Pattern] = [
    # For the Petitioner/Appellant/Respondent/State/Complainant/Accused: [Name]
    re.compile(
        r"For\s+(?:the\s+)?(?:Petitioner|Appellant|Respondent|Complainant|State|Accused|Defendant)"
        r"[^:]{0,30}?:\s*" + _NAME,
        re.IGNORECASE,
    ),
    # Sri/Shri/Mr./Ms./Mrs. [Name], Advocate / learned counsel / Senior Counsel / APP / SPP / PP
    re.compile(
        r"(?:Sri|Shri|Mr\.|Ms\.|Mrs\.)\s+" + _NAME +
        r"\s*,?\s*(?:Advocate|learned\s+counsel|Senior\s+Counsel|APP|SPP|PP)",
        re.IGNORECASE,
    ),
    # [Name], learned Senior Counsel / learned counsel for
    re.compile(
        _NAME + r"\s*,?\s*(?:learned\s+Senior\s+Counsel|learned\s+counsel\s+for)",
        re.IGNORECASE,
    ),
    # Amicus Curiae: [Name]  /  through its/his/her counsel [Name]  /  represented by [Name]
    re.compile(
        r"(?:Amicus\s+Curiae|through\s+(?:its|his|her|their)\s+(?:learned\s+)?counsel|represented\s+by)"
        r"\s*:?\s*" + _NAME,
        re.IGNORECASE,
    ),
]

# Words that must NOT appear in a valid lawyer name
_LAWYER_BAD_WORDS = frozenset([
    "for", "the", "learned", "app", "spp", "pp", "counsel", "advocate",
    "petitioner", "respondent", "state", "court", "hon", "justice",
    "section", "under", "versus", "complainant", "accused", "defendant",
    "appellant", "prosecution", "government", "india", "republic",
])


def _is_valid_lawyer_name(name: str) -> bool:
    """Return True only if name looks like a real person's name."""
    name = name.strip()
    if len(name) < 4:
        return False
    if not name[0].isupper():
        return False
    if name == name.lower():
        return False
    lower = name.lower()
    for bad in _LAWYER_BAD_WORDS:
        if bad in lower.split():
            return False
    return True


# ─── Court pattern ────────────────────────────────────────────────────────────
_COURT_PATTERN = re.compile(
    r"(?:"
    r"Supreme Court of India|"
    r"High Court of [A-Za-z\s]+(?:and [A-Za-z\s]+)?|"
    r"IN THE (?:HIGH|SUPREME|SESSIONS|DISTRICT|FAMILY|MAGISTRATE) COURT[^.\n]*|"
    r"(?:Additional\s+)?Sessions Court(?:\s+at\s+[A-Za-z\s]+)?|"
    r"(?:Additional\s+)?District Court(?:\s+at\s+[A-Za-z\s]+)?|"
    r"(?:Chief\s+)?Judicial\s+Magistrate(?:\s+Court)?(?:\s+at\s+[A-Za-z\s]+)?|"
    r"Metropolitan\s+Magistrate(?:\s+Court)?(?:\s+at\s+[A-Za-z\s]+)?|"
    r"Family Court(?:\s+at\s+[A-Za-z\s]+)?|"
    r"National\s+Consumer\s+Disputes\s+Redressal\s+Commission|"
    r"(?:State|District)\s+Consumer\s+(?:Disputes\s+)?Forum"
    r")",
    re.IGNORECASE,
)


# ─── Case number pattern ──────────────────────────────────────────────────────
# BUG 3 FIX: Added Supreme Court "OF YEAR" style patterns searched in first 10%

_CASE_NUM_SC_PATTERN = re.compile(
    r"(?:"
    # WRIT PETITION (C/Crl) NO. X OF YYYY
    r"WRIT\s+PETITION\s*\([A-Z]+\)\s*NO\.?\s*[\d]+\s*OF\s*\d{4}|"
    # W.P.(C/Crl) No. X of YYYY
    r"W\.P\.\s*\([A-Za-z]+\)\s*No\.?\s*[\d]+\s*of\s*\d{4}|"
    # CIVIL APPEAL NO. X OF YYYY
    r"CIVIL\s+APPEAL\s+NO\.?\s*[\d]+\s*OF\s*\d{4}|"
    # CRIMINAL APPEAL NO. X OF YYYY
    r"CRIMINAL\s+APPEAL\s+NO\.?\s*[\d]+\s*OF\s*\d{4}|"
    # TRANSFER PETITION (C/Crl) NO. X
    r"TRANSFER\s+PETITION\s*\([A-Z]+\)\s*NO\.?\s*[\d]+|"
    # SLP (C/Crl) NO. X OF YYYY
    r"SLP\s*\([A-Za-z]+\)\s*No\.?\s*[\d]+\s*of\s*\d{4}|"
    # CONTEMPT PETITION (C/Crl) NO. X
    r"CONTEMPT\s+PETITION\s*\([A-Z]+\)\s*NO\.?\s*[\d]+|"
    # Mixed case: Writ Petition (Civil/Criminal) No. X of YYYY
    r"(?:Writ\s+Petition|Civil\s+Appeal|Criminal\s+Appeal|SLP)\s*"
    r"\([A-Za-z]+\)\s*No\.?\s*\d+\s*of\s*\d{4}"
    r")",
    re.IGNORECASE,
)

_CASE_NUM_PATTERN = re.compile(
    r"(?:"
    r"CRL\.?\s*(?:A|REV|M\.?P|MISC|APPEAL|REVISION)\.?\s*No\.?\s*[\d]+[/\-][\d]{2,4}|"
    r"W\.?P\.?\s*(?:\(Crl\.?\)|(?:\(C\))?)\s*No\.?\s*[\d]+[/\-][\d]{2,4}|"
    r"SLP\s*(?:\(Crl\.?\)|\(C\))?\s*No\.?\s*[\d]+[/\-][\d]{2,4}|"
    r"C\.?A\.?\s*No\.?\s*[\d]+[/\-][\d]{2,4}|"
    r"(?:FIR|Crime)\s+No\.?\s*[\d]+[/\-][\d]{2,4}|"
    r"Sessions\s+Case\s+No\.?\s*[\d]+[/\-][\d]{2,4}|"
    r"(?:CC|SC|RC|O\.?S\.?|R\.?C\.?)\s+No\.?\s*[\d]+[/\-][\d]{2,4}|"
    r"Bail\s+(?:Application|Appl\.?)\s+No\.?\s*[\d]+[/\-][\d]{2,4}|"
    r"(?:Revision|Rev\.?)\s+(?:Petition|Pet\.?)\s+No\.?\s*[\d]+[/\-][\d]{2,4}|"
    r"Crl\.?\s*(?:M\.?P\.?|P\.?)\s*No\.?\s*[\d]+[/\-][\d]{2,4}|"
    r"Case\s+No\.?\s*[\d]+[/\-][\d]{2,4}"
    r")",
    re.IGNORECASE,
)


# ─── Section pattern ─────────────────────────────────────────────────────────
_SECTION_RAW = re.compile(
    r"(?:"
    r"[Ss]ection\s+\d+[A-Za-z]?(?:\s*(?:r/?w|read\s+with|and|&|,)\s*[Ss]ection\s+\d+[A-Za-z]?)*"
    r"(?:\s+(?:of\s+(?:the\s+)?)?(?:IPC|I\.P\.C\.|CrPC|Cr\.P\.C\.|POCSO\s+Act|IT\s+Act|SC/ST\s+Act|"
    r"NDPS\s+Act|Arms\s+Act|Motor\s+Vehicles\s+Act|Indian\s+Penal\s+Code|Code\s+of\s+Criminal\s+Procedure|"
    r"RTE\s+Act|Right\s+to\s+Education\s+Act|RPWD\s+Act))?|"
    r"u/?s\s+\d+[A-Za-z]?(?:[/,]\d+[A-Za-z]?)*(?:\s+(?:IPC|CrPC|POCSO|NDPS|IT\s+Act|Arms\s+Act))?|"
    r"(?:IPC|CrPC)\s+[Ss]ection\s+\d+[A-Za-z]?|"
    r"[Ss]ec(?:tion)?\.?\s+\d+[A-Za-z]?\s+(?:IPC|CrPC)"
    r")",
    re.IGNORECASE,
)

# Constitutional Article patterns (BUG 5 FIX)
_ARTICLE_PATTERNS: List[re.Pattern] = [
    re.compile(r"Article\s+(\d+[A-Z]?)\s+of\s+the\s+Constitution", re.IGNORECASE),
    re.compile(r"Articles?\s+(\d+[A-Z]?(?:\s*,\s*\d+[A-Z]?)*)\s+(?:and|of)\b", re.IGNORECASE),
    re.compile(r"Art\.\s*(\d+[A-Z]?)", re.IGNORECASE),
]


# ─── Date pattern ─────────────────────────────────────────────────────────────
_DATE_PATTERN = re.compile(
    r"\b\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}\b|"
    r"\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|"
    r"September|October|November|December)\s+\d{4}\b|"
    r"\b(?:January|February|March|April|May|June|July|August|"
    r"September|October|November|December)\s+\d{1,2},?\s+\d{4}\b",
    re.IGNORECASE,
)


# ─── Helpers ──────────────────────────────────────────────────────────────────
def _unique(items: List[str]) -> List[str]:
    seen: set[str] = set()
    out: List[str] = []
    for item in items:
        clean = re.sub(r"\s+", " ", item).strip().strip(".,;:")
        if clean and len(clean) > 2 and clean.lower() not in seen:
            seen.add(clean.lower())
            out.append(clean)
    return out


# ─── BUG 1 FIX: Judge name cleaning ─────────────────────────────────────────
_JUDGE_FALSE_PREFIXES = [
    "JUDGMENT", "ORDER", "BENCH", "HON'BLE", "HONBLE",
    "THE", "BEFORE", "CORAM", "PER",
]


def _clean_judge_name(name: str) -> str:
    """Remove false prefix words that regex sometimes captures as part of the name."""
    for prefix in _JUDGE_FALSE_PREFIXES:
        if name.upper().startswith(prefix):
            name = name[len(prefix):].strip()
    # Remove leading punctuation / separators
    name = name.lstrip(".:,-\u2013 ")
    return name.strip()


def _extract_judges(header: str) -> List[str]:
    """
    Extract judges ONLY from the header zone (first 5% of document).
    Applies _clean_judge_name() to every extracted name.
    """
    names: List[str] = []
    for pat in _JUDGE_PATTERNS:
        for m in pat.finditer(header):
            if m.lastindex and m.lastindex >= 2:
                try:
                    names.append(_clean_judge_name(m.group(1).strip()))
                    names.append(_clean_judge_name(m.group(2).strip()))
                except IndexError:
                    names.append(_clean_judge_name(m.group(1).strip()))
            else:
                names.append(_clean_judge_name(m.group(1).strip()))
    # Filter out empty strings or single-word leftovers that are clearly not names
    names = [n for n in names if len(n) >= 3]
    return _unique(names)


def _extract_lawyers(text: str, judge_set: set[str]) -> List[str]:
    """Extract proper lawyer names only — no role labels, no phrases."""
    names: List[str] = []
    for pat in _LAWYER_CONTEXT_PATTERNS:
        for m in pat.finditer(text):
            names.append(m.group(1).strip())
    valid = [
        n for n in names
        if _is_valid_lawyer_name(n) and n.lower() not in judge_set
    ]
    return _unique(valid)


def _extract_articles(text: str) -> List[str]:
    """Extract Constitutional Article references."""
    articles: List[str] = []
    for pat in _ARTICLE_PATTERNS:
        for m in pat.finditer(text):
            # group(1) may contain comma-separated numbers
            nums_raw = m.group(1)
            for num in re.split(r"[,\s]+", nums_raw):
                num = num.strip()
                if re.match(r"\d+[A-Z]?$", num):
                    articles.append(f"Article {num} of the Constitution")
    return _unique(articles)


# ─── Public API ───────────────────────────────────────────────────────────────
def extract_entities(text: str, document_type: str = "") -> Dict[str, List[str]]:
    """
    Extract legal entities from Indian legal document text.

    Returns:
        {
          "JUDGE":       [...],   # from first 5% only
          "LAWYER":      [...],
          "COURT":       [...],
          "CASE_NUMBER": [...],   # SC "OF YEAR" patterns searched in first 10%
          "SECTION":     [...],   # raw strings; normalization done in pipeline.py
          "ARTICLE":     [...],   # Constitutional articles
          "DATE":        [...],
        }
    """
    if not text:
        return {k: [] for k in ("JUDGE", "LAWYER", "COURT", "CASE_NUMBER", "SECTION", "ARTICLE", "DATE")}

    # BUG 1: judges from first 5% only
    header_5pct  = text[: max(300, len(text) // 20)]
    judges       = _extract_judges(header_5pct)
    judge_set    = {j.lower() for j in judges}

    lawyers      = _extract_lawyers(text, judge_set)
    courts       = _unique([m.group(0).strip() for m in _COURT_PATTERN.finditer(text)])

    # BUG 3: SC case numbers searched in first 10%, then fall back to full text
    header_10pct = text[: max(500, len(text) // 10)]
    case_nums_sc = _unique([m.group(0).strip() for m in _CASE_NUM_SC_PATTERN.finditer(header_10pct)])
    case_nums_std = _unique([m.group(0).strip() for m in _CASE_NUM_PATTERN.finditer(text)])
    # SC patterns take priority
    case_nums    = _unique(case_nums_sc + case_nums_std)

    sections     = _unique([m.group(0).strip() for m in _SECTION_RAW.finditer(text)])
    articles     = _extract_articles(text)
    dates        = _unique([m.group(0).strip() for m in _DATE_PATTERN.finditer(text)])

    # Augment judges with spaCy PERSON entities (header zone only)
    try:
        if spacy is not None:
            import spacy as _spacy
            try:
                nlp = _spacy.load("en_core_web_sm")
                doc = nlp(header_5pct)
                for ent in doc.ents:
                    if ent.label_ != "PERSON":
                        continue
                    ctx = header_5pct[max(0, ent.start_char - 100): ent.end_char + 100].lower()
                    if any(kw in ctx for kw in ("justice", "hon'ble", "honble", "judge", ", j.", ", c.j.", ", jj.")):
                        judges = _unique(judges + [ent.text])
            except Exception:
                pass
    except Exception:
        pass

    return {
        "JUDGE":       judges[:8],
        "LAWYER":      lawyers[:12],
        "COURT":       courts,
        "CASE_NUMBER": case_nums,
        "SECTION":     sections,
        "ARTICLE":     articles,
        "DATE":        dates,
    }
