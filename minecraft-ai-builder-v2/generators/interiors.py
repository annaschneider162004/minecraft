from core.models import BuildRequest, Block

def add_interiors_for_rooms(req: BuildRequest) -> list[Block]:
    blocks: list[Block] = []
    if not req.interior_rooms:
        return blocks

    cursor_x, cursor_z = 4, 4
    floor_y = 2
    max_row_depth = 0

    for r in req.interior_rooms:
        for x in range(cursor_x, cursor_x + r.width):
            for z in range(cursor_z, cursor_z + r.depth):
                blocks.append(Block(x=x, y=floor_y, z=z, block="minecraft:spruce_planks"))

        for y in range(floor_y+1, floor_y + r.height):
            for x in range(cursor_x, cursor_x + r.width):
                blocks.append(Block(x=x, y=y, z=cursor_z, block="minecraft:oak_planks"))
                blocks.append(Block(x=x, y=y, z=cursor_z + r.depth - 1, block="minecraft:oak_planks"))
            for z in range(cursor_z, cursor_z + r.depth):
                blocks.append(Block(x=cursor_x, y=y, z=z, block="minecraft:oak_planks"))
                blocks.append(Block(x=cursor_x + r.width - 1, y=y, z=z, block="minecraft:oak_planks"))

        px, pz = cursor_x + 1, cursor_z + 1
        purpose = r.purpose.lower()
        if "piano" in purpose:
            blocks.append(Block(x=px, y=floor_y+1, z=pz, block="minecraft:black_wool"))
            blocks.append(Block(x=px+1, y=floor_y+1, z=pz, block="minecraft:note_block"))
        elif "violin" in purpose:
            blocks.append(Block(x=px, y=floor_y+1, z=pz, block="minecraft:jukebox"))
        elif "thanh nhạc" in purpose or "vocal" in purpose:
            blocks.append(Block(x=px, y=floor_y+1, z=pz, block="minecraft:lectern"))
        else:
            blocks.append(Block(x=px, y=floor_y+1, z=pz, block="minecraft:bookshelf"))

        cursor_x += r.width + 3
        max_row_depth = max(max_row_depth, r.depth)
        if cursor_x + r.width >= req.width - 4:
            cursor_x = 4
            cursor_z += max_row_depth + 4
            max_row_depth = 0

    return blocks
