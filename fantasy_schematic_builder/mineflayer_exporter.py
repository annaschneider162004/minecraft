from __future__ import annotations

import json
import os
import shutil
import tempfile
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

AURALIS_V2_PLAN_FILENAME = "auralis_v2_team_plan.json"
AURALIS_V2_CONFIG_FILENAME = "auralis_v2_team_config.json"
AURALIS_V2_ALIAS_CONFIG_FILENAME = "cong_trinh_huyen_huyen_team_config.json"
AURALIS_V2_SERVER_SETUP_FILENAME = "server-console-setup-commands.txt"
AURALIS_V2_BOT_ASSIGNMENTS = (
    ("Builder_01", "dragon_body"),
    ("Builder_02", "dragon_head"),
    ("Builder_03", "heavenly_gate"),
    ("Builder_04", "city_platform"),
    ("Builder_05", "central_tower"),
    ("Builder_06", "elemental_temples"),
    ("Builder_07", "void_abyss"),
    ("Builder_08", "demon_fortress"),
    ("Builder_09", "decorations"),
    ("Builder_10", "lighting"),
)
AURALIS_V2_SERVER_SETUP_COMMANDS = tuple(
    [f"op Builder_{index:02d}" for index in range(1, 11)]
    + ["op Jonhbh", "op Jonh", "say Mineflayer bot operators configured"]
)


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


def _available_plan_roles(build: GeneratedBuild, team_bot_count: int) -> list[str]:
    return sorted({role_for_stage(stage_key, team_bot_count) for stage_key in _iter_stage_keys(build) if stage_key != "07_full_build"})


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


def auralis_v2_mineflayer_directory(mineflayer_dir: str | None = None) -> str:
    if mineflayer_dir:
        return os.path.abspath(mineflayer_dir)
    configured_dir = os.environ.get("MINEFLAYER_TEAM_BUILDER_DIR")
    if configured_dir:
        return os.path.abspath(configured_dir)
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "mineflayer-team-builder"))


def auralis_v2_examples_directory(examples_dir: str | None = None, mineflayer_dir: str | None = None) -> str:
    if examples_dir:
        return os.path.abspath(examples_dir)
    return os.path.join(auralis_v2_mineflayer_directory(mineflayer_dir), "examples")


def _auralis_v2_plan_source_path(examples_dir: str | None = None, mineflayer_dir: str | None = None) -> str:
    return os.path.join(auralis_v2_examples_directory(examples_dir=examples_dir, mineflayer_dir=mineflayer_dir), AURALIS_V2_PLAN_FILENAME)


def _auralis_v2_bot_definitions() -> list[dict[str, object]]:
    return [
        {
            "username": username,
            "role": stage_name,
            "assignedStages": [stage_name],
            "teamIndex": index,
        }
        for index, (username, stage_name) in enumerate(AURALIS_V2_BOT_ASSIGNMENTS, start=1)
    ]


def build_auralis_v2_team_config(plan_path: str) -> dict[str, object]:
    return {
        "host": "localhost",
        "port": 25565,
        "version": False,
        "auth": "offline",
        "autoFindOrigin": False,
        "origin": {"x": 0, "y": 100, "z": 0},
        "platformOrigin": {"x": 0, "y": 100, "z": 0},
        "searchCenter": "spawn",
        "searchRadius": 80,
        "maxSearchRadius": 160,
        "requiredFlatness": 3,
        "clearanceHeight": 20,
        "preferCurrentPlayerArea": True,
        "buildPadding": 10,
        "scoutBot": "Builder_01",
        "bots": _auralis_v2_bot_definitions(),
        "planFile": os.path.abspath(plan_path),
        "creativeMode": True,
        "issueCreativeCommands": True,
        "issueWorldCommands": True,
        "creativeCommandDelayMs": 750,
        "commandPrefix": "/",
        "placementDelayMs": 700,
        "commandDelayMs": 50,
        "placementMode": "commands",
        "commandBuildFallback": True,
        "movementTimeoutMs": 15000,
        "connectTimeoutMs": 120000,
        "connectRetries": 3,
        "connectRetryDelayMs": 5000,
        "maxPlacementRetries": 2,
        "joinBatchSize": 1,
        "joinBatchDelayMs": 5000,
        "allowPartialTeam": False,
        "teleportBotsToOrigin": False,
        "setWorldConditions": False,
        "clearBuildArea": False,
        "prepareBuildPlatform": True,
        "platformBlock": "minecraft:grass_block",
        "clearAbovePlatform": True,
        "platformPadding": 30,
        "platformExtraHeight": 50,
    }


def _write_json(payload: dict[str, object], output_path: str) -> None:
    with open(output_path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)


def _config_argument_for_output_dir(output_dir: str, config_path: str) -> str:
    appdata = os.environ.get("APPDATA")
    if os.name == "nt" and appdata:
        default_windows_output = os.path.abspath(os.path.join(appdata, ".minecraft", "schematics"))
        if os.path.abspath(output_dir) == default_windows_output:
            return r'%APPDATA%\.minecraft\schematics\cong_trinh_huyen_huyen_team_config.json'
    return os.path.abspath(config_path)


def format_auralis_v2_export_summary(result: dict[str, str]) -> str:
    run_config_path = _config_argument_for_output_dir(result["output_dir"], result["alias_config"])
    if os.name == "nt":
        run_command = f'cd /d "{result["mineflayer_dir"]}" && npm start -- --config "{run_config_path}"'
    else:
        run_command = f'cd "{result["mineflayer_dir"]}" && npm start -- --config "{run_config_path}"'
    return (
        f"Đã xuất Auralis v2 vào {result['output_dir']}\n\n"
        f"Các file đã tạo:\n"
        f"- Plan: {result['plan']}\n"
        f"- Config chính: {result['config']}\n"
        f"- Config alias để giữ lệnh cũ: {result['alias_config']}\n"
        f"- Lệnh OP server: {result['server_console_setup']}\n\n"
        f"Hãy dán nội dung {AURALIS_V2_SERVER_SETUP_FILENAME} vào cửa sổ server.jar, không dán vào CMD bot.\n"
        f"Sau đó chạy: {run_command}"
    )


def export_auralis_v2_assets(
    output_dir: str,
    examples_dir: str | None = None,
    mineflayer_dir: str | None = None,
) -> dict[str, str]:
    output_dir = os.path.abspath(output_dir)
    os.makedirs(output_dir, exist_ok=True)
    resolved_examples_dir = auralis_v2_examples_directory(examples_dir=examples_dir, mineflayer_dir=mineflayer_dir)
    resolved_mineflayer_dir = auralis_v2_mineflayer_directory(mineflayer_dir)
    if mineflayer_dir is None and examples_dir:
        normalized_examples_dir = os.path.basename(os.path.normpath(resolved_examples_dir)).lower()
        if normalized_examples_dir != "examples":
            raise ValueError(
                "Khi truyền examples_dir tùy chỉnh không phải thư mục 'examples', bạn cũng phải truyền mineflayer_dir."
            )
        resolved_mineflayer_dir = os.path.abspath(os.path.dirname(resolved_examples_dir))
    plan_source_path = os.path.join(resolved_examples_dir, AURALIS_V2_PLAN_FILENAME)
    if not os.path.isfile(plan_source_path):
        raise FileNotFoundError(
            f"Không tìm thấy asset nguồn {AURALIS_V2_PLAN_FILENAME} trong thư mục: {resolved_examples_dir}"
        )
    plan_output_path = os.path.join(output_dir, AURALIS_V2_PLAN_FILENAME)
    config_output_path = os.path.join(output_dir, AURALIS_V2_CONFIG_FILENAME)
    alias_output_path = os.path.join(output_dir, AURALIS_V2_ALIAS_CONFIG_FILENAME)
    server_setup_output_path = os.path.join(output_dir, AURALIS_V2_SERVER_SETUP_FILENAME)

    with tempfile.TemporaryDirectory(dir=output_dir, prefix=".auralis_v2_export_") as temp_dir:
        temp_plan_output_path = os.path.join(temp_dir, AURALIS_V2_PLAN_FILENAME)
        temp_config_output_path = os.path.join(temp_dir, AURALIS_V2_CONFIG_FILENAME)
        temp_alias_output_path = os.path.join(temp_dir, AURALIS_V2_ALIAS_CONFIG_FILENAME)
        temp_server_setup_output_path = os.path.join(temp_dir, AURALIS_V2_SERVER_SETUP_FILENAME)

        shutil.copyfile(plan_source_path, temp_plan_output_path)
        config_payload = build_auralis_v2_team_config(plan_output_path)
        _write_json(config_payload, temp_config_output_path)
        _write_json(config_payload, temp_alias_output_path)
        with open(temp_server_setup_output_path, "w", encoding="utf-8") as handle:
            handle.write("\n".join(AURALIS_V2_SERVER_SETUP_COMMANDS) + "\n")

        for temp_path, final_path in (
            (temp_plan_output_path, plan_output_path),
            (temp_config_output_path, config_output_path),
            (temp_alias_output_path, alias_output_path),
            (temp_server_setup_output_path, server_setup_output_path),
        ):
            os.replace(temp_path, final_path)

    return {
        "output_dir": output_dir,
        "plan": plan_output_path,
        "config": config_output_path,
        "alias_config": alias_output_path,
        "server_console_setup": server_setup_output_path,
        "mineflayer_dir": resolved_mineflayer_dir,
    }


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
        "availableRoles": _available_plan_roles(build, team_bot_count),
        "blocks": blocks,
    }
    _write_json(payload, output_path)


def export_mineflayer_team_config(
    plan_path: str,
    output_path: str,
    team_bot_count: int = 6,
    auto_find_origin: bool = False,
) -> None:
    team_bot_count = validate_team_bot_count(team_bot_count)
    default_origin = "auto" if auto_find_origin else {"x": 0, "y": 100, "z": 0}
    payload = {
        "host": "localhost",
        "port": 25565,
        "version": False,
        "auth": "offline",
        "autoFindOrigin": auto_find_origin,
        "origin": default_origin,
        "platformOrigin": {"x": 0, "y": 100, "z": 0},
        "searchCenter": "spawn",
        "searchRadius": 80,
        "maxSearchRadius": 160,
        "requiredFlatness": 3,
        "clearanceHeight": 20,
        "preferCurrentPlayerArea": True,
        "buildPadding": 6,
        "scoutBot": "Builder_01",
        "bots": build_team_bot_definitions(team_bot_count),
        "planFile": os.path.basename(plan_path),
        "creativeMode": True,
        "issueCreativeCommands": True,
        "issueWorldCommands": True,
        "creativeCommandDelayMs": 750,
        "commandPrefix": "/",
        "placementDelayMs": _recommended_placement_delay(team_bot_count),
        "commandDelayMs": 50,
        "placementMode": "commands",
        "commandBuildFallback": True,
        "movementTimeoutMs": 15000,
        "connectTimeoutMs": 120000,
        "connectRetries": 3,
        "connectRetryDelayMs": 5000,
        "maxPlacementRetries": 2,
        "joinBatchSize": 1,
        "joinBatchDelayMs": 5000,
        "allowPartialTeam": False,
        "teleportBotsToOrigin": False,
        "setWorldConditions": False,
        "clearBuildArea": False,
        "prepareBuildPlatform": True,
        "platformBlock": "minecraft:grass_block",
        "clearAbovePlatform": True,
        "platformPadding": 20,
        "platformExtraHeight": 20,
    }
    with open(output_path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
