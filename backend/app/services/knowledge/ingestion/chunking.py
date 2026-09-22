"""
Service chia nhỏ văn bản (Chunking) cho Knowledge Base.

Strategies (Chonkie):
- fixed    → TokenChunker (cl100k)
- markdown → RecursiveChunker markdown recipe
- semantic → Pipeline: recursive(markdown) → SemanticChunker + Gemini
"""
import re
from hashlib import sha256
from typing import Dict, List, Optional

import tiktoken
from chonkie import Pipeline, RecursiveChunker, TokenChunker

from app.core.config import settings
from app.core.logger import get_logger
from app.schemas.agent_memory import SectionLocation
from app.schemas.ingestion import ParsedBaseChunk
from app.services.knowledge.ingestion.chonkie_embeddings import FlaeGeminiEmbeddings
from app.services.knowledge.ingestion.parser import ParserService
from app.utils.token import get_token_count

logger = get_logger(__name__)

_ENCODING: Optional[tiktoken.Encoding] = None
_GEMINI_EMBEDDINGS: Optional[FlaeGeminiEmbeddings] = None


def _cl100k() -> tiktoken.Encoding:
    global _ENCODING
    if _ENCODING is None:
        _ENCODING = tiktoken.get_encoding("cl100k_base")
    return _ENCODING


def _gemini_embeddings() -> FlaeGeminiEmbeddings:
    global _GEMINI_EMBEDDINGS
    if _GEMINI_EMBEDDINGS is None:
        _GEMINI_EMBEDDINGS = FlaeGeminiEmbeddings()
    return _GEMINI_EMBEDDINGS


def _to_raw_chunks(file_hash: str, texts_and_tokens: list[tuple[str, int]]) -> List[Dict]:
    chunks: list[dict] = []
    for text, token_count in texts_and_tokens:
        cleaned = text.strip()
        if not cleaned:
            continue
        chunks.append({
            "chunk_id": f"{file_hash}_{len(chunks)}",
            "text": cleaned,
            "token_count": token_count if token_count > 0 else get_token_count(cleaned),
        })
    return chunks


class ChunkingService:
    @staticmethod
    def chunk_document(
        text: str,
        content_checksum: str,
        *,
        strategy: Optional[str] = None,
        chunk_size: Optional[int] = None,
        chunk_overlap: Optional[int] = None,
    ) -> tuple[ParsedBaseChunk, ...]:
        """Build deterministic typed chunks for a revisioned source."""
        file_hash = sha256(content_checksum.encode("utf-8")).hexdigest()[:24]
        chunks = ChunkingService._chunk_document_raw(
            text=text,
            file_hash=file_hash,
            strategy=strategy,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
        )
        typed: list[ParsedBaseChunk] = []
        for index, chunk in enumerate(chunks):
            chunk_text = str(chunk["text"])
            headings = tuple(
                match.group(1).strip()
                for match in re.finditer(r"^#{1,6}\s+(.+?)\s*$", chunk_text, re.MULTILINE)
            )
            heading_path = headings[-6:] or ("Document",)
            structural_prefix = "/".join(
                re.sub(r"[^a-z0-9]+", "-", heading.lower()).strip("-")
                or "section"
                for heading in heading_path
            )
            typed.append(
                ParsedBaseChunk(
                    section_structural_key=f"{structural_prefix}/{index:06d}",
                    heading_path=heading_path,
                    location=SectionLocation(heading_path=heading_path),
                    text=chunk_text,
                    token_count=int(chunk["token_count"]),
                )
            )
        return tuple(typed)

    @staticmethod
    def chunk_text_fixed(
        text: str,
        file_hash: str,
        chunk_size: Optional[int] = None,
        chunk_overlap: Optional[int] = None,
    ) -> List[Dict]:
        """Fixed-size token windows via Chonkie TokenChunker."""
        if not text:
            return []

        if chunk_size is None:
            chunk_size = settings.RAG_FIXED_SIZE
        if chunk_overlap is None:
            chunk_overlap = settings.RAG_FIXED_OVERLAP

        chunker = TokenChunker(
            tokenizer=_cl100k(),
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
        )
        raw = [
            (chunk.text, int(chunk.token_count))
            for chunk in chunker.chunk(text)
        ]
        chunks = _to_raw_chunks(file_hash, raw)
        logger.info(f"Fixed (Chonkie TokenChunker): {len(chunks)} chunks created")
        return chunks

    @staticmethod
    def chunk_text_markdown(
        text: str,
        file_hash: str,
        chunk_size: Optional[int] = None,
        chunk_overlap: Optional[int] = None,
        min_chunk_tokens: Optional[int] = None,
    ) -> List[Dict]:
        """Markdown recursive chunking via Chonkie recipe (no overlap refine)."""
        del chunk_overlap, min_chunk_tokens
        if not text:
            return []

        if chunk_size is None:
            chunk_size = settings.RAG_RECURSIVE_SIZE

        chunker = RecursiveChunker.from_recipe(
            "markdown",
            lang="en",
            tokenizer=_cl100k(),
            chunk_size=chunk_size,
        )
        raw = [
            (chunk.text, int(chunk.token_count))
            for chunk in chunker.chunk(text)
        ]
        chunks = _to_raw_chunks(file_hash, raw)
        logger.info(f"Markdown (Chonkie Recursive): {len(chunks)} chunks created")
        return chunks

    @staticmethod
    def chunk_text_semantic(
        text: str,
        file_hash: str,
        target_size: Optional[int] = None,
        *,
        threshold: Optional[float] = None,
        recursive_size: Optional[int] = None,
    ) -> List[Dict]:
        """Chonkie Pipeline: recursive(markdown) → SemanticChunker + Gemini."""
        if not text:
            return []

        if recursive_size is None:
            recursive_size = settings.RAG_RECURSIVE_SIZE
        if target_size is None:
            target_size = settings.RAG_SEMANTIC_TARGET
        if threshold is None:
            threshold = settings.RAG_SEMANTIC_THRESHOLD

        pipe = (
            Pipeline()
            .chunk_with(
                "recursive",
                tokenizer=_cl100k(),
                chunk_size=recursive_size,
                recipe="markdown",
                lang="en",
            )
            .chunk_with(
                "semantic",
                embedding_model=_gemini_embeddings(),
                chunk_size=target_size,
                threshold=threshold,
                similarity_window=settings.RAG_SEMANTIC_SIMILARITY_WINDOW,
                min_sentences_per_chunk=settings.RAG_SEMANTIC_MIN_SENTENCES,
                min_characters_per_sentence=settings.RAG_SEMANTIC_MIN_CHARS_PER_SENTENCE,
                skip_window=settings.RAG_SEMANTIC_SKIP_WINDOW,
                filter_window=settings.RAG_SEMANTIC_FILTER_WINDOW,
                filter_tolerance=settings.RAG_SEMANTIC_FILTER_TOLERANCE,
                delim=[". ", "! ", "? ", "\n\n"],
                include_delim="prev",
            )
        )
        doc = pipe.run(texts=text)
        raw = [
            (chunk.text, int(chunk.token_count))
            for chunk in doc.chunks
        ]
        chunks = _to_raw_chunks(file_hash, raw)
        logger.info(
            "Semantic (Pipeline recursive→Gemini): "
            f"{len(chunks)} chunks (recursive_size={recursive_size}, "
            f"semantic_size={target_size})"
        )
        return chunks

    @staticmethod
    def _chunk_document_raw(
        text: str,
        file_hash: str,
        strategy: Optional[str] = None,
        chunk_size: Optional[int] = None,
        chunk_overlap: Optional[int] = None,
    ) -> List[Dict]:
        """Dispatcher: chọn chiến lược chunking."""
        if strategy is None:
            strategy = settings.RAG_CHUNKING_STRATEGY

        cleaned = ParserService.preprocess_text(text)
        if strategy == "semantic":
            return ChunkingService.chunk_text_semantic(
                cleaned, file_hash, target_size=chunk_size
            )
        if strategy == "markdown":
            return ChunkingService.chunk_text_markdown(
                cleaned, file_hash, chunk_size=chunk_size, chunk_overlap=chunk_overlap
            )
        return ChunkingService.chunk_text_fixed(
            cleaned, file_hash, chunk_size=chunk_size, chunk_overlap=chunk_overlap
        )
