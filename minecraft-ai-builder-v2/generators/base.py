from core.models import Block

def fill(box_min, box_max, block: str):
    (x1, y1, z1) = box_min
    (x2, y2, z2) = box_max
    out = []
    for x in range(x1, x2 + 1):
        for y in range(y1, y2 + 1):
            for z in range(z1, z2 + 1):
                out.append(Block(x=x, y=y, z=z, block=block))
    return out
