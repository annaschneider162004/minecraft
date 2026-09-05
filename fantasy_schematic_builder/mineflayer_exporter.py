from __future__ import annotations

import json
import os
from typing import Iterable

from fantasy_schematic_builder.models import GeneratedBuild


STANDARD_STAGE_ROLES = (
    "foundation",
    "walls",
    "towers",
    "roof",
    "secret_room",
    "decorations",
)

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


ROLE_GROUPS = {
    1: [list(STANDARD_STAGE_ROLES)],
    2: [["foundation", "walls", "towers"], ["roof", "secret_room", "decorations"]],
    3: [["foundation"], ["walls", "towers"], ["roof", "secret_room", "decorations"]],
    4: [["foundation"], ["walls"], ["towers"], ["roof", "secret_room", "decorations"]],
    5: [["foundation"], ["walls"], ["towers"], ["roof"], ["secret_room", "decorations"]],
}

EXTRA_ROLE_CYCLE = ("walls", "towers", "decorations", "roof", "foundation", "secret_room")


def validate_team_bot_count(value: int | str) -> int:
    try:
        count = int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError("Số bot Mineflayer phải là số nguyên trong khoảng 1-50.") from exc
    if not 1 <= count <= 50:
        raise ValueError("Số bot Mineflayer phải nằm trong khoảng 1-50.")
    return count


def role_for_stage(stage_key: str, team_bot_count: int) -> str:
    count = validate_team_bot_count(team_bot_count)
    preset = ROLE_PRESETS.get(count)
    if preset is not None:
        return preset.get(stage_key, "general")
    return STAGE_NAMES.get(stage_key, "general")


def _stage_roles_for_count(team_bot_count: int) -> list[list[str]]:
    count = validate_team_bot_count(team_bot_count)
    if count in ROLE_GROUPS:
        return [list(group) for group in ROLE_GROUPS[count]]
    groups = [[role] for role in STANDARD_STAGE_ROLES]
    extras_needed = count - len(groups)
    for index in range(extras_needed):
        groups.append([EXTRA_ROLE_CYCLE[index % len(EXTRA_ROLE_CYCLE)]])
    return groups


def _plan_stage_roles() -> list[str]:
    return list(STANDARD_STAGE_ROLES)


def _available_plan_roles(team_bot_count: int) -> list[str]:
    return sorted({role_for_stage(stage_key, team_bot_count) for stage_key in STAGE_NAMES if stage_key != "07_full_build"})


def _primary_role_for_group(stage_roles: list[str], team_bot_count: int) -> str:
    if team_bot_count == 3:
        if stage_roles == ["foundation"]:
            return "foundation"
        if stage_roles == ["walls", "towers"]:
            return "structure"
        return "detail"
    if team_bot_count == 4:
        if stage_roles == ["roof", "secret_room", "decorations"]:
            return "finishing"
        return stage_roles[0]
    return stage_roles[0]


def build_team_bot_definitions(team_bot_count: int) -> list[dict[str, object]]:
    groups = _stage_roles_for_count(team_bot_count)
    bots = []
    for index, stage_roles in enumerate(groups, start=1):
        bots.append(
            {
                "username": f"Builder_{index:02d}",
                "role": _primary_role_for_group(stage_roles, team_bot_count),
                "assignedStages": stage_roles,
                "teamIndex": index,
            }
        )
    return bots


def _recommended_placement_delay(team_bot_count: int) -> int:
    if team_bot_count >= 40:
        return 1000
    if team_bot_count >= 20:
        return 900
    return 700


def _iter_stage_keys(build: GeneratedBuild) -> Iterable[str]:
    for stage in build.stages:
        yield stage.key


def _detect_block_stage(build: GeneratedBuild, position: tuple[int, int, int], block: str) -> str:
    for stage in build.stages:
        if stage.model.blocks.get(position) == block:
            return stage.key
    return build.full_stage.key


def export_mineflayer_build_plan(build: GeneratedBuild, output_path: str, team_bot_count: int = 6) -> None:
    team_bot_count = validate_team_bot_count(team_bot_count)
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
        "availableStageRoles": _plan_stage_roles(),
        "availableRoles": _available_plan_roles(team_bot_count),
        "blocks": blocks,
    }
    with open(output_path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)


def export_mineflayer_team_config(plan_path: str, output_path: str, team_bot_count: int = 6) -> None:
    team_bot_count = validate_team_bot_count(team_bot_count)
    payload = {
        "host": "localhost",
        "port": 25565,
        "version": False,
        "auth": "offline",
        "origin": {"x": 0, "y": 64, "z": 0},
        "bots": build_team_bot_definitions(team_bot_count),
        "planFile": os.path.basename(plan_path),
        "creativeMode": True,
        "issueCreativeCommands": False,
        "placementDelayMs": _recommended_placement_delay(team_bot_count),
        "movementTimeoutMs": 15000,
        "connectTimeoutMs": 30000,
        "maxPlacementRetries": 2,
        "joinBatchSize": 5,
        "joinBatchDelayMs": 3000,
    }
    with open(output_path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
