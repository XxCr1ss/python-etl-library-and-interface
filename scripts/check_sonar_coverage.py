"""Enforce overall branch coverage only after the matching Sonar analysis finishes."""
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


def check(branch, revision, minimum=80, token=None):
    latest_revision = get_branch_revision(branch, token)
    if not latest_revision or (
        latest_revision != revision
        and not latest_revision.startswith(revision)
        and not revision.startswith(latest_revision)
    ):
        raise ValueError("SonarCloud has no completed analysis for this branch and revision; refusing stale coverage.")

    response = fetch("measures/component", {"component": PROJECT, "branch": branch, "metricKeys": "coverage"}, token)
    measures = response.get("component", {}).get("measures", [])
    value = next((float(m["value"]) for m in measures if m.get("metric") == "coverage"), None)
    if value is None or not math.isfinite(value) or not 0 <= value <= 100:
        raise ValueError("SonarCloud did not return valid overall coverage.")
    if value < minimum:
        raise ValueError(f"Overall coverage {value:.1f}% is below {minimum:.1f}%.")
    return value


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--branch", required=True)
    parser.add_argument("--revision", required=True)
    parser.add_argument("--minimum", type=float, default=80)
    args = parser.parse_args()
    value = check(args.branch, args.revision, args.minimum, os.getenv("SONAR_TOKEN"))
    print(f"Overall coverage: {value:.1f}% ({args.branch}, {args.revision}).")


if __name__ == "__main__":
    main()
