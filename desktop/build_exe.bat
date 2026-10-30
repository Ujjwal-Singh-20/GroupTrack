@echo off
echo ========================================================
echo Building GroupTrack Lightweight Desktop Executable (.exe)
echo ========================================================

REM Step 1: Install dependencies if missing
python -m pip install -r requirements.txt

REM Step 2: Build standalone onefile executable using PyInstaller
pyinstaller --noconsole --onefile ^
  --add-data "..\index.html;." ^
  --add-data "..\style.css;." ^
  --add-data "..\xlsx.full.min.js;." ^
  --add-data "..\sample_students.csv;." ^
  --add-data "..\js;js" ^
  --name "GroupTrack" ^
  launcher.py

echo.
echo ========================================================
echo Build Complete!
echo Your executable is ready at: desktop\dist\GroupTrack.exe
echo Hand this single .exe file to your faculty.
echo ========================================================
pause
