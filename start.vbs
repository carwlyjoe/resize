Set objShell = CreateObject("WScript.Shell")
objShell.Run "cmd /c chcp 65001 > nul & npm start", 0, False 