from __future__ import annotations

import json
from typing import Iterable

from fantasy_schematic_builder.models import GeneratedBuild


ROLE_PRESETS = {
    3: {
        "01_foundation": "foundation",
        "02_walls": "structure",
        "03_towers_or_core": "structure",
        "04_roof_or_top": "detail",
        "05_secret_room": "detail",
        "06_decorations": "detail",
    },
    4: {
        "01_foundation": "foundation",
        "02_walls": "walls",
        "03_towers_or_core": "towers",
        "04_roof_or_top": "finishing",
        "05_secret_room": "finishing",
        "06_decorations": "finishing",
    },
    6: {
        "01_foundation": "foundation",
        "02_walls": "walls",
        "03_towers_or_core": "towers",
        "04_roof_or_top": "roof",
        "05_secret_room": "secret_room",
        "06_decorations": "decorations",
    },
}

STAGE_NAMES = {
    "01_foundation": "foundation",
    "02_walls": "walls",
    "03_towers_or_core": "towers",
    "04_roof_or_top": "roof",
    "05_secret_room": "secret_room",
    "06_decorations": "decorations",
    "07_full_build": "full_build",
}


def role_for_stage(stage_key: str, team_bot_count: int) -> str:
    preset = ROLE_PRESETS.get(team_bot_count, ROLE_PRESETS[6])
    return preset.get(stage_key, "general")


def _iter_stage_keys(build: GeneratedBuild) -> Iterable[str]:
    for stage in build.stages:
        yield stage.key


def _detect_block_stage(build: GeneratedBuild, position: tuple[int, int, int], block: str) -> str:
    for stage in build.stages:
        if stage.model.blocks.get(position) == block:
            return stage.key
    return build.full_stage.key


def export_mineflayer_build_plan(build: GeneratedBuild, output_path: str, team_bot_count: int = 6) -> None:
    model = build.full_stage.model
    blocks = []
    for position, block in sorted(model.blocks.items(), key=lambda item: (item[0][1], item[0][0], item[0][2], item[1])):
        stage_key = _detect_block_stage(build, position, block)
        stage_name = STAGE_NAMES.get(stage_key, stage_key)
        blocks.append(
            {
                "x": position[0],
                "y": position[1],
                "z": position[2],
                "block": block,
                "stage": stage_name,
                "role": role_for_stage(stage_key, team_bot_count),
            }
        )

    payload = {
        "name": build.display_name,
        "buildType": build.build_type,
        "size": {"width": model.width, "height": model.height, "length": model.length},
        "origin": {"x": 0, "y": 0, "z": 0},
        "recommendedBotCount": team_bot_count,
        "availableStageRoles": sorted({role_for_stage(stage_key, team_bot_count) for stage_key in _iter_stage_keys(build) if stage_key != "07_full_build"}),
        "blocks": blocks,
    }
    with open(output_path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
