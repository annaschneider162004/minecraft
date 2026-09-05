# Minecraft Fantasy Schematic Builder V2

A user-friendly Python tool for turning English or Vietnamese fantasy story prompts into Minecraft `.schem` files for Minecraft 1.20.1, WorldEdit/Litematica, and Baritone timelapse building.

## Features

- Tkinter GUI: paste a story, load a `.txt` story, choose a build type, pick an output folder, and generate files.
- CLI mode: run the generator without the GUI.
- Auto theme detection for:
  - `survival_cliffside_base`
  - `wizard_tower`
  - `dragon_cave`
  - `ancient_library`
  - `floating_temple`
  - `auto`
- Sponge schematic v2-style `.schem` writer using gzip-compressed NBT, a block palette, and varint `BlockData`.
- Cumulative staged schematic exports for easier Baritone building.
- Material list, `/give` command export, Baritone build steps, and YouTube notes.
- Example story files in `/examples`.

## Requirements

- Python 3.10+
- No extra dependency is required for the new builder path.
- The repository also contains an older experimental `minecraft-ai-builder-v2/` folder, but the main V2 fantasy schematic tool in this issue lives in `fantasy_schematic_builder/`.

## Run the GUI

```bash
python fantasy_schematic_builder/app.py --gui
```

The GUI lets you:
- paste or type a fantasy story
- load a `.txt` story file
- choose the build type or `auto`
- set the build name and output base name
- choose the output folder
- enable or disable full schematic, staged schematics, `/give` commands, Baritone steps, and YouTube notes

## Run the CLI

```bash
python fantasy_schematic_builder/app.py --story examples/story_wizard_tower.txt --build-type wizard_tower --name "Tower of the Last Mage" --output-name wizard_tower_demo
python fantasy_schematic_builder/app.py --story examples/story_cliffside.txt --build-type auto --name "The Last Cliffside Sanctuary" --output-name cliffside_demo --staged
```

### Useful CLI options

- `--gui` - launch the GUI
- `--story` - pass story text or a path to a `.txt` story file
- `--build-type auto|survival_cliffside_base|wizard_tower|dragon_cave|ancient_library|floating_temple`
- `--name` - build display name
- `--output-name` - file base name
- `--output-dir` - export folder
- `--staged` - generate cumulative staged schematics
- `--no-full-schematic` - skip the main full schematic
- `--no-give-commands` - skip `/give` command export
- `--no-baritone` - skip Baritone step export
- `--no-youtube-notes` - skip YouTube/story notes export

## Output location

On Windows, the default output folder is:

```text
%APPDATA%\.minecraft\schematics
```

When `%APPDATA%` is not available, the tool falls back to `~/.minecraft/schematics` when possible, otherwise `./output`.

## Generated files

Depending on the options you select, the tool writes:

- `build_name.schem` - full schematic
- `build_name_01_foundation.schem`
- `build_name_02_walls.schem`
- `build_name_03_towers_or_core.schem`
- `build_name_04_roof_or_top.schem`
- `build_name_05_secret_room.schem`
- `build_name_06_decorations.schem`
- `build_name_07_full_build.schem`
- `build_name_materials.txt`
- `build_name_give_commands.txt`
- `build_name_baritone_steps.txt`
- `build_name_youtube_notes.md`

Staged schematics are **cumulative**. That means each later stage includes everything from the earlier stages so Baritone can continue more reliably.

## Baritone and Minecraft 1.20.1 usage

- Use this in Singleplayer or on your own server only.
- Put generated `.schem` files in `.minecraft/schematics` for Baritone.
- In Minecraft, run `#build filename.schem` for the full build or run staged files one by one.
- If Baritone says materials are missing, copy the `/give` commands from the generated command file, then run `#resume`.
- These generated structures intentionally use mostly simple full blocks to make Baritone building more reliable.

## Example stories

- `examples/story_cliffside.txt`
- `examples/story_wizard_tower.txt`
- `examples/story_dragon_cave.txt`
- `examples/story_ancient_library.txt`
- `examples/story_floating_temple.txt`

## Tests

Run the targeted unit tests with:

```bash
python -m unittest discover -s tests -v
```
