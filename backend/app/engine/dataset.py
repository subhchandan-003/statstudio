import io
from dataclasses import dataclass

import pandas as pd

SUPPORTED_EXTENSIONS = (".csv", ".xlsx")


@dataclass
class ColumnSchema:
    name: str
    dtype: str
    measure: str
    null_count: int


def load_dataframe(content: bytes, filename: str) -> pd.DataFrame:
    lower_name = filename.lower()
    if not lower_name.endswith(SUPPORTED_EXTENSIONS):
        raise ValueError(f"Unsupported file extension for {filename}")

    buffer = io.BytesIO(content)
    try:
        if lower_name.endswith(".csv"):
            return pd.read_csv(buffer)
        return pd.read_excel(buffer)
    except Exception as exc:
        raise ValueError(f"Could not parse {filename}: {exc}") from exc


def infer_schema(df: pd.DataFrame) -> list[ColumnSchema]:
    schema = []
    for column in df.columns:
        series = df[column]
        measure = "scale" if pd.api.types.is_numeric_dtype(series) else "nominal"
        schema.append(
            ColumnSchema(
                name=str(column),
                dtype=str(series.dtype),
                measure=measure,
                null_count=int(series.isna().sum()),
            )
        )
    return schema
