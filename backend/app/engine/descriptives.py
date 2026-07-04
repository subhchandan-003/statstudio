import math
from dataclasses import dataclass

import pandas as pd

TOP_CATEGORIES = 5


@dataclass
class NumericStats:
    mean: float | None
    median: float | None
    std: float | None
    min: float | None
    max: float | None
    skew: float | None


@dataclass
class CategoryCount:
    value: str
    count: int


@dataclass
class ColumnStats:
    name: str
    numeric: NumericStats | None
    top_values: list[CategoryCount] | None


def safe_float(value: float) -> float | None:
    if value is None or math.isnan(value) or math.isinf(value):
        return None
    return float(value)


def describe_columns(df: pd.DataFrame) -> list[ColumnStats]:
    results = []
    for column in df.columns:
        series = df[column]
        if pd.api.types.is_numeric_dtype(series):
            numeric = NumericStats(
                mean=safe_float(series.mean()),
                median=safe_float(series.median()),
                std=safe_float(series.std()),
                min=safe_float(series.min()),
                max=safe_float(series.max()),
                skew=safe_float(series.skew()),
            )
            results.append(ColumnStats(name=str(column), numeric=numeric, top_values=None))
        else:
            counts = series.dropna().astype(str).value_counts().head(TOP_CATEGORIES)
            top_values = [
                CategoryCount(value=value, count=int(count)) for value, count in counts.items()
            ]
            results.append(ColumnStats(name=str(column), numeric=None, top_values=top_values))
    return results
