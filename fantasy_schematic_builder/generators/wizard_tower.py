from __future__ import annotations

from fantasy_schematic_builder.generators.base import StageBuilder, add_roof_layers


def generate(display_name, analysis):
    builder = StageBuilder(width=17, height=29, length=17)

    builder.fill(1, 3, 0, 3, 13, 0, 13, "minecraft:stone_bricks")
    builder.fill(1, 5, 1, 5, 11, 1, 11, "minecraft:polished_andesite")

    builder.hollow_box(2, 4, 2, 4, 12, 20, 12, "minecraft:deepslate_bricks")
    builder.fill(2, 7, 5, 4, 9, 8, 4, "minecraft:glass")
    builder.fill(2, 7, 11, 12, 9, 14, 12, "minecraft:glass")
    for x, z in [(4, 4), (12, 4), (4, 12), (12, 12)]:
        builder.fill(2, x, 1, z, x, 21, z, "minecraft:dark_oak_log[axis=y]")

    builder.fill(3, 7, 2, 7, 9, 17, 9, "minecraft:amethyst_block")
    builder.fill(3, 6, 18, 6, 10, 18, 10, "minecraft:gold_block")
    builder.fill(3, 5, 21, 5, 11, 21, 11, "minecraft:spruce_planks")

    add_roof_layers(
        builder,
        4,
        [
            (3, 22, 3, 13, 22, 13, "minecraft:dark_oak_planks"),
            (4, 23, 4, 12, 23, 12, "minecraft:dark_oak_planks"),
            (5, 24, 5, 11, 24, 11, "minecraft:dark_oak_planks"),
            (6, 25, 6, 10, 25, 10, "minecraft:dark_oak_planks"),
            (7, 26, 7, 9, 27, 9, "minecraft:amethyst_block"),
        ],
    )

    builder.hollow_box(5, 5, 1, 5, 11, 4, 11, "minecraft:stone_bricks")
    builder.fill(5, 6, 2, 6, 10, 3, 10, "minecraft:air")
    builder.fill(5, 6, 2, 5, 10, 2, 5, "minecraft:bookshelf")

    for x, y, z, block in [
        (8, 2, 8, "minecraft:bookshelf"),
        (8, 3, 8, "minecraft:bookshelf"),
        (6, 21, 8, "minecraft:glass"),
        (10, 21, 8, "minecraft:glass"),
        (8, 21, 6, "minecraft:glass"),
        (8, 21, 10, "minecraft:glass"),
        (8, 18, 8, "minecraft:glowstone"),
    ]:
        builder.set_block(6, x, y, z, block)

    return builder.build("wizard_tower", display_name, "Arcane wizard tower with a glowing magic core, observatory top, and hidden study.", analysis)
