from __future__ import annotations

from fantasy_schematic_builder.generators.base import StageBuilder, add_roof_layers


def generate(display_name, analysis):
    builder = StageBuilder(width=23, height=16, length=19)

    builder.fill(1, 1, 0, 1, 21, 0, 17, "minecraft:stone_bricks")
    builder.fill(1, 3, 1, 3, 19, 1, 15, "minecraft:spruce_planks")

    builder.hollow_box(2, 2, 2, 2, 20, 10, 16, "minecraft:deepslate_bricks")
    builder.fill(2, 10, 3, 2, 12, 5, 2, "minecraft:glass")
    builder.fill(2, 10, 3, 16, 12, 5, 16, "minecraft:glass")
    for x, z in [(2, 2), (20, 2), (2, 16), (20, 16), (6, 2), (16, 2)]:
        builder.fill(2, x, 1, z, x, 11, z, "minecraft:dark_oak_log[axis=y]")

    builder.fill(3, 4, 2, 4, 18, 8, 14, "minecraft:bookshelf")
    builder.fill(3, 9, 2, 7, 13, 2, 11, "minecraft:stone_bricks")
    builder.fill(3, 10, 3, 8, 12, 3, 10, "minecraft:gold_block")

    add_roof_layers(
        builder,
        4,
        [
            (1, 11, 1, 21, 11, 17, "minecraft:dark_oak_planks"),
            (2, 12, 2, 20, 12, 16, "minecraft:dark_oak_planks"),
            (4, 13, 4, 18, 13, 14, "minecraft:dark_oak_planks"),
        ],
    )

    builder.hollow_box(5, 15, 1, 13, 20, 5, 17, "minecraft:deepslate_bricks")
    builder.fill(5, 16, 2, 14, 19, 4, 16, "minecraft:air")
    builder.fill(5, 15, 2, 13, 15, 4, 13, "minecraft:bookshelf")

    for x, y, z, block in [
        (11, 2, 9, "minecraft:glowstone"),
        (10, 2, 9, "minecraft:glowstone"),
        (12, 2, 9, "minecraft:glowstone"),
        (5, 2, 5, "minecraft:bookshelf"),
        (17, 2, 5, "minecraft:bookshelf"),
        (5, 2, 13, "minecraft:bookshelf"),
        (17, 2, 13, "minecraft:bookshelf"),
    ]:
        builder.set_block(6, x, y, z, block)

    return builder.build("ancient_library", display_name, "Ancient library hall with altar, old stone frame, and a hidden back room.", analysis)
