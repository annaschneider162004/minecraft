from core.models import Blueprint

def dedupe_blocks_keep_last(bp: Blueprint) -> Blueprint:
    m = {}
    for b in bp.blocks:
        m[(b.x, b.y, b.z)] = b
    bp.blocks = list(m.values())
    return bp

def remove_air_if_not_needed(bp: Blueprint, keep_air: bool = False) -> Blueprint:
    if keep_air:
        return bp
    bp.blocks = [b for b in bp.blocks if b.block != "minecraft:air"]
    return bp
