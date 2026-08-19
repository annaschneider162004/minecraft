from core.models import BuildRequest, Block

def add_corner_towers(req: BuildRequest) -> list[Block]:
    w, d, h = req.width, req.depth, req.height
    blocks: list[Block] = []
    r = max(2, min(w, d)//12)
    th = h + 10
    corners = [(0,0), (0,d-1), (w-1,0), (w-1,d-1)]

    for cx, cz in corners:
        for y in range(1, th):
            for dx in range(-r, r+1):
                for dz in range(-r, r+1):
                    if dx*dx + dz*dz <= r*r:
                        x, z = cx+dx, cz+dz
                        if 0 <= x < w and 0 <= z < d:
                            blocks.append(Block(x=x, y=y, z=z, block="minecraft:deepslate_bricks"))
    return blocks
