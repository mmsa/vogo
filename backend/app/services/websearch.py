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
    import time

    # Try multiple times with delays (DuckDuckGo can be rate-limited)
    max_retries = 3
    for attempt in range(max_retries):
        try:
            if attempt > 0:
                delay = 2 * attempt  # Exponential backoff: 2s, 4s
                print(
                    f"  ⏳ Retrying search (attempt {attempt + 1}/{max_retries}) after {delay}s delay..."
                )
                time.sleep(delay)

            ddgs = DDGS()
            print(f"  🔎 Executing DuckDuckGo search: '{query}'")

            # Try with different parameters
            try:
                # First try: standard search
                results = ddgs.text(query, max_results=limit)
            except Exception as e1:
                print(
                    f"  ⚠️ Standard search failed: {e1}, trying with different params..."
                )
                # Try with safesearch off and different region
                try:
                    results = ddgs.text(query, max_results=limit, safesearch="off")
                except Exception as e2:
                    print(f"  ⚠️ Alternative search also failed: {e2}")
                    raise e1

            # Convert generator to list to check if we got results
            results_list = list(results) if results else []
            print(f"  📊 DuckDuckGo returned {len(results_list)} raw results")

            formatted_results = []
            for r in results_list:
                href = r.get("href", "")
                if href and "http" in href:
                    formatted_results.append(
                        {
                            "url": href,
                            "title": r.get("title", ""),
                            "snippet": r.get("body", ""),
                        }
                    )
                    print(f"    ✓ Found: {r.get('title', href)}")

            if formatted_results:
                print(f"  ✅ Formatted {len(formatted_results)} valid results")
                return formatted_results[:limit]
            elif attempt < max_retries - 1:
                print(f"  ⚠️ No results found, will retry...")
                continue
            else:
                print(f"  ⚠️ No results after {max_retries} attempts")
                return []

        except Exception as e:
            print(f"  ❌ DuckDuckGo search failed (attempt {attempt + 1}): {e}")
            if attempt == max_retries - 1:
                import traceback

                traceback.print_exc()
                return []
            # Continue to retry

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
        headers = {"User-Agent": "vogoplus.app Bot/1.0 (Membership benefits aggregator)"}

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
