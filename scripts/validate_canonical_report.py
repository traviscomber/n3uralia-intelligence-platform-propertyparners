#!/usr/bin/env python3
"""Validate canonical N3uralia report payloads, including chart specifications."""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

ALLOWED_CHART_TYPES = {"bar", "grouped_bar", "line", "combo_bar_line", "progress", "donut"}
ALLOWED_CHART_STATUSES = {"verified", "partial", "not_evaluable"}


def fail(message: str) -> None:
    raise ValueError(message)


def validate_refs(refs: object, evidence_ids: set[str], path: str) -> None:
    if not isinstance(refs, list) or not refs or not all(isinstance(ref, str) and ref for ref in refs):
        fail(f"missing_or_invalid:{path}")
    unknown = [ref for ref in refs if ref not in evidence_ids]
    if unknown:
        fail(f"unknown_evidence:{path}:{','.join(unknown)}")


def validate(payload: dict) -> None:
    for field in ("title", "client", "sourceSnapshotId"):
        if not isinstance(payload.get(field), str) or not payload[field].strip():
            fail(f"missing_or_invalid:{field}")

    period = payload.get("period")
    if not isinstance(period, dict):
        fail("missing_or_invalid:period")
    start = period.get("start")
    end = period.get("end")
    cutoff = period.get("sourceCutoff")
    if not all(isinstance(value, str) and value for value in (start, end, cutoff)):
        fail("missing_or_invalid:period_dates")
    if start > end or end > cutoff:
        fail("invalid:period_order")

    evidence = payload.get("evidence")
    if not isinstance(evidence, list) or not evidence:
        fail("missing_or_invalid:evidence")
    evidence_ids: set[str] = set()
    for index, item in enumerate(evidence):
        if not isinstance(item, dict):
            fail(f"invalid:evidence[{index}]")
        evidence_id = item.get("id")
        if not isinstance(evidence_id, str) or not evidence_id:
            fail(f"invalid:evidence[{index}].id")
        evidence_ids.add(evidence_id)

    for index, metric in enumerate(payload.get("metrics", [])):
        if not isinstance(metric, dict):
            fail(f"invalid:metrics[{index}]")
        validate_refs(metric.get("evidenceRefs"), evidence_ids, f"metrics[{index}].evidenceRefs")

    for chart_index, chart in enumerate(payload.get("charts", [])):
        path = f"charts[{chart_index}]"
        if not isinstance(chart, dict):
            fail(f"invalid:{path}")
        if chart.get("type") not in ALLOWED_CHART_TYPES:
            fail(f"invalid:{path}.type")
        if chart.get("status") not in ALLOWED_CHART_STATUSES:
            fail(f"invalid:{path}.status")
        if chart.get("status") == "not_evaluable":
            fail(f"not_evaluable_chart:{path}")
        for field in ("id", "title", "purpose", "sourceNote"):
            if not isinstance(chart.get(field), str) or not chart[field].strip():
                fail(f"missing_or_invalid:{path}.{field}")
        validate_refs(chart.get("evidenceRefs"), evidence_ids, f"{path}.evidenceRefs")

        categories = chart.get("categories")
        if not isinstance(categories, list) or not categories or not all(isinstance(v, str) and v for v in categories):
            fail(f"missing_or_invalid:{path}.categories")
        series = chart.get("series")
        if not isinstance(series, list) or not series:
            fail(f"missing_or_invalid:{path}.series")

        methodology_versions = set()
        all_numeric_values: list[float] = []
        for series_index, item in enumerate(series):
            series_path = f"{path}.series[{series_index}]"
            if not isinstance(item, dict):
                fail(f"invalid:{series_path}")
            for field in ("id", "label", "unit"):
                if not isinstance(item.get(field), str) or not item[field].strip():
                    fail(f"missing_or_invalid:{series_path}.{field}")
            values = item.get("values")
            if not isinstance(values, list) or len(values) != len(categories):
                fail(f"invalid:{series_path}.values_length")
            for value in values:
                if value is not None and (not isinstance(value, (int, float)) or isinstance(value, bool) or not math.isfinite(value)):
                    fail(f"invalid:{series_path}.value")
                if value is not None:
                    all_numeric_values.append(float(value))
            validate_refs(item.get("evidenceRefs"), evidence_ids, f"{series_path}.evidenceRefs")
            version = item.get("methodologyVersion")
            if version is not None:
                if not isinstance(version, str) or not version:
                    fail(f"invalid:{series_path}.methodologyVersion")
                methodology_versions.add(version)

        if len(methodology_versions) > 1:
            fail(f"incompatible_methodology_versions:{path}")
        if chart.get("type") == "donut":
            if len(series) != 1:
                fail(f"invalid:{path}.donut_series_count")
            if any(value < 0 for value in all_numeric_values) or abs(sum(all_numeric_values) - 100.0) > 0.2:
                fail(f"invalid:{path}.donut_total")
        target_id = chart.get("targetSeriesId")
        if target_id is not None and target_id not in {item.get("id") for item in series}:
            fail(f"invalid:{path}.targetSeriesId")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("usage: validate_canonical_report.py payload.json", file=sys.stderr)
        sys.exit(2)
    path = Path(sys.argv[1])
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            fail("payload_must_be_object")
        validate(data)
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        print(f"INVALID {exc}", file=sys.stderr)
        sys.exit(1)
    print("VALID")
