@echo off
cd /d C:\Users\felip\academico-platform
git config --global user.email "felipequirozalvarez@gmail.com"
git config --global user.name "Felipe Quiroz"
git add .
git commit -m "PlataformaAcademica v1.0"
git branch -M main
git remote remove origin 2>nul
git remote add origin https://github.com/Felquiroz/academico-platform.git
git push -u origin main
echo DONE
pause