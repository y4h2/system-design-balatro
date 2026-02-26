"""Batch generate joker card images using Gemini API."""
import os
import sys
import time
import subprocess

OUTDIR = os.path.join(os.path.dirname(__file__), "../../src/web/assets/jokers")
SCRIPT = os.path.join(os.path.dirname(__file__), "image-generator.py")

STYLE_PREFIX = (
    "Digital illustration, tech culture aesthetic, vibrant colors, "
    "portrait orientation 2:3 aspect ratio, no text no words no letters, "
    "detailed high quality, suitable as a game card illustration, "
)

JOKERS = [
    ("jk_sla_maniac", "Server room with rows of rack servers, green LED status lights glowing in darkness, cool blue ambient light, data center atmosphere"),
    ("jk_data_hoarder", "Macro close-up of a hard drive platter with read head, reflective surface showing rainbow light patterns, technical precision"),
    ("jk_cloud_native", "Aerial view of a colorful shipping container yard with stacked containers, Docker/cloud metaphor, industrial scale"),
    ("jk_pattern_amp", "Vintage guitar amplifier with glowing vacuum tubes, volume dial cranked to 11, warm orange light, rock and roll energy"),
    ("jk_combo_king", "Retro arcade cabinet glowing with neon purple and blue lights in a dark arcade room, pixel art on screen, nostalgic atmosphere"),
    ("jk_card_counter", "Playing cards spread elegantly on a green felt poker table, dramatic lighting from above, casino atmosphere"),
    ("jk_reroll_master", "Colorful dice mid-roll captured in motion, dynamic angles, multiple dice showing different faces, energetic composition"),
    ("jk_gold_mine", "Stacked gold bars and scattered gold nuggets with dramatic spotlight, treasure vault atmosphere, warm golden glow"),
    ("jk_all_in", "Poker chips pushed all-in on a green felt table, dramatic overhead lighting, stacks of red black and white chips, high stakes"),
    ("jk_minimalist", "Ultra-clean white minimalist modern architecture building, sharp geometric lines, blue sky, Bauhaus inspired design"),
    ("jk_rubber_duck", "Bright yellow rubber duck sitting on a programmer desk next to a keyboard and monitor with code, debugging mascot, cute and fun"),
    ("jk_legacy_code", "Vintage 1980s computer with green CRT monitor displaying code, retro computing setup, warm nostalgic lighting, floppy disks"),
    ("jk_microservice_mania", "Tangled mass of colorful network cables in a server room patch panel, organized chaos, tech infrastructure"),
    ("jk_cache_hit", "Formula 1 racing car speeding with motion blur, speed lines, high velocity, red and white livery, dynamic angle"),
    ("jk_incident_cmd", "Red emergency alarm light spinning in a dark industrial corridor, warning atmosphere, dramatic red glow, alert signal"),
    ("jk_open_source", "Terminal screen showing green code on black background, hacker aesthetic, matrix style, programming atmosphere, bright text"),
    ("jk_10x_dev", "Space rocket launching with dramatic fire and smoke plume, clear blue sky, powerful thrust, ascending into space"),
    ("jk_over_engineer", "Complex Rube Goldberg contraption machine with gears pulleys and levers, steampunk influenced, intricate mechanisms, whimsical engineering"),
    ("jk_devops_guru", "Industrial conveyor belt in a modern factory with robotic arms, CI/CD pipeline metaphor, blue and orange lighting, automation"),
    ("jk_chaos_lover", "Monarch butterfly with detailed wing patterns in macro, colorful wings against dark background, butterfly effect chaos theory"),
]

def main():
    os.makedirs(OUTDIR, exist_ok=True)

    for i, (jk_id, desc) in enumerate(JOKERS):
        png_path = os.path.join(OUTDIR, f"{jk_id}.png")
        webp_path = os.path.join(OUTDIR, f"{jk_id}.webp")

        # Skip if webp already exists
        if os.path.exists(webp_path) and os.path.getsize(webp_path) > 1000:
            print(f"[{i+1}/20] SKIP {jk_id} (already exists)")
            continue

        prompt = STYLE_PREFIX + desc
        print(f"\n[{i+1}/20] Generating {jk_id}...")

        try:
            result = subprocess.run(
                [sys.executable, SCRIPT, prompt, "-o", png_path, "-s", "512", "-m", "gemini-3-pro-image-preview"],
                capture_output=True, text=True, timeout=120
            )
            if result.returncode != 0:
                print(f"  ERROR: {result.stderr}")
                # On rate limit, wait and retry once
                if "429" in result.stderr or "rate" in result.stderr.lower():
                    print("  Rate limited, waiting 60s...")
                    time.sleep(60)
                    result = subprocess.run(
                        [sys.executable, SCRIPT, prompt, "-o", png_path, "-s", "512", "-m", "gemini-3-pro-image-preview"],
                        capture_output=True, text=True, timeout=120
                    )
                    if result.returncode != 0:
                        print(f"  RETRY FAILED: {result.stderr}")
                        continue
                else:
                    continue

            print(f"  {result.stdout.strip()}")

            # Convert to webp
            if os.path.exists(png_path):
                subprocess.run(
                    ["cwebp", "-q", "80", png_path, "-o", webp_path],
                    capture_output=True
                )
                os.remove(png_path)  # Remove PNG after webp conversion
                size_kb = os.path.getsize(webp_path) / 1024
                print(f"  Converted to webp: {size_kb:.1f} KB")

        except subprocess.TimeoutExpired:
            print(f"  TIMEOUT for {jk_id}")
        except Exception as e:
            print(f"  EXCEPTION: {e}")

        # Brief pause between API calls to avoid rate limits
        if i < len(JOKERS) - 1:
            time.sleep(2)

    # Final summary
    print("\n=== Summary ===")
    for jk_id, _ in JOKERS:
        webp_path = os.path.join(OUTDIR, f"{jk_id}.webp")
        if os.path.exists(webp_path):
            size_kb = os.path.getsize(webp_path) / 1024
            print(f"  OK  {jk_id}.webp ({size_kb:.1f} KB)")
        else:
            print(f"  MISSING  {jk_id}.webp")

if __name__ == "__main__":
    main()
