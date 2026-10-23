import ast
import asyncio
import copy
import inspect
import json
import re
from pathlib import Path

import pandas as pd
import pytest

from services import transform_service
from services.extract_service import clean_records

CASES = json.loads((Path(__file__).parent / "fixtures/operations.json").read_text(encoding="utf-8"))


def test_exact_catalog_dispatcher_frontend_parity(client):
    response = client.get("/api/v1/transform/operations")
    assert response.status_code == 200
    catalog = response.json()
    types = [item["type"] for item in catalog]
    from etl.recipe import apply_transformation_steps as apply_core_recipe
    tree = ast.parse(inspect.getsource(apply_core_recipe))
    dispatched = []
    # Only the dispatch chain: nested ifs choose which core join to call again.
    loop = next(node for node in tree.body[0].body if isinstance(node, ast.For))
    branch = next(node for node in loop.body if isinstance(node, ast.If))
    branch_params = {}
    while isinstance(branch, ast.If):
        value = branch.test.comparators[0]
        names = [value.value] if isinstance(value, ast.Constant) else [item.value for item in value.elts]
        dispatched.extend(names)
        parameters = {node.args[0].value for statement in branch.body for node in ast.walk(statement)
            if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)
            and isinstance(node.func.value, ast.Name) and node.func.value.id == "params"
            and node.func.attr == "get" and node.args and isinstance(node.args[0], ast.Constant)}
        branch_params.update({name: parameters for name in names})
        branch = branch.orelse[0]
    frontend_root = Path(__file__).resolve().parents[2] / "frontend/src"
    core_types = (frontend_root / "types/etl.ts").read_text(encoding="utf-8")
    assert "export type StepType = keyof StepParamsByType;" in core_types
    modal = (frontend_root / "app/(app)/transform/components/AddStepModal.tsx").read_text(encoding="utf-8")
    assert 'import type { StepType } from "@/types/etl";' in modal
    # Read the top-level keys of the shared parameter map, removing nested object
    # members first. TS typecheck and the frontend tests also check this map.
    declaration = core_types.split("export interface StepParamsByType {", 1)[1].split("\n}", 1)[0]
    while re.search(r"\{[^{}]*\}", declaration):
        declaration = re.sub(r"\{[^{}]*\}", "ObjectType", declaration)
    frontend = re.findall(r"(?:^|;)\s*([a-z_]+)\s*:", declaration)
    captured_catalog = json.loads((frontend_root / "tests/fixtures/operations-catalog.json").read_text(encoding="utf-8"))
    assert captured_catalog == catalog
    fixtures = [case["type"] for case in CASES]
    assert len(types) == len(set(types)) == 42
    assert len(dispatched) == len(set(dispatched)) == 42
    assert len(frontend) == len(set(frontend)) == 42
    assert len(fixtures) == len(set(fixtures)) == 42
    assert set(types) == set(dispatched) == set(frontend) == set(fixtures)
    for operation, case in zip(sorted(catalog, key=lambda x: x["type"]), sorted(CASES, key=lambda x: x["type"])):
        assert operation["name"] and operation["description"]
        assert set(case["params"]) <= set(operation["params"])
        assert set(operation["params"]) == branch_params[operation["type"]]
        assert all("type" in parameter and "required" in parameter and "description" in parameter
                   for parameter in operation["params"].values())


@pytest.mark.parametrize("case", CASES, ids=lambda case: case["type"])
def test_dispatcher_result_contract(case, tmp_path):
    params = copy.deepcopy(case["params"])
    if "secondary" in case:
        path = tmp_path / "secondary.csv"
        pd.DataFrame(case["secondary"]).to_csv(path, index=False)
        params = {key: {"type": "file", "filepath": str(path)} if value == "$secondary" else value
                  for key, value in params.items()}
    result = asyncio.run(transform_service.apply_transformation_steps(
        pd.DataFrame(case["input"]), [{"type": case["type"], "params": params}]))
    assert result.columns.tolist() == list(case["expected"])
    assert clean_records(result, len(result)) == clean_records(pd.DataFrame(case["expected"]), len(result) + 1)
    if case["type"] == "convert_to_ordered_category":
        assert result["level"].cat.ordered
        assert result["level"].cat.categories.tolist() == ["low", "high"]
    if case["type"] == "convert_types":
        assert result["a"].dtype == "int64"


@pytest.mark.parametrize("kind", ["left_join", "right_join", "inner_join", "outer_join"])
@pytest.mark.parametrize("keys", ["common", "different", "two_common"])
def test_join_key_interpretation_and_duplicates(kind, keys, tmp_path):
    # Existing intent: two names common to BOTH frames are a composite key;
    # otherwise [left_name, right_name] identifies differently named keys.
    left = pd.DataFrame({"id": [1, 2], "region": ["a", "a"]})
    right = pd.DataFrame({"id": [2, 2, 3], "region": ["a", "b", "a"]})
    if keys == "different":
        right = right.rename(columns={"id": "customer_id"})
        on = ["id", "customer_id"]
    else:
        on = ["id", "region"] if keys == "two_common" else "id"
    path = tmp_path / "right.csv"
    right.to_csv(path, index=False)
    result = asyncio.run(transform_service.apply_transformation_steps(left, [{"type": kind,
        "params": {"on": on, "right_source": {"type": "file", "filepath": str(path)}}}]))
    how = kind.replace("_join", "")
    expected = pd.merge(left, right, how=how, **({"left_on": "id", "right_on": "customer_id"}
        if keys == "different" else {"on": on}))
    pd.testing.assert_frame_equal(result.reset_index(drop=True), expected.reset_index(drop=True))
