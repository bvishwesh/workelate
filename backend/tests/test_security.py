import pytest
from app.services.security_validator import SecurityValidator, SecurityValidationError

def test_valid_urls():
    valid_urls = [
        "https://example.com",
        "http://example.org/path?query=1",
        "example.com"
    ]
    for url in valid_urls:
        is_valid, normalized, err = SecurityValidator.validate_url(url)
        assert is_valid is True, f"Failed for {url}: {err}"
        assert normalized.startswith("http://") or normalized.startswith("https://")

def test_blocked_schemes():
    invalid_urls = [
        "ftp://example.com",
        "file:///etc/passwd",
        "javascript:alert(1)",
        "gopher://example.com"
    ]
    for url in invalid_urls:
        is_valid, _, err = SecurityValidator.validate_url(url)
        assert is_valid is False
        assert "Invalid scheme" in err

def test_ssrf_blocked_hostnames():
    blocked = [
        "http://localhost",
        "http://127.0.0.1:8000",
        "http://169.254.169.254/latest/meta-data/",
        "http://0.0.0.0",
        "http://metadata.google.internal"
    ]
    for url in blocked:
        is_valid, _, err = SecurityValidator.validate_url(url)
        assert is_valid is False
        assert "blocked by security policy" in err or "private/restricted" in err

def test_sanitize_arguments():
    # Enforces limits
    args = SecurityValidator.sanitize_arguments(
        url="https://example.com",
        max_pages=100, # beyond max
        depth=10       # beyond max
    )
    assert args["max_pages"] <= 15
    assert args["depth"] <= 3

def test_log_sanitization():
    raw_log = "Error occurred with api_key='AIzaSyD-dummyKey1234567890123456789' and Bearer eyJhbGciOi..."
    sanitized = SecurityValidator.sanitize_log_output(raw_log)
    assert "AIzaSyD-dummyKey1234567890123456789" not in sanitized
    assert "[REDACTED" in sanitized
