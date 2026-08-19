from core.models import Blueprint

def export_schem_placeholder(bp: Blueprint, out_path: str):
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("SCHEM export placeholder. Integrate NBT writer here.\n")
