import asyncio
import time
from urllib.parse import urlparse, urljoin
from typing import List, Dict, Any, Set, Optional, Callable
import httpx
from bs4 import BeautifulSoup
from app.config import settings

class CrawledPage:
    def __init__(
        self,
        url: str,
        status_code: int,
        title: str,
        meta_description: str,
        metadata: Dict[str, Any],
        headings: Dict[str, List[str]],
        paragraphs: List[str],
        links: List[Dict[str, str]],
        raw_text_summary: str,
        response_time_ms: float,
        depth: int,
        json_ld: List[Dict[str, Any]] = None
    ):
        self.url = url
        self.status_code = status_code
        self.title = title
        self.meta_description = meta_description
        self.metadata = metadata
        self.headings = headings
        self.paragraphs = paragraphs
        self.links = links
        self.raw_text_summary = raw_text_summary
        self.response_time_ms = response_time_ms
        self.depth = depth
        self.json_ld = json_ld or []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "url": self.url,
            "status_code": self.status_code,
            "title": self.title,
            "meta_description": self.meta_description,
            "metadata": self.metadata,
            "headings": self.headings,
            "paragraphs": self.paragraphs[:15], # top 15 key paragraphs
            "total_paragraphs": len(self.paragraphs),
            "links_sample": self.links[:20],
            "total_links": len(self.links),
            "response_time_ms": round(self.response_time_ms, 2),
            "depth": self.depth,
            "json_ld_count": len(self.json_ld)
        }

class WebCrawlerEngine:
    """
    Real website crawler engine powered by httpx and BeautifulSoup4.
    Performs multi-page BFS crawl within same origin, extracting structured content.
    """

    def __init__(
        self,
        user_agent: Optional[str] = None,
        timeout: float = 15.0,
        status_callback: Optional[Callable[[str], None]] = None
    ):
        self.user_agent = user_agent or settings.CRAWLER_USER_AGENT
        self.timeout = timeout
        self.status_callback = status_callback or (lambda msg: None)

    def _log(self, message: str):
        self.status_callback(message)

    async def crawl(
        self,
        start_url: str,
        max_pages: int = 1,
        max_depth: int = 1
    ) -> Dict[str, Any]:
        parsed_start = urlparse(start_url)
        base_domain = parsed_start.netloc.lower()

        visited_urls: Set[str] = set()
        queue: List[tuple[str, int]] = [(start_url, 1)]
        pages: List[CrawledPage] = []
        errors: List[Dict[str, Any]] = []

        headers = {
            "User-Agent": self.user_agent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }

        self._log(f"Connecting to website: {start_url}")

        start_time = time.time()

        limits = httpx.Limits(max_keepalive_connections=5, max_connections=10)
        async with httpx.AsyncClient(headers=headers, timeout=self.timeout, follow_redirects=True, limits=limits) as client:
            while queue and len(pages) < max_pages:
                current_url, current_depth = queue.pop(0)

                # Normalize URL
                norm_current = current_url.split("#")[0].rstrip("/")
                if norm_current in visited_urls:
                    continue
                visited_urls.add(norm_current)

                self._log(f"Connecting to website: {current_url} (depth {current_depth}/{max_depth})")

                req_start = time.time()
                try:
                    response = await client.get(current_url)
                    req_duration = (time.time() - req_start) * 1000

                    self._log(f"Connected to {current_url} with status {response.status_code} ({req_duration:.1f}ms)")

                    if response.status_code >= 400:
                        errors.append({
                            "url": current_url,
                            "status_code": response.status_code,
                            "error": f"HTTP error {response.status_code}"
                        })
                        continue

                    content_type = response.headers.get("content-type", "").lower()
                    if "text/html" not in content_type and "application/xhtml" not in content_type:
                        self._log(f"Skipping non-HTML resource at {current_url} (Content-Type: {content_type})")
                        continue

                    self._log(f"Extracting page content from {current_url}...")
                    crawled_page = self._parse_html(
                        url=str(response.url),
                        html_text=response.text,
                        status_code=response.status_code,
                        response_time_ms=req_duration,
                        depth=current_depth,
                        base_domain=base_domain
                    )
                    pages.append(crawled_page)

                    self._log(
                        f"Extracted: '{crawled_page.title}' ({len(crawled_page.paragraphs)} paragraphs, {len(crawled_page.links)} links)"
                    )

                    # If multi-page crawling is requested and we have not exceeded depth
                    if current_depth < max_depth and len(pages) < max_pages:
                        for link_info in crawled_page.links:
                            link_url = link_info.get("url", "")
                            link_domain = urlparse(link_url).netloc.lower()
                            if link_domain == base_domain:
                                link_norm = link_url.split("#")[0].rstrip("/")
                                if link_norm not in visited_urls:
                                    queue.append((link_url, current_depth + 1))

                except httpx.TimeoutException:
                    self._log(f"Connection timed out for {current_url}")
                    errors.append({
                        "url": current_url,
                        "error": f"Timeout after {self.timeout}s"
                    })
                except Exception as e:
                    self._log(f"Error fetching {current_url}: {str(e)}")
                    errors.append({
                        "url": current_url,
                        "error": str(e)
                    })

        total_duration = time.time() - start_time
        self._log(f"Processing extracted information across {len(pages)} pages...")

        return {
            "target_url": start_url,
            "base_domain": base_domain,
            "pages_crawled_count": len(pages),
            "max_pages_requested": max_pages,
            "max_depth_requested": max_depth,
            "total_crawl_time_seconds": round(total_duration, 2),
            "pages": [p.to_dict() for p in pages],
            "errors": errors,
            "crawled_at": time.strftime("%Y-%m-%d %H:%M:%SZ", time.gmtime())
        }

    def _parse_html(
        self,
        url: str,
        html_text: str,
        status_code: int,
        response_time_ms: float,
        depth: int,
        base_domain: str
    ) -> CrawledPage:
        soup = BeautifulSoup(html_text, "html.parser")

        # Remove script and style elements
        for script_or_style in soup(["script", "style", "noscript", "svg"]):
            script_or_style.extract()

        # Title
        title = ""
        if soup.title and soup.title.string:
            title = soup.title.string.strip()
        elif soup.find("h1"):
            title = soup.find("h1").get_text(strip=True)

        # Meta tags
        metadata: Dict[str, Any] = {}
        meta_description = ""
        for meta in soup.find_all("meta"):
            name = meta.get("name", "").strip().lower() or meta.get("property", "").strip().lower()
            content = meta.get("content", "").strip()
            if name and content:
                metadata[name] = content
                if name in ("description", "og:description", "twitter:description") and not meta_description:
                    meta_description = content

        # Headings
        headings: Dict[str, List[str]] = {
            "h1": [h.get_text(strip=True) for h in soup.find_all("h1") if h.get_text(strip=True)],
            "h2": [h.get_text(strip=True) for h in soup.find_all("h2") if h.get_text(strip=True)],
            "h3": [h.get_text(strip=True) for h in soup.find_all("h3") if h.get_text(strip=True)][:15]
        }

        # Paragraphs & Body text
        paragraphs: List[str] = []
        for p in soup.find_all("p"):
            text = p.get_text(strip=True)
            if len(text) > 20: # skip empty or tiny fragments
                paragraphs.append(text)

        # Links
        links: List[Dict[str, str]] = []
        seen_links = set()
        for a in soup.find_all("a", href=True):
            href = a.get("href", "").strip()
            if not href or href.startswith("javascript:") or href.startswith("mailto:") or href.startswith("tel:"):
                continue

            absolute_url = urljoin(url, href)
            if absolute_url in seen_links:
                continue
            seen_links.add(absolute_url)

            anchor_text = a.get_text(strip=True) or href
            parsed_link = urlparse(absolute_url)
            is_internal = parsed_link.netloc.lower() == base_domain

            links.append({
                "url": absolute_url,
                "text": anchor_text[:60],
                "type": "internal" if is_internal else "external"
            })

        # Concise text summary for AI consumption
        combined_text = f"{title}\n{meta_description}\n" + "\n".join(paragraphs[:8])

        return CrawledPage(
            url=url,
            status_code=status_code,
            title=title,
            meta_description=meta_description,
            metadata=metadata,
            headings=headings,
            paragraphs=paragraphs,
            links=links,
            raw_text_summary=combined_text,
            response_time_ms=response_time_ms,
            depth=depth
        )
