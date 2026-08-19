from core.models import Blueprint

VALID_PREFIX = "minecraft:"

def validate_blueprint(bp: Blueprint) -> None:
    if bp.meta.size.x <= 0 or bp.meta.size.y <= 0 or bp.meta.size.z <= 0:
        raise ValueError("Kích thước công trình không hợp lệ")

    for b in bp.blocks:
        if ":" not in b.block:
            b.block = VALID_PREFIX + b.block
        if not b.block.startswith(VALID_PREFIX):
            raise ValueError(f"Block không hợp lệ: {b.block}")
