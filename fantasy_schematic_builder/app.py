from __future__ import annotations

import argparse
import os
import sys

if __package__ in {None, ""}:
    sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fantasy_schematic_builder.builder import default_output_directory, generate_project, read_story_input  # noqa: E402
from fantasy_schematic_builder.models import GenerationOptions  # noqa: E402
from fantasy_schematic_builder.story_analyzer import BUILD_TYPES  # noqa: E402


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Minecraft Fantasy Schematic Builder V2")
    parser.add_argument("--gui", action="store_true", help="Launch the Tkinter GUI")
    parser.add_argument("--story", help="Story text or path to a .txt story file")
    parser.add_argument("--build-type", choices=BUILD_TYPES, default="auto", help="Build type to generate")
    parser.add_argument("--name", default="Fantasy Build", help="Display name for the build")
    parser.add_argument("--output-name", default="fantasy_build", help="Base file name for exported files")
    parser.add_argument("--output-dir", default=default_output_directory(), help="Output directory for .schem and notes")
    parser.add_argument("--staged", action="store_true", help="Generate staged cumulative schematics")
    parser.add_argument("--no-full-schematic", action="store_true", help="Skip generating the main full schematic")
    parser.add_argument("--no-give-commands", action="store_true", help="Skip generating /give command files")
    parser.add_argument("--no-baritone", action="store_true", help="Skip generating Baritone step instructions")
    parser.add_argument("--no-youtube-notes", action="store_true", help="Skip generating YouTube/story notes")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.gui:
        try:
            from fantasy_schematic_builder.gui.tkinter_app import run_gui  # noqa: E402
        except ModuleNotFoundError as exc:
            parser.exit(1, f"GUI is unavailable because tkinter could not be imported: {exc}\n")
        run_gui()
        return 0

    if not args.story:
        parser.error("--story is required unless --gui is used")

    story_text = read_story_input(args.story)
    result = generate_project(
        story_text=story_text,
        build_type=args.build_type,
        build_name=args.name,
        output_name=args.output_name,
        output_dir=args.output_dir,
        options=GenerationOptions(
            generate_full_schematic=not args.no_full_schematic,
            generate_staged_schematics=args.staged,
            generate_material_commands=not args.no_give_commands,
            generate_baritone_steps=not args.no_baritone,
            generate_youtube_notes=not args.no_youtube_notes,
        ),
    )

    print(f"Generated build type: {result['selected_build_type']}")
    print(f"Output directory: {result['output_dir']}")
    if "full_schematic" in result:
        print(f"Full schematic: {result['full_schematic']}")
    for stage_path in result.get("stage_paths", []):
        print(f"Stage schematic: {stage_path}")
    for key in ("materials", "give_commands", "baritone_steps", "youtube_notes"):
        if key in result:
            print(f"{key.replace('_', ' ').title()}: {result[key]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
