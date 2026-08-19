from core.models import BuildRequest, Block

def add_garden(req: BuildRequest) -> list[Block]:
    w, d = req.width, req.depth
    blocks: list[Block] = []
    for x in range(2, w-2):
        for z in range(2, d-2):
            if (x + z) % 9 == 0:
                blocks.append(Block(x=x, y=1, z=z, block="minecraft:grass_block"))
                blocks.append(Block(x=x, y=2, z=z, block="minecraft:oak_sapling"))
    return blocks
