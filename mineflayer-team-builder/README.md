# Mineflayer Team Builder

## Mục đích

Công cụ này là một hệ phụ **Node.js + Mineflayer** tách riêng khỏi Python generator hiện có. Nó đọc file `*_mineflayer_plan.json`, chia block cho nhiều bot, rồi để cả đội bot cùng xây công trình fantasy trong **singleplayer LAN / local server / private server** nhằm quay video timelapse hoặc cinematic.

> Chỉ dùng trên server riêng, LAN, hoặc thế giới test của bạn. **Không dùng để griefing** hay tự động xây trên public server khi chưa có quyền.

## Công cụ này làm gì?

- đọc JSON build plan do Python export ra
- đọc luôn file config team bot do Python tự sinh ra
- chia việc theo `role` như nền móng / tường / tháp / mái / trang trí
- kết nối nhiều bot Mineflayer vào server Minecraft local/private
- kết nối bot theo từng batch nhỏ để local dedicated server vào đủ đội ổn định hơn
- cho bot build theo chế độ Mineflayer cũ hoặc chế độ command dùng `/setblock` ổn định hơn trên server local/private
- tự chuẩn bị nền build bằng `/fill` và fallback sang `/setblock` trên server creative riêng khi bật command mode
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

### Auralis v2 mẫu chi tiết (bot động 10-50)

Trong `mineflayer-team-builder/examples` đã có sẵn:

- `auralis_v2_team_plan.json` (kế hoạch lớn cho **Thiên Thành Auralis – Thành Phố Trên Lưng Rồng**)
- `auralis_v2_team_config.json` (mẫu 10 bot theo stage, flow export Python có thể sinh 10-50 bot)
- `auralis_v2_cinematic_config.json` (mẫu quay video theo phase với camera orbit cho `Jonhbh`, cũng hỗ trợ bot động khi export)
- `server-console-setup-commands.txt` (lệnh OP copy/paste cho server console)
- `run_auralis_recording.bat` (script CMD gợi ý để mở OBS/server và chạy build)

Nếu muốn regenerate plan:

```bash
cd mineflayer-team-builder
node examples/generate_auralis_v2_plan.js
```

Plan Auralis v2 đã chia stage rõ ràng theo thứ tự:

- `void_abyss`
- `dragon_body`
- `dragon_head`
- `heavenly_gate`
- `city_platform`
- `central_tower`
- `elemental_temples`
- `demon_fortress`
- `decorations`
- `lighting`

Flow export Python sẽ tự tạo `Builder_01` ... `Builder_50` và chia stage theo vòng lặp (round-robin). Ví dụ chọn `20 bot` thì mỗi stage nhận `2 bot`.

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
- `origin`: gốc đặt công trình trong world (`"auto"` hoặc `{x,y,z}`); default local-friendly là `{ "x": 0, "y": 100, "z": 0 }`
- `platformOrigin`: mốc riêng để dựng nền phẳng bằng `/fill` khi không muốn scout địa hình tự nhiên
- `autoFindOrigin`: bật scout bot tự tìm khu vực build phù hợp; config mới mặc định `false`
- `searchCenter`, `searchRadius`, `maxSearchRadius`: tâm và bán kính dò tìm
- `requiredFlatness`, `clearanceHeight`, `buildPadding`: độ phẳng và khoảng trống yêu cầu
- `scoutBot`: bot leader dùng để dò vị trí build
- `bots`: tên bot và vai trò
- `planFile`: đường dẫn tới file JSON plan
- `creativeMode`: bật/tắt logic ưu tiên inventory creative của bot
- `issueCreativeCommands`: nếu `true` (mặc định file config mới), tool sẽ tự gửi lệnh `/gamemode creative <bot>`
- `issueWorldCommands`: nếu `true`, cho phép dùng thêm lệnh world như `/fill` hoặc `/setblock` ngay cả khi bạn không muốn auto `/gamemode`
- `creativeCommandDelayMs`: thời gian chờ giữa các lệnh creative để tránh spam quá nhanh
- `commandPrefix`: tiền tố lệnh chat, mặc định `/`
- `placementMode`: `mineflayer`, `commands`, hoặc `command-fallback`; config mới mặc định `commands`
- `commandBuildFallback`: khi `true`, lỗi pathfinding/support sẽ fallback sang `/setblock` nếu server cho phép lệnh
- `commandDelayMs`: delay giữa các lệnh `/setblock` hoặc `/fill`; config local mặc định `50`
- `joinBatchSize`, `joinBatchDelayMs`: số bot vào mỗi đợt và thời gian chờ giữa các batch
- `connectRetries`, `connectRetryDelayMs`: số lần thử vào lại khi bot bị lỗi kết nối
- `allowPartialTeam`: mặc định `false`, tool sẽ báo rõ nếu chưa vào đủ bot
- `teleportBotsToOrigin`: thử `/tp` cả đội tới origin sau khi dò xong
- `setWorldConditions`: thử set time/weather/gamerule để build ổn định hơn
- `clearBuildArea`: mặc định `false`, nếu bật sẽ dùng `/fill ... air` để dọn khu build
- `prepareBuildPlatform`, `platformBlock`, `clearAbovePlatform`, `platformPadding`, `platformExtraHeight`: tự dọn thể tích phía trên và tạo nền phẳng quanh công trình bằng `/fill`
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

### Quay cinematic Auralis v2 với `Jonhbh` làm camera

Mẫu config sẵn để quay video nằm ở:

```text
examples/auralis_v2_cinematic_config.json
```

Luồng hoạt động:

1. `Jonhbh` là **camera player**, không phải builder bot
2. `Builder_01` tới `Builder_xx` (theo số bot đã export) sẽ xây theo từng `phase/stage`
3. controller bot gửi lệnh `/gamemode spectator Jonhbh`
4. trong lúc bot xây từng phase, tool gửi `/tp Jonhbh x y z yaw pitch` để camera bay vòng quanh khu vực đang xây
5. nếu bật `pauseBetweenStages`, tool sẽ dừng ngắn giữa các phase để bạn quay cảnh chuyển tiếp

Chạy trực tiếp trong CMD:

```bat
cd /d "D:\minecraft-main\minecraft-main\mineflayer-team-builder"
npm start -- --config "examples\auralis_v2_cinematic_config.json"
```

Hoặc dùng file helper:

```bat
examples\run_auralis_recording.bat
```

> Minecraft tự nó **không xuất file `.mp4`**. Bạn vẫn cần OBS, Replay Mod, hoặc phần mềm quay màn hình khác để tạo video thực tế.

Checklist nhanh:

1. Mở server local/private `localhost:25565`
2. Vào Minecraft bằng tài khoản/người chơi `Jonhbh`
3. Paste file `examples/server-console-setup-commands.txt` vào **server console**
4. Nếu cần bot động, chạy script `examples/run_auralis_recording.bat` rồi đặt `BOT_COUNT=20/25/.../50`
5. Chạy config cinematic hoặc file `.bat`

Nếu `Jonhbh` đang offline, tool sẽ log cảnh báo tiếng Việt rồi vẫn tiếp tục build bằng bot thay vì crash.

### Quick start dễ nhất cho local dedicated server

1. Khởi động dedicated server Minecraft Java 1.20.1 của bạn.
2. Mở `server.properties` và kiểm tra:

```properties
max-players=50
online-mode=false
gamemode=creative
force-gamemode=true
allow-flight=true
spawn-protection=0
```

3. Chạy:

```bash
cd mineflayer-team-builder
npm start -- --config ../output/<name>_team_config.json
```

Với default mới:

- tool mặc định dùng `origin/platformOrigin = {x:0,y:100,z:0}` nên **không cần tự đi tìm chỗ đẹp**
- nếu bật `prepareBuildPlatform`, tool sẽ tự log `Đang tạo nền phẳng tự động bằng /fill...` rồi gửi `/fill ... grass_block` và `/fill ... air`
- `placementMode: "commands"` sẽ build bằng `/setblock`, nên bot không cần pathfinding tới từng block
- vì không cần pathfinding/inventory placement trong mode này, lỗi `No path to the goal`, `Took too long to decide path to goal!`, hoặc `Setting slot 36 cancelled...` sẽ biến mất

Luồng cơ bản:

1. load config + build plan JSON
2. mặc định dùng `origin/platformOrigin` để dựng nền phẳng, chỉ scout địa hình khi bạn bật `autoFindOrigin: true`
3. chia block theo role, nếu role gộp thì dùng thêm `assignedStages`, nếu vẫn thiếu thì chia đều fallback
4. giữ scout/controller online, rồi kết nối **các bot còn lại** theo batch/retry
5. gửi `/fill` để tạo nền phẳng và dọn không khí phía trên
6. build bằng `/setblock` trong `placementMode: "commands"` hoặc fallback sang `/setblock` trong `command-fallback`

### Auto-origin và dry-run

- `--dry-run` vẫn chạy được khi `origin: "auto"` mà không cần kết nối Minecraft world.
- Dry-run sẽ log thông số dò vị trí; để thật sự tìm tọa độ, bạn cần chạy live (không dùng `--dry-run`).
- Khi chạy thật và bạn bật `autoFindOrigin`, scout sẽ log tiến độ kiểu `Builder_01 đang quét địa hình bán kính 80...` và **không tự quit sau khi quét xong**.

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
- `creativeMode` trong config **không tự đổi gamemode Minecraft** nếu server chặn lệnh chat hoặc bot không có quyền.
- File `*_team_config.json` mới sinh ra sẽ mặc định thử gửi lệnh chuyển creative tự động cho từng bot.
- Nếu server không cho bot tự set creative inventory, hãy cấp materials thủ công hoặc bật quyền operator trên server riêng của bạn.
- Một số block có state như `minecraft:dark_oak_log[axis=y]` sẽ tự được normalize về item `dark_oak_log`.

## Troubleshooting: bot chưa vào Creative

Nếu bot không đặt block được hoặc không ở creative:

1. Đảm bảo bạn đang chạy LAN/private/local server có quyền lệnh.
2. Nếu là singleplayer LAN, bật **Open to LAN** với **Allow Cheats: ON**.
3. Trong Minecraft, chạy lệnh:

```text
/gamemode creative @a
```

Khi `issueCreativeCommands: false`, tool sẽ chỉ hiện lưu ý này thay vì tự gửi lệnh.

## Troubleshooting: command mode không chạy được `/fill` hoặc `/setblock`

Nếu log báo bot không có quyền dùng world command:

1. Vào **server console** rồi chạy:

```text
op Builder_01
```

Bạn có thể copy nhanh toàn bộ từ file:

```text
examples/server-console-setup-commands.txt
```

Quan trọng:

- Dán trong **cửa sổ server.jar console** (dedicated server), **không dán trong CMD chạy bot**.
- Trong **server console** thì dùng `op Builder_01` (**không có `/`**).
- Trong **Minecraft chat** mới dùng `/op Builder_01`.
- Nếu `ops.json` đang rỗng thì bot sẽ fail `/fill` và `/setblock`.
- File helper đã gồm cả `op Jonhbh` (tên dùng trước đó) và `op Jonh` (tên vừa yêu cầu thêm).
- Không nên tự sửa `ops.json` bằng UUID giả; hãy dùng lệnh `op` để server tự ghi đúng UUID.

2. Kiểm tra lại `server.properties`:

```properties
gamemode=creative
force-gamemode=true
online-mode=false
max-players=50
```

3. Chạy lại tool. Ở `placementMode: "commands"`, bot không cần đi tới từng block nên lỗi pathfinding sẽ không còn là nguyên nhân chính nữa.

## Troubleshooting: bot không vào đủ đội hoặc Builder_01 cứ scout

- Nếu log báo `multiplayer.disconnect.server_full`, hãy tăng `max-players` trong `server.properties` sao cho lớn hơn **số bot + số người chơi thật**. Ví dụ an toàn: `max-players=50`.
- Với flow mới, `Builder_01` **không tự quit sau khi scout**. Nếu bạn vẫn thấy bot leave, đó thường là lỗi kết nối thật hoặc server đang full slot.
- Nếu auto-origin không tìm được chỗ, hãy:
  - tăng `maxSearchRadius`
  - dùng world phẳng/superflat
  - hoặc bật `prepareBuildPlatform`
- Nếu local server yếu, giữ `joinBatchSize: 1` và `joinBatchDelayMs: 5000`.

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
