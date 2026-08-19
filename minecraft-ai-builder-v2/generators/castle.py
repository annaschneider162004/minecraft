from core.models import BuildRequest, Block

def generate_castle_shell(req: BuildRequest) -> list[Block]:
    w, d, h = req.width, req.depth, req.height
    blocks: list[Block] = []

    for x in range(w):
        for z in range(d):
            blocks.append(Block(x=x, y=0, z=z, block="minecraft:stone_bricks"))

    for y in range(1, h):
        for x in range(w):
            blocks.append(Block(x=x, y=y, z=0, block="minecraft:stone_bricks"))
            blocks.append(Block(x=x, y=y, z=d-1, block="minecraft:stone_bricks"))
        for z in range(d):
            blocks.append(Block(x=0, y=y, z=z, block="minecraft:stone_bricks"))
            blocks.append(Block(x=w-1, y=y, z=z, block="minecraft:stone_bricks"))

    gx = w // 2
    for y in range(1, min(6, h)):
        blocks.append(Block(x=gx, y=y, z=0, block="minecraft:air"))
        blocks.append(Block(x=gx-1, y=y, z=0, block="minecraft:air"))

    return blocks
