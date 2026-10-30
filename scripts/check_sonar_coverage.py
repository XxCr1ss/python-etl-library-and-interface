"""Enforce overall branch coverage only after the matching Sonar analysis finishes."""
import argparse
import json
import math
import os
from urllib.parse import urlencode
from urllib.request import Request, urlopen

PROJECT = "XxCr1ss_python-etl-library-and-interface"


def fetch(endpoint, parameters, token):
    request = Request("https://sonarcloud.io/api/" + endpoint + "?" + urlencode(parameters),
                      headers={"Authorization": "Bearer " + token} if token else {})
    with urlopen(request, timeout=30) as response:
        return json.load(response)


def check(branch, revision, minimum=80, token=None):
    parameters = {"project": PROJECT, "branch": branch, "ps": 1}
    analyses = fetch("project_analyses/search", parameters, token).get("analyses", [])
    if not analyses or analyses[0].get("revision") != revision:
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
