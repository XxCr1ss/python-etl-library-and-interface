"""Enforce overall coverage and duplication on the matching Sonar revision."""
import argparse
import json
import math
import os
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

PROJECT = "XxCr1ss_python-etl-library-and-interface"


def fetch(endpoint, parameters, token):
    url = "https://sonarcloud.io/api/" + endpoint + "?" + urlencode(parameters)
    headers = {"Authorization": "Bearer " + token} if token else {}
    request = Request(url, headers=headers)
    try:
        with urlopen(request, timeout=30) as response:
            return json.load(response)
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"SonarCloud API error ({exc.code} {exc.reason}) for {url}: {body}") from exc


def get_branch_revision(branch, token):
    """Retrieve the analyzed revision for a branch.

    Uses `project_branches/list` because it supports both SHORT and LONG branches,
    falling back to `project_analyses/search` for legacy compatibility if needed.
    """
    try:
        data = fetch("project_branches/list", {"project": PROJECT}, token)
        for b in data.get("branches", []):
            if b.get("name") == branch:
                sha = b.get("commit", {}).get("sha")
                if sha:
                    return sha
    except Exception:
        pass

    try:
        data = fetch("project_analyses/search", {"project": PROJECT, "branch": branch, "ps": 1}, token)
        analyses = data.get("analyses", [])
        if analyses:
            return analyses[0].get("revision")
    except Exception:
        pass

    return None


def measure_value(measures, metric, label):
    raw = next((item.get("value") for item in measures if item.get("metric") == metric), None)
    try:
        value = float(raw)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"SonarCloud did not return valid overall {label}.") from exc
    if isinstance(raw, bool) or not math.isfinite(value) or not 0 <= value <= 100:
        raise ValueError(f"SonarCloud did not return valid overall {label}.")
    return value


def check(branch, revision, minimum=80, token=None, maximum_duplication=None):
    latest_revision = get_branch_revision(branch, token)
    if not latest_revision or latest_revision != revision:
        raise ValueError("SonarCloud has no completed analysis for this branch and revision; refusing stale coverage.")

    metrics = "coverage" if maximum_duplication is None else "coverage,duplicated_lines_density"
    response = fetch("measures/component", {"component": PROJECT, "branch": branch, "metricKeys": metrics}, token)
    measures = response.get("component", {}).get("measures", [])
    value = measure_value(measures, "coverage", "coverage")
    if value < minimum:
        raise ValueError(f"Overall coverage {value:.1f}% is below {minimum:.1f}%.")
    if maximum_duplication is not None:
        if not math.isfinite(maximum_duplication) or not 0 < maximum_duplication <= 100:
            raise ValueError("The duplication limit must be finite and between 0 (exclusive) and 100.")
        duplication = measure_value(measures, "duplicated_lines_density", "duplication")
        if duplication >= maximum_duplication:
            raise ValueError(f"Overall duplication {duplication:.1f}% must be below {maximum_duplication:.1f}%.")
        if get_branch_revision(branch, token) != revision:
            raise ValueError("SonarCloud analysis changed while reading metrics; refusing stale results.")
    return value


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--branch", required=True)
    parser.add_argument("--revision", required=True)
    parser.add_argument("--minimum", type=float, default=80)
    parser.add_argument("--maximum-duplication", type=float, default=3.0)
    args = parser.parse_args()
    value = check(args.branch, args.revision, args.minimum, os.getenv("SONAR_TOKEN"), args.maximum_duplication)
    print(f"Overall coverage: {value:.1f}% ({args.branch}, {args.revision}).")
    print(f"Overall duplication is below {args.maximum_duplication:.1f}%.")


if __name__ == "__main__":
    main()
