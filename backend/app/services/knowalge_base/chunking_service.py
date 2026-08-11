"""
Service chia nhỏ văn bản (Chunking) cho Knowledge Base.
Tách từ ingestion_service.py để đảm bảo giới hạn kích thước file.
"""
import re
from hashlib import sha256
from typing import Dict, List, Optional

from app.core.config import settings
from app.core.logger import get_logger
from app.services.knowalge_base.parser_service import ParserService
from app.utils.token import get_token_count
from app.schemas.agent_memory import SectionLocation
from app.schemas.ingestion import ParsedBaseChunk

logger = get_logger(__name__)


class ChunkingService:
    @staticmethod
    def chunk_document_v2(
        text: str,
        content_checksum: str,
        *,
        strategy: Optional[str] = None,
        chunk_size: Optional[int] = None,
        chunk_overlap: Optional[int] = None,
    ) -> tuple[ParsedBaseChunk, ...]:
        """Build deterministic typed chunks for a revisioned source."""
        file_hash = sha256(content_checksum.encode("utf-8")).hexdigest()[:24]
        chunks = ChunkingService.chunk_document(
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
        """Chia khối theo kích thước token cố định."""
        if not text:
            return []

        if chunk_size is None:
            chunk_size = settings.RAG_FIXED_SIZE
        if chunk_overlap is None:
            chunk_overlap = settings.RAG_FIXED_OVERLAP

        import tiktoken
        encoding = tiktoken.get_encoding("cl100k_base")
        tokens = encoding.encode(text)
        chunks = []
        step = max(1, chunk_size - chunk_overlap)

        for i in range(0, len(tokens), step):
            chunk_tokens = tokens[i : i + chunk_size]
            chunk_text = encoding.decode(chunk_tokens, errors="replace").strip("\ufffd").strip()
            if not chunk_text:
                continue

            chunks.append({
                "chunk_id": f"{file_hash}_{len(chunks)}",
                "text": chunk_text,
                "token_count": len(chunk_tokens),
            })

        logger.info(f"Fixed chunking: {len(chunks)} chunks created")
        return chunks

    @staticmethod
    def chunk_text_semantic(
        text: str,
        file_hash: str,
        target_size: Optional[int] = None,
        overlap_target: Optional[int] = None,
        pre_context_limit: Optional[int] = None,
        hard_limit: Optional[int] = None,
    ) -> List[Dict]:
        """Chia khối theo ngữ nghĩa (heading-aware)."""
        if not text:
            return []

        if target_size is None:
            target_size = settings.RAG_SEMANTIC_TARGET
        if overlap_target is None:
            overlap_target = settings.RAG_SEMANTIC_OVERLAP
        if pre_context_limit is None:
            pre_context_limit = settings.RAG_SEMANTIC_PRE_CONTEXT_LIMIT
        if hard_limit is None:
            hard_limit = settings.RAG_SEMANTIC_HARD_LIMIT

        separators_regex = r"(\n##+\s.*)"
        blocks = re.split(separators_regex, text)
        structured_blocks: list[str] = []
        i = 0
        while i < len(blocks):
            block = blocks[i].strip()
            if not block:
                i += 1
            elif re.match(separators_regex, block) and i + 1 < len(blocks):
                structured_blocks.append(f"{block}\n\n{blocks[i + 1].strip()}")
                i += 2
            else:
                structured_blocks.append(block)
                i += 1

        if not structured_blocks:
            return [{"chunk_id": f"{file_hash}_0", "text": text, "token_count": get_token_count(text)}] if text.strip() else []

        base_chunks: list[list[str]] = []
        current_base: list[str] = []
        current_tokens = 0

        for block in structured_blocks:
            block_tokens = get_token_count(block)
            if block_tokens > target_size:
                if current_base:
                    base_chunks.append(current_base)
                base_chunks.append([block])
                current_base = []
                current_tokens = 0
            elif current_tokens + block_tokens > target_size and current_base:
                base_chunks.append(current_base)
                current_base = [block]
                current_tokens = block_tokens
            else:
                current_base.append(block)
                current_tokens += block_tokens

        if current_base:
            base_chunks.append(current_base)

        final_chunks = []
        for idx, current_blocks in enumerate(base_chunks):
            final_blocks = list(current_blocks)

            if idx > 0:
                prev_blocks = base_chunks[idx - 1]
                last_unit = prev_blocks[-1]
                last_unit_tokens = get_token_count(last_unit)
                overlap_prepend: list[str] = []

                if last_unit_tokens <= hard_limit:
                    if last_unit_tokens > overlap_target:
                        overlap_prepend.append(last_unit)
                        if len(prev_blocks) > 1:
                            pre_ctx = prev_blocks[-2]
                            if get_token_count(pre_ctx) <= pre_context_limit:
                                overlap_prepend.insert(0, pre_ctx)
                    else:
                        current_overlap = 0
                        for prev_block in reversed(prev_blocks):
                            pb_tokens = get_token_count(prev_block)
                            if current_overlap + pb_tokens > overlap_target:
                                break
                            overlap_prepend.insert(0, prev_block)
                            current_overlap += pb_tokens

                final_blocks = overlap_prepend + final_blocks

            final_text = "\n\n".join(final_blocks)
            final_chunks.append({
                "chunk_id": f"{file_hash}_{len(final_chunks)}",
                "text": final_text,
                "token_count": get_token_count(final_text),
            })

        logger.info(f"Semantic chunking: {len(final_chunks)} chunks created")
        return final_chunks

    @staticmethod
    def chunk_document(
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
                cleaned, file_hash, target_size=chunk_size, overlap_target=chunk_overlap
            )
        return ChunkingService.chunk_text_fixed(
            cleaned, file_hash, chunk_size=chunk_size, chunk_overlap=chunk_overlap
        )
