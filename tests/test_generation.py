import gzip
import os
import tempfile
import unittest
from contextlib import redirect_stdout
from io import StringIO

from fantasy_schematic_builder.app import main
from fantasy_schematic_builder.builder import generate_project
from fantasy_schematic_builder.models import GenerationOptions
from fantasy_schematic_builder.schem_writer import build_block_data, build_palette, encode_varint
from fantasy_schematic_builder.models import SchematicModel
from fantasy_schematic_builder.gui.tkinter_app import build_generation_options


class GenerationTests(unittest.TestCase):
    def test_gui_option_mapping_helper(self):
        options = build_generation_options(True, False, True, False, True, False)
        self.assertTrue(options.generate_full_schematic)
        self.assertFalse(options.generate_staged_schematics)
        self.assertTrue(options.generate_material_list)
        self.assertFalse(options.generate_material_commands)
        self.assertTrue(options.generate_baritone_steps)
        self.assertFalse(options.generate_youtube_notes)

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
