"""Web search and fetching utilities."""

import httpx
from bs4 import BeautifulSoup
from duckduckgo_search import DDGS
from typing import List, Dict


def search_urls(query: str, limit: int = 5) -> List[str]:
    """
    Search DuckDuckGo and return URLs.

    Args:
        query: Search query string
        limit: Maximum number of URLs to return

    Returns:
        List of URLs
    """
    try:
        ddgs = DDGS()
        results = ddgs.text(query, max_results=limit)
        urls = [r["href"] for r in results if "http" in r.get("href", "")]
        return urls[:limit]
    except Exception as e:
        print(f"Search failed: {e}")
        return []


def search_membership_sites(query: str, limit: int = 5) -> List[Dict[str, str]]:
    """
    Search DuckDuckGo and return results with metadata.

    Backward compatibility function for existing code.

    Args:
        query: Search query string
        limit: Maximum number of results to return

    Returns:
        List of dicts with 'url', 'title', 'snippet'
    """
    try:
        ddgs = DDGS()
        results = ddgs.text(query, max_results=limit)

        formatted_results = []
        for r in results:
            if "http" in r.get("href", ""):
                formatted_results.append(
                    {
                        "url": r["href"],
                        "title": r.get("title", ""),
                        "snippet": r.get("body", ""),
                    }
                )

        return formatted_results[:limit]
    except Exception as e:
        print(f"Search failed: {e}")
        return []


def fetch_text(url: str, timeout: int = 12) -> Dict[str, str]:
    """
    Fetch and extract text from a URL.

    Args:
        url: URL to fetch
        timeout: Request timeout in seconds

    Returns:
        Dictionary with url, title, and text
    """
    try:
        headers = {"User-Agent": "VogPlus.ai Bot/1.0 (Membership benefits aggregator)"}

        with httpx.Client(
            follow_redirects=True, timeout=timeout, headers=headers
        ) as client:
            response = client.get(url)
            response.raise_for_status()
            html = response.text

        # Parse HTML
        soup = BeautifulSoup(html, "html.parser")

        # Extract title
        title = ""
        if soup.title and soup.title.string:
            title = soup.title.string.strip()[:120]

        # Extract text from paragraphs and lists
        text_elements = soup.find_all(["p", "li"])
        text = " ".join([elem.get_text(" ", strip=True) for elem in text_elements])

        # Limit text length
        text = text[:12000]

        return {"url": url, "title": title, "text": text}

    except Exception as e:
        print(f"Failed to fetch {url}: {e}")
        return {"url": url, "title": "", "text": ""}
