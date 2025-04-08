#!/bin/bash

# Find all files with the old import pattern and update them
find ./src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' "s/import { useTheme } from ['\"].*themeprovider['\"]';/import { useTheme } from '\.\.\/styles\/theme\/ThemeContext';/g"
find ./src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' "s/import { useTheme } from ['\"].*themeprovider['\"]\\\\';/import { useTheme } from '\.\.\/\.\.\/styles\/theme\/ThemeContext';/g"
find ./src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' "s/import { useTheme } from ['\"].*themeprovider[\"'];/import { useTheme } from '\.\.\/\.\.\/\.\.\/styles\/theme\/ThemeContext';/g"

echo "Theme imports updated successfully!" 