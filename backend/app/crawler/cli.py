import argparse
import asyncio
import json
import sys
import os

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.crawler.engine import WebCrawlerEngine
from app.services.security_validator import SecurityValidator, SecurityValidationError

def log_event(message: str):
    """Logs status message to stderr so stdout can remain clean JSON."""
    sys.stderr.write(f"[STATUS] {message}\n")
    sys.stderr.flush()

async def run_crawler_cli(args):
    log_event("Starting CLI process...")
    log_event("Validating URL and security restrictions...")

    # Step: Validate URL and security constraints
    try:
        sanitized = SecurityValidator.sanitize_arguments(
            url=args.url,
            max_pages=args.max_pages,
            depth=args.depth
        )
    except SecurityValidationError as e:
        sys.stderr.write(f"[ERROR] Security validation failed: {str(e)}\n")
        sys.stderr.flush()
        sys.exit(2)
    except Exception as e:
        sys.stderr.write(f"[ERROR] Unexpected validation error: {str(e)}\n")
        sys.stderr.flush()
        sys.exit(2)

    target_url = sanitized["url"]
    max_pages = sanitized["max_pages"]
    depth = sanitized["depth"]

    log_event(f"Validated parameters: URL={target_url}, max_pages={max_pages}, depth={depth}")
    log_event("CLI process started successfully.")

    # Initialize crawler engine
    engine = WebCrawlerEngine(
        status_callback=log_event,
        timeout=args.timeout
    )

    try:
        result = await engine.crawl(
            start_url=target_url,
            max_pages=max_pages,
            max_depth=depth
        )

        log_event("Validating JSON output...")
        json_output = json.dumps(result, indent=2)

        if args.output:
            with open(args.output, "w", encoding="utf-8") as f:
                f.write(json_output)
            log_event(f"Wrote structured output to {args.output}")

        # Always print JSON output to stdout
        sys.stdout.write(json_output + "\n")
        sys.stdout.flush()

        log_event(f"Task completed successfully: crawled {result['pages_crawled_count']} page(s).")
        sys.exit(0)

    except Exception as e:
        sys.stderr.write(f"[ERROR] Crawl execution failed: {str(e)}\n")
        sys.stderr.flush()
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(
        description="WorkElate Website Crawler CLI - Autonomous Structured Web Extractor"
    )
    parser.add_argument(
        "--url",
        required=True,
        help="Target website URL to crawl (HTTP or HTTPS)"
    )
    parser.add_argument(
        "--max-pages",
        type=int,
        default=1,
        help="Maximum number of pages to crawl (1-15)"
    )
    parser.add_argument(
        "--depth",
        type=int,
        default=1,
        help="Maximum crawl link depth (1-3)"
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=20.0,
        help="HTTP request timeout in seconds"
    )
    parser.add_argument(
        "--output",
        "-o",
        type=str,
        default=None,
        help="Optional path to write output JSON"
    )
    parser.add_argument(
        "--format",
        choices=["json", "text"],
        default="json",
        help="Output format"
    )

    args = parser.parse_args()
    asyncio.run(run_crawler_cli(args))

if __name__ == "__main__":
    main()
