"""Jackie's test suite.

Standard-library unittest only — Jackie's local core has no dependencies, and
her tests should not add any. Run from the Jackie/ directory:

    python3 -m unittest discover -s tests -v
"""

import sys
from pathlib import Path

# Make `core` importable no matter which directory the runner was invoked from.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
