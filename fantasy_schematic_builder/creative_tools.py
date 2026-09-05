from __future__ import annotations

from dataclasses import dataclass
import hashlib
import random
import re

from fantasy_schematic_builder.story_analyzer import BUILD_TYPES, analyze_story


IDEA_THEMES = [
    "fantasy",
    "medieval",
    "survival",
    "dragon",
    "wizard",
    "ocean",
    "sky",
    "nether",
    "ancient",
    "village",
    "castle",
    "cave",
    "temple",
]

IDEA_THEME_LABELS = {
    "fantasy": "Fantasy / Huyền huyễn",
    "medieval": "Medieval / Trung cổ",
    "survival": "Survival / Sinh tồn",
    "dragon": "Dragon / Rồng",
    "wizard": "Wizard / Pháp sư",
    "ocean": "Ocean / Đại dương",
    "sky": "Sky / Trên không",
    "nether": "Nether / Địa ngục",
    "ancient": "Ancient / Cổ đại",
    "village": "Village / Làng cổ",
    "castle": "Castle / Lâu đài",
    "cave": "Cave / Hang động",
    "temple": "Temple / Đền thờ",
}

BUILD_TYPE_LABELS_VI = {
    "auto": "Tự động nhận diện",
    "survival_cliffside_base": "Căn cứ sinh tồn bên vách núi",
    "wizard_tower": "Tháp pháp sư",
    "dragon_cave": "Hang rồng",
    "ancient_library": "Thư viện cổ đại",
    "floating_temple": "Đền bay trên không",
}

BUILD_TYPE_TITLE_HINTS = {
    "survival_cliffside_base": "Fantasy Survival Base",
    "wizard_tower": "Wizard Tower",
    "dragon_cave": "Dragon Cave",
    "ancient_library": "Ancient Library",
    "floating_temple": "Floating Temple",
}

THEME_PROFILES = {
    "fantasy": {
        "adjectives": ["Moonlit", "Lost", "Crystal", "Runebound"],
        "nouns": ["Sanctuary", "Citadel", "Stronghold", "Watchpost"],
        "locations": ["above a mist valley", "on a forgotten ridge", "between glowing pines", "beside ancient ruins"],
        "hooks": ["the last refuge of a fallen kingdom", "a hidden outpost guarding a magical relic", "a base built for survivors of an arcane war"],
        "palette": ["stone bricks", "spruce planks", "dark oak", "lanterns", "mossy stone bricks"],
        "features": ["a hidden map room", "a banner-lined gate", "a lookout balcony", "glowing rune details", "a small supply farm"],
        "recommended_build_type": "survival_cliffside_base",
    },
    "medieval": {
        "adjectives": ["Iron", "Royal", "Old", "Stormwatch"],
        "nouns": ["Keep", "Gatehouse", "Fortress", "Barracks"],
        "locations": ["watching over a trade road", "near a fortified hill", "inside a mountain pass", "beside an old stone bridge"],
        "hooks": ["the last checkpoint before the wild frontier", "a holdfast rebuilt after years of siege", "a knight outpost protecting a hidden vault"],
        "palette": ["stone bricks", "cobblestone", "spruce planks", "oak logs", "andesite"],
        "features": ["arched supports", "storage alcoves", "defensive towers", "torch-lit walls", "a compact inner courtyard"],
        "recommended_build_type": "survival_cliffside_base",
    },
    "survival": {
        "adjectives": ["Last", "Hidden", "Lone", "Frontier"],
        "nouns": ["Base", "Shelter", "Outpost", "Sanctuary"],
        "locations": ["carved into a mountain", "on the edge of a forest cliff", "above a river canyon", "between terraced farms"],
        "hooks": ["built by survivors who had to defend every block", "designed to store supplies and hide a secret escape room", "made to look humble outside but rich inside"],
        "palette": ["stone bricks", "cobblestone", "spruce planks", "glass", "oak leaves"],
        "features": ["an emergency storage vault", "a hidden bedroom", "a compact crop terrace", "a chimney", "a scenic balcony"],
        "recommended_build_type": "survival_cliffside_base",
    },
    "dragon": {
        "adjectives": ["Ember", "Obsidian", "Ashen", "Infernal"],
        "nouns": ["Cavern", "Roost", "Sanctum", "Vault"],
        "locations": ["inside a cracked volcano", "behind a lavafall", "beneath a scorched mountain", "under a broken dragon skull"],
        "hooks": ["where a sleeping dragon guards treasure older than kingdoms", "a shrine built around the remains of a legendary beast", "the lair where dragon riders once trained"],
        "palette": ["deepslate bricks", "blackstone", "magma blocks", "lava", "gold blocks"],
        "features": ["a treasure chamber", "lava-lit arches", "dragon egg display", "bone decorations", "a ritual platform"],
        "recommended_build_type": "dragon_cave",
    },
    "wizard": {
        "adjectives": ["Arcane", "Astral", "Runic", "Elder"],
        "nouns": ["Tower", "Observatory", "Spire", "Sanctum"],
        "locations": ["above a silent forest", "on a lonely hilltop", "overlooking a moonlit lake", "at the center of a magic grove"],
        "hooks": ["where the last mage studies a dangerous prophecy", "a tower built to watch celestial alignments", "the workshop of a wizard hiding forbidden books"],
        "palette": ["stone bricks", "purple stained glass", "bookshelves", "spruce planks", "lanterns"],
        "features": ["an observatory room", "a potion lab", "spiral stairs", "a secret library", "glowing crystal accents"],
        "recommended_build_type": "wizard_tower",
    },
    "ocean": {
        "adjectives": ["Tidal", "Coral", "Sunken", "Pearl"],
        "nouns": ["Temple", "Harbor", "Watchtower", "Refuge"],
        "locations": ["on a sea stack", "above a coral reef", "inside a flooded cliff", "over a moonlit bay"],
        "hooks": ["built to hide relics from deep-sea raiders", "a sanctuary for ocean mages and explorers", "the last safe port before a cursed sea"],
        "palette": ["prismarine", "dark prismarine", "sea lanterns", "quartz", "warped planks"],
        "features": ["water channels", "a dock platform", "glowing tide windows", "coral gardens", "a hidden tide vault"],
        "recommended_build_type": "floating_temple",
    },
    "sky": {
        "adjectives": ["Floating", "Celestial", "Cloudborn", "Dawnspire"],
        "nouns": ["Temple", "Sanctuary", "Citadel", "Shrine"],
        "locations": ["above the clouds", "between suspended islands", "over a sunrise valley", "at the edge of the world"],
        "hooks": ["a sacred build powered by wind crystals", "the final sky refuge of an ancient order", "a temple that only appears at dawn"],
        "palette": ["quartz", "smooth stone", "glowstone", "spruce planks", "white stained glass"],
        "features": ["floating bridges", "a central altar", "hanging lanterns", "sky gardens", "a portal chamber"],
        "recommended_build_type": "floating_temple",
    },
    "nether": {
        "adjectives": ["Blazing", "Crimson", "Forsaken", "Hellfire"],
        "nouns": ["Bastion", "Citadel", "Shrine", "Sanctum"],
        "locations": ["inside a basalt canyon", "beside a lava ocean", "above a crimson forest", "under a shattered portal"],
        "hooks": ["a fortress raised around a cursed nether gate", "the ritual site of a fire cult", "a hidden stronghold used by treasure hunters"],
        "palette": ["blackstone", "crimson planks", "nether bricks", "chains", "shroomlights"],
        "features": ["lava windows", "chain bridges", "a ritual throne", "secret blaze storage", "a scorched vault room"],
        "recommended_build_type": "dragon_cave",
    },
    "ancient": {
        "adjectives": ["Forgotten", "Ancient", "Dustbound", "Stonebound"],
        "nouns": ["Archive", "Sanctum", "Vault", "Library"],
        "locations": ["below ruined arches", "under a fallen kingdom", "inside buried catacombs", "behind collapsed stone halls"],
        "hooks": ["where lost knowledge was hidden from invaders", "an archive sealed until the stars return", "a ruin protecting the story of a vanished empire"],
        "palette": ["stone bricks", "mossy stone bricks", "bookshelves", "lanterns", "chiseled stone bricks"],
        "features": ["a relic hall", "secret redstone doors", "collapsed corners", "a reading chamber", "engraved floor patterns"],
        "recommended_build_type": "ancient_library",
    },
    "village": {
        "adjectives": ["Oakheart", "Riverside", "Lantern", "Hillcrest"],
        "nouns": ["Village Hall", "Trading Post", "Guard House", "Storehouse"],
        "locations": ["in a protected valley", "along a riverbank", "between crop terraces", "near an old bell tower"],
        "hooks": ["rebuilt by villagers after a raid", "a bustling fantasy settlement hub with a hidden safe room", "the first village outpost near dangerous lands"],
        "palette": ["oak planks", "spruce planks", "stone bricks", "hay bales", "lanterns"],
        "features": ["market stalls", "flower planters", "villager rooms", "defensive walls", "a storage loft"],
        "recommended_build_type": "survival_cliffside_base",
    },
    "castle": {
        "adjectives": ["Royal", "Frostguard", "Shadow", "Sunfire"],
        "nouns": ["Castle", "Keep", "Bastion", "Stronghold"],
        "locations": ["on a mountain crown", "above a torch-lit valley", "behind layered walls", "beside a great stone stair"],
        "hooks": ["a fortress raised to protect the final royal bloodline", "the headquarters of a kingdom at war", "a ruined keep restored by a determined ruler"],
        "palette": ["stone bricks", "andesite", "spruce planks", "iron bars", "red banners"],
        "features": ["gate towers", "a throne room", "arched battlements", "hidden treasure storage", "a courtyard fountain"],
        "recommended_build_type": "survival_cliffside_base",
    },
    "cave": {
        "adjectives": ["Echoing", "Hidden", "Deep", "Glowstone"],
        "nouns": ["Hideout", "Cavern", "Refuge", "Mine Sanctum"],
        "locations": ["inside a crystal cave", "behind a waterfall", "under a giant ravine", "deep in the mountains"],
        "hooks": ["a concealed base for explorers mining rare relics", "an underground refuge filled with secret tunnels", "the camp of a forgotten mining guild"],
        "palette": ["deepslate bricks", "stone", "spruce planks", "lanterns", "amethyst"],
        "features": ["minecart storage", "hidden passages", "bridge walkways", "ore display walls", "an underground dock"],
        "recommended_build_type": "dragon_cave",
    },
    "temple": {
        "adjectives": ["Sacred", "Golden", "Runic", "Moonstone"],
        "nouns": ["Temple", "Shrine", "Sanctuary", "Altar"],
        "locations": ["on a floating island", "inside a jungle cliff", "above sacred stairs", "at the center of ancient ruins"],
        "hooks": ["where guardians protected a forgotten relic", "a mystical shrine powered by hidden light", "the place where heroes once took their final oath"],
        "palette": ["quartz", "stone bricks", "gold blocks", "sea lanterns", "spruce planks"],
        "features": ["an altar chamber", "symmetrical stairs", "glowing floor inlays", "secret relic storage", "ritual banners"],
        "recommended_build_type": "floating_temple",
    },
}

THUMBNAIL_TEXT_POOL = [
    "AI BUILT THIS?",
    "SECRET BASE!",
    "LOST KINGDOM",
    "DRAGON CAVE",
    "WIZARD TOWER",
    "FLOATING TEMPLE",
    "INSANE TIMELAPSE",
    "FANTASY SURVIVAL",
]


@dataclass
class BuildIdea:
    theme: str
    keyword: str
    concept: str
    story_hook: str
    recommended_build_type: str
    block_palette: list[str]
    key_details: list[str]
    staged_build_plan: list[str]


@dataclass
class TitlePackage:
    titles: list[str]
    thumbnail_texts: list[str]


def _build_seed(*values: str) -> int:
    joined = "|".join((value or "").strip().lower() for value in values)
    digest = hashlib.sha256(joined.encode("utf-8")).hexdigest()
    return int(digest[:16], 16)


def _humanize_words(value: str) -> str:
    cleaned = re.sub(r"[_\-\s]+", " ", (value or "").strip())
    return " ".join(piece.capitalize() for piece in cleaned.split())


def get_display_build_type(build_type: str) -> str:
    return BUILD_TYPE_LABELS_VI.get(build_type, build_type.replace("_", " "))


def build_type_from_display(display_value: str) -> str:
    for build_type, label in BUILD_TYPE_LABELS_VI.items():
        if display_value == label:
            return build_type
    return display_value


def idea_theme_from_display(display_value: str) -> str:
    for theme, label in IDEA_THEME_LABELS.items():
        if display_value == label:
            return theme
    return display_value


def generate_build_idea(theme: str = "fantasy", keyword: str = "") -> BuildIdea:
    if theme not in IDEA_THEMES:
        accepted = ", ".join(IDEA_THEMES)
        raise ValueError(f"Unsupported idea theme '{theme}'. Expected one of: {accepted}.")

    profile = THEME_PROFILES[theme]
    keyword_label = _humanize_words(keyword) if keyword.strip() else ""
    rng = random.Random(_build_seed(theme, keyword))

    adjective = rng.choice(profile["adjectives"])
    noun = rng.choice(profile["nouns"])
    location = rng.choice(profile["locations"])
    hook = rng.choice(profile["hooks"])

    concept_parts = [adjective]
    if keyword_label:
        concept_parts.append(keyword_label)
    concept_parts.append(noun)
    concept = " ".join(concept_parts)

    detail_pool = list(profile["features"])
    rng.shuffle(detail_pool)
    palette = list(profile["palette"])
    if keyword_label:
        palette.insert(1, keyword_label.lower().replace(" ", "_"))
    staged_plan = [
        "Dọn mặt bằng và đặt phần nền chính.",
        "Dựng khung tường, cổng hoặc lõi trung tâm.",
        "Hoàn thiện phần mái, tháp hoặc khu vực điểm nhấn.",
        "Thêm phòng bí mật, kho đồ hoặc khu nghi thức.",
        "Trang trí, ánh sáng và cảnh quan kể chuyện.",
    ]

    story_hook = (
        f"{concept} {location}, {hook}. "
        f"Người xem khám phá công trình này như một địa điểm có thật trong thế giới Minecraft fantasy."
    )
    return BuildIdea(
        theme=theme,
        keyword=keyword.strip(),
        concept=concept,
        story_hook=story_hook,
        recommended_build_type=profile["recommended_build_type"],
        block_palette=palette[:5],
        key_details=detail_pool[:4],
        staged_build_plan=staged_plan,
    )


def idea_to_story_prompt(idea: BuildIdea) -> str:
    details = ", ".join(idea.key_details)
    palette = ", ".join(idea.block_palette)
    stages = "; ".join(idea.staged_build_plan)
    return (
        f"{idea.concept}. {idea.story_hook} "
        f"Recommended palette: {palette}. "
        f"Key features: {details}. "
        f"Suggested build stages: {stages}"
    )


def format_build_idea(idea: BuildIdea) -> str:
    details = "\n".join(f"- {detail}" for detail in idea.key_details)
    stages = "\n".join(f"- {stage}" for stage in idea.staged_build_plan)
    palette = ", ".join(idea.block_palette)
    return (
        f"Ý tưởng công trình: {idea.concept}\n"
        f"Móc chuyện fantasy: {idea.story_hook}\n"
        f"Loại công trình đề xuất: {get_display_build_type(idea.recommended_build_type)} ({idea.recommended_build_type})\n"
        f"Block palette gợi ý: {palette}\n"
        f"Chi tiết nổi bật:\n{details}\n"
        f"Kế hoạch build theo giai đoạn:\n{stages}"
    )


def _pick_focus_phrase(story_text: str, build_type: str, build_name: str) -> str:
    if build_name.strip():
        return build_name.strip()
    if story_text.strip():
        words = re.findall(r"[A-Za-z0-9']+", story_text)
        if words:
            sample = " ".join(words[:4]).strip()
            if len(sample) >= 8:
                return sample.title()
    effective_build_type = build_type if build_type in BUILD_TYPES else "auto"
    analysis = analyze_story(story_text or build_name or "fantasy build", build_type=effective_build_type)
    return BUILD_TYPE_TITLE_HINTS.get(analysis.selected_build_type, "Fantasy Build")


def generate_youtube_title_package(
    story_text: str,
    build_type: str = "auto",
    build_name: str = "",
    count: int = 10,
) -> TitlePackage:
    focus_phrase = _pick_focus_phrase(story_text, build_type, build_name)
    effective_build_type = build_type if build_type in BUILD_TYPES else "auto"
    analysis = analyze_story(story_text or build_name or focus_phrase, build_type=effective_build_type)
    hint = BUILD_TYPE_TITLE_HINTS[analysis.selected_build_type]
    rng = random.Random(_build_seed(story_text, build_type, build_name, str(count)))
    titles = [
        f"I Asked AI to Build a {hint} in Minecraft",
        f"AI Built This {hint} in Minecraft Survival",
        f"I Turned a Fantasy Story Into a Minecraft Build",
        f"Minecraft Build Timelapse: {focus_phrase}",
        f"This Secret Minecraft Base Started as an AI Story",
        f"Building a {hint} Block by Block With Baritone",
        f"I Made an AI Fantasy Base With a Secret Room",
        f"From Story to Schematic: My Minecraft {hint}",
        f"AI Designed My Next Minecraft YouTube Build",
        f"Lost Kingdom Vibes: Minecraft {hint} Reveal",
        f"Tôi dùng AI xây {hint} trong Minecraft",
        f"Biến câu chuyện fantasy thành Minecraft build: {focus_phrase}",
    ]
    unique_titles = list(dict.fromkeys(titles))
    limit = max(1, min(count, len(unique_titles)))
    ordered_titles = unique_titles[:limit]
    thumbs = list(THUMBNAIL_TEXT_POOL)
    rng.shuffle(thumbs)
    return TitlePackage(titles=ordered_titles, thumbnail_texts=thumbs[:4])


def format_title_package(title_package: TitlePackage) -> str:
    titles = "\n".join(f"- {title}" for title in title_package.titles)
    thumbs = "\n".join(f"- {text}" for text in title_package.thumbnail_texts)
    return f"Gợi ý tiêu đề YouTube:\n{titles}\n\nGợi ý chữ thumbnail:\n{thumbs}"
