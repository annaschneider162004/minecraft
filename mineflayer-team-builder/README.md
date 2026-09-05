# Mineflayer Team Builder

## Mục đích

Công cụ này là một hệ phụ **Node.js + Mineflayer** tách riêng khỏi Python generator hiện có. Nó đọc file `*_mineflayer_plan.json`, chia block cho nhiều bot, rồi để cả đội bot cùng xây công trình fantasy trong **singleplayer LAN / local server / private server** nhằm quay video timelapse hoặc cinematic.

> Chỉ dùng trên server riêng, LAN, hoặc thế giới test của bạn. **Không dùng để griefing** hay tự động xây trên public server khi chưa có quyền.

## Công cụ này làm gì?

- đọc JSON build plan do Python export ra
- đọc luôn file config team bot do Python tự sinh ra
- chia việc theo `role` như nền móng / tường / tháp / mái / trang trí
- kết nối nhiều bot Mineflayer vào server Minecraft local/private
- kết nối bot theo từng batch để mode `40–50 bot` ổn định hơn
- cho bot di chuyển gần block cần đặt, đặt block từ thấp lên cao, log tiến độ rõ ràng
- bỏ qua block đã có sẵn để bot không kẹt mãi

## Yêu cầu

- Node.js 22+ hoặc mới hơn
- Minecraft Java server local/private hoặc Singleplayer mở LAN
- Tài khoản/offline auth phù hợp với server test của bạn
- Khuyên dùng world backup trước khi chạy bot

## Cài đặt

```bash
cd mineflayer-team-builder
npm install
```

## Xuất plan từ Python

### CLI

```bash
python fantasy_schematic_builder/app.py \
  --story examples/story_wizard_tower.txt \
  --build-type wizard_tower \
  --output-name wizard_team \
  --output-dir output \
  --mineflayer-plan \
  --team-bots 6

python fantasy_schematic_builder/app.py \
  --story examples/story_wizard_tower.txt \
  --build-type wizard_tower \
  --output-name wizard_50 \
  --output-dir output \
  --mineflayer-plan \
  --team-bots 50 \
  --staged
```

### GUI

Trong GUI, bật:

- **Tạo kế hoạch Mineflayer team bot**
- **Số bot Mineflayer (1–50)**
- **Bật chế độ đội bot lớn (Mass Bot Mode)** để chọn nhanh `10 / 20 / 30 / 40 / 50`

Python generator vẫn hoạt động riêng bình thường. Nếu bạn chỉ muốn `.schem`, bạn không cần cài Node.js.

## Cấu hình bot

Mặc định Python sẽ tự sinh:

- `*_mineflayer_plan.json`
- `*_team_config.json`

Bạn có thể chạy trực tiếp file config sinh sẵn đó hoặc chỉnh thêm nếu cần.

Ví dụ vai trò cho video:

- `Builder_01` = nền móng
- `Builder_02` = tường
- `Builder_03` = tháp
- `Builder_04` = mái
- `Builder_05` = phòng bí mật
- `Builder_06` = trang trí

Với `Mass Bot Mode`, tool sẽ tiếp tục sinh `Builder_07` tới `Builder_50` và tự lặp role theo đội lớn.

Các trường quan trọng:

- `host`, `port`: địa chỉ server local/private
- `origin`: gốc đặt công trình trong world
- `bots`: tên bot và vai trò
- `planFile`: đường dẫn tới file JSON plan
- `creativeMode`: bật/tắt logic ưu tiên creative
- `issueCreativeCommands`: nếu `true`, bot sẽ thử chat lệnh `/gamemode creative <bot>`
- `joinBatchSize`, `joinBatchDelayMs`: số bot vào mỗi đợt và thời gian chờ giữa các batch
- `assignedStages`: metadata để bot ít vai trò hơn vẫn nhận đúng stage như `roof / secret_room / decorations`

## Chạy bot

### Kiểm tra plan/config trước

```bash
cd mineflayer-team-builder
npm start -- --config ../output/<name>_team_config.json --dry-run
```

### Chạy thật

```bash
cd mineflayer-team-builder
npm start -- --config ../output/<name>_team_config.json
```

Luồng cơ bản:

1. load config
2. load build plan JSON
3. chia block theo role, nếu role gộp thì dùng thêm `assignedStages`, nếu vẫn thiếu thì chia đều fallback
4. kết nối bot theo batch
5. bot xây từ thấp lên cao, có delay để timelapse nhìn rõ hơn

## Ghi hình YouTube

Workflow gợi ý:

1. Viết câu chuyện fantasy
2. Dùng Python tool tạo `.schem`, staged files, YouTube notes, và `*_mineflayer_plan.json`
3. Lấy luôn file `*_team_config.json` vừa được sinh ra
4. Mở world local/private để thử build
5. Cho đội bot vào xây
5. Dùng Replay Mod hoặc camera account để quay timelapse cinematic

Sample title:

- `6 AI Builders Made This Secret Fantasy Base in Minecraft`
- `20 AI Builders Made a Fantasy Kingdom in Minecraft`
- `50 AI Builders Created a Secret Kingdom in Minecraft`

Thumbnail text:

- `6 AI BOTS?!`
- `AI BUILT THIS!`

## Lưu ý creative / vật liệu

- Ở chế độ creative, bot sẽ cố dùng creative inventory API nếu server hỗ trợ.
- Nếu server không cho bot tự set creative inventory, hãy cấp materials thủ công hoặc bật quyền operator trên server riêng của bạn.
- Một số block có state như `minecraft:dark_oak_log[axis=y]` sẽ tự được normalize về item `dark_oak_log`.

## Block name normalization đã hỗ trợ

Ví dụ các block phổ biến:

- `stone_bricks`
- `cobblestone`
- `mossy_stone_bricks`
- `andesite`
- `deepslate_bricks`
- `spruce_planks`
- `dark_oak_planks`
- `dark_oak_log`
- `spruce_log`
- `glass`
- `bookshelf`
- `dirt`
- `oak_leaves`
- `lantern`
- `gold_block`
- `amethyst_block`
- `obsidian`
- `crying_obsidian`
- `red_wool`
- `blackstone`
- `chiseled_stone_bricks`

## Giới hạn prototype

- Khuyến nghị mạnh nhất là dùng **JSON build plan do Python export** thay vì parse trực tiếp file `.schem` trong Node.
- Prototype này ưu tiên dễ hiểu, dễ sửa, và đủ tốt để làm nền tảng team-building video.
- Nếu một block đặt lỗi quá số lần retry hoặc bị chặn đường đi, bot sẽ log lỗi rồi bỏ qua block đó thay vì treo vô hạn.

## Khuyến nghị cho đội lớn 40–50 bot

- Test tăng dần: `6 → 10 → 20 → 30 → 50`.
- Chỉ dùng ở server private/LAN/local hoặc nơi bạn có quyền.
- 16GB RAM là mức tối thiểu; 32GB RAM được khuyến nghị khi thử 50 bot.
- Giảm `view-distance` và `simulation-distance` để giảm lag.
- Backup world trước khi chạy build lớn.
