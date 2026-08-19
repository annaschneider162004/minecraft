import json
from openai import OpenAI
from core.models import BuildRequest

SYSTEM_PROMPT = """
Bạn là kiến trúc sư Minecraft.
Nhiệm vụ: chuyển yêu cầu tiếng Việt thành JSON BuildRequest hợp lệ.
Chỉ trả về JSON, không thêm chữ khác.
"""

SCHEMA_HINT = """
{
  "name": "string",
  "build_type": "castle|temple|city|library|sky_city|nether_fortress|end_palace|beacon_temple",
  "style": "string",
  "width": 64,
  "depth": 64,
  "height": 40,
  "floors": 2,
  "has_walls": true,
  "has_towers": true,
  "has_garden": true,
  "palette_hint": "string|null",
  "origin": {"x":0,"y":64,"z":0},
  "interior_rooms":[{"name":"...", "width":10, "depth":10, "height":5, "purpose":"..."}]
}
"""

def parse_prompt_with_llm(user_prompt: str, model: str = "gpt-4o-mini") -> BuildRequest:
    client = OpenAI()
    msg = f"Yêu cầu: {user_prompt}\nSchema:\n{SCHEMA_HINT}"
    resp = client.chat.completions.create(
        model=model,
        temperature=0.2,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": msg}
        ]
    )
    text = resp.choices[0].message.content.strip()
    data = json.loads(text)
    return BuildRequest.model_validate(data)

def parse_prompt_fallback(user_prompt: str) -> BuildRequest:
    t = user_prompt.lower()
    build_type = "castle"
    if "thư viện" in t:
        build_type = "library"
    elif "thành phố trên mây" in t:
        build_type = "sky_city"
    elif "nether" in t:
        build_type = "nether_fortress"
    elif "end" in t:
        build_type = "end_palace"
    elif "beacon" in t:
        build_type = "beacon_temple"

    return BuildRequest(
        name="Công trình AI V2",
        build_type=build_type,  # type: ignore
        width=80 if "lớn" in t else 64,
        depth=80 if "lớn" in t else 64,
        height=48,
        floors=3 if "3 tầng" in t else 2
    )
