"""Web page metadata scraper for semantic matching."""

import httpx
from bs4 import BeautifulSoup
from typing import Dict, Optional


async def scrape_page_metadata(url: str, timeout: int = 10) -> Dict[str, str]:
    """
    Scrape key metadata from a web page for semantic matching.

    Args:
        url: Full URL to scrape
        timeout: Request timeout in seconds

    Returns:
        Dictionary with page metadata
    """
    print(f"      🌐 Scraping: {url}")
    try:
        # Use realistic browser headers to avoid 403 blocks
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-GB,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "DNT": "1",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Cache-Control": "max-age=0",
        }
        
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=timeout,
            headers=headers,
        ) as client:
            print(f"      📡 Sending HTTP request (real browser headers)...")
            response = await client.get(url)
            print(f"      ✅ Got response: {response.status_code}")
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "html.parser")

            # Extract metadata
            metadata = {
                "url": url,
                "domain": httpx.URL(url).host or "",
                "title": "",
                "description": "",
                "h1": "",
                "content_snippet": "",
                "og_title": "",
                "og_description": "",
                "keywords": "",
            }

            # Page title
            if soup.title:
                metadata["title"] = (
                    soup.title.string.strip() if soup.title.string else ""
                )

            # Meta description
            meta_desc = soup.find("meta", attrs={"name": "description"})
            if meta_desc and meta_desc.get("content"):
                metadata["description"] = str(meta_desc["content"]).strip()

            # H1 heading
            h1 = soup.find("h1")
            if h1:
                metadata["h1"] = h1.get_text(strip=True)

            # OpenGraph tags
            og_title = soup.find("meta", property="og:title")
            if og_title and og_title.get("content"):
                metadata["og_title"] = str(og_title["content"]).strip()

            og_desc = soup.find("meta", property="og:description")
            if og_desc and og_desc.get("content"):
                metadata["og_description"] = str(og_desc["content"]).strip()

            # Keywords
            meta_keywords = soup.find("meta", attrs={"name": "keywords"})
            if meta_keywords and meta_keywords.get("content"):
                metadata["keywords"] = str(meta_keywords["content"]).strip()

            # Content snippet (first few paragraphs)
            paragraphs = soup.find_all("p", limit=5)
            content_parts = []
            for p in paragraphs:
                text = p.get_text(strip=True)
                if len(text) > 50:  # Only meaningful paragraphs
                    content_parts.append(text)
            metadata["content_snippet"] = " ".join(content_parts)[:500]

            print(f"      ✅ Extracted: title={metadata.get('title', 'N/A')[:50]}")
            return metadata

    except Exception as e:
        # Return minimal metadata on error
        print(f"      ❌ SCRAPING ERROR: {type(e).__name__}: {str(e)}")
        return {
            "url": url,
            "domain": httpx.URL(url).host or "",
            "title": "",
            "description": "",
            "h1": "",
            "content_snippet": "",
            "og_title": "",
            "og_description": "",
            "keywords": "",
            "error": str(e),
        }


def metadata_to_text(metadata: Dict[str, str]) -> str:
    """
    Convert page metadata to searchable text for embeddings.

    Args:
        metadata: Page metadata dictionary

    Returns:
        Concatenated text for embedding
    """
    parts = []

    # Domain is most important
    if metadata.get("domain"):
        parts.append(f"Domain: {metadata['domain']}")

    # Title variations
    title = metadata.get("title") or metadata.get("og_title") or ""
    if title:
        parts.append(f"Title: {title}")

    # H1 if different from title
    h1 = metadata.get("h1", "")
    if h1 and h1.lower() != title.lower():
        parts.append(f"Heading: {h1}")

    # Description
    desc = metadata.get("description") or metadata.get("og_description") or ""
    if desc:
        parts.append(f"Description: {desc}")

    # Keywords
    if metadata.get("keywords"):
        parts.append(f"Keywords: {metadata['keywords']}")

    # Content snippet
    if metadata.get("content_snippet"):
        parts.append(f"Content: {metadata['content_snippet']}")

    return " | ".join(parts)
