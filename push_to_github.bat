@echo off
color 0a
echo ==============================================
echo   اداة الرفع الى GitHub - نظام الحضور السحابي
echo ==============================================
echo.
set /p REPO_URL="يرجى لصق رابط مستودع GitHub الخاص بك هنا (مثل https://github.com/user/repo.git): "

if "%REPO_URL%"=="" (
    echo [خطأ] لم تقم بإدخال الرابط. يرجى المحاولة مرة أخرى.
    pause
    exit
)

echo.
echo [1/4] جاري تجهيز الملفات...
git init
git add .

echo [2/4] جاري حفظ التغييرات...
git commit -m "النسخة السحابية لخدمة تأجير البصمة (SaaS) + Docker"

echo [3/4] جاري ربط المستودع...
git branch -M main
git remote add origin %REPO_URL%
git remote set-url origin %REPO_URL%

echo [4/4] جاري الرفع إلى GitHub...
git push -u origin main --force

echo.
echo ==============================================
echo   تم الرفع بنجاح! يمكنك الآن الذهاب إلى Coolify.
echo ==============================================
pause
