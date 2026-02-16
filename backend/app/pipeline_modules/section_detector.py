import re
from typing import Dict, List


SECTION_ORDER = [
    "Case Title",
    "Court Name",
    "Parties Involved",
    "Facts of the Case",
    "Issues / Questions Before Court",
    "Arguments",
    "Legal Provisions Referenced",
    "Judgment / Verdict",
    "Important Dates",
]


SECTION_PATTERNS: Dict[str, List[re.Pattern]] = {
    "Case Title": [
        re.compile(r"^\s*.+\s+v(?:s\.?|ersus)\s+.+$", re.IGNORECASE | re.MULTILINE),
    ],
    "Court Name": [
        re.compile(r"^\s*in the .*court.*$", re.IGNORECASE | re.MULTILINE),
    ],
    "Parties Involved": [
        re.compile(r"^\s*between\s*:", re.IGNORECASE | re.MULTILINE),
        re.compile(r"^\s*parties\s*:", re.IGNORECASE | re.MULTILINE),
    ],
    "Facts of the Case": [
        re.compile(r"^\s*facts of the case\s*[:\-]?", re.IGNORECASE | re.MULTILINE),
        re.compile(r"^\s*background\s*[:\-]?", re.IGNORECASE | re.MULTILINE),
    ],
    "Issues / Questions Before Court": [
        re.compile(r"^\s*issues?\s*[:\-]?", re.IGNORECASE | re.MULTILINE),
        re.compile(r"^\s*points for determination\s*[:\-]?", re.IGNORECASE | re.MULTILINE),
    ],
    "Arguments": [
        re.compile(r"^\s*arguments\s*[:\-]?", re.IGNORECASE | re.MULTILINE),
        re.compile(r"^\s*submissions\s*[:\-]?", re.IGNORECASE | re.MULTILINE),
    ],
    "Legal Provisions Referenced": [
        re.compile(r"^\s*relevant provisions\s*[:\-]?", re.IGNORECASE | re.MULTILINE),
        re.compile(r"^\s*statutory provisions\s*[:\-]?", re.IGNORECASE | re.MULTILINE),
    ],
    "Judgment / Verdict": [
        re.compile(r"^\s*judgment\s*[:\-]?", re.IGNORECASE | re.MULTILINE),
        re.compile(r"^\s*order\s*[:\-]?", re.IGNORECASE | re.MULTILINE),
        re.compile(r"^\s*conclusion\s*[:\-]?", re.IGNORECASE | re.MULTILINE),
    ],
    "Important Dates": [
        re.compile(r"^\s*important dates\s*[:\-]?", re.IGNORECASE | re.MULTILINE),
        re.compile(r"^\s*chronology of events\s*[:\-]?", re.IGNORECASE | re.MULTILINE),
    ],
}


def detect_sections(text: str, document_type: str) -> List[Dict[str, str]]:
    """
    Detect logical sections based on heading patterns.

    Returns a list of dicts: { "name": section_name, "text": content }.
    If no headings are found, returns a single 'Full Document' section.
    """
    if not text:
        return []

    matches: List[Dict] = []

    for section_name, patterns in SECTION_PATTERNS.items():
        for pattern in patterns:
            for m in pattern.finditer(text):
                matches.append({"name": section_name, "start": m.start()})

    # Add synthetic start and end markers
    matches.append({"name": "__START__", "start": 0})
    matches.sort(key=lambda x: x["start"])

    sections: List[Dict[str, str]] = []

    for idx, match in enumerate(matches):
        if match["name"] == "__START__":
            continue

        start = match["start"]
        end = len(text)
        if idx + 1 < len(matches):
            end = matches[idx + 1]["start"]
        section_text = text[start:end].strip()
        if not section_text:
            continue

        sections.append({"name": match["name"], "text": section_text})

    if not sections:
        sections = [{"name": "Full Document", "text": text.strip()}]

    # Ensure we keep canonical ordering where possible
    ordered: List[Dict[str, str]] = []
    used = set()
    for sec_name in SECTION_ORDER:
        for sec in sections:
            if sec["name"] == sec_name and id(sec) not in used:
                ordered.append(sec)
                used.add(id(sec))
    # Append any remaining sections at the end
    for sec in sections:
        if id(sec) not in used:
            ordered.append(sec)

    return ordered


