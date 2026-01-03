#!/bin/bash
# Script to completely clean git history of API keys
# WARNING: This will rewrite your entire git history

echo "⚠️  This will completely rewrite your git history!"
echo "Make sure you have a backup of your code first."
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

# Create a new branch from the safe commit
git checkout -b clean-history 29487cb

# Cherry-pick the Enhancements doc update
git cherry-pick 8fc3550

# Apply all current changes as a new commit
git add -A
git commit -m "feat: implement all immediate enhancement goals with security fixes

Completed features:
- ✅ AI search repositioned (disabled for security - needs backend)
- ✅ Renamed Travel Budget to Transport Budget
- ✅ Budget period toggle (weekly/monthly/yearly)
- ✅ Optional budget dates
- ✅ Metric vs imperial toggle
- ✅ Medications tracker
- ✅ Favorites system
- ✅ Fuzzy search for filters
- ✅ Medication rules framework

Security: Removed all API keys, added security documentation

🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# Delete the old main branch and rename clean-history to main
git branch -D main
git branch -m main

# Force push the clean history
git push origin main --force

echo "✅ Done! Git history has been cleaned."
echo "⚠️  Don't forget to rotate your Anthropic API key!"
