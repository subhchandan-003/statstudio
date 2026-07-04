from fastapi import APIRouter, File, HTTPException, UploadFile

from app.config import get_settings
from app.engine.dataset import SUPPORTED_EXTENSIONS, infer_schema, load_dataframe
from app.engine.descriptives import describe_columns
from app.schemas.dataset import AnalyzeResponse, CategoryCount, ColumnSummary, NumericStats

router = APIRouter(prefix="/datasets", tags=["datasets"])


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_dataset(file: UploadFile = File(...)) -> AnalyzeResponse:  # noqa: B008
    filename = file.filename or ""
    if not filename.lower().endswith(SUPPORTED_EXTENSIONS):
        raise HTTPException(status_code=415, detail=f"Unsupported file type: {filename}")

    content = await file.read()
    max_bytes = get_settings().max_upload_mb * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(status_code=413, detail="File exceeds maximum upload size")

    try:
        df = load_dataframe(content, filename)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    schema = infer_schema(df)
    stats = describe_columns(df)

    columns = [
        ColumnSummary(
            name=col_schema.name,
            dtype=col_schema.dtype,
            measure=col_schema.measure,
            null_count=col_schema.null_count,
            numeric=NumericStats(**col_stats.numeric.__dict__) if col_stats.numeric else None,
            top_values=(
                [CategoryCount(value=c.value, count=c.count) for c in col_stats.top_values]
                if col_stats.top_values is not None
                else None
            ),
        )
        for col_schema, col_stats in zip(schema, stats, strict=True)
    ]

    return AnalyzeResponse(
        filename=filename,
        row_count=len(df),
        column_count=len(df.columns),
        columns=columns,
    )
