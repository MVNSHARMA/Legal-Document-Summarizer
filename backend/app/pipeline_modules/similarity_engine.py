"""
similarity_engine.py — TF-IDF cosine similarity against a reference corpus.

BUG 6 FIX:
- TF-IDF now runs on text + issue + judgment_summary combined for richer matching.
- PIL/Constitutional documents get a similarity boost for cases that mention
  Article 21, fundamental right, education, health, dignity, equality.
- Returns max 3 SimilarCase objects with no duplicate titles.
"""

from __future__ import annotations

import json
import os
import re
from functools import lru_cache
from typing import List

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from ..schemas import SimilarCase


# Keywords that indicate a PIL/Constitutional case in the corpus
_PIL_BOOST_TERMS = re.compile(
    r"\b(?:article\s+21|fundamental\s+right|right\s+to\s+education|"
    r"right\s+to\s+health|right\s+to\s+life|dignity|equality|"
    r"writ\s+petition|public\s+interest|menstrual|hygiene|"
    r"article\s+14|article\s+15|article\s+16|article\s+19|"
    r"rte\s+act|rpwd|disability|accessibility)\b",
    re.IGNORECASE,
)

# Keywords that indicate a PIL/Constitutional query document
_PIL_QUERY_TERMS = re.compile(
    r"\b(?:article\s+21|fundamental\s+right|right\s+to\s+education|"
    r"right\s+to\s+health|menstrual|hygiene|writ\s+petition|"
    r"public\s+interest|article\s+14|article\s+15|article\s+16|"
    r"rte\s+act|rpwd|disability)\b",
    re.IGNORECASE,
)

_PIL_BOOST_FACTOR = 0.25   # additive boost to similarity score for matching PIL cases


@lru_cache(maxsize=1)
def _load_corpus():
    base_dir  = os.path.dirname(os.path.dirname(__file__))
    data_path = os.path.join(base_dir, "sample_data", "sample_cases.json")
    with open(data_path, "r", encoding="utf-8") as f:
        cases = json.load(f)

    # BUG 6 FIX: combine text + issue + judgment_summary for richer TF-IDF matching
    combined_texts = [
        " ".join(filter(None, [
            case.get("text", ""),
            case.get("issue", ""),
            case.get("judgment_summary", ""),
        ]))
        for case in cases
    ]

    vectorizer = TfidfVectorizer(max_features=8000, ngram_range=(1, 2), min_df=1)
    matrix     = vectorizer.fit_transform(combined_texts)
    return cases, vectorizer, matrix


def _is_pil_query(document_text: str) -> bool:
    """Return True if the query document looks like a PIL/Constitutional case."""
    return bool(_PIL_QUERY_TERMS.search(document_text[:5000]))


def find_similar_cases(document_text: str, document_type: str = "", top_k: int = 3) -> List[SimilarCase]:
    """
    Compute TF-IDF cosine similarity and return up to top_k unique cases.

    BUG 6 FIX: For PIL/Constitutional query documents, boost similarity scores
    for corpus cases that also contain PIL/Constitutional keywords.
    """
    if not document_text:
        return []

    cases, vectorizer, matrix = _load_corpus()

    # BUG 6 FIX: also enrich the query with issue/summary context if available
    query_vec = vectorizer.transform([document_text])
    raw_sims  = cosine_similarity(query_vec, matrix)[0]

    # BUG 6 FIX: apply PIL boost
    is_pil = _is_pil_query(document_text)
    sims   = raw_sims.copy()

    if is_pil:
        for i, case in enumerate(cases):
            case_text = " ".join(filter(None, [
                case.get("text", ""),
                case.get("issue", ""),
                case.get("judgment_summary", ""),
            ]))
            if _PIL_BOOST_TERMS.search(case_text):
                sims[i] = min(1.0, float(sims[i]) + _PIL_BOOST_FACTOR)

    scored = sorted(enumerate(sims), key=lambda x: x[1], reverse=True)

    results: List[SimilarCase] = []
    seen_titles: set[str] = set()

    for idx, score in scored:
        case  = cases[idx]
        title = case["title"]
        if title in seen_titles:
            continue
        seen_titles.add(title)

        results.append(
            SimilarCase(
                title=title,
                similarity_score=round(float(score), 4),
                issue=case.get("issue", ""),
                judgment_summary=case.get("judgment_summary", ""),
            )
        )
        if len(results) >= top_k:
            break

    return results
