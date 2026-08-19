from core.models import BuildRequest, Block

def add_main_hall(req: BuildRequest) -> list[Block]:
    w, d = req.width, req.depth
    blocks: list[Block] = []

    x1, x2 = w//4, 3*w//4
    z1, z2 = d//4, 3*d//4
    y = 1

    for x in range(x1, x2):
        for z in range(z1, z2):
            blocks.append(Block(x=x, y=y, z=z, block="minecraft:polished_andesite"))

    for (px, pz) in [(x1+2,z1+2), (x2-3,z1+2), (x1+2,z2-3), (x2-3,z2-3)]:
        for py in range(2, min(req.height, 14)):
            blocks.append(Block(x=px, y=py, z=pz, block="minecraft:quartz_pillar"))

    return blocks
