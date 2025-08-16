#!/bin/bash

# find-domain-references.sh
# Script to find all references to calculaaiabr.com in the codebase

echo "🔍 Finding all references to calculaaiabr.com in the codebase..."
echo "================================================================="

echo ""
echo "📁 Environment Variables (.env):"
echo "---------------------------------"
grep -n "calculaaiabr\.com" .env 2>/dev/null || echo "No .env file found or no references"

echo ""
echo "📁 JavaScript Files:"
echo "--------------------"
find . -name "*.js" -not -path "./node_modules/*" -not -path "./.git/*" -exec grep -l "calculaaiabr\.com" {} \; 2>/dev/null | while read file; do
    echo "File: $file"
    grep -n "calculaaiabr\.com" "$file" | sed 's/^/  Line /'
    echo ""
done

echo ""
echo "📁 JSON Files:"
echo "---------------"
find . -name "*.json" -not -path "./node_modules/*" -not -path "./.git/*" -exec grep -l "calculaaiabr\.com" {} \; 2>/dev/null | while read file; do
    echo "File: $file"
    grep -n "calculaaiabr\.com" "$file" | sed 's/^/  Line /'
    echo ""
done

echo ""
echo "📁 Markdown Files:"
echo "------------------"
find . -name "*.md" -not -path "./node_modules/*" -not -path "./.git/*" -exec grep -l "calculaaiabr\.com" {} \; 2>/dev/null | while read file; do
    echo "File: $file"
    grep -n "calculaaiabr\.com" "$file" | sed 's/^/  Line /'
    echo ""
done

echo ""
echo "📊 Summary:"
echo "----------"
total_files=$(find . -type f \( -name "*.js" -o -name "*.json" -o -name "*.md" -o -name ".env*" \) -not -path "./node_modules/*" -not -path "./.git/*" -exec grep -l "calculaaiabr\.com" {} \; 2>/dev/null | wc -l)
total_references=$(find . -type f \( -name "*.js" -o -name "*.json" -o -name "*.md" -o -name ".env*" \) -not -path "./node_modules/*" -not -path "./.git/*" -exec grep "calculaaiabr\.com" {} \; 2>/dev/null | wc -l)

echo "Total files with domain references: $total_files"
echo "Total domain references found: $total_references"

echo ""
echo "✅ Search complete! See DOMAIN_REFERENCES.md for detailed documentation."