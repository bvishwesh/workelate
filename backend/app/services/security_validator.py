import ipaddress
import socket
from urllib.parse import urlparse
from typing import Tuple, Optional
from app.config import settings

class SecurityValidationError(Exception):
    def __init__(self, message: str, code: str = "SECURITY_VIOLATION"):
        super().__init__(message)
        self.message = message
        self.code = code

class SecurityValidator:
    """
    Enforces security policies:
    - URL scheme validation (HTTP/HTTPS only)
    - Anti-SSRF: blocks private IPs, loopback, link-local, multicast, and AWS/cloud metadata IPs (169.254.169.254)
    - Hostname resolution validation
    - Safe crawl parameters validation (depth, max pages)
    """

    ALLOWED_SCHEMES = {"http", "https"}
    BLOCKED_HOSTNAMES = {
        "localhost",
        "127.0.0.1",
        "0.0.0.0",
        "::1",
        "metadata.google.internal",
        "169.254.169.254",
        "instance-data"
    }

    @classmethod
    def validate_url(cls, raw_url: str) -> Tuple[bool, str, Optional[str]]:
        """
        Validates URL against SSRF and protocol restrictions.
        Returns (is_valid, normalized_url, error_message).
        """
        if not raw_url or not isinstance(raw_url, str):
            return False, "", "URL cannot be empty."

        trimmed_url = raw_url.strip()
        try:
            initial_parsed = urlparse(trimmed_url)
            # If scheme is absent (e.g. "example.com" or "example.com/path"), prepend https://
            if not initial_parsed.scheme:
                trimmed_url = "https://" + trimmed_url
        except Exception:
            pass

        try:
            parsed = urlparse(trimmed_url)
        except Exception as e:
            return False, trimmed_url, f"Invalid URL syntax: {str(e)}"

        if parsed.scheme.lower() not in cls.ALLOWED_SCHEMES:
            return False, trimmed_url, f"Invalid scheme '{parsed.scheme}'. Only http:// and https:// are permitted."

        hostname = parsed.hostname
        if not hostname:
            return False, trimmed_url, "Missing host in URL."

        hostname_lower = hostname.lower()

        # Check explicit blocked hostnames
        if hostname_lower in cls.BLOCKED_HOSTNAMES or hostname_lower.endswith(".local") or hostname_lower.endswith(".internal"):
            return False, trimmed_url, f"Access to '{hostname}' is blocked by security policy (Internal/Loopback address)."

        # If internal IPs are allowed by explicit config (for local dev tests only)
        if settings.ALLOW_INTERNAL_IPS:
            return True, trimmed_url, None

        # Resolve IP addresses for the hostname to prevent DNS rebinding / SSRF to private IP ranges
        try:
            addr_info = socket.getaddrinfo(hostname, None)
            for item in addr_info:
                ip_str = item[4][0]
                ip_obj = ipaddress.ip_address(ip_str)

                if (
                    ip_obj.is_private
                    or ip_obj.is_loopback
                    or ip_obj.is_link_local
                    or ip_obj.is_multicast
                    or ip_obj.is_reserved
                    or ip_obj.is_unspecified
                ):
                    return False, trimmed_url, f"Resolved IP '{ip_str}' for host '{hostname}' is in a private/restricted address range."
        except socket.gaierror:
            # Domain could not be resolved
            return False, trimmed_url, f"Could not resolve hostname '{hostname}'. Host does not exist or DNS lookup failed."
        except Exception as e:
            return False, trimmed_url, f"DNS validation error: {str(e)}"

        return True, trimmed_url, None

    @classmethod
    def sanitize_arguments(cls, url: str, max_pages: int = 1, depth: int = 1) -> dict:
        """
        Validates and sanitizes crawler parameters within safe bounds.
        """
        is_valid, validated_url, error = cls.validate_url(url)
        if not is_valid:
            raise SecurityValidationError(error or "URL security validation failed")

        safe_max_pages = max(1, min(int(max_pages), settings.MAX_CRAWL_PAGES))
        safe_depth = max(1, min(int(depth), settings.MAX_CRAWL_DEPTH))

        return {
            "url": validated_url,
            "max_pages": safe_max_pages,
            "depth": safe_depth
        }

    @classmethod
    def sanitize_log_output(cls, text: str) -> str:
        """
        Strips sensitive tokens, API keys, or credentials from logs before sending to client or storing.
        """
        if not text:
            return ""
        
        # Redact common secrets patterns (Bearer tokens, API keys)
        import re
        sanitized = re.sub(r'(AIza[0-9A-Za-z-_]{35})', '[REDACTED_API_KEY]', text)
        sanitized = re.sub(r'Bearer\s+[A-Za-z0-9\-\._~\+\/]+=*', 'Bearer [REDACTED_TOKEN]', sanitized)
        sanitized = re.sub(r'(api[-_]?key\s*[:=]\s*)["\']?([^"\'\s]+)["\']?', r'\1[REDACTED]', sanitized, flags=re.IGNORECASE)
        sanitized = re.sub(r'(password\s*[:=]\s*)["\']?([^"\'\s]+)["\']?', r'\1[REDACTED]', sanitized, flags=re.IGNORECASE)
        return sanitized
