from typing import Any, Dict

from pydantic import BaseModel


class ConfigUpdate(BaseModel):
    # Nhận JSON tự do, vì mỗi service có bộ key khác nhau
    config: Dict[str, Any]