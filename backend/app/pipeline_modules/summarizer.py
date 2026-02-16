import math
from typing import Tuple


def _basic_sentence_split(text: str):
    # Very lightweight sentence splitter to avoid heavy dependencies.
    # For production, plug in spaCy or a transformer-based summarizer.
    import re

    sentences = re.split(r"(?<=[.?!])\s+", text.strip())
    return [s.strip() for s in sentences if s.strip()]


def summarize_document(document_text: str, used_ocr: bool) -> str:
    """
    Create a 2–3 paragraph high-level summary of the whole document.

    Uses the same lightweight sentence splitter and selects more sentences,
    grouped into paragraphs, to convey what happened in the case overall.
    """
    if not document_text:
        return ""

    sentences = _basic_sentence_split(document_text)
    if not sentences:
        return document_text[:1200]

    # Aim for roughly 2–3 paragraphs worth of content.
    max_sentences = min(len(sentences), 18)
    selected = sentences[:max_sentences]

    # Split into 2–3 paragraphs depending on length.
    if max_sentences <= 6:
        paragraphs = [" ".join(selected)]
    elif max_sentences <= 12:
        split = max_sentences // 2
        paragraphs = [" ".join(selected[:split]), " ".join(selected[split:])]
    else:
        split1 = max_sentences // 3
        split2 = 2 * max_sentences // 3
        paragraphs = [
            " ".join(selected[:split1]),
            " ".join(selected[split1:split2]),
            " ".join(selected[split2:]),
        ]

    return "\n\n".join(paragraphs)


def summarize_section(
    section_name: str,
    section_text: str,
    used_ocr: bool,
) -> Tuple[str, str, float]:
    """
    Produce a short and detailed summary and a heuristic confidence score.

    Current implementation uses simple lead-based summarization (first N sentences),
    which works reasonably for many legal documents that are structured and formal.
    This can be upgraded to a transformer-based summarizer later.
    """
    if not section_text:
        return "", "", 0.0

    sentences = _basic_sentence_split(section_text)
    if not sentences:
        return section_text[:300], section_text[:800], 40.0

    short_count = min(3, len(sentences))
    detailed_count = min(8, len(sentences))

    short_summary = " ".join(sentences[:short_count])
    detailed_summary = " ".join(sentences[:detailed_count])

    # Heuristic confidence
    base_conf = 85.0
    if used_ocr:
        base_conf -= 15.0

    # Penalize very short sections (likely noisy headings or artifacts)
    char_count = len(section_text)
    if char_count < 400:
        base_conf -= 20.0
    elif char_count < 800:
        base_conf -= 10.0

    # Slightly adjust based on length of summaries vs original
    ratio = len(detailed_summary) / max(1, char_count)
    if ratio < 0.2:
        base_conf -= 5.0

    base_conf = max(10.0, min(98.0, base_conf))
    # Round to one decimal place
    return short_summary, detailed_summary, math.floor(base_conf * 10) / 10.0


