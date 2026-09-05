from __future__ import annotations

from fantasy_schematic_builder.creative_tools import generate_youtube_title_package
from fantasy_schematic_builder.models import GeneratedBuild


def generate_youtube_notes(build: GeneratedBuild, output_name: str, story_text: str = "") -> str:
    themes = ", ".join(build.analysis.detected_themes) or build.build_type.replace("_", " ")
    story = build.analysis.story_summary
    title_package = generate_youtube_title_package(
        story_text=story_text or build.analysis.story_summary,
        build_type=build.build_type,
        build_name=build.display_name,
    )
    suggested_title = title_package.titles[0]
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
    extra_titles = "\n".join(f"- {title}" for title in title_package.titles)
    thumbnail_texts = "\n".join(f"- {text}" for text in title_package.thumbnail_texts)
    return f"""# {build.display_name}

## Build title
{build.display_name}

## Detected themes
{themes}

## Short fantasy story summary
{story}

## Suggested YouTube title
{suggested_title}

## More title ideas
{extra_titles}

## Thumbnail text ideas
{thumbnail_texts}

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
