import gzip
import os
import tempfile
import unittest

from fantasy_schematic_builder.builder import generate_project
from fantasy_schematic_builder.models import GenerationOptions


class GenerationTests(unittest.TestCase):
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
            self.assertIn(b"Schematic", payload)
            self.assertIn(b"Palette", payload)
            self.assertGreater(os.path.getsize(result["full_schematic"]), 100)
            self.assertGreater(sum(result["material_counts"].values()), 0)


if __name__ == "__main__":
    unittest.main()
