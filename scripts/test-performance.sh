#!/bin/bash

# Performance Test Script
# Builds production version and opens preview for testing

set -e

echo "🚀 Building production version..."
npm run build

echo ""
echo "✅ Build complete!"
echo ""
echo "📊 Starting preview server on http://localhost:4173"
echo ""
echo "🧪 Testing Instructions:"
echo "   1. Open Chrome Incognito (Cmd+Shift+N)"
echo "   2. Navigate to http://localhost:4173"
echo "   3. Open DevTools → Performance tab"
echo "   4. Click 'Record' → Reload page → Stop recording"
echo "   5. Check LCP metric (target: <2,000ms)"
echo ""
echo "💡 Tip: Compare with regular Chrome window to see extension impact"
echo ""

# Start preview server
npm run preview
