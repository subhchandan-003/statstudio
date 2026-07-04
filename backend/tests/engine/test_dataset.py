import pytest

from app.engine.dataset import infer_schema, load_dataframe


def test_load_dataframe_parses_csv() -> None:
    content = b"age,segment\n25,A\n30,B\n"
    df = load_dataframe(content, "survey.csv")
    assert list(df.columns) == ["age", "segment"]
    assert len(df) == 2


def test_load_dataframe_rejects_unsupported_extension() -> None:
    with pytest.raises(ValueError, match="Unsupported file extension"):
        load_dataframe(b"whatever", "notes.txt")


def test_load_dataframe_rejects_corrupt_csv_bytes() -> None:
    with pytest.raises(ValueError, match="Could not parse"):
        load_dataframe(b"", "empty.csv")


def test_infer_schema_detects_measure_and_nulls() -> None:
    content = b"age,segment\n25,A\n,B\n"
    df = load_dataframe(content, "survey.csv")
    schema = infer_schema(df)

    by_name = {col.name: col for col in schema}
    assert by_name["age"].measure == "scale"
    assert by_name["age"].null_count == 1
    assert by_name["segment"].measure == "nominal"
    assert by_name["segment"].null_count == 0
