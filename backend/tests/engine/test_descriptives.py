from app.engine.dataset import load_dataframe
from app.engine.descriptives import describe_columns, safe_float


def test_describe_columns_computes_numeric_stats() -> None:
    content = b"age,segment\n20,A\n30,A\n40,B\n"
    df = load_dataframe(content, "survey.csv")
    stats = describe_columns(df)

    by_name = {col.name: col for col in stats}
    age = by_name["age"].numeric
    assert age is not None
    assert age.mean == 30.0
    assert age.min == 20.0
    assert age.max == 40.0

    segment = by_name["segment"]
    assert segment.numeric is None
    assert segment.top_values is not None
    assert {c.value: c.count for c in segment.top_values} == {"A": 2, "B": 1}


def test_describe_columns_single_value_std_is_none_not_nan() -> None:
    content = b"score\n5\n"
    df = load_dataframe(content, "one_row.csv")
    stats = describe_columns(df)

    score = stats[0].numeric
    assert score is not None
    assert score.std is None


def test_safe_float_maps_nan_and_inf_to_none() -> None:
    assert safe_float(float("nan")) is None
    assert safe_float(float("inf")) is None
    assert safe_float(1.5) == 1.5
