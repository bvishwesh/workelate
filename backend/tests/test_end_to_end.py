import pytest
from app.database.connection import init_db, AsyncSessionLocal
from app.services.task_orchestrator import TaskOrchestrator
from app.database.models import TaskExecution
from sqlalchemy import select

@pytest.mark.asyncio
async def test_full_crawler_task_lifecycle():
    await init_db()

    orchestrator = TaskOrchestrator()
    result = await orchestrator.run_task(
        prompt="Crawl https://example.com and summarize it.",
        crawl_options={"max_pages": 1, "depth": 1}
    )

    assert result["status"] == "Completed"
    assert "execution_id" in result
    assert result["pages_crawled"] >= 1
    assert "summary" in result
    assert "structured_json" in result

    # Check database persistence
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(TaskExecution).where(TaskExecution.id == orchestrator.execution_id))
        record = res.scalar_one_or_none()
        assert record is not None
        assert record.execution_status == "Completed"
        assert record.exit_code == 0
        assert record.pages_crawled >= 1
        assert record.stdout != ""
        assert len(record.timeline_events) >= 10
