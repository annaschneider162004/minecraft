from __future__ import annotations

from fantasy_schematic_builder.generators.base import StageBuilder, add_roof_layers


def generate(display_name, analysis):
    builder = StageBuilder(width=25, height=18, length=23)

    builder.fill(1, 2, 0, 3, 22, 0, 19, "minecraft:blackstone")
    builder.fill(1, 5, 1, 6, 19, 1, 16, "minecraft:basalt")
    builder.fill(1, 9, 1, 8, 15, 1, 14, "minecraft:polished_blackstone_bricks")

    builder.hollow_box(2, 3, 2, 4, 21, 10, 18, "minecraft:blackstone")
    builder.fill(2, 7, 3, 4, 17, 7, 4, "minecraft:air")
    builder.fill(2, 7, 4, 18, 17, 8, 18, "minecraft:air")
    builder.fill(2, 10, 4, 4, 14, 7, 4, "minecraft:glass")

    builder.fill(3, 10, 2, 9, 14, 6, 13, "minecraft:obsidian")
    builder.fill(3, 11, 3, 10, 13, 5, 12, "minecraft:red_wool")
    builder.fill(3, 9, 2, 8, 15, 2, 14, "minecraft:blackstone")

    add_roof_layers(
        builder,
        4,
        [
            (4, 11, 5, 20, 11, 17, "minecraft:blackstone"),
            (5, 12, 6, 19, 12, 16, "minecraft:polished_blackstone_bricks"),
            (7, 13, 8, 17, 13, 14, "minecraft:blackstone"),
            (9, 14, 9, 15, 15, 13, "minecraft:obsidian"),
        ],
    )

    builder.hollow_box(5, 16, 1, 15, 21, 5, 19, "minecraft:deepslate_bricks")
    builder.fill(5, 17, 2, 16, 20, 4, 18, "minecraft:air")
    builder.fill(5, 18, 2, 15, 19, 3, 15, "minecraft:gold_block")

    for x, y, z, block in [
        (12, 2, 11, "minecraft:gold_block"),
        (10, 2, 12, "minecraft:gold_block"),
        (14, 2, 10, "minecraft:gold_block"),
        (8, 1, 8, "minecraft:red_wool"),
        (16, 1, 15, "minecraft:red_wool"),
        (12, 7, 12, "minecraft:glowstone"),
    ]:
        builder.set_block(6, x, y, z, block)

    return builder.build("dragon_cave", display_name, "Dragon cave shrine with blackstone shell, obsidian relic, treasure, and a hidden chamber.", analysis)
