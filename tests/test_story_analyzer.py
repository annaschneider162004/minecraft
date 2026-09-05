import unittest

from fantasy_schematic_builder.story_analyzer import analyze_story


class StoryAnalyzerTests(unittest.TestCase):
    def test_auto_detects_wizard_tower_from_vietnamese_keywords(self):
        analysis = analyze_story("Một pháp sư xây tháp ma thuật với thư viện và phòng bí mật.", build_type="auto")
        self.assertEqual(analysis.selected_build_type, "wizard_tower")
        self.assertIn("wizard", analysis.detected_themes)

    def test_auto_detects_floating_temple_from_english_keywords(self):
        analysis = analyze_story("A floating sky temple above a cloud island with a glowing core.", build_type="auto")
        self.assertEqual(analysis.selected_build_type, "floating_temple")


if __name__ == "__main__":
    unittest.main()
