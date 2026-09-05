# Minecraft Fantasy Schematic Builder V2

A user-friendly Python tool for turning English or Vietnamese fantasy story prompts into Minecraft `.schem` files for Minecraft 1.20.1, WorldEdit/Litematica, and Baritone timelapse building.

## Features

- Tkinter GUI tiếng Việt với giao diện tối kiểu dashboard: dán câu chuyện, tải file `.txt`, chọn loại công trình, chọn thư mục xuất, và tạo file.
- CLI mode: run the generator without the GUI.
- Auto theme detection for:
  - `survival_cliffside_base`
  - `wizard_tower`
  - `dragon_cave`
  - `ancient_library`
  - `floating_temple`
  - `auto`
- Offline build idea generator with curated fantasy/medieval/survival/dragon/wizard/ocean/sky/nether/ancient/village/castle/cave/temple templates.
- Offline YouTube title + thumbnail text generator for Minecraft fantasy build videos.
- Sponge schematic v2-style `.schem` writer using gzip-compressed NBT, a block palette, and varint `BlockData`.
- Cumulative staged schematic exports for easier Baritone building.
- Material list, `/give` command export, Baritone build steps, and YouTube notes.
- Optional Mineflayer team build plan JSON export plus a separate `mineflayer-team-builder/` Node.js bot prototype.
- Example story files in `/examples`.

## Requirements

- Python 3.10+
- No extra dependency is required for the new builder path.
- Mineflayer bot building is optional and lives in `mineflayer-team-builder/` with its own `npm install`.
- The repository also contains an older experimental `minecraft-ai-builder-v2/` folder, but the main V2 fantasy schematic tool in this issue lives in `fantasy_schematic_builder/`.

## Run the GUI

```bash
python fantasy_schematic_builder/app.py --gui
```

The GUI lets you:
- nhập hoặc dán câu chuyện / prompt huyền huyễn bằng tiếng Việt hoặc tiếng Anh
- tải file `.txt`
- chọn loại công trình hoặc `Tự động nhận diện`
- tạo ý tưởng Minecraft mới theo chủ đề và từ khóa
- dùng ngay ý tưởng vừa tạo để đổ vào ô prompt
- tạo nhiều tiêu đề YouTube và chữ thumbnail
- bật/tắt tạo schematic đầy đủ, schematic theo giai đoạn, danh sách vật liệu, lệnh `/give`, hướng dẫn Baritone, và ghi chú YouTube

### Quy trình GUI gợi ý

1. Chạy `python fantasy_schematic_builder/app.py --gui`
2. Bấm **`Tạo ý tưởng mới`**
3. Bấm **`Dùng ý tưởng này`**
4. Chọn **Loại công trình** hoặc để **`Tự động nhận diện`**
5. Bấm **`Tạo schematic`**
6. Trong Minecraft dùng các lệnh Baritone theo file xuất ra từng giai đoạn

## Run the CLI

```bash
python fantasy_schematic_builder/app.py --story examples/story_wizard_tower.txt --build-type wizard_tower --name "Tower of the Last Mage" --output-name wizard_tower_demo
python fantasy_schematic_builder/app.py --story examples/story_cliffside.txt --build-type auto --name "The Last Cliffside Sanctuary" --output-name cliffside_demo --staged
python fantasy_schematic_builder/app.py --generate-idea --idea-theme dragon --idea-keyword relic
python fantasy_schematic_builder/app.py --story examples/story_dragon_cave.txt --build-type auto --generate-titles
python fantasy_schematic_builder/app.py --story examples/story_wizard_tower.txt --build-type wizard_tower --output-name wizard_team --mineflayer-plan --team-bots 6
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
- `--no-materials-list` - skip the material count file
- `--no-give-commands` - skip `/give` command export
- `--no-baritone` - skip Baritone step export
- `--no-youtube-notes` - skip YouTube/story notes export
- `--mineflayer-plan` - generate a JSON build plan for the optional Mineflayer multi-bot subsystem
- `--team-bots 3|4|6` - choose the recommended bot-role split encoded into the Mineflayer plan
- `--generate-idea` - print an offline build idea to the console
- `--idea-theme fantasy|medieval|survival|dragon|wizard|ocean|sky|nether|ancient|village|castle|cave|temple`
- `--idea-keyword "..."` - inject an extra keyword into the generated idea
- `--generate-titles` - print offline YouTube title suggestions and thumbnail text (requires `--story` or `--generate-idea`)

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
- `build_name_07_full_build.schem` - staged numeric copy of the same final structure as `build_name.schem`
- `build_name_materials.txt`
- `build_name_give_commands.txt`
- `build_name_baritone_steps.txt`
- `build_name_youtube_notes.md`
- `build_name_mineflayer_plan.json`

Staged schematics are **cumulative**. That means each later stage includes everything from the earlier stages so Baritone can continue more reliably.
If staged exports are disabled but Baritone steps are enabled, the steps file falls back to the full schematic.
When YouTube notes are enabled, the notes file also includes multiple title suggestions and thumbnail text ideas.

## Optional Mineflayer team builder

- The optional Node.js prototype lives in `mineflayer-team-builder/`.
- It reads the exported `*_mineflayer_plan.json`, connects multiple Mineflayer bots to a **singleplayer LAN/local/private server**, and splits the structure into team roles for cinematic build videos.
- See `mineflayer-team-builder/README.md` for setup, safety notes, and the YouTube workflow.

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
