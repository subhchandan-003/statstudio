import subprocess
import sys


def test_engine_package_has_no_web_imports() -> None:
    """app.engine must stay importable with zero web/db dependencies.

    Runs in a subprocess so results aren't polluted by fastapi/sqlalchemy
    already sitting in sys.modules from other tests in this session.
    """
    check = (
        "import sys; import app.engine; "
        "leaked = {m for m in sys.modules if m.split('.')[0] in "
        "('fastapi', 'starlette', 'sqlalchemy', 'alembic')}; "
        "assert not leaked, leaked"
    )
    result = subprocess.run(
        [sys.executable, "-c", check], capture_output=True, text=True, timeout=30
    )
    assert result.returncode == 0, result.stderr
