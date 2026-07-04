from pydantic import BaseModel


class NumericStats(BaseModel):
    mean: float | None
    median: float | None
    std: float | None
    min: float | None
    max: float | None
    skew: float | None


class CategoryCount(BaseModel):
    value: str
    count: int


class ColumnSummary(BaseModel):
    name: str
    dtype: str
    measure: str
    null_count: int
    numeric: NumericStats | None = None
    top_values: list[CategoryCount] | None = None


class AnalyzeResponse(BaseModel):
    filename: str
    row_count: int
    column_count: int
    columns: list[ColumnSummary]
