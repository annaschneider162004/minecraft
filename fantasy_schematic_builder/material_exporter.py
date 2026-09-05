from __future__ import annotations

import os
from collections import Counter

from fantasy_schematic_builder.models import SchematicModel


def count_materials(model: SchematicModel) -> Counter:
    return model.material_counts()


def _friendly_block_name(block: str) -> str:
    return block.replace("minecraft:", "")


def write_materials_file(materials: Counter, output_path: str) -> None:
    with open(output_path, "w", encoding="utf-8") as handle:
        for block, count in sorted(materials.items()):
            handle.write(f"{_friendly_block_name(block)}: {count}\n")


def write_give_commands_file(materials: Counter, output_path: str) -> None:
    with open(output_path, "w", encoding="utf-8") as handle:
        handle.write("# Copy the commands below in Creative or on your own server only.\n")
        for block, total in sorted(materials.items()):
            remaining = total
            while remaining > 0:
                chunk = min(64, remaining)
                handle.write(f"/give @s {block} {chunk}\n")
                remaining -= chunk
        handle.write("\n# If Baritone pauses after you get blocks, run:\n#resume\n")


def write_baritone_steps_file(stage_paths: list[str], output_path: str) -> None:
    with open(output_path, "w", encoding="utf-8") as handle:
        handle.write("# Staged schematics are cumulative for easier Baritone building.\n")
        handle.write("# Put the .schem files in .minecraft/schematics, then run each step in order.\n")
        handle.write("# If Baritone pauses after materials are given, run #resume.\n\n")
        for stage_path in stage_paths:
            handle.write(f"#build {os.path.basename(stage_path)}\n")
