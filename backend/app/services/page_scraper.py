"""Web page metadata scraper for semantic matching."""

import httpx
from bs4 import BeautifulSoup
from typing import Dict, Optional
from openai import OpenAI
from app.core.config import settings

# Initialize OpenAI client
openai_client = None
if settings.openai_api_key:
    openai_client = OpenAI(api_key=settings.openai_api_key)


def infer_metadata_from_url(url: str) -> Dict[str, str]:
    """
    Use LLM to infer page metadata when scraping fails.
    
    Args:
        url: Full URL to analyze
        
    Returns:
        Dictionary with inferred metadata
    """
    if not openai_client:
        # Fallback to basic URL parsing
        parsed_url = httpx.URL(url)
        domain = parsed_url.host or ""
        path = parsed_url.path
        path_parts = path.strip("/").split("/")
        path_text = " ".join(part.replace("-", " ").replace("_", " ") for part in path_parts if part)
        
        return {
            "url": url,
            "domain": domain,
            "title": f"{path_text} {domain}".strip() if path_text else domain,
            "description": f"Content from {domain}: {path_text}",
            "h1": path_text,
            "content_snippet": f"{domain} {path_text}",
            "og_title": "",
            "og_description": "",
            "keywords": "",
            "llm_inferred": False,
        }
    
    print(f"      🤖 Using LLM to infer page content from URL...")
    
    prompt = f"""Analyze this URL and infer what the page is about:

URL: {url}

Based on the domain and path, generate realistic page metadata as JSON:
{{
  "title": "Brief title (5-10 words)",
  "description": "What this page likely offers (1-2 sentences)",
  "keywords": "5-8 relevant keywords, comma-separated",
  "category": "Main category (e.g., travel, insurance, shopping, breakdown cover)"
}}

Be specific and realistic. Example:
- "amazon.co.uk/books" → title: "Books - Amazon UK", category: "shopping"
- "rac.co.uk/breakdown-cover" → title: "RAC Breakdown Cover", category: "breakdown cover"
"""
    
    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.3,
            max_tokens=200,
        )
        
        import json
        result = json.loads(response.choices[0].message.content)
        
        parsed_url = httpx.URL(url)
        domain = parsed_url.host or ""
        
        print(f"      ✅ LLM inferred: {result.get('title', 'N/A')}")
        
        return {
            "url": url,
            "domain": domain,
            "title": result.get("title", domain),
            "description": result.get("description", ""),
            "h1": result.get("title", ""),
            "content_snippet": result.get("description", ""),
            "og_title": "",
            "og_description": "",
            "keywords": result.get("keywords", ""),
            "category": result.get("category", ""),
            "llm_inferred": True,
        }
    
    except Exception as e:
        print(f"      ❌ LLM inference failed: {str(e)}")
        # Fall back to basic parsing
        parsed_url = httpx.URL(url)
        domain = parsed_url.host or ""
        path = parsed_url.path
        path_parts = path.strip("/").split("/")
        path_text = " ".join(part.replace("-", " ").replace("_", " ") for part in path_parts if part)
        
        return {
            "url": url,
            "domain": domain,
            "title": f"{path_text} {domain}".strip() if path_text else domain,
            "description": f"Content from {domain}: {path_text}",
            "h1": path_text,
            "content_snippet": f"{domain} {path_text}",
            "og_title": "",
            "og_description": "",
            "keywords": "",
            "llm_inferred": False,
        }


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
        # Scraping blocked - use LLM to infer metadata from URL!
        print(f"      ❌ SCRAPING BLOCKED: {type(e).__name__}")
        print(f"      🎯 FALLBACK: Using LLM to infer page content from URL")
        
        # Use LLM to understand what the page is about from the URL
        return infer_metadata_from_url(url)


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
