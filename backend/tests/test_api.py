import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database.connection import init_db

@pytest.mark.asyncio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data

@pytest.mark.asyncio
async def test_tools_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/tools")
        assert response.status_code == 200
        data = response.json()
        assert "tools" in data
        assert len(data["tools"]) >= 1

@pytest.mark.asyncio
async def test_session_lifecycle():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create session
        res = await client.post("/api/sessions", json={"title": "Test Exploration"})
        assert res.status_code == 200
        session_data = res.json()
        session_id = session_data["id"]

        # Get session
        get_res = await client.get(f"/api/sessions/{session_id}")
        assert get_res.status_code == 200
        assert get_res.json()["id"] == session_id

        # Delete session
        del_res = await client.delete(f"/api/sessions/{session_id}")
        assert del_res.status_code == 200

@pytest.mark.asyncio
async def test_completed_execution_stream():
    await init_db()
    # Create a completed execution record in DB
    from app.database.models import TaskExecution
    from app.database.connection import AsyncSessionLocal
    import uuid

    test_id = str(uuid.uuid4())
    async with AsyncSessionLocal() as db:
        rec = TaskExecution(
            id=test_id,
            user_prompt="Test crawl",
            execution_status="Completed",
            exit_code=0
        )
        db.add(rec)
        await db.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get(f"/api/executions/{test_id}/stream")
        assert res.status_code == 200
        text = res.text
        assert "event: connected" in text
        assert "event: complete" in text
