import os
from typing import List
from pydantic import ConfigDict
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", extra="allow")
    PROJECT_NAME: str = "WorkElate AI Agent"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]
    
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./workelate.db"
    
    # LLM Settings
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"
    
    # CLI Execution Limits
    CLI_EXECUTION_TIMEOUT_SECONDS: int = 60
    MAX_CRAWL_DEPTH: int = 3
    MAX_CRAWL_PAGES: int = 15
    CRAWLER_USER_AGENT: str = "WorkElateCrawlerBot/1.0 (+https://github.com/workelate)"
    ALLOW_INTERNAL_IPS: bool = False

settings = Settings()
