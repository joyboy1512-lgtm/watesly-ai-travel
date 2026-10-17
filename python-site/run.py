from pathlib import Path
import sys

import uvicorn

sys.path.insert(0, str(Path(__file__).resolve().parent))

if __name__ == "__main__":
    uvicorn.run("weekendgate.app:app", host="127.0.0.1", port=8080, reload=False)
