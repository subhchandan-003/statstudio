import io

import pandas as pd
import pytest
import xlwt

from app.engine.dataset import infer_schema, load_dataframe


def test_load_dataframe_parses_csv() -> None:
    content = b"age,segment\n25,A\n30,B\n"
    df = load_dataframe(content, "survey.csv")
    assert list(df.columns) == ["age", "segment"]
    assert len(df) == 2


def test_load_dataframe_parses_tsv() -> None:
    content = b"age\tsegment\n25\tA\n30\tB\n"
    df = load_dataframe(content, "survey.tsv")
    assert list(df.columns) == ["age", "segment"]
    assert len(df) == 2


def test_load_dataframe_parses_xlsx() -> None:
    df_in = pd.DataFrame({"age": [25, 30], "segment": ["A", "B"]})
    buffer = io.BytesIO()
    df_in.to_excel(buffer, engine="openpyxl", index=False)
    df_out = load_dataframe(buffer.getvalue(), "survey.xlsx")
    assert list(df_out.columns) == ["age", "segment"]
    assert len(df_out) == 2


def test_load_dataframe_parses_legacy_xls() -> None:
    workbook = xlwt.Workbook()
    sheet = workbook.add_sheet("Sheet1")
    for col, header in enumerate(["age", "segment"]):
        sheet.write(0, col, header)
    sheet.write(1, 0, 25)
    sheet.write(1, 1, "A")
    sheet.write(2, 0, 30)
    sheet.write(2, 1, "B")
    buffer = io.BytesIO()
    workbook.save(buffer)

    df_out = load_dataframe(buffer.getvalue(), "survey.xls")
    assert list(df_out.columns) == ["age", "segment"]
    assert len(df_out) == 2


def test_load_dataframe_parses_parquet() -> None:
    df_in = pd.DataFrame({"age": [25, 30], "segment": ["A", "B"]})
    buffer = io.BytesIO()
    df_in.to_parquet(buffer, engine="pyarrow")
    df_out = load_dataframe(buffer.getvalue(), "survey.parquet")
    assert list(df_out.columns) == ["age", "segment"]
    assert len(df_out) == 2


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
