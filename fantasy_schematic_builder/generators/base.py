from __future__ import annotations

from dataclasses import dataclass

from fantasy_schematic_builder.models import BuildAnalysis, BuildStage, GeneratedBuild, SchematicModel


STAGE_KEYS = [
    "01_foundation",
    "02_walls",
    "03_towers_or_core",
    "04_roof_or_top",
    "05_secret_room",
    "06_decorations",
]

STAGE_TITLES = {
    "01_foundation": "Foundation",
    "02_walls": "Walls",
    "03_towers_or_core": "Towers or Core",
    "04_roof_or_top": "Roof or Top",
    "05_secret_room": "Secret Room",
    "06_decorations": "Decorations",
    "07_full_build": "Full Build",
}


@dataclass
class StageBuilder:
    width: int
    height: int
    length: int

    def __post_init__(self) -> None:
        self._staged_models = {index: SchematicModel(self.width, self.height, self.length) for index in range(1, 7)}

    def set_block(self, stage: int, x: int, y: int, z: int, block: str) -> None:
        for index in range(stage, 7):
            self._staged_models[index].set_block(x, y, z, block)

    def fill(self, stage: int, x1: int, y1: int, z1: int, x2: int, y2: int, z2: int, block: str) -> None:
        for index in range(stage, 7):
            self._staged_models[index].fill(x1, y1, z1, x2, y2, z2, block)

    def hollow_box(self, stage: int, x1: int, y1: int, z1: int, x2: int, y2: int, z2: int, block: str) -> None:
        for index in range(stage, 7):
            self._staged_models[index].hollow_box(x1, y1, z1, x2, y2, z2, block)

    def carve(self, stage: int, x1: int, y1: int, z1: int, x2: int, y2: int, z2: int) -> None:
        self.fill(stage, x1, y1, z1, x2, y2, z2, "minecraft:air")

    def build(self, build_type: str, display_name: str, description: str, analysis: BuildAnalysis) -> GeneratedBuild:
        stages = []
        for index, key in enumerate(STAGE_KEYS, start=1):
            stages.append(
                BuildStage(
                    key=key,
                    title=STAGE_TITLES[key],
                    description=f"Cumulative stage {index}: {STAGE_TITLES[key]}",
                    model=self._staged_models[index].clone(),
                )
            )
        stages.append(
            BuildStage(
                key="07_full_build",
                title=STAGE_TITLES["07_full_build"],
                description="Cumulative final build for Baritone.",
                model=self._staged_models[6].clone(),
            )
        )
        return GeneratedBuild(build_type, display_name, description, analysis, stages)


def add_roof_layers(builder: StageBuilder, stage: int, layers: list[tuple[int, int, int, int, int, int, str]]) -> None:
    for x1, y1, z1, x2, y2, z2, block in layers:
        builder.fill(stage, x1, y1, z1, x2, y2, z2, block)
