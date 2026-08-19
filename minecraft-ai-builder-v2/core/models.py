from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Literal

BuildType = Literal["castle", "temple", "city", "library", "sky_city", "nether_fortress", "end_palace", "beacon_temple"]

class Vec3(BaseModel):
    x: int
    y: int
    z: int

class Block(BaseModel):
    x: int
    y: int
    z: int
    block: str

class RoomSpec(BaseModel):
    name: str
    width: int
    depth: int
    height: int
    purpose: str

class BuildRequest(BaseModel):
    name: str
    build_type: BuildType
    style: str = "fantasy"
    width: int = 64
    depth: int = 64
    height: int = 40
    floors: int = 2
    has_walls: bool = True
    has_towers: bool = True
    has_garden: bool = True
    interior_rooms: List[RoomSpec] = Field(default_factory=list)
    palette_hint: Optional[str] = None
    origin: Vec3 = Field(default_factory=lambda: Vec3(x=0, y=64, z=0))

class BuildMeta(BaseModel):
    name: str
    style: str
    build_type: BuildType
    size: Vec3
    origin: Vec3
    floors: int

class Blueprint(BaseModel):
    meta: BuildMeta
    blocks: List[Block]
    tags: Dict[str, str] = Field(default_factory=dict)
