import gzip
import json
import os
import tempfile
import unittest
from contextlib import redirect_stderr
from contextlib import redirect_stdout
from io import StringIO

from fantasy_schematic_builder.app import main
from fantasy_schematic_builder.builder import generate_project
from fantasy_schematic_builder.creative_tools import (
    BUILD_TYPE_LABELS_VI,
    generate_build_idea,
    generate_youtube_title_package,
    idea_to_story_prompt,
)
from fantasy_schematic_builder.models import GenerationOptions
from fantasy_schematic_builder.schem_writer import build_block_data, build_palette, encode_varint
from fantasy_schematic_builder.models import SchematicModel
from fantasy_schematic_builder.gui.tkinter_app import build_generation_options


class GenerationTests(unittest.TestCase):
    def test_gui_option_mapping_helper(self):
        options = build_generation_options(True, False, True, False, True, False, True, 4)
        self.assertTrue(options.generate_full_schematic)
        self.assertFalse(options.generate_staged_schematics)
        self.assertTrue(options.generate_material_list)
        self.assertFalse(options.generate_material_commands)
        self.assertTrue(options.generate_baritone_steps)
        self.assertFalse(options.generate_youtube_notes)
        self.assertTrue(options.generate_mineflayer_plan)
        self.assertEqual(options.team_bot_count, 4)

    def test_generation_writes_full_and_staged_schematics(self):
        story = "A wizard mage builds a magic tower with an observatory and hidden room."
        with tempfile.TemporaryDirectory() as tempdir:
            result = generate_project(
                story_text=story,
                build_type="auto",
                build_name="Tower of the Last Mage",
                output_name="wizard_tower_demo",
                output_dir=tempdir,
                options=GenerationOptions(),
            )

            self.assertEqual(result["selected_build_type"], "wizard_tower")
            self.assertTrue(os.path.exists(result["full_schematic"]))
            self.assertEqual(len(result["stage_paths"]), 7)
            self.assertTrue(os.path.exists(result["materials"]))
            self.assertTrue(os.path.exists(result["give_commands"]))
            self.assertTrue(os.path.exists(result["baritone_steps"]))
            self.assertTrue(os.path.exists(result["youtube_notes"]))

            with gzip.open(result["full_schematic"], "rb") as handle:
                payload = handle.read()
            with gzip.open(result["stage_paths"][-1], "rb") as handle:
                final_stage_payload = handle.read()
            self.assertIn(b"Schematic", payload)
            self.assertIn(b"Palette", payload)
            self.assertEqual(payload, final_stage_payload)
            self.assertGreater(os.path.getsize(result["full_schematic"]), 100)
            self.assertGreater(sum(result["material_counts"].values()), 0)

    def test_generation_respects_disabled_optional_exports(self):
        story = "A floating temple above the sky island with a glowing core."
        with tempfile.TemporaryDirectory() as tempdir:
            result = generate_project(
                story_text=story,
                build_type="auto",
                build_name="Sky Temple",
                output_name="sky_temple",
                output_dir=tempdir,
                options=GenerationOptions(
                    generate_full_schematic=True,
                    generate_staged_schematics=False,
                    generate_material_list=False,
                    generate_material_commands=False,
                    generate_baritone_steps=True,
                    generate_youtube_notes=False,
                ),
            )

            self.assertEqual(result["selected_build_type"], "floating_temple")
            self.assertEqual(result["stage_paths"], [])
            self.assertIn("full_schematic", result)
            self.assertIn("baritone_steps", result)
            self.assertNotIn("materials", result)
            self.assertNotIn("give_commands", result)
            self.assertNotIn("youtube_notes", result)
            with open(result["baritone_steps"], "r", encoding="utf-8") as handle:
                baritone_steps = handle.read()
            self.assertIn("#build sky_temple.schem", baritone_steps)

    def test_generation_rejects_baritone_without_any_schematic_export(self):
        with tempfile.TemporaryDirectory() as tempdir:
            with self.assertRaisesRegex(ValueError, "Baritone steps require at least one generated schematic"):
                generate_project(
                    story_text="A library in ancient ruins.",
                    build_type="ancient_library",
                    build_name="Silent Stacks",
                    output_name="silent_stacks",
                    output_dir=tempdir,
                    options=GenerationOptions(
                        generate_full_schematic=False,
                        generate_staged_schematics=False,
                        generate_material_list=True,
                        generate_material_commands=False,
                        generate_baritone_steps=True,
                        generate_youtube_notes=False,
                    ),
                )

    def test_generated_youtube_notes_include_multiple_titles(self):
        story = "A dragon cave fortress with treasure, a secret room, and a timelapse reveal."
        with tempfile.TemporaryDirectory() as tempdir:
            result = generate_project(
                story_text=story,
                build_type="auto",
                build_name="Infernal Vault",
                output_name="infernal_vault",
                output_dir=tempdir,
                options=GenerationOptions(generate_staged_schematics=False),
            )

            with open(result["youtube_notes"], "r", encoding="utf-8") as handle:
                notes = handle.read()

            self.assertIn("## More title ideas", notes)
            self.assertIn("## Thumbnail text ideas", notes)
            self.assertIn("AI Built This", notes)

    def test_cli_defaults_to_full_only_and_supports_staged_flag(self):
        with tempfile.TemporaryDirectory() as tempdir:
            stdout = StringIO()
            with redirect_stdout(stdout):
                exit_code = main(
                    [
                        "--story",
                        "A wizard tower with a secret room.",
                        "--build-type",
                        "auto",
                        "--output-name",
                        "cli_default",
                        "--output-dir",
                        tempdir,
                    ]
                )
            self.assertEqual(exit_code, 0)
            self.assertTrue(os.path.exists(os.path.join(tempdir, "cli_default.schem")))
            self.assertFalse(os.path.exists(os.path.join(tempdir, "cli_default_01_foundation.schem")))

        with tempfile.TemporaryDirectory() as tempdir:
            stdout = StringIO()
            with redirect_stdout(stdout):
                exit_code = main(
                    [
                        "--story",
                        "A wizard tower with a secret room.",
                        "--build-type",
                        "auto",
                        "--output-name",
                        "cli_staged",
                        "--output-dir",
                        tempdir,
                        "--staged",
                    ]
                )
            self.assertEqual(exit_code, 0)
            self.assertTrue(os.path.exists(os.path.join(tempdir, "cli_staged_01_foundation.schem")))

    def test_cli_no_flags_suppress_selected_outputs(self):
        with tempfile.TemporaryDirectory() as tempdir:
            stdout = StringIO()
            with redirect_stdout(stdout):
                exit_code = main(
                    [
                        "--story",
                        "A floating temple above the clouds.",
                        "--build-type",
                        "auto",
                        "--output-name",
                        "cli_flags",
                        "--output-dir",
                        tempdir,
                        "--no-materials-list",
                        "--no-give-commands",
                        "--no-youtube-notes",
                    ]
                )
            self.assertEqual(exit_code, 0)
            self.assertFalse(os.path.exists(os.path.join(tempdir, "cli_flags_materials.txt")))
            self.assertFalse(os.path.exists(os.path.join(tempdir, "cli_flags_give_commands.txt")))
            self.assertFalse(os.path.exists(os.path.join(tempdir, "cli_flags_youtube_notes.md")))

    def test_generation_can_export_mineflayer_plan(self):
        story = "Một pháp sư xây tháp ma thuật có lõi phát sáng và phòng bí mật."
        with tempfile.TemporaryDirectory() as tempdir:
            result = generate_project(
                story_text=story,
                build_type="wizard_tower",
                build_name="Arcane Team Tower",
                output_name="arcane_team_tower",
                output_dir=tempdir,
                options=GenerationOptions(
                    generate_staged_schematics=False,
                    generate_material_commands=False,
                    generate_mineflayer_plan=True,
                    team_bot_count=6,
                ),
            )

            self.assertIn("mineflayer_plan", result)
            self.assertIn("mineflayer_config", result)
            self.assertTrue(os.path.exists(result["mineflayer_plan"]))
            self.assertTrue(os.path.exists(result["mineflayer_config"]))
            with open(result["mineflayer_plan"], "r", encoding="utf-8") as handle:
                payload = json.load(handle)
            self.assertEqual(payload["recommendedBotCount"], 6)
            self.assertEqual(payload["availableStageRoles"], ["foundation", "walls", "towers", "roof", "secret_room", "decorations"])
            self.assertGreater(len(payload["blocks"]), 0)
            self.assertIn(payload["blocks"][0]["stage"], {"foundation", "walls", "towers", "roof", "secret_room", "decorations"})
            self.assertIn(payload["blocks"][0]["role"], {"foundation", "walls", "towers", "roof", "secret_room", "decorations"})

    def test_cli_can_export_mineflayer_plan_for_three_bots(self):
        with tempfile.TemporaryDirectory() as tempdir:
            stdout = StringIO()
            with redirect_stdout(stdout):
                exit_code = main(
                    [
                        "--story",
                        "A floating fantasy temple with a hidden room.",
                        "--build-type",
                        "floating_temple",
                        "--output-name",
                        "cli_mineflayer",
                        "--output-dir",
                        tempdir,
                        "--mineflayer-plan",
                        "--team-bots",
                        "3",
                    ]
                )
            self.assertEqual(exit_code, 0)
            plan_path = os.path.join(tempdir, "cli_mineflayer_mineflayer_plan.json")
            self.assertTrue(os.path.exists(plan_path))
            with open(plan_path, "r", encoding="utf-8") as handle:
                payload = json.load(handle)
            self.assertEqual(payload["recommendedBotCount"], 3)
            self.assertTrue(any(block["role"] == "structure" for block in payload["blocks"]))
            config_path = os.path.join(tempdir, "cli_mineflayer_team_config.json")
            self.assertTrue(os.path.exists(config_path))
            with open(config_path, "r", encoding="utf-8") as handle:
                config_payload = json.load(handle)
            self.assertEqual(config_payload["bots"][0]["username"], "Builder_01")
            self.assertEqual(config_payload["bots"][1]["assignedStages"], ["walls", "towers"])
            self.assertEqual(config_payload["planFile"], "cli_mineflayer_mineflayer_plan.json")

    def test_generation_can_export_four_bot_role_mapping(self):
        story = "A fantasy library with towers, roof, and secret room."
        with tempfile.TemporaryDirectory() as tempdir:
            result = generate_project(
                story_text=story,
                build_type="ancient_library",
                build_name="Four Bot Library",
                output_name="four_bot_library",
                output_dir=tempdir,
                options=GenerationOptions(
                    generate_staged_schematics=False,
                    generate_material_list=False,
                    generate_material_commands=False,
                    generate_baritone_steps=False,
                    generate_youtube_notes=False,
                    generate_mineflayer_plan=True,
                    team_bot_count=4,
                ),
            )

            with open(result["mineflayer_plan"], "r", encoding="utf-8") as handle:
                payload = json.load(handle)
            self.assertEqual(payload["recommendedBotCount"], 4)
            self.assertTrue(any(block["role"] == "finishing" for block in payload["blocks"]))

    def test_cli_accepts_fifty_team_bots_and_generates_config(self):
        with tempfile.TemporaryDirectory() as tempdir:
            stdout = StringIO()
            with redirect_stdout(stdout):
                exit_code = main(
                    [
                        "--story",
                        "Một vương quốc fantasy lớn với tháp, tường thành, phòng bí mật và sân trang trí.",
                        "--build-type",
                        "wizard_tower",
                        "--output-name",
                        "wizard_50",
                        "--output-dir",
                        tempdir,
                        "--mineflayer-plan",
                        "--team-bots",
                        "50",
                        "--staged",
                    ]
                )
            self.assertEqual(exit_code, 0)
            plan_path = os.path.join(tempdir, "wizard_50_mineflayer_plan.json")
            config_path = os.path.join(tempdir, "wizard_50_team_config.json")
            self.assertTrue(os.path.exists(plan_path))
            self.assertTrue(os.path.exists(config_path))
            with open(config_path, "r", encoding="utf-8") as handle:
                config_payload = json.load(handle)
            self.assertEqual(len(config_payload["bots"]), 50)
            self.assertEqual(config_payload["bots"][0]["username"], "Builder_01")
            self.assertEqual(config_payload["bots"][-1]["username"], "Builder_50")
            self.assertEqual(config_payload["joinBatchSize"], 5)
            self.assertEqual(config_payload["joinBatchDelayMs"], 3000)
            self.assertGreaterEqual(
                {bot["role"] for bot in config_payload["bots"]},
                {"foundation", "walls", "towers", "roof", "secret_room", "decorations"},
            )

    def test_cli_rejects_invalid_team_bot_counts(self):
        for value in ("0", "51", "abc"):
            stderr = StringIO()
            with self.assertRaises(SystemExit) as exc, redirect_stderr(stderr):
                main(
                    [
                        "--story",
                        "A tower.",
                        "--build-type",
                        "wizard_tower",
                        "--team-bots",
                        value,
                    ]
                )
            self.assertEqual(exc.exception.code, 2)
            self.assertIn("Số bot Mineflayer", stderr.getvalue())

    def test_creative_tools_generate_idea_and_titles(self):
        idea = generate_build_idea(theme="wizard", keyword="moon archive")
        self.assertEqual(idea.recommended_build_type, "wizard_tower")
        self.assertIn(idea.recommended_build_type, BUILD_TYPE_LABELS_VI)
        self.assertIn("moon archive", idea_to_story_prompt(idea).lower())

        titles = generate_youtube_title_package(
            story_text=idea_to_story_prompt(idea),
            build_type=idea.recommended_build_type,
            build_name=idea.concept,
        )
        self.assertGreaterEqual(len(titles.titles), 8)
        self.assertGreaterEqual(len(titles.thumbnail_texts), 4)
        self.assertTrue(any("Minecraft" in title for title in titles.titles))

    def test_title_package_respects_requested_count(self):
        titles = generate_youtube_title_package(
            story_text="A floating temple above the clouds with secret rooms.",
            build_type="floating_temple",
            build_name="Sky Shrine",
            count=3,
        )
        self.assertEqual(len(titles.titles), 3)

    def test_cli_supports_generate_idea_and_titles_without_story_export(self):
        stdout = StringIO()
        with redirect_stdout(stdout):
            exit_code = main(
                [
                    "--generate-idea",
                    "--idea-theme",
                    "dragon",
                    "--idea-keyword",
                    "lost relic",
                    "--generate-titles",
                    "--build-type",
                    "dragon_cave",
                ]
            )
        output = stdout.getvalue()
        self.assertEqual(exit_code, 0)
        self.assertIn("Ý tưởng công trình:", output)
        self.assertIn("Gợi ý tiêu đề YouTube:", output)

    def test_varint_block_data_encoding_for_small_model(self):
        model = SchematicModel(width=2, height=1, length=1)
        model.set_block(0, 0, 0, "minecraft:stone")
        model.set_block(1, 0, 0, "minecraft:gold_block")
        palette = build_palette(model)
        data = build_block_data(model, palette)

        self.assertEqual(palette["minecraft:air"], 0)
        self.assertEqual(palette["minecraft:stone"], 1)
        self.assertEqual(palette["minecraft:gold_block"], 2)
        self.assertEqual(data, encode_varint(1) + encode_varint(2))


if __name__ == "__main__":
    unittest.main()
