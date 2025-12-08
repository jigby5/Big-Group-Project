@echo off
echo ================================================
echo Mental Health Resource Hub - Database Setup
echo ================================================
echo.

echo Step 1: Creating database schema...
psql -U postgres -d project3 -f setup_database.sql
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to create database schema
    echo Make sure PostgreSQL is running and database 'project3' exists
    echo.
    pause
    exit /b 1
)

echo.
echo Step 2: Populating resources...
psql -U postgres -d project3 -f populate_resources.sql
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to populate resources
    echo.
    pause
    exit /b 1
)

echo.
echo ================================================
echo SUCCESS! Database setup complete.
echo ================================================
echo.
echo You can now:
echo   1. Run 'npm start' to start the server
echo   2. Go to http://localhost:3000/register
echo   3. Create an account and login
echo.
pause
