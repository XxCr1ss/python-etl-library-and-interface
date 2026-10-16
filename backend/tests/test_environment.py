def test_health_and_deployment_entrypoint(client):
    from api.index import app as deployed
    from backend.main import app

    assert deployed is app
    assert client.get("/api/v1/health").json() == {
        "status": "ok", "message": "ETL API is running"
    }


def test_frontend_fixtures_match_http(client):
    import json
    from pathlib import Path

    directory = Path(__file__).resolve().parents[2] / "frontend/src/tests/fixtures"
    fixture = json.loads((directory / "backend-contracts.json").read_text(encoding="utf-8"))
    response = client.post("/api/v1/extract/upload", files={
        "file": ("sample_sales.csv", (directory / "sample_sales.csv").read_bytes())})
    assert response.status_code == 200
    upload = response.json()
    response = client.post("/api/v1/transform/preview", json={
        "source": {"type": "file", "filepath": upload["filepath"]}, "steps": [], "limit": 10})
    assert response.status_code == 200
    assert response.json() == fixture["previewResponse"]
    upload["filepath"] = fixture["uploadResponse"]["filepath"]
    upload["unique_filename"] = fixture["uploadResponse"]["unique_filename"]
    assert upload == fixture["uploadResponse"]


def test_browser_combination_oracles_match_real_http(client):
    import json
    from pathlib import Path
    directory = Path(__file__).resolve().parents[2] / "frontend/src/tests/fixtures"
    fixture = json.loads((directory / "backend-contracts.json").read_text(encoding="utf-8"))
    sources = {}
    for side in ("left", "right"):
        expected = fixture[f"combination{side.title()}Upload"]
        response = client.post("/api/v1/extract/upload", files={
            "file": (expected["filename"], (directory / expected["filename"]).read_bytes())})
        assert response.status_code == 200
        actual = response.json()
        sources[side] = {"type": "file", "filepath": actual["filepath"]}
        actual.update(filepath=expected["filepath"], unique_filename=expected["unique_filename"])
        assert actual == expected
    for kind, expected in fixture["combinations"].items():
        params = {"secondary_source": sources["right"]} if kind == "union" else {"right_source": sources["right"], "on": "id"}
        response = client.post("/api/v1/transform/preview", json={
            "source": sources["left"], "steps": [{"type": kind, "params": params}], "limit": 10})
        assert response.status_code == 200
        assert response.json() == expected
