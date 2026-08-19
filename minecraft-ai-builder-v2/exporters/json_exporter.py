import json
from core.models import Blueprint

def export_json(bp: Blueprint, out_path: str):
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(bp.model_dump(), f, ensure_ascii=False, indent=2)
