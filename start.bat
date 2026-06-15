@echo off
rem ====================================================================
rem  Ravensmoor - Stimmungstest: Doppelklick-Starter (Windows)
rem  Wechselt immer in den eigenen Ordner, richtet beim ersten Mal alles
rem  ein, oeffnet den Browser und startet den Dev-Server auf Port 5190.
rem ====================================================================
cd /d "%~dp0"

if not exist node_modules (
  echo Erste Einrichtung - das dauert ein, zwei Minuten...
  call npm install
)

echo.
echo ====================================================
echo  Stimmungstest startet.
echo  Browser-Adresse:  http://localhost:5190
echo  (oeffnet sich gleich von selbst)
echo  Zum Beenden: dieses Fenster schliessen.
echo ====================================================
echo.

start "" http://localhost:5190
call npm run dev
