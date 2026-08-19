from core.models import BuildRequest, Blueprint, BuildMeta, Vec3, Block
from generators.castle import generate_castle_shell
from generators.tower import add_corner_towers
from generators.hall import add_main_hall
from generators.garden import add_garden
from generators.interiors import add_interiors_for_rooms

def plan_build(req: BuildRequest) -> Blueprint:
    blocks: list[Block] = []

    blocks.extend(generate_castle_shell(req))

    if req.has_towers:
        blocks.extend(add_corner_towers(req))

    blocks.extend(add_main_hall(req))

    if req.has_garden:
        blocks.extend(add_garden(req))

    blocks.extend(add_interiors_for_rooms(req))

    meta = BuildMeta(
        name=req.name,
        style=req.style,
        build_type=req.build_type,
        size=Vec3(x=req.width, y=req.height, z=req.depth),
        origin=req.origin,
        floors=req.floors
    )
    return Blueprint(meta=meta, blocks=blocks, tags={"version": "v2"})
