from __future__ import annotations

import os
import re

from fantasy_schematic_builder.generators import GENERATOR_MAP
from fantasy_schematic_builder.material_exporter import count_materials, write_baritone_steps_file, write_give_commands_file, write_materials_file
from fantasy_schematic_builder.models import GenerationOptions
from fantasy_schematic_builder.schem_writer import write_schematic
from fantasy_schematic_builder.story_analyzer import analyze_story
from fantasy_schematic_builder.youtube_notes import generate_youtube_notes


AUTHOR = "Minecraft Fantasy Schematic Builder V2"


def default_output_directory() -> str:
    appdata = os.environ.get("APPDATA")
    if appdata:
        return os.path.join(appdata, ".minecraft", "schematics")
    home = os.path.expanduser("~")
    linux_like = os.path.join(home, ".minecraft", "schematics")
    if os.path.isdir(os.path.dirname(linux_like)):
        return linux_like
    return os.path.join(os.getcwd(), "output")


def slugify(value: str, fallback: str = "fantasy_build") -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9_-]+", "_", (value or "").strip()).strip("_").lower()
    return cleaned or fallback


def read_story_input(story_value: str) -> str:
    if os.path.isfile(story_value):
        with open(story_value, "r", encoding="utf-8") as handle:
            return handle.read()
    return story_value


def generate_project(
    story_text: str,
    build_type: str,
    build_name: str,
    output_name: str,
    output_dir: str | None = None,
    options: GenerationOptions | None = None,
):
    options = options or GenerationOptions()
    output_dir = output_dir or default_output_directory()
    os.makedirs(output_dir, exist_ok=True)

    analysis = analyze_story(story_text, build_type=build_type)
    generator = GENERATOR_MAP[analysis.selected_build_type]
    safe_output_name = slugify(output_name or build_name)
    display_name = build_name.strip() or safe_output_name.replace("_", " ").title()
    build = generator(display_name=display_name, analysis=analysis)

    written_files: dict[str, object] = {
        "selected_build_type": analysis.selected_build_type,
        "detected_themes": analysis.detected_themes,
        "output_dir": output_dir,
        "stage_paths": [],
    }

    if options.generate_full_schematic:
        full_path = os.path.join(output_dir, f"{safe_output_name}.schem")
        write_schematic(build.full_stage.model, full_path, display_name, AUTHOR, build.description)
        written_files["full_schematic"] = full_path

    stage_paths: list[str] = []
    if options.generate_staged_schematics:
        for stage in build.stages:
            stage_path = os.path.join(output_dir, f"{safe_output_name}_{stage.key}.schem")
            stage_name = display_name if stage.key == "07_full_build" else f"{display_name} - {stage.title}"
            stage_description = build.description if stage.key == "07_full_build" else stage.description
            write_schematic(stage.model, stage_path, stage_name, AUTHOR, stage_description)
            stage_paths.append(stage_path)
        written_files["stage_paths"] = stage_paths

    materials = count_materials(build.full_stage.model)
    written_files["material_counts"] = dict(materials)
    if options.generate_material_list:
        materials_path = os.path.join(output_dir, f"{safe_output_name}_materials.txt")
        write_materials_file(materials, materials_path)
        written_files["materials"] = materials_path

    if options.generate_material_commands:
        give_path = os.path.join(output_dir, f"{safe_output_name}_give_commands.txt")
        write_give_commands_file(materials, give_path)
        written_files["give_commands"] = give_path

    if options.generate_baritone_steps:
        baritone_sources = stage_paths
        if not baritone_sources and "full_schematic" in written_files:
            baritone_sources = [written_files["full_schematic"]]
        if baritone_sources:
            steps_path = os.path.join(output_dir, f"{safe_output_name}_baritone_steps.txt")
            write_baritone_steps_file(baritone_sources, steps_path)
            written_files["baritone_steps"] = steps_path
    if options.generate_youtube_notes:
        notes_path = os.path.join(output_dir, f"{safe_output_name}_youtube_notes.md")
        with open(notes_path, "w", encoding="utf-8") as handle:
            handle.write(generate_youtube_notes(build, safe_output_name))
        written_files["youtube_notes"] = notes_path

    return written_files
