# Mineflayer Team Builder

## Mục đích

Công cụ này là một hệ phụ **Node.js + Mineflayer** tách riêng khỏi Python generator hiện có. Nó đọc file `*_mineflayer_plan.json`, chia block cho nhiều bot, rồi để cả đội bot cùng xây công trình fantasy trong **singleplayer LAN / local server / private server** nhằm quay video timelapse hoặc cinematic.

> Chỉ dùng trên server riêng, LAN, hoặc thế giới test của bạn. **Không dùng để griefing** hay tự động xây trên public server khi chưa có quyền.

## Công cụ này làm gì?

- đọc JSON build plan do Python export ra
- chia việc theo `role` như nền móng / tường / tháp / mái / trang trí
- kết nối nhiều bot Mineflayer vào server Minecraft local/private
- cho bot di chuyển gần block cần đặt, đặt block từ thấp lên cao, log tiến độ rõ ràng
- bỏ qua block đã có sẵn để bot không kẹt mãi

## Yêu cầu

- Node.js 20+ hoặc mới hơn
- Minecraft Java server local/private hoặc Singleplayer mở LAN
- Tài khoản/offline auth phù hợp với server test của bạn
- Khuyên dùng world backup trước khi chạy bot

## Cài đặt

```bash
cd /home/runner/work/minecraft/minecraft/mineflayer-team-builder
npm install
```

## Xuất plan từ Python

### CLI

```bash
python /home/runner/work/minecraft/minecraft/fantasy_schematic_builder/app.py \
  --story /home/runner/work/minecraft/minecraft/examples/story_wizard_tower.txt \
  --build-type wizard_tower \
  --output-name wizard_team \
  --output-dir /home/runner/work/minecraft/minecraft/output \
  --mineflayer-plan \
  --team-bots 6
```

### GUI

Trong GUI, bật:

- **Tạo kế hoạch Mineflayer team bot**
- **Số bot: 3 / 4 / 6**

Python generator vẫn hoạt động riêng bình thường. Nếu bạn chỉ muốn `.schem`, bạn không cần cài Node.js.

## Cấu hình bot

Sửa file:

`/home/runner/work/minecraft/minecraft/mineflayer-team-builder/examples/team-build-config.json`

Ví dụ vai trò cho video:

- `Builder_Mason` = nền móng
- `Builder_Carpenter` = tường gỗ
- `Builder_Guardian` = tháp
- `Builder_Roofer` = mái
- `Builder_Decorator` = trang trí / phòng bí mật

Các trường quan trọng:

- `host`, `port`: địa chỉ server local/private
- `origin`: gốc đặt công trình trong world
- `bots`: tên bot và vai trò
- `planFile`: đường dẫn tới file JSON plan
- `creativeMode`: bật/tắt logic ưu tiên creative
- `issueCreativeCommands`: nếu `true`, bot sẽ thử chat lệnh `/gamemode creative <bot>`

## Chạy bot

### Kiểm tra plan/config trước

```bash
cd /home/runner/work/minecraft/minecraft/mineflayer-team-builder
npm start -- --config examples/team-build-config.json --dry-run
```

### Chạy thật

```bash
cd /home/runner/work/minecraft/minecraft/mineflayer-team-builder
npm start -- --config examples/team-build-config.json
```

Luồng cơ bản:

1. load config
2. load build plan JSON
3. chia block theo role, nếu thiếu role phù hợp thì chia round-robin
4. kết nối tất cả bot
5. bot xây từ thấp lên cao, có delay để timelapse nhìn rõ hơn

## Ghi hình YouTube

Workflow gợi ý:

1. Viết câu chuyện fantasy
2. Dùng Python tool tạo `.schem`, staged files, YouTube notes, và `*_mineflayer_plan.json`
3. Mở world local/private để thử build
4. Cho đội bot vào xây
5. Dùng Replay Mod hoặc camera account để quay timelapse cinematic

Sample title:

- `6 AI Builders Made This Secret Fantasy Base in Minecraft`

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
