"""Page fetching and text extraction service."""
import httpx
from typing import List, Dict
from bs4 import BeautifulSoup


def fetch_pages(urls: List[str], timeout: int = 10) -> List[Dict[str, str]]:
    """
    Fetch multiple URLs and extract clean text.
    
    Args:
        urls: List of URLs to fetch
        timeout: Request timeout in seconds
        
    Returns:
        List of {"url": str, "html": str, "text": str} dicts
    """
    results = []
    
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; VogoBot/1.0; +https://vogo.com/bot)"
    }
    
    for url in urls:
        try:
            with httpx.Client(follow_redirects=True) as client:
                response = client.get(url, headers=headers, timeout=timeout)
                response.raise_for_status()
                
                html = response.text
                text = _extract_clean_text(html)
                
                results.append({
                    "url": url,
                    "html": html[:50000],  # Limit HTML size
                    "text": text[:12000],  # Limit text to 12k chars as per spec
                })
                
        except Exception as e:
            print(f"Failed to fetch {url}: {e}")
            # Continue with other URLs
            
    return results


def _extract_clean_text(html: str) -> str:
    """
    Extract readable text from HTML, removing boilerplate.
    
    Uses BeautifulSoup to parse and extract main content.
    """
    try:
        soup = BeautifulSoup(html, "html.parser")
        
        # Remove script, style, nav, footer, and other non-content tags
        for tag in soup(["script", "style", "nav", "footer", "header", "aside", "iframe"]):
            tag.decompose()
        
        # Extract text
        text = soup.get_text(separator="\n", strip=True)
        
        # Clean up whitespace
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        text = "\n".join(lines)
        
        return text
        
    except Exception as e:
        print(f"Text extraction failed: {e}")
        # Fallback: return raw text
        return html[:12000]

