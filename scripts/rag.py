"""Lightweight retrieval helpers for the local descriptions knowledge base."""

from __future__ import annotations

import json
import math
import os
import re
from collections import Counter
from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional

# Matches alpha-numeric sequences or individual CJK characters so mixed text stays searchable.
TOKEN_PATTERN = re.compile(r"[A-Za-z0-9]+|[\u4e00-\u9fff]")


def _tokenize(text: str) -> List[str]:
    tokens = TOKEN_PATTERN.findall(text.lower())
    return tokens


@dataclass
class KnowledgeChunk:
    chunk_id: str
    text: str
    metadata: Dict[str, str]
    vector: Dict[str, float]
    norm: float


class RAGKnowledgeBase:
    """Simple TF-IDF retriever over the descriptions JSON file."""

    def __init__(self, json_path: str) -> None:
        self.json_path = json_path
        self._chunks: List[KnowledgeChunk] = []
        self._idf: Dict[str, float] = {}
        self._load()

    def _load(self) -> None:
        if not os.path.exists(self.json_path):
            raise FileNotFoundError(f"Knowledge file not found: {self.json_path}")

        data = None
        last_error: Optional[Exception] = None
        for encoding in ("utf-8", "utf-8-sig"):
            try:
                with open(self.json_path, "r", encoding=encoding) as fh:
                    data = json.load(fh)
                break
            except json.JSONDecodeError as json_error:
                last_error = json_error
        if data is None:
            raise ValueError(f"Failed to parse {self.json_path}: {last_error}")

        raw_chunks: List[Dict[str, str]] = []
        for entry_id, payload in data.items():
            description = (payload.get("description") or "").strip()
            if not description:
                continue

            base_metadata = {
                "source": f"data/descriptions.json#{entry_id}",
                "title": payload.get("title", "未知"),
                "dynasty": payload.get("dynasty", "未知"),
                "category": payload.get("category", "未知"),
                "year": payload.get("year", "未知"),
            }

            for idx, chunk_text in enumerate(self._split_description(description)):
                tokens = _tokenize(chunk_text)
                if not tokens:
                    continue

                raw_chunks.append(
                    {
                        "chunk_id": f"{entry_id}#{idx}",
                        "text": chunk_text,
                        "metadata": base_metadata,
                        "tokens": tokens,
                    }
                )

        if not raw_chunks:
            raise ValueError("No knowledge chunks were generated from the descriptions file.")

        df: Counter[str] = Counter()
        for chunk in raw_chunks:
            df.update(set(chunk["tokens"]))

        total_docs = len(raw_chunks)
        self._idf = {
            term: math.log((1.0 + total_docs) / (1.0 + freq)) + 1.0
            for term, freq in df.items()
        }

        self._chunks = []
        for chunk in raw_chunks:
            vector = self._build_vector(chunk["tokens"])
            norm = math.sqrt(sum(weight * weight for weight in vector.values()))
            self._chunks.append(
                KnowledgeChunk(
                    chunk_id=chunk["chunk_id"],
                    text=chunk["text"],
                    metadata=chunk["metadata"],
                    vector=vector,
                    norm=norm or 1e-9,
                )
            )

    def _split_description(self, description: str) -> Iterable[str]:
        # Preserve bilingual paragraphs by splitting on blank lines.
        paragraphs = [para.strip() for para in description.split("\n\n") if para.strip()]
        if paragraphs:
            return paragraphs
        return [description]

    def _build_vector(self, tokens: Iterable[str]) -> Dict[str, float]:
        counts = Counter(tokens)
        total = float(sum(counts.values())) or 1.0
        return {term: (count / total) * self._idf.get(term, 0.0) for term, count in counts.items()}

    def retrieve(self, query: str, top_k: int = 3, min_score: float = 0.05) -> List[Dict[str, object]]:
        query_tokens = _tokenize(query)
        if not query_tokens:
            return []

        query_vector = self._build_vector(query_tokens)
        query_norm = math.sqrt(sum(weight * weight for weight in query_vector.values())) or 1e-9

        scored: List[Dict[str, object]] = []
        for chunk in self._chunks:
            dot = sum(
                query_vector.get(term, 0.0) * chunk.vector.get(term, 0.0)
                for term in query_vector.keys()
            )
            similarity = dot / (chunk.norm * query_norm)
            if similarity >= min_score:
                scored.append(
                    {
                        "score": similarity,
                        "text": chunk.text,
                        "metadata": chunk.metadata,
                        "chunk_id": chunk.chunk_id,
                    }
                )

        scored.sort(key=lambda item: item["score"], reverse=True)
        return scored[:top_k]

    def stats(self) -> Dict[str, object]:
        return {
            "chunks": len(self._chunks),
            "source": self.json_path,
        }


_DEFAULT_KB: Optional[RAGKnowledgeBase] = None


def load_default_kb(json_path: str) -> RAGKnowledgeBase:
    global _DEFAULT_KB
    if _DEFAULT_KB is None:
        _DEFAULT_KB = RAGKnowledgeBase(json_path)
    return _DEFAULT_KB
