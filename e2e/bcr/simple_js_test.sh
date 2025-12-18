#!/bin/bash
set -euo pipefail

# Check that we received arguments
if [ $# -eq 0 ]; then
  echo "FAIL: No arguments provided"
  exit 1
fi

# Verify each arg is a readable file
for arg in "$@"; do
  if [ ! -f "$arg" ]; then
    echo "FAIL: $arg is not a file"
    exit 1
  fi

  if [ ! -s "$arg" ]; then
    echo "FAIL: $arg is empty"
    exit 1
  fi
done

echo "PASS: Verified $# file(s)"
