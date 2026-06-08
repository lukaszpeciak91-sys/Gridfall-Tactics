@echo off
setlocal
pushd "%~dp0..\.."
python tools\balance-lab\balance_lab_launcher.py
if errorlevel 1 (
  echo.
  echo Balance Lab GUI failed to start or exited with an error.
  echo Make sure Python is installed and available as "python".
  pause
)
popd
endlocal
