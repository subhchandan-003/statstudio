from collections.abc import Callable
from typing import Any

# Registry of engine functions the visual terminal is allowed to call.
# Populated as real analysis functions (describe, ttest, hist, ...) land in
# this package. Kept separate from app.engine.__init__ so the whitelist is
# always an explicit, auditable list rather than "everything importable".
ENGINE_FUNCTIONS: dict[str, Callable[..., Any]] = {}
