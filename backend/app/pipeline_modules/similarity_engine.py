import json
import os
from functools import lru_cache
from typing import List

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from ..schemas import SimilarCase


@lru_cache(maxsize=1)
def _load_cases_and_vectorizer():
    base_dir = os.path.dirname(os.path.dirname(__file__))
    data_path = os.path.join(base_dir, "sample_data", "sample_cases.json")
    with open(data_path, "r", encoding="utf-8") as f:
        cases = json.load(f)

    texts = [case["text"] for case in cases]
    vectorizer = TfidfVectorizer(max_features=5000, ngram_range=(1, 2))
    matrix = vectorizer.fit_transform(texts)

    return cases, vectorizer, matrix


def find_similar_cases(document_text: str, document_type: str, top_k: int = 3) -> List[SimilarCase]:
    """
    Compute TF-IDF based cosine similarity against a small internal corpus
    of sample legal documents.
    """
    if not document_text:
        return []

    cases, vectorizer, matrix = _load_cases_and_vectorizer()
    query_vec = vectorizer.transform([document_text])
    sims = cosine_similarity(query_vec, matrix)[0]

    scored = list(enumerate(sims))
    scored.sort(key=lambda x: x[1], reverse=True)

    results: List[SimilarCase] = []
    for idx, score in scored[:top_k]:
        case = cases[idx]
        similarity_pct = float(round(score * 100, 2))
        results.append(
            SimilarCase(
                case_id=case["case_id"],
                title=case["title"],
                document_type=case.get("document_type", "unknown"),
                similarity=similarity_pct,
            )
        )

    return results


