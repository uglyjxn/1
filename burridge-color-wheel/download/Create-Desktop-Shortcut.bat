@echo off
set "EXE=%~dp0Burridge-Color-Wheel.exe"
if not exist "%EXE%" (echo Put this file next to Burridge-Color-Wheel.exe first. & pause & exit /b 1)
powershell -NoProfile -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Desktop')+'\Burridge Color Wheel.lnk'); $s.TargetPath='%EXE%'; $s.WorkingDirectory='%~dp0'; $s.IconLocation='%~dp0Burridge-Color-Wheel.ico'; $s.Save()"
echo Shortcut "Burridge Color Wheel" created on your Desktop.
pause
