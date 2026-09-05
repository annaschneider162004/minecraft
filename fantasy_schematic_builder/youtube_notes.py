from __future__ import annotations

from fantasy_schematic_builder.models import GeneratedBuild


def generate_youtube_notes(build: GeneratedBuild, output_name: str) -> str:
    themes = ", ".join(build.analysis.detected_themes) or build.build_type.replace("_", " ")
    story = build.analysis.story_summary
    suggested_title = f"I Let Baritone Build {build.display_name} From an AI Fantasy Story"
    stage_lines = "\n".join(
        f"- {stage.key}: Narrate the {stage.title.lower()} phase of {build.display_name}."
        for stage in build.stages
    )
    shot_list = "\n".join(
        [
            "- Wide establishing shot of the empty site before the build starts.",
            "- Time-lapse orbit during the foundation and wall stages.",
            "- Mid-build pan focusing on the towers/core stage.",
            "- Slow reveal through the secret room entrance.",
            "- Replay Mod sunrise pull-back for the final completed build.",
        ]
    )
    return f"""# {build.display_name}

## Build title
{build.display_name}

## Detected themes
{themes}

## Short fantasy story summary
{story}

## Suggested YouTube title
{suggested_title}

## Thumbnail text ideas
- AI BUILT THIS IN MINECRAFT
- Fantasy Story -> Schematic -> Baritone
- {build.display_name.upper()}

## Replay Mod cinematic shot list
{shot_list}

## Stage-by-stage narration
{stage_lines}

## Baritone reminder
- Use in Singleplayer or your own server only.
- Put generated `.schem` files in `.minecraft/schematics`.
- Run `#build {output_name}.schem` for the full build or staged files one by one.
- If Baritone says materials are missing, use the generated `/give` command file and then run `#resume`.
- These structures intentionally use mostly simple full blocks for more reliable Baritone building.
"""
