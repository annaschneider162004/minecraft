from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field
from typing import Dict, Iterable, List, Tuple


BlockPosition = Tuple[int, int, int]


@dataclass
class BuildAnalysis:
    selected_build_type: str
    detected_themes: List[str]
    keyword_scores: Dict[str, int]
    story_summary: str


@dataclass
class SchematicModel:
    width: int
    height: int
    length: int
    blocks: Dict[BlockPosition, str] = field(default_factory=dict)

    def set_block(self, x: int, y: int, z: int, block: str) -> None:
        if not (0 <= x < self.width and 0 <= y < self.height and 0 <= z < self.length):
            return
        if block == "minecraft:air":
            self.blocks.pop((x, y, z), None)
            return
        self.blocks[(x, y, z)] = block

    def fill(self, x1: int, y1: int, z1: int, x2: int, y2: int, z2: int, block: str) -> None:
        xa, xb = sorted((x1, x2))
        ya, yb = sorted((y1, y2))
        za, zb = sorted((z1, z2))
        for x in range(xa, xb + 1):
            for y in range(ya, yb + 1):
                for z in range(za, zb + 1):
                    self.set_block(x, y, z, block)

    def hollow_box(self, x1: int, y1: int, z1: int, x2: int, y2: int, z2: int, block: str) -> None:
        xa, xb = sorted((x1, x2))
        ya, yb = sorted((y1, y2))
        za, zb = sorted((z1, z2))
        for x in range(xa, xb + 1):
            for y in range(ya, yb + 1):
                self.set_block(x, y, za, block)
                self.set_block(x, y, zb, block)
            for z in range(za, zb + 1):
                self.set_block(x, ya, z, block)
                self.set_block(x, yb, z, block)
        for z in range(za, zb + 1):
            for y in range(ya, yb + 1):
                self.set_block(xa, y, z, block)
                self.set_block(xb, y, z, block)

    def clone(self) -> "SchematicModel":
        return SchematicModel(self.width, self.height, self.length, dict(self.blocks))

    def material_counts(self) -> Counter:
        return Counter(self.blocks.values())

    @property
    def block_count(self) -> int:
        return len(self.blocks)

    def iter_blocks(self) -> Iterable[tuple[int, int, int, str]]:
        for (x, y, z), block in self.blocks.items():
            yield x, y, z, block


@dataclass
class BuildStage:
    key: str
    title: str
    description: str
    model: SchematicModel


@dataclass
class GeneratedBuild:
    build_type: str
    display_name: str
    description: str
    analysis: BuildAnalysis
    stages: List[BuildStage]

    @property
    def full_stage(self) -> BuildStage:
        return self.stages[-1]


@dataclass
class GenerationOptions:
    generate_full_schematic: bool = True
    generate_staged_schematics: bool = True
    generate_material_list: bool = True
    generate_material_commands: bool = True
    generate_baritone_steps: bool = True
    generate_youtube_notes: bool = True
