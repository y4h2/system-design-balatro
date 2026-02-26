#!/usr/bin/env python3
"""
Normalize Chinese punctuation to ASCII equivalents.

This script helps avoid UTF-8 string boundary issues that can cause crashes
in tools that incorrectly slice multi-byte characters.

Usage:
    python scripts/normalize_chinese_punctuation.py [--dry-run] [--backup] [path...]

Examples:
    # Preview changes without modifying files
    python scripts/normalize_chinese_punctuation.py --dry-run

    # Normalize all JSON files in spec/ with backup
    python scripts/normalize_chinese_punctuation.py --backup

    # Normalize specific files
    python scripts/normalize_chinese_punctuation.py spec/aurora_world/scenarios/*.json
"""

import argparse
import json
import os
import shutil
import sys
from pathlib import Path
from typing import Any


# Chinese punctuation -> ASCII equivalents
PUNCTUATION_MAP = {
    # Quotation marks
    '"': '"',   # Left double quotation mark
    '"': '"',   # Right double quotation mark
    ''': "'",   # Left single quotation mark
    ''': "'",   # Right single quotation mark
    '「': '"',  # Left corner bracket
    '」': '"',  # Right corner bracket
    '『': '"',  # Left white corner bracket
    '』': '"',  # Right white corner bracket

    # Brackets
    '（': '(',  # Fullwidth left parenthesis
    '）': ')',  # Fullwidth right parenthesis
    '【': '[',  # Left black lenticular bracket
    '】': ']',  # Right black lenticular bracket
    '〔': '[',  # Left tortoise shell bracket
    '〕': ']',  # Right tortoise shell bracket
    '〈': '<',  # Left angle bracket
    '〉': '>',  # Right angle bracket
    '《': '<',  # Left double angle bracket
    '》': '>',  # Right double angle bracket

    # Basic punctuation
    '。': '.',  # Ideographic full stop
    '，': ',',  # Fullwidth comma
    '、': ',',  # Ideographic comma
    '；': ';',  # Fullwidth semicolon
    '：': ':',  # Fullwidth colon
    '！': '!',  # Fullwidth exclamation mark
    '？': '?',  # Fullwidth question mark

    # Dashes and dots
    '—': '-',   # Em dash
    '－': '-',  # Fullwidth hyphen-minus
    '～': '~',  # Fullwidth tilde
    '…': '...', # Horizontal ellipsis
    '·': '.',   # Middle dot

    # Spaces
    '　': ' ',  # Ideographic space (fullwidth)
}


def normalize_text(text: str) -> tuple[str, int]:
    """
    Normalize Chinese punctuation in text to ASCII equivalents.

    Returns:
        tuple: (normalized_text, change_count)
    """
    if not isinstance(text, str):
        return text, 0

    change_count = 0
    result = []

    for char in text:
        if char in PUNCTUATION_MAP:
            result.append(PUNCTUATION_MAP[char])
            change_count += 1
        else:
            result.append(char)

    return ''.join(result), change_count


def normalize_value(value: Any) -> tuple[Any, int]:
    """
    Recursively normalize all string values in a JSON structure.

    Returns:
        tuple: (normalized_value, total_change_count)
    """
    if isinstance(value, str):
        return normalize_text(value)
    elif isinstance(value, dict):
        total_changes = 0
        result = {}
        for k, v in value.items():
            normalized_v, changes = normalize_value(v)
            result[k] = normalized_v
            total_changes += changes
        return result, total_changes
    elif isinstance(value, list):
        total_changes = 0
        result = []
        for item in value:
            normalized_item, changes = normalize_value(item)
            result.append(normalized_item)
            total_changes += changes
        return result, total_changes
    else:
        return value, 0


def process_json_file(
    filepath: Path,
    dry_run: bool = False,
    backup: bool = False
) -> tuple[int, list[str]]:
    """
    Process a single JSON file.

    Returns:
        tuple: (change_count, list of change descriptions)
    """
    changes = []

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            original_content = f.read()
            data = json.loads(original_content)
    except json.JSONDecodeError as e:
        print(f"  ERROR: Invalid JSON in {filepath}: {e}", file=sys.stderr)
        return 0, []
    except Exception as e:
        print(f"  ERROR: Cannot read {filepath}: {e}", file=sys.stderr)
        return 0, []

    normalized_data, change_count = normalize_value(data)

    if change_count == 0:
        return 0, []

    # Generate normalized content
    normalized_content = json.dumps(
        normalized_data,
        ensure_ascii=False,
        indent=2
    ) + '\n'

    # Find specific changes for reporting
    for char, replacement in PUNCTUATION_MAP.items():
        count = original_content.count(char)
        if count > 0:
            changes.append(f"  '{char}' -> '{replacement}': {count} occurrences")

    if not dry_run:
        if backup:
            backup_path = filepath.with_suffix(filepath.suffix + '.bak')
            shutil.copy2(filepath, backup_path)
            print(f"  Backup created: {backup_path}")

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(normalized_content)

    return change_count, changes


def find_json_files(paths: list[str], default_dir: str = 'spec') -> list[Path]:
    """Find all JSON files to process."""
    files = []

    if not paths:
        # Default: process all JSON files in spec/
        paths = [default_dir]

    for path_str in paths:
        path = Path(path_str)
        if path.is_file() and path.suffix == '.json':
            files.append(path)
        elif path.is_dir():
            files.extend(path.rglob('*.json'))
        else:
            # Could be a glob pattern
            import glob
            for match in glob.glob(path_str, recursive=True):
                match_path = Path(match)
                if match_path.is_file() and match_path.suffix == '.json':
                    files.append(match_path)

    return sorted(set(files))


def main():
    parser = argparse.ArgumentParser(
        description='Normalize Chinese punctuation in JSON files to ASCII equivalents.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument(
        'paths',
        nargs='*',
        help='Files or directories to process (default: spec/)'
    )
    parser.add_argument(
        '--dry-run', '-n',
        action='store_true',
        help='Preview changes without modifying files'
    )
    parser.add_argument(
        '--backup', '-b',
        action='store_true',
        help='Create .bak backup files before modifying'
    )
    parser.add_argument(
        '--quiet', '-q',
        action='store_true',
        help='Only show summary, not individual changes'
    )

    args = parser.parse_args()

    # Find project root (where spec/ directory is)
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    os.chdir(project_root)

    files = find_json_files(args.paths)

    if not files:
        print("No JSON files found to process.")
        return 1

    print(f"{'[DRY RUN] ' if args.dry_run else ''}Processing {len(files)} JSON file(s)...\n")

    total_changes = 0
    files_changed = 0

    for filepath in files:
        change_count, changes = process_json_file(
            filepath,
            dry_run=args.dry_run,
            backup=args.backup
        )

        if change_count > 0:
            files_changed += 1
            total_changes += change_count

            status = "[would change]" if args.dry_run else "[changed]"
            print(f"{status} {filepath} ({change_count} replacements)")

            if not args.quiet:
                for change in changes:
                    print(change)
                print()
        elif not args.quiet:
            print(f"[no changes] {filepath}")

    print(f"\n{'=' * 50}")
    print(f"Summary:")
    print(f"  Files scanned:  {len(files)}")
    print(f"  Files changed:  {files_changed}")
    print(f"  Total replacements: {total_changes}")

    if args.dry_run and total_changes > 0:
        print(f"\nRun without --dry-run to apply changes.")

    return 0


if __name__ == '__main__':
    sys.exit(main())
