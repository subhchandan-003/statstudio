import io
from collections.abc import Iterator

import pandas as pd
import pytest
from fastapi.testclient import TestClient

import app.api.v1.datasets as datasets_module
from app.config import Settings
from app.main import app

client = TestClient(app)


def test_analyze_valid_csv_returns_schema_and_stats() -> None:
    content = b"age,segment\n25,A\n30,B\n35,A\n"
    response = client.post(
        "/api/v1/datasets/analyze",
        files={"file": ("survey.csv", content, "text/csv")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["filename"] == "survey.csv"
    assert body["row_count"] == 3
    assert body["column_count"] == 2

    by_name = {col["name"]: col for col in body["columns"]}
    assert by_name["age"]["measure"] == "scale"
    assert by_name["age"]["numeric"]["mean"] == 30.0
    assert by_name["segment"]["measure"] == "nominal"
    assert by_name["segment"]["top_values"] is not None


def test_analyze_accepts_parquet() -> None:
    df = pd.DataFrame({"age": [25, 30], "segment": ["A", "B"]})
    buffer = io.BytesIO()
    df.to_parquet(buffer, engine="pyarrow")

    response = client.post(
        "/api/v1/datasets/analyze",
        files={"file": ("survey.parquet", buffer.getvalue(), "application/octet-stream")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["row_count"] == 2
    assert body["column_count"] == 2


def test_analyze_rejects_unsupported_extension() -> None:
    response = client.post(
        "/api/v1/datasets/analyze",
        files={"file": ("notes.txt", b"hello", "text/plain")},
    )
    assert response.status_code == 415


def test_analyze_rejects_corrupt_csv() -> None:
    response = client.post(
        "/api/v1/datasets/analyze",
        files={"file": ("empty.csv", b"", "text/csv")},
    )
    assert response.status_code == 400


@pytest.fixture
def tiny_upload_cap() -> Iterator[None]:
    original = datasets_module.get_settings
    datasets_module.get_settings = lambda: Settings(max_upload_mb=1)
    try:
        yield
    finally:
        datasets_module.get_settings = original


def test_analyze_rejects_oversize_upload(tiny_upload_cap: None) -> None:
    oversize_content = b"a" * (1024 * 1024 + 1)
    response = client.post(
        "/api/v1/datasets/analyze",
        files={"file": ("big.csv", oversize_content, "text/csv")},
    )
    assert response.status_code == 413
