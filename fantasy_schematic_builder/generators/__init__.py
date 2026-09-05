from fantasy_schematic_builder.generators.ancient_library import generate as generate_ancient_library
from fantasy_schematic_builder.generators.cliffside_base import generate as generate_survival_cliffside_base
from fantasy_schematic_builder.generators.dragon_cave import generate as generate_dragon_cave
from fantasy_schematic_builder.generators.floating_temple import generate as generate_floating_temple
from fantasy_schematic_builder.generators.wizard_tower import generate as generate_wizard_tower


GENERATOR_MAP = {
    "survival_cliffside_base": generate_survival_cliffside_base,
    "wizard_tower": generate_wizard_tower,
    "dragon_cave": generate_dragon_cave,
    "ancient_library": generate_ancient_library,
    "floating_temple": generate_floating_temple,
}
