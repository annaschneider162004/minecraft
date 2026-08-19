# Minecraft AI Builder V2

## Setup
```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Tạo `.env`:
```env
OPENAI_API_KEY=your_key_here
```

## Run
```bash
python app.py build --prompt "Xây CLB Music 3 tầng có phòng Piano, Violin, Thanh nhạc và sân khấu"
```

Output trong `dist/`:
- blueprint.json
- build.mcfunction
- manifest.txt
- build.schem (placeholder)
