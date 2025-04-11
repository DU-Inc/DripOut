#!/bin/bash

# Find all files with the old ThemeContext import pattern and update them to themeprovider
find ./src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' "s/import { useTheme } from ['\"]..\/styles\/theme\/ThemeContext['\"]';/import { useTheme } from '..\/styles\/themeprovider';/g"
find ./src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' "s/import { useTheme } from ['\"]..\/..\/styles\/theme\/ThemeContext['\"]';/import { useTheme } from '..\/..\/styles\/themeprovider';/g"
find ./src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' "s/import { useTheme } from ['\"]..\/..\/..\/styles\/theme\/ThemeContext['\"]';/import { useTheme } from '..\/..\/..\/styles\/themeprovider';/g"
find ./src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' "s/import { useTheme } from ['\"]..\/..\/..\/..\/styles\/theme\/ThemeContext['\"]';/import { useTheme } from '..\/..\/..\/..\/styles\/themeprovider';/g"

echo "Theme imports updated successfully to use themeprovider!" 