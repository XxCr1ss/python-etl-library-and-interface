import pytest

from scripts import check_sonar_coverage as gate


@pytest.mark.parametrize("value,accepted", [("79.9", False), ("80.0", True), ("85.2", True)])
def test_gate_uses_overall_coverage_for_the_matching_branch_and_revision(monkeypatch, value, accepted):
    calls = []

    def fetch(endpoint, parameters, token):
        calls.append((endpoint, parameters))
        if endpoint == "project_branches/list":
            return {"branches": [{"name": "sonar/coverage", "commit": {"sha": "current"}}]}
        return {"component": {"measures": [{"metric": "coverage", "value": value}]}}

    monkeypatch.setattr(gate, "fetch", fetch)
    if accepted:
        assert gate.check("sonar/coverage", "current") == float(value)
    else:
        with pytest.raises(ValueError, match="below"):
            gate.check("sonar/coverage", "current")
    assert any(parameters.get("branch") == "sonar/coverage" for _, parameters in calls)


def test_gate_rejects_missing_branch_analysis(monkeypatch):
    calls = []

    def fetch(endpoint, parameters, token):
        calls.append(endpoint)
        return {"branches": []}

    monkeypatch.setattr(gate, "fetch", fetch)
    with pytest.raises(ValueError, match="stale"):
        gate.check("sonar/coverage", "current")
    assert calls == ["project_branches/list", "project_analyses/search"]


def test_gate_rejects_stale_branch_analysis(monkeypatch):
    calls = []

    def fetch(endpoint, parameters, token):
        calls.append(endpoint)
        return {"branches": [{"name": "sonar/coverage", "commit": {"sha": "outdated"}}]}

    monkeypatch.setattr(gate, "fetch", fetch)
    with pytest.raises(ValueError, match="stale"):
        gate.check("sonar/coverage", "current")
    assert calls == ["project_branches/list"]


def test_gate_falls_back_to_project_analyses_for_long_branches(monkeypatch):
    calls = []

    def fetch(endpoint, parameters, token):
        calls.append(endpoint)
        if endpoint == "project_branches/list":
            return {"branches": []}
        if endpoint == "project_analyses/search":
            return {"analyses": [{"revision": "current"}]}
        return {"component": {"measures": [{"metric": "coverage", "value": "85.0"}]}}

    monkeypatch.setattr(gate, "fetch", fetch)
    assert gate.check("main", "current") == 85.0
    assert calls == ["project_branches/list", "project_analyses/search", "measures/component"]


def test_gate_rejects_missing_coverage(monkeypatch):
    monkeypatch.setattr(
        gate,
        "fetch",
        lambda endpoint, parameters, token: (
            {"branches": [{"name": "main", "commit": {"sha": "current"}}]}
            if endpoint == "project_branches/list"
            else {"component": {}}
        ),
    )
    with pytest.raises(ValueError, match="did not return"):
        gate.check("main", "current")


@pytest.mark.parametrize("value", ["NaN", "inf", "101"])
def test_gate_fails_closed_for_invalid_metric_values(monkeypatch, value):
    monkeypatch.setattr(
        gate,
        "fetch",
        lambda endpoint, parameters, token: (
            {"branches": [{"name": "main", "commit": {"sha": "current"}}]}
            if endpoint == "project_branches/list"
            else {"component": {"measures": [{"metric": "coverage", "value": value}]}}
        ),
    )
    with pytest.raises(ValueError, match="valid overall coverage"):
        gate.check("main", "current")
