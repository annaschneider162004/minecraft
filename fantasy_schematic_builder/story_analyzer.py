from __future__ import annotations

import re
from collections import defaultdict

from fantasy_schematic_builder.models import BuildAnalysis


KEYWORDS = {
    "survival_cliffside_base": {
        "cliff": 4,
        "mountain": 3,
        "cliffside": 5,
        "survival": 4,
        "farm": 2,
        "sanctuary": 2,
        "vách núi": 5,
        "núi": 3,
        "sườn đồi": 4,
        "sinh tồn": 4,
        "ruộng": 2,
        "lúa": 2,
    },
    "wizard_tower": {
        "wizard": 5,
        "mage": 5,
        "magic": 4,
        "arcane": 4,
        "tower": 3,
        "pháp sư": 5,
        "ma thuật": 4,
        "phép thuật": 4,
    },
    "dragon_cave": {
        "dragon": 5,
        "wyvern": 4,
        "cave": 4,
        "dark": 3,
        "nether": 3,
        "demon": 3,
        "rồng": 5,
        "long thần": 4,
        "hang": 3,
        "bóng tối": 3,
        "hắc ám": 3,
        "quỷ": 3,
    },
    "ancient_library": {
        "library": 5,
        "bookshelf": 3,
        "book": 2,
        "ancient": 3,
        "kingdom": 2,
        "hidden": 2,
        "secret": 3,
        "thư viện": 5,
        "sách": 2,
        "kệ sách": 3,
        "cổ đại": 3,
        "vương quốc": 2,
        "bí mật": 3,
        "ẩn": 2,
    },
    "floating_temple": {
        "temple": 5,
        "floating": 5,
        "sky": 4,
        "island": 3,
        "celestial": 2,
        "đền": 5,
        "đảo bay": 5,
        "bay": 2,
        "trên trời": 4,
    },
}

THEME_LABELS = {
    "survival_cliffside_base": "cliffside survival",
    "wizard_tower": "wizard magic",
    "dragon_cave": "dragon dark shrine",
    "ancient_library": "ancient library secret",
    "floating_temple": "floating sky temple",
}


BUILD_TYPES = [
    "auto",
    "survival_cliffside_base",
    "wizard_tower",
    "dragon_cave",
    "ancient_library",
    "floating_temple",
]


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())


def summarize_story(story_text: str, limit: int = 220) -> str:
    cleaned = re.sub(r"\s+", " ", story_text.strip())
    if len(cleaned) <= limit:
        return cleaned
    clipped = cleaned[:limit].rsplit(" ", 1)[0]
    return f"{clipped}..."


def analyze_story(story_text: str, build_type: str = "auto") -> BuildAnalysis:
    normalized = _normalize(story_text)
    scores = defaultdict(int)

    for candidate, keywords in KEYWORDS.items():
        for keyword, weight in keywords.items():
            if keyword in normalized:
                scores[candidate] += weight

    if build_type == "auto":
        selected = max(KEYWORDS, key=lambda candidate: (scores[candidate], candidate))
        if not scores[selected]:
            selected = "survival_cliffside_base"
    else:
        selected = build_type

    detected_themes = []
    for candidate, label in THEME_LABELS.items():
        if scores[candidate] > 0 or candidate == selected:
            detected_themes.extend(label.split())
    detected_themes = sorted(set(detected_themes))

    return BuildAnalysis(
        selected_build_type=selected,
        detected_themes=detected_themes,
        keyword_scores=dict(scores),
        story_summary=summarize_story(story_text),
    )
