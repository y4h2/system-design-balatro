#!/usr/bin/env python3
"""
Import Aurora World scenarios from JSON files to PostgreSQL database.

Usage:
    python scripts/import_aurora_scenarios.py [--dry-run]

This script reads scenario JSON files from spec/aurora_world/scenarios/
and updates the corresponding records in the database.
"""

import argparse
import json
import os
import sys
from pathlib import Path

try:
    import psycopg2
    from psycopg2.extras import Json
except ImportError:
    print("Error: psycopg2 is required. Install with: pip install psycopg2-binary")
    sys.exit(1)


# Database connection settings
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5433'),
    'dbname': os.getenv('DB_NAME', 'lark_admin'),
    'user': os.getenv('DB_USER', 'larkadmin'),
    'password': os.getenv('DB_PASSWORD', 'larkadmin123'),
}

# Scenario ID mapping (JSON id -> Database UUID)
SCENARIO_ID_MAP = {
    'case001_night_outage': 'a1000001-0001-0001-0001-000000000001',
    'case002_fund_rollback': 'a1000001-0001-0001-0002-000000000001',
    'case003_deepfake_briefing': 'a1000001-0001-0001-0003-000000000001',
    'case004_kpi_city_index': 'a1000001-0001-0001-0004-000000000001',
    'case005_false_premise_audit': 'a1000001-0001-0001-0005-000000000001',
}


def get_db_connection():
    """Create database connection."""
    return psycopg2.connect(**DB_CONFIG)


def update_scenario(cursor, scenario_data: dict, dry_run: bool = False):
    """Update scenario record."""
    json_id = scenario_data.get('id')
    db_id = SCENARIO_ID_MAP.get(json_id)

    if not db_id:
        print(f"  Warning: No DB mapping for scenario '{json_id}'")
        return False

    # Map JSON fields to DB columns
    updates = {
        'title': scenario_data.get('title'),
        'short_pitch': scenario_data.get('summary'),
        'world_setting': scenario_data.get('worldSetting'),
    }

    # Filter out None values
    updates = {k: v for k, v in updates.items() if v is not None}

    if not updates:
        return False

    set_clause = ', '.join(f"{k} = %s" for k in updates.keys())
    values = list(updates.values()) + [db_id]

    sql = f"UPDATE scenarios SET {set_clause}, updated_at = NOW() WHERE id = %s"

    if dry_run:
        print(f"  [DRY RUN] Would update scenario {db_id}")
        print(f"    Fields: {list(updates.keys())}")
    else:
        cursor.execute(sql, values)

    return True


def update_clues(cursor, clues: list, scenario_json_id: str, dry_run: bool = False):
    """Update clue records."""
    db_scenario_id = SCENARIO_ID_MAP.get(scenario_json_id)
    if not db_scenario_id:
        return 0

    updated = 0
    for clue in clues:
        clue_key = clue.get('key')
        if not clue_key:
            continue

        updates = {
            'title': clue.get('title'),
            'description': clue.get('rawContent'),
            'detail': clue.get('rawContent'),  # Same as description for logic clues
        }

        # Add image if present (column is 'image', not 'image_url')
        if clue.get('imageUrl'):
            updates['image'] = clue.get('imageUrl')

        updates = {k: v for k, v in updates.items() if v is not None}

        if not updates:
            continue

        set_clause = ', '.join(f"{k} = %s" for k in updates.keys())
        values = list(updates.values()) + [db_scenario_id, clue_key]

        sql = f"UPDATE scenario_clues SET {set_clause}, updated_at = NOW() WHERE scenario_id = %s AND key = %s"

        if dry_run:
            print(f"  [DRY RUN] Would update clue '{clue_key}'")
        else:
            cursor.execute(sql, values)
            if cursor.rowcount > 0:
                updated += 1

    return updated


def update_timeline_events(cursor, events: list, scenario_json_id: str, dry_run: bool = False):
    """Update timeline event records (skipped - table doesn't exist)."""
    # Timeline events are not stored in a separate table
    # They may be embedded in scenario data or not used
    return 0


def process_scenario_file(cursor, filepath: Path, dry_run: bool = False) -> dict:
    """Process a single scenario JSON file."""
    results = {'scenario': False, 'clues': 0, 'timeline': 0}

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"  Error reading {filepath}: {e}")
        return results

    # Get scenario ID
    scenario_data = data.get('logic_scenario', {})
    scenario_json_id = scenario_data.get('id')

    if not scenario_json_id:
        print(f"  Warning: No scenario ID in {filepath}")
        return results

    # Update scenario
    if update_scenario(cursor, scenario_data, dry_run):
        results['scenario'] = True

    # Update clues
    clues = data.get('logic_clues', [])
    results['clues'] = update_clues(cursor, clues, scenario_json_id, dry_run)

    # Update timeline events
    events = data.get('timeline_events', [])
    results['timeline'] = update_timeline_events(cursor, events, scenario_json_id, dry_run)

    return results


def main():
    parser = argparse.ArgumentParser(
        description='Import Aurora World scenarios from JSON to database'
    )
    parser.add_argument(
        '--dry-run', '-n',
        action='store_true',
        help='Preview changes without modifying database'
    )

    args = parser.parse_args()

    # Find project root
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    scenarios_dir = project_root / 'spec' / 'aurora_world' / 'scenarios'

    if not scenarios_dir.exists():
        print(f"Error: Scenarios directory not found: {scenarios_dir}")
        return 1

    # Find scenario files
    files = sorted(scenarios_dir.glob('case*.json'))
    if not files:
        print("No scenario files found")
        return 1

    print(f"{'[DRY RUN] ' if args.dry_run else ''}Importing {len(files)} scenario(s)...\n")

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        total_results = {'scenarios': 0, 'clues': 0, 'timeline': 0}

        for filepath in files:
            print(f"Processing: {filepath.name}")
            results = process_scenario_file(cursor, filepath, args.dry_run)

            if results['scenario']:
                total_results['scenarios'] += 1
            total_results['clues'] += results['clues']
            total_results['timeline'] += results['timeline']

            print(f"  Scenario: {'updated' if results['scenario'] else 'skipped'}")
            print(f"  Clues: {results['clues']} updated")
            print(f"  Timeline: {results['timeline']} updated")
            print()

        if not args.dry_run:
            conn.commit()
            print("Changes committed to database.")

        print(f"\n{'=' * 50}")
        print(f"Summary:")
        print(f"  Scenarios updated: {total_results['scenarios']}")
        print(f"  Clues updated: {total_results['clues']}")
        print(f"  Timeline events updated: {total_results['timeline']}")

        if args.dry_run:
            print(f"\nRun without --dry-run to apply changes.")

        cursor.close()
        conn.close()

    except psycopg2.Error as e:
        print(f"Database error: {e}")
        return 1

    return 0


if __name__ == '__main__':
    sys.exit(main())
