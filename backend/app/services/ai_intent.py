import re
import json
import logging
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from app.config import settings

logger = logging.getLogger(__name__)

class ExecutionPlanStep(BaseModel):
    step: int
    title: str
    description: str

class IntentAnalysisResult(BaseModel):
    task_type: str # 'website_crawling', 'general_query', 'unsupported'
    target_url: Optional[str] = None
    parameters: Dict[str, Any] = {}
    expected_output_format: str = "json_and_summary"
    selected_tool: str = "web_crawler"
    execution_plan: List[ExecutionPlanStep]
    confidence: float = 1.0

class AIIntentService:
    """
    Understands natural-language instructions, identifies task type, extracts URLs,
    determines output format, and generates a structured execution plan.
    Uses Gemini API when configured, with a resilient rule-based intent engine fallback.
    """

    @classmethod
    async def analyze_prompt(cls, prompt: str) -> IntentAnalysisResult:
        if settings.GEMINI_API_KEY:
            try:
                import google.generativeai as genai
                genai.configure(api_key=settings.GEMINI_API_KEY)
                model = genai.GenerativeModel(settings.GEMINI_MODEL)
                
                system_instruction = (
                    "You are the intent analyzer for an autonomous AI Agent with an approved CLI execution engine.\n"
                    "Analyze the user's prompt and extract structured intent.\n"
                    "Output ONLY valid JSON with keys:\n"
                    "{\n"
                    '  "task_type": "website_crawling" | "general_query",\n'
                    '  "target_url": "extracted URL or null",\n'
                    '  "parameters": {"max_pages": 1, "depth": 1},\n'
                    '  "expected_output_format": "json_and_summary",\n'
                    '  "selected_tool": "web_crawler",\n'
                    '  "execution_plan": [\n'
                    '    {"step": 1, "title": "Understanding your request...", "description": "Analyzing user intent"},\n'
                    '    {"step": 2, "title": "Identified task: Website crawling.", "description": "Task classification"},\n'
                    '    {"step": 3, "title": "Extracted URL...", "description": "URL extraction"},\n'
                    '    {"step": 4, "title": "Validating URL and security restrictions...", "description": "SSRF & domain safety validation"},\n'
                    '    {"step": 5, "title": "Creating execution plan...", "description": "Building CLI parameters"},\n'
                    '    {"step": 6, "title": "Selecting website crawler CLI...", "description": "Selecting approved tool"},\n'
                    '    {"step": 7, "title": "Starting CLI process...", "description": "Spawning subprocess"},\n'
                    '    {"step": 8, "title": "CLI process started successfully.", "description": "Process running"},\n'
                    '    {"step": 9, "title": "Connecting to website...", "description": "HTTP client handshake"},\n'
                    '    {"step": 10, "title": "Extracting page content...", "description": "Parsing DOM, headings, paragraphs, links"},\n'
                    '    {"step": 11, "title": "Processing extracted information...", "description": "Formatting structured data"},\n'
                    '    {"step": 12, "title": "Generating structured JSON...", "description": "Creating validated JSON"},\n'
                    '    {"step": 13, "title": "Validating JSON output...", "description": "Schema check"},\n'
                    '    {"step": 14, "title": "Generating final summary...", "description": "Synthesizing AI summary"},\n'
                    '    {"step": 15, "title": "Task completed successfully.", "description": "Returning results"}\n'
                    "  ]\n"
                    "}"
                )

                response = await model.generate_content_async(
                    f"{system_instruction}\n\nUser Request: {prompt}"
                )
                text = response.text.strip()
                # Clean markdown json code fences if any
                if text.startswith("```json"):
                    text = text[7:]
                if text.startswith("```"):
                    text = text[3:]
                if text.endswith("```"):
                    text = text[:-3]
                data = json.loads(text.strip())

                # Validate against Pydantic model
                return IntentAnalysisResult(
                    task_type=data.get("task_type", "website_crawling"),
                    target_url=data.get("target_url"),
                    parameters=data.get("parameters", {"max_pages": 1, "depth": 1}),
                    expected_output_format=data.get("expected_output_format", "json_and_summary"),
                    selected_tool=data.get("selected_tool", "web_crawler"),
                    execution_plan=[ExecutionPlanStep(**s) for s in data.get("execution_plan", [])] or cls._default_plan(data.get("target_url")),
                    confidence=0.98
                )
            except Exception as e:
                logger.warning(f"Gemini API intent analysis failed: {e}. Falling back to rule-based engine.")

        # Fallback rule-based analysis
        return cls._rule_based_analysis(prompt)

    @classmethod
    def _rule_based_analysis(cls, prompt: str) -> IntentAnalysisResult:
        # Extract URL
        url_match = re.search(r'(https?://[^\s<>"]+|www\.[^\s<>"]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:/[^\s]*)?)', prompt)
        target_url = None
        if url_match:
            raw_url = url_match.group(1).rstrip(".,;:?!)")
            if not raw_url.startswith("http://") and not raw_url.startswith("https://"):
                target_url = f"https://{raw_url}"
            else:
                target_url = raw_url

        # Check for max pages or depth keywords
        max_pages = 1
        depth = 1
        pages_match = re.search(r'(\d+)\s*(?:pages|page)', prompt, re.IGNORECASE)
        if pages_match:
            max_pages = min(int(pages_match.group(1)), 10)

        depth_match = re.search(r'(?:depth|level)\s*(\d+)', prompt, re.IGNORECASE)
        if depth_match:
            depth = min(int(depth_match.group(1)), 3)

        is_crawl_query = bool(
            target_url or
            re.search(r'\b(crawl|scrape|extract|visit|website|url|summarize|fetch|json|data)\b', prompt, re.IGNORECASE)
        )

        task_type = "website_crawling" if is_crawl_query else "general_query"

        plan = cls._default_plan(target_url or "target website")

        return IntentAnalysisResult(
            task_type=task_type,
            target_url=target_url,
            parameters={"max_pages": max_pages, "depth": depth},
            expected_output_format="json_and_summary",
            selected_tool="web_crawler",
            execution_plan=plan,
            confidence=0.95 if target_url else 0.70
        )

    @staticmethod
    def _default_plan(url: Optional[str]) -> List[ExecutionPlanStep]:
        display_url = url or "target website"
        return [
            ExecutionPlanStep(step=1, title="Understanding your request...", description="Analyzing user prompt"),
            ExecutionPlanStep(step=2, title="Identified task: Website crawling.", description="Task classified as web extraction"),
            ExecutionPlanStep(step=3, title=f"Extracted URL: {display_url}", description="Extracted target parameter"),
            ExecutionPlanStep(step=4, title="Validating URL and security restrictions...", description="Checking SSRF, internal IPs, protocols"),
            ExecutionPlanStep(step=5, title="Creating execution plan...", description="Configuring crawl depth and limits"),
            ExecutionPlanStep(step=6, title="Selecting website crawler CLI...", description="Selected approved tool 'web_crawler'"),
            ExecutionPlanStep(step=7, title="Starting CLI process...", description="Spawning subprocess asynchronously"),
            ExecutionPlanStep(step=8, title="CLI process started successfully.", description="Process PID active"),
            ExecutionPlanStep(step=9, title="Connecting to website...", description="HTTP handshake and TLS negotiation"),
            ExecutionPlanStep(step=10, title="Extracting page content...", description="Parsing HTML, metadata, headings, paragraphs, links"),
            ExecutionPlanStep(step=11, title="Processing extracted information...", description="Aggregating pages and calculating stats"),
            ExecutionPlanStep(step=12, title="Generating structured JSON...", description="Serializing structured crawl data"),
            ExecutionPlanStep(step=13, title="Validating JSON output...", description="Ensuring schema adherence and data completeness"),
            ExecutionPlanStep(step=14, title="Generating final summary...", description="Generating AI synthesis and insights"),
            ExecutionPlanStep(step=15, title="Task completed successfully.", description="Returning structured result and logs")
        ]
