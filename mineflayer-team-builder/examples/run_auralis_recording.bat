@echo off
setlocal EnableExtensions
title Auralis v2 - quay video build cinematic

rem ============================================================
rem SCRIPT GOI Y CHO WINDOWS CMD
rem - Mo Minecraft va vao localhost:25565 bang nhan vat Jonhbh
rem - Bot Builder_01..Builder_xx se xay theo phase (bot dong 10-50)
rem - Jonhbh duoc dung lam camera spectator bay quanh cong trinh
rem - Neu co OBS, script co the mo OBS va bat dau recording
rem ============================================================

rem --- SUA CAC BIEN BEN DUOI CHO MAY CUA BAN ---
rem BOT_COUNT hop le: 10, 20, 25, 30, ... toi 50
set "BOT_COUNT=20"
set "REPO_PATH=D:\minecraft-main\minecraft-main\mineflayer-team-builder"
set "PYTHON_APP_PATH=D:\minecraft-main\minecraft-main\fantasy_schematic_builder\app.py"
set "SERVER_PATH=D:\minecraft-server"
set "SERVER_JAR=server.jar"
set "JAVA_RAM=-Xms2G -Xmx4G"
set "OBS_PATH=C:\Program Files\obs-studio\bin\64bit\obs64.exe"
set "EXPORT_OUTPUT=%APPDATA%\.minecraft\schematics"
set "CONFIG_PATH=%EXPORT_OUTPUT%\auralis_v2_cinematic_config.json"
set "SERVER_SETUP_PATH=%EXPORT_OUTPUT%\server-console-setup-commands.txt"

rem --- DOI THANH 0 NEU KHONG MUON SCRIPT THU MO OBS ---
set "AUTO_START_OBS=1"

echo.
echo ============================================================
echo [1/7] NHAC NHO TRUOC KHI CHAY
echo - Hay mo Minecraft Java truoc.
echo - Dang nhap vao server local bang nhan vat Jonhbh.
echo - Duong vao game: Multiplayer ^> Direct Connection ^> localhost:25565
echo - Jonhbh se la CAMERA, KHONG phai builder.
echo - BOT_COUNT hien tai: %BOT_COUNT% (co the set 20/25/30/.../50)
echo - server.properties can max-players lon hon Jonhbh + BOT_COUNT
echo   Vi du BOT_COUNT=20 thi nen dung max-players=30
echo ============================================================
echo.
pause

echo.
echo ============================================================
echo [2/7] OBS (TUY CHON)
echo ============================================================
if "%AUTO_START_OBS%"=="1" (
  if exist "%OBS_PATH%" (
    echo Tim thay OBS: "%OBS_PATH%"
    echo Dang thu mo OBS va bat dau recording...
    start "OBS Recording" "%OBS_PATH%" --startrecording
  ) else (
    echo Khong tim thay OBS tai:
    echo   "%OBS_PATH%"
    echo Ban co the tu mo OBS bang tay roi bam Start Recording.
  )
) else (
  echo AUTO_START_OBS=0, bo qua buoc mo OBS tu dong.
)

echo.
echo ============================================================
echo [3/7] SERVER MINECRAFT
echo ============================================================
echo Lua chon an toan:
echo   A. Tu mo server bang tay trong cua so rieng
echo   B. De script mo them 1 cua so CMD moi cho server
echo.
set /p START_SERVER_CHOICE=Nhap A hoac B roi nhan Enter [A/B]:
if /I "%START_SERVER_CHOICE%"=="B" (
  echo Dang mo cua so server moi...
  start "Minecraft Server" cmd /k "cd /d "%SERVER_PATH%" && java %JAVA_RAM% -jar "%SERVER_JAR%" nogui"
) else (
  echo Ban da chon mo server bang tay.
  echo Neu chua mo server, hay tu chay lenh sau trong CMD khac:
  echo   cd /d "%SERVER_PATH%"
  echo   java %JAVA_RAM% -jar "%SERVER_JAR%" nogui
)

echo.
echo ============================================================
echo [4/7] XUAT CONFIG AURALIS V2 THEO BOT_COUNT
echo ============================================================
if exist "%PYTHON_APP_PATH%" (
  echo Dang xuat auralis_v2_team_config.json + auralis_v2_cinematic_config.json voi %BOT_COUNT% bot...
  call python "%PYTHON_APP_PATH%" --export-auralis-v2 --team-bots %BOT_COUNT% --output-dir "%EXPORT_OUTPUT%"
  if errorlevel 1 goto :export_failed
) else (
  echo Khong tim thay Python app:
  echo   "%PYTHON_APP_PATH%"
  set "CONFIG_PATH=examples\auralis_v2_cinematic_config.json"
  set "SERVER_SETUP_PATH=%REPO_PATH%\examples\server-console-setup-commands.txt"
  echo Bo qua buoc export tu dong, fallback ve config mau:
  echo   "%REPO_PATH%\%CONFIG_PATH%"
)

echo.
echo ============================================================
echo [5/7] CAP QUYEN OP CHO BOT + CAMERA
echo ============================================================
echo KHONG co gang bom lenh vao server console tu dong de tranh loi.
echo Hay mo file duoc export va copy/paste vao CUA SO SERVER.JAR:
echo   "%SERVER_SETUP_PATH%"
echo.
echo Sau khi paste xong, dam bao Jonhbh da vao server local.
echo Day la file OP helper dong theo BOT_COUNT hien tai.
echo.
pause

echo.
echo ============================================================
echo [6/7] KIEM TRA npm install
echo ============================================================
cd /d "%REPO_PATH%"
if not exist "node_modules" (
  echo Chua co node_modules, dang chay npm install...
  call npm install
  if errorlevel 1 goto :npm_failed
) else (
  echo Da tim thay node_modules, bo qua npm install.
)

echo.
echo ============================================================
echo [7/7] BAT DAU BUILD + QUAY VIDEO
echo ============================================================
echo Lenh se chay:
echo   npm start -- --config "%CONFIG_PATH%"
echo.
echo Khi build bat dau:
echo - Builder_01..Builder_%BOT_COUNT% se xay tung phase
echo - Jonhbh se duoc /tp bay quanh khu vuc dang xay de quay cinematic
echo - Neu khong thay camera bay, kiem tra lai quyen OP cua Jonhbh
echo.
call npm start -- --config "%CONFIG_PATH%"
if errorlevel 1 goto :run_failed

echo.
echo Build da chay xong.
echo Neu OBS dang quay, hay quay lai OBS va bam Stop Recording de luu file video an toan.
echo KHONG taskkill OBS mac dinh de tranh mat file quay.
goto :done

:npm_failed
echo.
echo npm install that bai. Hay sua loi roi chay lai script.
goto :done

:export_failed
echo.
echo Export Auralis v2 that bai.
echo Hay kiem tra lai Python path/command roi chay lai.
goto :done

:run_failed
echo.
echo Lenh npm start bi loi.
echo Hay xem log o cua so CMD nay va kiem tra:
echo - server co dang chay khong
echo - Jonhbh da vao localhost:25565 chua
echo - da paste server-console-setup-commands.txt vao server console chua
echo - config examples\auralis_v2_cinematic_config.json co dung duong dan plan khong
goto :done

:done
echo.
pause
endlocal
