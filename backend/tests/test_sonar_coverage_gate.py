import pytest

from scripts import check_sonar_coverage as gate


@pytest.mark.parametrize("value,accepted", [("79.9", False), ("80.0", True), ("85.2", True)])
def test_gate_uses_overall_coverage_for_the_matching_branch_and_revision(monkeypatch, value, accepted):
    calls = []
    def fetch(endpoint, parameters, token):
        calls.append((endpoint, parameters))
        if endpoint == 'project_analyses/search': return {'analyses': [{'revision': 'current'}]}
        return {'component': {'measures': [{'metric': 'coverage', 'value': value}]}}
    monkeypatch.setattr(gate, 'fetch', fetch)
    if accepted:
        assert gate.check('sonar/coverage', 'current') == float(value)
    else:
        with pytest.raises(ValueError, match='below'):
            gate.check('sonar/coverage', 'current')
    assert all(parameters['branch'] == 'sonar/coverage' for _, parameters in calls)


@pytest.mark.parametrize('analyses', [[], [{'revision': 'outdated'}]])
def test_gate_rejects_missing_or_stale_analysis_before_reading_coverage(monkeypatch, analyses):
    calls = []
    def fetch(endpoint, parameters, token):
        calls.append(endpoint)
        return {'analyses': analyses}
    monkeypatch.setattr(gate, 'fetch', fetch)
    with pytest.raises(ValueError, match='stale'):
        gate.check('main', 'current')
    assert calls == ['project_analyses/search']


def test_gate_rejects_missing_coverage(monkeypatch):
    monkeypatch.setattr(gate, 'fetch', lambda endpoint, parameters, token:
                        {'analyses': [{'revision': 'current'}]} if endpoint == 'project_analyses/search' else {'component': {}})
    with pytest.raises(ValueError, match='did not return'):
        gate.check('main', 'current')


@pytest.mark.parametrize('value', ['NaN', 'inf', '101'])
def test_gate_fails_closed_for_invalid_metric_values(monkeypatch, value):
    monkeypatch.setattr(gate, 'fetch', lambda endpoint, parameters, token:
                        {'analyses': [{'revision': 'current'}]} if endpoint == 'project_analyses/search'
                        else {'component': {'measures': [{'metric': 'coverage', 'value': value}]}})
    with pytest.raises(ValueError, match='valid overall coverage'):
        gate.check('main', 'current')
