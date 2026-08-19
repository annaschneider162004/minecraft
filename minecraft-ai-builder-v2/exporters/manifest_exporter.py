from collections import Counter
from core.models import Blueprint

def export_manifest(bp: Blueprint, out_path: str):
    c = Counter([b.block for b in bp.blocks])
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(f"Build: {bp.meta.name}\n")
        f.write(f"Type: {bp.meta.build_type}\n")
        f.write(f"Size: {bp.meta.size.x}x{bp.meta.size.y}x{bp.meta.size.z}\n")
        f.write("\n=== Materials ===\n")
        for k, v in c.most_common():
            f.write(f"{k}: {v}\n")
