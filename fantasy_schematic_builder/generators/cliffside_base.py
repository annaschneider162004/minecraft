from __future__ import annotations

from fantasy_schematic_builder.generators.base import StageBuilder, add_roof_layers


def generate(display_name, analysis):
    builder = StageBuilder(width=25, height=15, length=19)

    mixed = ["minecraft:stone_bricks", "minecraft:cobblestone", "minecraft:andesite", "minecraft:mossy_stone_bricks"]
    for x in range(25):
        for z in range(19):
            builder.set_block(1, x, 0, z, mixed[(x * 3 + z * 5) % len(mixed)])
    builder.fill(1, 5, 1, 5, 19, 1, 17, "minecraft:spruce_planks")
    builder.fill(1, 14, 1, 13, 18, 1, 17, "minecraft:dirt")

    builder.hollow_box(2, 5, 2, 4, 19, 8, 17, "minecraft:spruce_planks")
    builder.hollow_box(2, 5, 2, 4, 19, 3, 17, "minecraft:stone_bricks")
    builder.fill(2, 11, 2, 4, 13, 4, 4, "minecraft:air")
    builder.fill(2, 11, 6, 4, 13, 7, 4, "minecraft:glass")
    builder.fill(2, 5, 5, 8, 5, 6, 10, "minecraft:glass")
    builder.fill(2, 19, 5, 8, 19, 6, 10, "minecraft:glass")
    for x, z in [(5, 4), (19, 4), (5, 17), (19, 17), (9, 4), (15, 4)]:
        builder.fill(2, x, 1, z, x, 9, z, "minecraft:dark_oak_log[axis=y]")

    builder.hollow_box(3, 0, 1, 0, 4, 10, 4, "minecraft:stone_bricks")
    builder.hollow_box(3, 20, 1, 0, 24, 10, 4, "minecraft:stone_bricks")
    builder.fill(3, 0, 10, 0, 4, 10, 4, "minecraft:dark_oak_planks")
    builder.fill(3, 20, 10, 0, 24, 10, 4, "minecraft:dark_oak_planks")
    builder.fill(3, 9, 6, 2, 15, 6, 3, "minecraft:dark_oak_planks")
    builder.fill(3, 9, 7, 2, 15, 7, 2, "minecraft:dark_oak_log[axis=y]")
    builder.fill(3, 6, 6, 5, 18, 6, 16, "minecraft:spruce_planks")
    builder.fill(3, 16, 6, 14, 18, 6, 16, "minecraft:air")

    add_roof_layers(
        builder,
        4,
        [
            (4, 9, 3, 20, 9, 18, "minecraft:dark_oak_planks"),
            (5, 10, 4, 19, 10, 17, "minecraft:dark_oak_planks"),
            (7, 11, 6, 17, 11, 15, "minecraft:dark_oak_planks"),
            (9, 12, 8, 15, 12, 13, "minecraft:dark_oak_planks"),
            (17, 10, 14, 18, 13, 15, "minecraft:deepslate_bricks"),
        ],
    )

    builder.hollow_box(5, 5, 1, 15, 10, 5, 18, "minecraft:deepslate_bricks")
    builder.fill(5, 6, 2, 16, 9, 4, 17, "minecraft:air")
    builder.fill(5, 6, 2, 14, 8, 4, 14, "minecraft:bookshelf")

    for x, y, z, block in [
        (4, 5, 5, "minecraft:moss_block"),
        (20, 5, 5, "minecraft:moss_block"),
        (6, 9, 5, "minecraft:moss_block"),
        (18, 9, 5, "minecraft:moss_block"),
        (5, 5, 16, "minecraft:moss_block"),
        (19, 5, 16, "minecraft:moss_block"),
        (14, 2, 14, "minecraft:hay_block"),
        (15, 2, 14, "minecraft:hay_block"),
        (16, 2, 14, "minecraft:hay_block"),
    ]:
        builder.set_block(6, x, y, z, block)

    return builder.build("survival_cliffside_base", display_name, "Cliffside survival base with towers, roof, hidden room, and simple farm decor.", analysis)
