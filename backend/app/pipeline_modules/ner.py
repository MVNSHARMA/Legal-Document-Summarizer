from typing import List

try:
    import spacy
except ImportError:  # pragma: no cover - handled gracefully at runtime
    spacy = None

from ..schemas import Entity


_NLP = None


def _get_nlp():
    global _NLP  # noqa: PLW0603
    if _NLP is None and spacy is not None:
        try:
            _NLP = spacy.load("en_core_web_sm")
        except Exception:  # noqa: BLE001
            _NLP = None
    return _NLP


def _infer_role(label: str, context: str) -> str | None:
    lowered = context.lower()
    if "judge" in lowered or "justice" in lowered or "hon'ble" in lowered:
        return "Judge"
    if "advocate" in lowered or "counsel" in lowered:
        return "Advocate"
    if "petitioner" in lowered or "plaintiff" in lowered or "appellant" in lowered:
        return "Party (Petitioner/Appellant)"
    if "respondent" in lowered or "defendant" in lowered:
        return "Party (Respondent/Defendant)"
    if label == "ORG" and "court" in lowered:
        return "Court"
    return None


def extract_entities(text: str, document_type: str) -> List[Entity]:
    """
    Use spaCy NER to extract people, orgs, locations, etc.
    Then infer legal-specific roles using simple keyword-based context rules.
    """
    nlp = _get_nlp()
    if nlp is None or not text:
        return []

    doc = nlp(text)
    entities: List[Entity] = []

    for ent in doc.ents:
        context_window_start = max(0, ent.start_char - 60)
        context_window_end = min(len(text), ent.end_char + 60)
        context = text[context_window_start:context_window_end]

        role = _infer_role(ent.label_, context)
        ent_label = ent.label_
        # Normalize some labels for UI friendliness
        label_map = {
            "PERSON": "Person",
            "ORG": "Organization",
            "GPE": "Location",
            "DATE": "Date",
            "LAW": "Law",
        }
        ent_label = label_map.get(ent_label, ent_label)

        entities.append(
            Entity(
                text=ent.text,
                label=ent_label,
                role=role,
                start_char=ent.start_char,
                end_char=ent.end_char,
            )
        )

    return entities


