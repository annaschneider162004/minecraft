from __future__ import annotations

import gzip
import struct
from collections import OrderedDict

from fantasy_schematic_builder.models import SchematicModel


TAG_END = 0
TAG_BYTE_ARRAY = 7
TAG_STRING = 8
TAG_LIST = 9
TAG_COMPOUND = 10
TAG_INT = 3
TAG_SHORT = 2
TAG_INT_ARRAY = 11
# Minecraft 1.20.1 schematic metadata version.
MINECRAFT_1_20_1_DATA_VERSION = 3465


class NBTWriter:
    def __init__(self):
        self.buf = bytearray()

    def _write_name(self, name: str) -> None:
        encoded = name.encode("utf-8")
        self.buf.extend(struct.pack(">H", len(encoded)))
        self.buf.extend(encoded)

    def tag_header(self, tag_type: int, name: str) -> None:
        self.buf.extend(struct.pack(">B", tag_type))
        self._write_name(name)

    def write_int(self, name: str, value: int) -> None:
        self.tag_header(TAG_INT, name)
        self.buf.extend(struct.pack(">i", value))

    def write_short(self, name: str, value: int) -> None:
        self.tag_header(TAG_SHORT, name)
        self.buf.extend(struct.pack(">h", value))

    def write_string(self, name: str, value: str) -> None:
        self.tag_header(TAG_STRING, name)
        encoded = value.encode("utf-8")
        self.buf.extend(struct.pack(">H", len(encoded)))
        self.buf.extend(encoded)

    def write_byte_array(self, name: str, value: bytes) -> None:
        self.tag_header(TAG_BYTE_ARRAY, name)
        self.buf.extend(struct.pack(">i", len(value)))
        self.buf.extend(value)

    def write_int_array(self, name: str, values: list[int]) -> None:
        self.tag_header(TAG_INT_ARRAY, name)
        self.buf.extend(struct.pack(">i", len(values)))
        for value in values:
            self.buf.extend(struct.pack(">i", value))


def encode_varint(value: int) -> bytes:
    out = bytearray()
    while True:
        current = value & 0x7F
        value >>= 7
        if value:
            current |= 0x80
        out.append(current)
        if not value:
            break
    return bytes(out)


def build_palette(model: SchematicModel) -> OrderedDict[str, int]:
    palette = OrderedDict()
    palette["minecraft:air"] = 0
    for _, _, _, block in sorted(model.iter_blocks()):
        if block not in palette:
            palette[block] = len(palette)
    return palette


def build_block_data(model: SchematicModel, palette: dict[str, int]) -> bytes:
    data = bytearray()
    for y in range(model.height):
        for z in range(model.length):
            for x in range(model.width):
                block = model.blocks.get((x, y, z), "minecraft:air")
                data.extend(encode_varint(palette[block]))
    return bytes(data)


def serialize_schematic(model: SchematicModel, name: str, author: str, description: str) -> bytes:
    for dimension_name, value in (("width", model.width), ("height", model.height), ("length", model.length)):
        if not 0 < value <= 32767:
            raise ValueError(f"Schematic {dimension_name} must be between 1 and 32767 for Sponge .schem export, got {value}.")

    writer = NBTWriter()
    palette = build_palette(model)
    block_data = build_block_data(model, palette)

    writer.buf.extend(struct.pack(">B", TAG_COMPOUND))
    writer._write_name("Schematic")
    writer.write_int("Version", 2)
    writer.write_int("DataVersion", MINECRAFT_1_20_1_DATA_VERSION)
    writer.write_short("Width", model.width)
    writer.write_short("Height", model.height)
    writer.write_short("Length", model.length)
    writer.write_int_array("Offset", [0, 0, 0])

    writer.tag_header(TAG_COMPOUND, "Palette")
    for block, index in palette.items():
        writer.write_int(block, index)
    writer.buf.extend(struct.pack(">B", TAG_END))

    writer.write_int("PaletteMax", len(palette))
    writer.write_byte_array("BlockData", block_data)

    writer.tag_header(TAG_LIST, "BlockEntities")
    writer.buf.extend(struct.pack(">B", TAG_COMPOUND))
    writer.buf.extend(struct.pack(">i", 0))

    writer.tag_header(TAG_LIST, "Entities")
    writer.buf.extend(struct.pack(">B", TAG_COMPOUND))
    writer.buf.extend(struct.pack(">i", 0))

    writer.tag_header(TAG_COMPOUND, "Metadata")
    writer.write_string("Name", name)
    writer.write_string("Author", author)
    writer.write_string("Description", description)
    writer.write_int("WEOffsetX", 0)
    writer.write_int("WEOffsetY", 0)
    writer.write_int("WEOffsetZ", 0)
    writer.buf.extend(struct.pack(">B", TAG_END))

    writer.buf.extend(struct.pack(">B", TAG_END))
    return bytes(writer.buf)


def write_schematic(model: SchematicModel, output_path: str, name: str, author: str, description: str) -> None:
    payload = serialize_schematic(model, name=name, author=author, description=description)
    with gzip.open(output_path, "wb") as handle:
        handle.write(payload)
