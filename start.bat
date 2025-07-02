@echo off
if "%1" == "silent" (
    powershell -WindowStyle Hidden -Command "Start-Process cmd -ArgumentList '/c chcp 65001 >nul 2>&1 & npm start' -WindowStyle Hidden"
) else (
    chcp 65001 >nul 2>&1
    title 图片处理工具
    echo 正在启动图片处理工具...
    npm start
) 