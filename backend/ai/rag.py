"""
rag.py — Retrieval-Augmented Generation (RAG) pipeline
=======================================================
Workflow
--------
1. Extract text from every PDF found in the *Articles* folder.
2. Split extracted text into overlapping chunks and rank them against the
   user query using TF-IDF cosine similarity.
3. If relevant chunks are found (score >= RELEVANCE_THRESHOLD), build a
   context string and pass it to the local LLM via backend.chat().
4. If no relevant local content is found, fall back to a DuckDuckGo web
   search, collect the top snippets, and pass those to the LLM instead.

Dependencies (see requirements.txt):
    pypdf, scikit-learn, duckduckgo-search
"""

import logging
import os
import textwrap
from typing import Any

# PDF text extraction
import pypdf

# TF-IDF similarity for retrieval
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# DuckDuckGo web search (no API key needed)
from duckduckgo_search import DDGS

# LLM interface from the existing backend
from backend import chat

# Configuration

# Absolute path to the folder that contains the PDF articles
ARTICLES_FOLDER = os.path.join(os.path.dirname(__file__), "Articles")

# Number of top chunks to pass to the LLM as context
TOP_K_CHUNKS = 5

# Minimum cosine-similarity score to consider a chunk *relevant*
RELEVANCE_THRESHOLD = 0.10

# Maximum characters per chunk (keeps LLM prompts manageable)
CHUNK_SIZE = 800

# Character overlap between consecutive chunks (preserves cross-chunk context)
CHUNK_OVERLAP = 150

# Number of web-search results to retrieve when local lookup fails
WEB_SEARCH_MAX_RESULTS = 5

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(name)s | %(message)s")
logger = logging.getLogger("skillpulse-rag")


# Step 1 — PDF text extraction

def extract_text_from_pdf(pdf_path: str) -> str:
    """
    Extract all plain text from a PDF file.

    Args:
        pdf_path: Absolute path to the PDF.

    Returns:
        Concatenated text of all pages, or an empty string on failure.
    """
    try:
        reader = pypdf.PdfReader(pdf_path)
        pages = [page.extract_text() or "" for page in reader.pages]
        text = "\n".join(pages)
        logger.debug("Extracted %d chars from '%s'", len(text), os.path.basename(pdf_path))
        return text
    except Exception as exc:
        logger.warning("Could not read '%s': %s", pdf_path, exc)
        return ""


def load_articles(folder_path: str) -> list[dict[str, str]]:
    """
    Load every PDF in *folder_path* and return a list of
    ``{"source": filename, "text": extracted_text}`` dictionaries.

    Args:
        folder_path: Path to the folder containing PDF files.

    Returns:
        List of article dictionaries; empty list if no PDFs are found.
    """
    if not os.path.isdir(folder_path):
        logger.error("Articles folder not found: %s", folder_path)
        return []

    articles: list[dict[str, str]] = []
    for filename in sorted(os.listdir(folder_path)):
        if filename.lower().endswith(".pdf"):
            full_path = os.path.join(folder_path, filename)
            text = extract_text_from_pdf(full_path)
            if text.strip():
                articles.append({"source": filename, "text": text})

    logger.info("Loaded %d PDF article(s) from '%s'", len(articles), folder_path)
    return articles


# Step 2 — Text chunking

def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """
    Split *text* into overlapping fixed-size character chunks.

    Overlapping ensures that information spanning a chunk boundary is not lost.

    Args:
        text:       Source text to split.
        chunk_size: Maximum characters per chunk.
        overlap:    Number of characters shared between consecutive chunks.

    Returns:
        Ordered list of text chunks.
    """
    chunks: list[str] = []
    step = max(1, chunk_size - overlap)
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += step
    return chunks


def build_chunk_index(articles: list[dict[str, str]]) -> list[dict[str, str]]:
    """
    Convert a list of article dicts into a flat list of chunk dicts.

    Each chunk dict has the keys ``source`` and ``text``.

    Args:
        articles: Output of :func:`load_articles`.

    Returns:
        Flat list of ``{"source": str, "text": str}`` chunks.
    """
    index: list[dict[str, str]] = []
    for article in articles:
        for chunk in chunk_text(article["text"]):
            if chunk.strip():           # skip whitespace-only chunks
                index.append({"source": article["source"], "text": chunk})
    logger.info("Built chunk index with %d chunks", len(index))
    return index


# Step 3 — TF-IDF similarity search

def search_article_folder(
    folder_path: str,
    query: str,
    top_k: int = TOP_K_CHUNKS,
    threshold: float = RELEVANCE_THRESHOLD,
) -> list[dict[str, Any]]:
    """
    Search the PDF articles in *folder_path* for content relevant to *query*.

    Uses TF-IDF vectorisation and cosine similarity to rank chunks.

    Args:
        folder_path: Path to the folder containing PDF articles.
        query:       User's question or search string.
        top_k:       Maximum number of top-ranked chunks to return.
        threshold:   Minimum similarity score; chunks below this are discarded.

    Returns:
        List of ``{"source": str, "text": str, "score": float}`` dicts,
        sorted by descending relevance.  Empty list if nothing qualifies.
    """
    logger.info("Searching articles for: '%s'", query)

    articles = load_articles(folder_path)
    if not articles:
        logger.warning("No articles available for search.")
        return []

    chunk_index = build_chunk_index(articles)
    if not chunk_index:
        logger.warning("Chunk index is empty.")
        return []

    # Build the TF-IDF matrix over all chunks + the query
    corpus = [c["text"] for c in chunk_index]
    try:
        vectorizer = TfidfVectorizer(stop_words="english")
        # fit on corpus so vocabulary is derived from the articles
        tfidf_matrix = vectorizer.fit_transform(corpus)
        query_vec = vectorizer.transform([query])
    except Exception as exc:
        logger.error("TF-IDF vectorization failed: %s", exc)
        return []

    # Cosine similarity between the query and every chunk
    scores = cosine_similarity(query_vec, tfidf_matrix).flatten()

    # Collect chunks that exceed the relevance threshold
    ranked = sorted(
        (
            {"source": chunk_index[i]["source"], "text": chunk_index[i]["text"], "score": float(scores[i])}
            for i in range(len(scores))
            if scores[i] >= threshold
        ),
        key=lambda x: x["score"],
        reverse=True,
    )[:top_k]

    if ranked:
        logger.info(
            "Found %d relevant chunk(s) (top score %.3f) for query '%s'",
            len(ranked),
            ranked[0]["score"],
            query,
        )
    else:
        logger.info("No chunks exceeded the relevance threshold (%.2f) for query '%s'", threshold, query)

    return ranked


# Step 4a — Pass local context to the LLM

def pass_to_llm(context_chunks: list[dict[str, Any]], query: str) -> str:
    """
    Send the retrieved context chunks together with the user query to the LLM.

    The LLM is instructed to answer *only* from the provided context so that
    answers remain grounded in the source articles.

    Args:
        context_chunks: Top-ranked chunks from :func:`search_article_folder`.
        query:          The original user question.

    Returns:
        LLM response string.
    """
    # Build a readable context block, labelling each source
    context_parts: list[str] = []
    for idx, chunk in enumerate(context_chunks, start=1):
        snippet = textwrap.shorten(chunk["text"], width=CHUNK_SIZE, placeholder="…")
        context_parts.append(f"[{idx}] Source: {chunk['source']}\n{snippet}")
    context_text = "\n\n".join(context_parts)

    system_prompt = (
        "You are a knowledgeable assistant specialising in IT skills, career development, "
        "and technology trends. You have been given a set of excerpts from research articles. "
        "Answer the user's question using ONLY the information in these excerpts. "
        "If the excerpts do not fully answer the question, state what is known and acknowledge the gap. "
        "Always cite the source filename when you use information from it."
    )

    user_prompt = (
        f"Context excerpts:\n\n{context_text}\n\n"
        f"Question: {query}\n\n"
        "Please provide a clear and accurate answer based on the context above."
    )

    logger.info("Sending %d context chunk(s) to LLM for query '%s'", len(context_chunks), query)
    return chat(system_prompt, user_prompt)


# Step 4b — Web search fallback

def search_web(query: str, max_results: int = WEB_SEARCH_MAX_RESULTS) -> list[dict[str, str]]:
    """
    Run a DuckDuckGo web search and return the top result snippets.

    No API key is required.  Each result dict contains ``title``, ``href``,
    and ``body`` keys.

    Args:
        query:       Search query string.
        max_results: Maximum number of results to retrieve.

    Returns:
        List of result dicts; empty list on failure.
    """
    logger.info("Performing web search for: '%s'", query)
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))
        logger.info("Web search returned %d result(s)", len(results))
        return results
    except Exception as exc:
        logger.error("Web search failed: %s", exc)
        return []


def pass_web_context_to_llm(web_results: list[dict[str, str]], query: str) -> str:
    """
    Pass web-search snippets to the LLM as context for the user query.

    Args:
        web_results: Results from :func:`search_web`.
        query:       The original user question.

    Returns:
        LLM response string, or a hardcoded fallback message when
        *web_results* is empty.
    """
    if not web_results:
        return "I could not find relevant information in the article library or via web search."

    # Build a labelled context block from the web snippets
    context_parts: list[str] = []
    for idx, result in enumerate(web_results, start=1):
        title = result.get("title", "Untitled")
        body = textwrap.shorten(result.get("body", ""), width=600, placeholder="…")
        href = result.get("href", "")
        context_parts.append(f"[{idx}] {title}\nURL: {href}\n{body}")
    context_text = "\n\n".join(context_parts)

    system_prompt = (
        "You are a knowledgeable assistant specialising in IT skills, career development, "
        "and technology trends. You have been given web-search snippets as context. "
        "Answer the user's question using these snippets. "
        "Cite the URL of your source where relevant, and acknowledge uncertainty if the snippets "
        "are insufficient to fully answer the question."
    )

    user_prompt = (
        f"Web search context:\n\n{context_text}\n\n"
        f"Question: {query}\n\n"
        "Please provide a clear and accurate answer based on the context above."
    )

    logger.info("Sending %d web snippet(s) to LLM for query '%s'", len(web_results), query)
    return chat(system_prompt, user_prompt)


# Step 5 — Main orchestration

def main(query: str, folder_path: str = ARTICLES_FOLDER) -> str:
    """
    End-to-end RAG pipeline:

    1. Search the local article folder for relevant PDF content.
    2. If found  → pass context to the LLM and return its answer.
    3. If not    → fall back to a DuckDuckGo web search, pass results to the
                   LLM, and return its answer.

    Args:
        query:       The user's question / search string.
        folder_path: Path to the folder containing PDF articles.
                     Defaults to the ``Articles/`` directory next to this file.

    Returns:
        A string response generated by the LLM.
    """
    if not query or not query.strip():
        logger.error("Empty query provided.")
        return "Please provide a non-empty query."

    # ---- 1. Local article search ----------------------------------------
    relevant_chunks = search_article_folder(folder_path, query)

    if relevant_chunks:
        # ---- 2. Local context → LLM ------------------------------------
        logger.info("Using local article context for query: '%s'", query)
        return pass_to_llm(relevant_chunks, query)

    # ---- 3. Web search fallback ----------------------------------------
    logger.info("No local context found. Falling back to web search for: '%s'", query)
    web_results = search_web(query)
    return pass_web_context_to_llm(web_results, query)


# CLI entry-point
if __name__ == "__main__":
    import sys

    # Accept query from command-line argument, or prompt interactively
    if len(sys.argv) > 1:
        user_query = " ".join(sys.argv[1:])
    else:
        user_query = input("Enter your query: ").strip()

    answer = main(user_query)
    print("\n" + "=" * 70)
    print("ANSWER")
    print("=" * 70)
    print(answer)

