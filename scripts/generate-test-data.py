#!/usr/bin/env python3
"""Generate sample parquet files for QuackBlocks testing.

Uses the Palmer Penguins dataset — the modern "hello world" of data analysis.
344 penguins across 3 species, 3 islands, with body measurements.

Usage:
    python scripts/generate-test-data.py <output_dir>

Example:
    python scripts/generate-test-data.py ~/my-vault/data
"""

import sys
import os

try:
    import pyarrow as pa
    import pyarrow.parquet as pq
except ImportError:
    print("Error: pyarrow is required. Install with: pip install pyarrow")
    sys.exit(1)


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)

    # Palmer Penguins — measurements (main fact table)
    # Based on Horst AM, Hill AP, Gorman KB (2020)
    # Simplified to 60 representative rows for fast testing
    penguins = pa.table({
        "species": (
            ["Adelie"] * 20 + ["Chinstrap"] * 20 + ["Gentoo"] * 20
        ),
        "island": (
            ["Torgersen"] * 7 + ["Biscoe"] * 7 + ["Dream"] * 6 +
            ["Dream"] * 20 +
            ["Biscoe"] * 20
        ),
        "bill_length_mm": [
            39.1, 38.8, 36.7, 39.3, 38.9, 42.0, 37.8,
            37.8, 41.1, 38.6, 34.6, 36.6, 38.7, 42.5,
            40.3, 39.5, 44.1, 36.7, 37.6, 39.6,
            46.5, 50.0, 51.3, 45.4, 52.7, 46.9, 53.5,
            49.0, 46.2, 50.3, 51.3, 45.2, 49.1, 52.0,
            48.5, 52.8, 49.6, 50.2, 48.1, 51.4,
            46.1, 50.0, 48.7, 46.5, 45.4, 46.7, 43.3,
            46.8, 40.9, 49.0, 45.5, 48.4, 45.8, 49.6,
            50.5, 43.5, 49.5, 46.4, 48.6, 51.1,
        ],
        "bill_depth_mm": [
            18.7, 17.2, 19.3, 20.6, 17.8, 19.2, 18.1,
            18.3, 17.6, 21.2, 21.1, 17.8, 19.0, 20.7,
            18.0, 17.4, 18.0, 19.1, 19.3, 20.7,
            17.9, 19.5, 19.2, 18.7, 19.0, 16.6, 19.6,
            18.5, 18.5, 20.0, 18.2, 18.5, 19.6, 18.1,
            18.0, 20.0, 18.2, 18.7, 18.2, 19.0,
            13.2, 16.3, 14.1, 13.5, 14.6, 15.3, 13.4,
            15.4, 13.7, 16.3, 13.7, 14.6, 14.4, 15.9,
            15.9, 14.2, 16.1, 14.4, 16.0, 16.5,
        ],
        "flipper_length_mm": [
            181, 190, 193, 190, 181, 180, 186,
            174, 182, 191, 198, 185, 195, 197,
            190, 186, 210, 187, 181, 190,
            192, 196, 198, 188, 197, 192, 200,
            200, 191, 197, 194, 193, 195, 197,
            191, 205, 193, 197, 199, 194,
            211, 230, 210, 218, 215, 219, 209,
            215, 214, 228, 212, 233, 215, 220,
            221, 213, 225, 217, 230, 220,
        ],
        "body_mass_g": [
            3750, 3800, 3250, 3650, 3625, 4250, 3300,
            3200, 3950, 3800, 4400, 3475, 3700, 4500,
            3250, 3150, 4000, 3350, 3300, 3600,
            3500, 3950, 3600, 3525, 3725, 3350, 4475,
            3500, 3400, 4050, 3600, 3200, 3950, 4150,
            3400, 3800, 3775, 4050, 3250, 3800,
            4500, 5700, 4450, 5200, 5150, 5200, 4400,
            5150, 4650, 5700, 4750, 5550, 4600, 5350,
            5650, 4130, 5400, 4900, 5800, 5250,
        ],
        "sex": (
            ["male", "female"] * 30
        ),
    })
    pq.write_table(penguins, os.path.join(out, "penguins.parquet"))
    print(f"  Written {os.path.join(out, 'penguins.parquet')} ({penguins.num_rows} rows)")

    # Islands — metadata / dimension table (for join testing)
    islands = pa.table({
        "island": ["Torgersen", "Biscoe", "Dream"],
        "latitude": [-64.77, -65.43, -64.73],
        "longitude": [-64.08, -65.50, -64.23],
        "area_km2": [6.8, 49.3, 3.2],
    })
    pq.write_table(islands, os.path.join(out, "islands.parquet"))
    print(f"  Written {os.path.join(out, 'islands.parquet')} ({islands.num_rows} rows)")

    print(f"\nDone! 2 parquet files written to {out}")


if __name__ == "__main__":
    main()
