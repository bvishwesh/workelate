import pytest
from app.crawler.engine import WebCrawlerEngine

SAMPLE_HTML = """
<!DOCTYPE html>
<html>
<head>
    <title>Acme Corporation - Cloud AI Services</title>
    <meta name="description" content="Acme Corporation leads in enterprise autonomous cloud systems." />
    <meta property="og:title" content="Acme Cloud Platform" />
</head>
<body>
    <header>
        <h1>Welcome to Acme Cloud</h1>
    </header>
    <main>
        <h2>Enterprise Features</h2>
        <p>Acme provides scalable, enterprise-grade AI infrastructure for modern mission-critical applications.</p>
        <p>Our autonomous deployment engine accelerates development while maintaining rigorous compliance standards.</p>
        <h3>Subsystems</h3>
        <p>Real-time analytics engine and distributed tracing support standard protocols.</p>
        <a href="/pricing">View Pricing</a>
        <a href="https://external-partner.com">Partner Portal</a>
    </main>
</body>
</html>
"""

def test_html_parsing():
    engine = WebCrawlerEngine()
    crawled = engine._parse_html(
        url="https://acme.example.com",
        html_text=SAMPLE_HTML,
        status_code=200,
        response_time_ms=120.5,
        depth=1,
        base_domain="acme.example.com"
    )

    assert crawled.title == "Acme Corporation - Cloud AI Services"
    assert crawled.meta_description == "Acme Corporation leads in enterprise autonomous cloud systems."
    assert "Welcome to Acme Cloud" in crawled.headings["h1"]
    assert "Enterprise Features" in crawled.headings["h2"]
    assert len(crawled.paragraphs) >= 2
    assert len(crawled.links) == 2

    # Check internal vs external link detection
    internal_links = [l for l in crawled.links if l["type"] == "internal"]
    external_links = [l for l in crawled.links if l["type"] == "external"]
    assert len(internal_links) == 1
    assert internal_links[0]["url"] == "https://acme.example.com/pricing"
    assert len(external_links) == 1
    assert external_links[0]["url"] == "https://external-partner.com"
