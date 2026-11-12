#!/usr/bin/env python3
"""Structural and referential checks for an ingest bundle. Game-neutral: everything it checks is
read from the bundle itself, so it works unchanged for any game.

It does NOT run an optimizer. It proves the bundle is internally consistent before anyone wires
an adapter from it: schemas are valid, every record matches its schema, every id and spec_ref
resolves, weights sum to 1, and the acceptance cases only name things that exist.

Run from the bundle folder:  python3 tests/validate_bundle.py
Needs: PyYAML, jsonschema (>= 4.18, which brings `referencing`).
"""
from pathlib import Path
import json, math, re, sys

import yaml
from jsonschema import Draft202012Validator
from referencing import Registry, Resource

ROOT = Path(__file__).resolve().parent.parent
errors: list[str] = []


def check(ok: bool, message: str) -> None:
    if not ok:
        errors.append(message)


def unique(values, what: str) -> None:
    seen = set()
    for v in values:
        check(v not in seen, f"duplicate {what}: {v}")
        seen.add(v)


def report_and_exit() -> None:
    print("FAILED:")
    for e in errors:
        print(" -", e)
    sys.exit(1)


# ---- Load everything ---------------------------------------------------------------------------
schemas = {p.name: json.loads(p.read_text()) for p in sorted((ROOT / "schema").glob("*.schema.json"))}
registry = Registry().with_resources((name, Resource.from_contents(s)) for name, s in schemas.items())
profile = yaml.safe_load((ROOT / "optimizer-profile.yaml").read_text())
cases = yaml.safe_load((ROOT / "tests" / "acceptance-cases.yaml").read_text())["cases"]
findings = yaml.safe_load((ROOT / "community-findings.yaml").read_text())["findings"] or []
spec = (ROOT / "spec.md").read_text()
catalog = []
for path in sorted((ROOT / "catalog").glob("*.json")):
    data = json.loads(path.read_text())
    catalog.extend(data if isinstance(data, list) else [data])


def validate(schema_name: str, instance, label: str) -> None:
    validator = Draft202012Validator(schemas[schema_name], registry=registry)
    for err in validator.iter_errors(instance):
        where = "/".join(str(p) for p in err.absolute_path) or "(root)"
        errors.append(f"{label}: {where}: {err.message}")


# ---- 1. Schemas and records match their schemas --------------------------------------------------
for name, s in schemas.items():
    Draft202012Validator.check_schema(s)
validate("optimizer-profile.schema.json", profile, "optimizer-profile.yaml")
for record in catalog:
    validate("option.schema.json", record, f"catalog {record.get('id')}")
for f in findings:
    validate("community-finding.schema.json", f, f"community finding {f.get('id')}")
# The checks below assume every record has the right shape, so stop here if any doesn't.
if errors:
    report_and_exit()

vocab = schemas["vocabulary.schema.json"]["$defs"]
goal_ids = [g["id"] for g in profile["goals"]]
slot_ids = [s["id"] for s in profile["decision_slots"]]
rule_ids = [r["id"] for r in profile["rules"]]
gen_ids = [g["id"] for g in profile["relation_generators"]]
blocker_ids = [b["id"] for b in profile["blockers"]]
metric_ids = [m["id"] for m in profile["benchmarks"]["metrics"]]
option_ids = {o["id"] for o in catalog}
id_pattern = re.compile(vocab["EntityId"]["pattern"])

# ---- 2. Profile is internally consistent ---------------------------------------------------------
check(set(goal_ids) == set(vocab["GoalId"]["enum"]), "goal ids in the profile must equal GoalId in vocabulary.schema.json")
for what, ids in [("goal", goal_ids), ("slot", slot_ids), ("rule", rule_ids), ("generator", gen_ids),
                  ("blocker", blocker_ids), ("preset", [p["id"] for p in profile["presets"]]), ("metric", metric_ids)]:
    unique(ids, what + " id")
for g in profile["goals"]:
    weights = [c["weight"] for c in g["criteria"]]
    check(math.isclose(sum(weights), 1.0, abs_tol=1e-9), f"goal {g['id']}: criterion weights sum to {sum(weights)}, not 1")
    unique([c["id"] for c in g["criteria"]], f"criterion id in goal {g['id']}")
for s in profile["decision_slots"]:
    check(s["unlock_level"] <= profile["max_level"], f"slot {s['id']} unlocks above max_level")
for p in profile["presets"]:
    for b in p["blockers"]:
        check(b in blocker_ids, f"preset {p['id']} names unknown blocker {b}")
for peer in profile["benchmarks"]["peers"]:
    check(set(peer["metrics"]) == set(metric_ids), f"peer {peer['id']} must report every metric (null if unmeasured)")
    if any(v is None for v in peer["metrics"].values()):
        check(not peer["measured"], f"peer {peer['id']} has unmeasured figures but says measured: true")
for r in profile["authored_relations"]:
    for side in ("a", "b"):
        check(r[side] in option_ids, f"authored relation names {r[side]}, which is not in catalog/")

# ---- 3. Catalog records are complete and resolve --------------------------------------------------
unique([o["id"] for o in catalog], "option id")
families = {s["family"] for s in profile["decision_slots"]}
for o in catalog:
    oid = o["id"]
    check(oid.split(".")[0] == o["family"], f"{oid}: id namespace must equal its family ({o['family']})")
    check(o["family"] in families, f"{oid}: family {o['family']} has no decision slot")
    check(o["level"] <= profile["max_level"], f"{oid}: level above max_level")
    check(set(o["tactical_grades"]) == set(goal_ids), f"{oid}: tactical_grades must list every goal (known or unknown)")
    for ref in o["requires"] + o["excludes"]:
        check(ref in option_ids, f"{oid}: requires/excludes {ref}, which is not in catalog/")
    for c in o["effect_clauses"]:
        for pred in c["predicates"]:
            v = pred["value"]
            if isinstance(v, str) and id_pattern.fullmatch(v):
                check(v in option_ids, f"{oid} clause {c['id']}: predicate names {v}, which is not in catalog/")
    for key in o["evidence"]["source_keys"]:
        check(f"[{key}]" in spec, f"{oid}: source key {key} is not listed in spec.md §20")

# ---- 4. Acceptance cases name only things that exist ----------------------------------------------
check({a["id"]: a["status"] for a in profile["acceptance"]} == {c["id"]: c["status"] for c in cases},
      "acceptance registry in the profile must match tests/acceptance-cases.yaml (ids and statuses)")


def walk(value):
    if isinstance(value, dict):
        for k, v in value.items():
            yield k
            yield from walk(v)
    elif isinstance(value, list):
        for v in value:
            yield from walk(v)
    else:
        yield value


for c in cases:
    for v in walk({"given": c.get("given"), "expect": c.get("expect")}):
        if isinstance(v, str) and id_pattern.fullmatch(v):
            check(v in option_ids, f"{c['id']}: names {v}, which is not in catalog/")
    expect = c.get("expect") or {}
    if "failed_rule" in expect:
        check(expect["failed_rule"] in rule_ids, f"{c['id']}: unknown rule {expect['failed_rule']}")
    if "generator" in expect:
        check(expect["generator"] in gen_ids, f"{c['id']}: unknown generator {expect['generator']}")
    if "reported_slot" in expect:
        check(expect["reported_slot"] in slot_ids, f"{c['id']}: unknown slot {expect['reported_slot']}")
    for slot in ((c.get("given") or {}).get("slots") or {}):
        check(slot in slot_ids, f"{c['id']}: unknown slot {slot}")
    check("covered_by" in c, f"{c['id']}: say which test covers it, or covered_by: null")

for f in findings:
    for o in f.get("options", []):
        check(o in option_ids, f"{f['id']}: names {o}, which is not in catalog/")
    if f.get("acceptance_case"):
        check(f["acceptance_case"] in {c["id"] for c in cases}, f"{f['id']}: unknown acceptance case {f['acceptance_case']}")

# ---- 5. Every spec_ref has an anchor in spec.md ----------------------------------------------------
refs = {v for v in walk({"p": profile, "c": cases, "o": catalog})
        if isinstance(v, str) and re.fullmatch(r"§[0-9]+(?:\.[0-9]+)?", v)}
for r in sorted(refs):
    anchor = "sec-" + r.removeprefix("§").replace(".", "-")
    check(f'id="{anchor}"' in spec, f"spec_ref {r} has no anchor <a id=\"{anchor}\"> in spec.md")

# ---- Report ----------------------------------------------------------------------------------------
if errors:
    report_and_exit()
covered = sum(1 for c in cases if c.get("covered_by"))
print(f"PASS: {len(schemas)} schemas, {len(goal_ids)} goals, {len(slot_ids)} slots, {len(rule_ids)} rules, "
      f"{len(gen_ids)} generators, {len(profile['presets'])} presets, {len(catalog)} catalog records, "
      f"{len(cases)} acceptance cases ({covered} with a test, {len(cases) - covered} still to write), "
      f"{len(findings)} community findings, {len(refs)} spec anchors")
