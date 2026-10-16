import base64
import pytest
from tests.integration.artifact_audit import audit_artifacts


@pytest.mark.parametrize("encoding", [lambda s: s, lambda s: base64.b64encode(s.encode()).decode()])
def test_rejects_credentials_even_in_failure_artifacts(tmp_path, encoding):
    secret = "synthetic-password-audit-42"
    for name in ("summary.json", "junit.xml", "index.html"):
        (tmp_path / name).write_text("public failed result", encoding="utf-8")
    assert audit_artifacts(tmp_path, secret) == 3
    (tmp_path / "junit.xml").write_text(encoding(secret), encoding="utf-8")
    with pytest.raises(ValueError, match="credencial"):
        audit_artifacts(tmp_path, secret)


def test_rejects_raw_trace_and_missing_reports(tmp_path):
    with pytest.raises(ValueError, match="Faltan"):
        audit_artifacts(tmp_path, "")
    for name in ("summary.json", "junit.xml", "index.html", "trace.zip"):
        (tmp_path / name).write_text("public result", encoding="utf-8")
    with pytest.raises(ValueError, match="crudo"):
        audit_artifacts(tmp_path, "")
