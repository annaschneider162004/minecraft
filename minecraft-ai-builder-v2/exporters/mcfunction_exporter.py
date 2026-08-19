from core.models import Blueprint

def export_mcfunction(bp: Blueprint, out_path: str):
    ox, oy, oz = bp.meta.origin.x, bp.meta.origin.y, bp.meta.origin.z
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(f"# Build: {bp.meta.name}\n")
        for b in bp.blocks:
            f.write(f"setblock {ox+b.x} {oy+b.y} {oz+b.z} {b.block}\n")
