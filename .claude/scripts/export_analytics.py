#!/usr/bin/env python3
"""
Export analytics_events from database to CSV.

Usage:
    python scripts/export_analytics.py [--env ENV_FILE] [--output DIR] [--days N]

Examples:
    # Export from local database (default)
    python scripts/export_analytics.py

    # Export from sic database
    python scripts/export_analytics.py --env .env.sic

    # Export last 7 days only
    python scripts/export_analytics.py --days 7

    # Custom output directory
    python scripts/export_analytics.py --output ./my_analytics
"""

import argparse
import csv
import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    print("Error: psycopg2 is required. Install with: pip install psycopg2-binary")
    sys.exit(1)


def load_env_file(env_file: str) -> dict:
    """Load environment variables from a file."""
    env = {}
    if not os.path.exists(env_file):
        return env

    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                env[key.strip()] = value.strip()
    return env


def get_db_config(env_file: str = None) -> dict:
    """Get database configuration from environment or env file."""
    if env_file:
        env = load_env_file(env_file)
    else:
        env = {}

    return {
        'host': env.get('DB_HOST', os.getenv('DB_HOST', 'localhost')),
        'port': env.get('DB_PORT', os.getenv('DB_PORT', '5433')),
        'dbname': env.get('DB_NAME', os.getenv('DB_NAME', 'lark_admin')),
        'user': env.get('DB_USER', os.getenv('DB_USER', 'larkadmin')),
        'password': env.get('DB_PASSWORD', os.getenv('DB_PASSWORD', 'larkadmin123')),
    }


def export_analytics(db_config: dict, output_dir: str, days: int = None, prefix: str = None) -> str:
    """Export analytics_events to CSV."""
    conn = psycopg2.connect(**db_config)
    cur = conn.cursor(cursor_factory=RealDictCursor)

    # Build query
    query = """
        SELECT
            id,
            session_id,
            player_id,
            event_name,
            properties,
            timestamp,
            client_ip,
            created_at
        FROM analytics_events
    """
    params = []

    if days:
        query += " WHERE timestamp >= %s"
        params.append(datetime.now() - timedelta(days=days))

    query += " ORDER BY timestamp DESC"

    cur.execute(query, params)
    rows = cur.fetchall()

    # Create output directory
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    # Generate filename with timestamp and optional prefix
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    if prefix:
        filename = f"{prefix}_analytics_events_{timestamp}.csv"
    else:
        filename = f"analytics_events_{timestamp}.csv"
    filepath = output_path / filename

    # Write CSV
    if rows:
        fieldnames = ['id', 'session_id', 'player_id', 'event_name', 'properties', 'timestamp', 'client_ip', 'created_at']

        with open(filepath, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()

            for row in rows:
                # Convert properties dict to JSON string
                row_dict = dict(row)
                if row_dict.get('properties'):
                    row_dict['properties'] = json.dumps(row_dict['properties'], ensure_ascii=False)
                writer.writerow(row_dict)
    else:
        # Create empty file with headers
        with open(filepath, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['id', 'session_id', 'player_id', 'event_name', 'properties', 'timestamp', 'client_ip', 'created_at'])

    cur.close()
    conn.close()

    return str(filepath), len(rows)


def main():
    parser = argparse.ArgumentParser(
        description='Export analytics_events from database to CSV'
    )
    parser.add_argument(
        '--env', '-e',
        help='Path to environment file (e.g., .env.sic)',
        default=None
    )
    parser.add_argument(
        '--output', '-o',
        help='Output directory (default: ./output/analytics)',
        default='./output/analytics'
    )
    parser.add_argument(
        '--days', '-d',
        type=int,
        help='Only export events from last N days',
        default=None
    )
    parser.add_argument(
        '--prefix', '-p',
        help='Filename prefix (e.g., sic, local)',
        default=None
    )

    args = parser.parse_args()

    # Get database config
    db_config = get_db_config(args.env)

    print(f"Connecting to {db_config['host']}:{db_config['port']}/{db_config['dbname']}...")

    try:
        filepath, count = export_analytics(db_config, args.output, args.days, args.prefix)
        print(f"Exported {count} events to {filepath}")
    except psycopg2.Error as e:
        print(f"Database error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
