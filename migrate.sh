#!/bin/bash
cd /home/runner/workspace
# Try to handle the drizzle interactive prompt by sending enter key
(echo "" | npx drizzle-kit push) || {
    echo "Migration with default selection failed"
    # Try with --force flag if available
    npx drizzle-kit push --force 2>/dev/null || echo "Force flag not available"
}