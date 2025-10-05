"""Web search service for discovering membership benefits."""
import os
from typing import List, Dict

try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False


def search_membership_sites(query: str, limit: int = 5) -> List[Dict[str, str]]:
    """
    Search the web for membership benefit pages.
    
    Args:
        query: Search query (e.g., "XYZ Club Premium membership benefits")
        limit: Maximum number of results to return
        
    Returns:
        List of {"title": str, "url": str} dicts
    """
    # Try to use DuckDuckGo as a free fallback
    # For production, consider: SerpAPI, Bing Search API, or Google Custom Search
    
    try:
        from duckduckgo_search import DDGS
        
        results = []
        with DDGS() as ddgs:
            search_results = ddgs.text(query, max_results=limit)
            for result in search_results:
                results.append({
                    "title": result.get("title", ""),
                    "url": result.get("href", result.get("url", "")),
                })
        return results
        
    except ImportError:
        # Fallback: return empty or use a different method
        print("Warning: duckduckgo_search not installed. Install with: pip install duckduckgo-search")
        return _fallback_search(query, limit)
    except Exception as e:
        print(f"Search failed: {e}")
        return _fallback_search(query, limit)


def _fallback_search(query: str, limit: int) -> List[Dict[str, str]]:
    """
    Fallback search using Bing Search API if BING_SEARCH_KEY is set.
    Otherwise returns empty list.
    """
    bing_key = os.getenv("BING_SEARCH_KEY")
    
    if not bing_key:
        print("No BING_SEARCH_KEY found. Returning empty results.")
        return []
    
    try:
        endpoint = "https://api.bing.microsoft.com/v7.0/search"
        headers = {"Ocp-Apim-Subscription-Key": bing_key}
        params = {"q": query, "count": limit, "mkt": "en-GB"}
        
        with httpx.Client() as client:
            response = client.get(endpoint, headers=headers, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            results = []
            for item in data.get("webPages", {}).get("value", []):
                results.append({
                    "title": item.get("name", ""),
                    "url": item.get("url", ""),
                })
            return results[:limit]
            
    except Exception as e:
        print(f"Bing search failed: {e}")
        return []

