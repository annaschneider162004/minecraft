from __future__ import annotations

from fantasy_schematic_builder.generators.base import StageBuilder, add_roof_layers


def generate(display_name, analysis):
    builder = StageBuilder(width=27, height=22, length=27)

    builder.fill(1, 7, 4, 7, 19, 4, 19, "minecraft:stone")
    builder.fill(1, 5, 5, 5, 21, 5, 21, "minecraft:dirt")
    builder.fill(1, 9, 6, 9, 17, 6, 17, "minecraft:grass_block")
    builder.fill(1, 12, 6, 4, 14, 6, 6, "minecraft:stone")
    builder.fill(1, 12, 6, 20, 14, 6, 22, "minecraft:stone")

    builder.hollow_box(2, 8, 7, 8, 18, 14, 18, "minecraft:quartz_block")
    for x, z in [(8, 8), (18, 8), (8, 18), (18, 18)]:
        builder.fill(2, x, 5, z, x, 14, z, "minecraft:chiseled_stone_bricks")
    builder.fill(2, 12, 7, 8, 14, 10, 8, "minecraft:air")

    builder.fill(3, 11, 5, 11, 15, 9, 15, "minecraft:amethyst_block")
    builder.fill(3, 12, 6, 12, 14, 11, 14, "minecraft:gold_block")
    builder.fill(3, 12, 8, 4, 14, 8, 7, "minecraft:stone_bricks")
    builder.fill(3, 12, 8, 19, 14, 8, 22, "minecraft:stone_bricks")

    add_roof_layers(
        builder,
        4,
        [
            (7, 15, 7, 19, 15, 19, "minecraft:quartz_block"),
            (8, 16, 8, 18, 16, 18, "minecraft:quartz_block"),
            (10, 17, 10, 16, 18, 16, "minecraft:amethyst_block"),
        ],
    )

    builder.hollow_box(5, 9, 5, 19, 17, 8, 23, "minecraft:stone_bricks")
    builder.fill(5, 10, 6, 20, 16, 7, 22, "minecraft:air")
    builder.fill(5, 11, 6, 21, 15, 6, 21, "minecraft:bookshelf")

    for x, y, z, block in [
        (7, 5, 13, "minecraft:moss_block"),
        (19, 5, 13, "minecraft:moss_block"),
        (13, 5, 7, "minecraft:moss_block"),
        (13, 5, 19, "minecraft:moss_block"),
        (13, 10, 13, "minecraft:glowstone"),
        (13, 14, 13, "minecraft:glass"),
    ]:
        builder.set_block(6, x, y, z, block)

    return builder.build("floating_temple", display_name, "Floating island temple with columns, magic core, and a hidden rear chamber.", analysis)
