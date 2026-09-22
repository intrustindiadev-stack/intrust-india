import os
import shutil

src_dir = r"C:\Users\yoges\.gemini\antigravity-ide\brain\7b5bca05-7373-45c9-8ae4-856cdee5de5a"
dest_dir = r"e:\Intrust\intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f\public\marketing\prizes"

os.makedirs(dest_dir, exist_ok=True)

mapping = {
    "prize_smartwatch_1789995343687.jpg": "smartwatch.jpg",
    "prize_gold_coin_1789995484403.jpg": "gold_coin.jpg",
    "prize_anc_earbuds_1789995503371.jpg": "anc_earbuds.jpg",
    "prize_executive_kit_1789995523632.jpg": "executive_kit.jpg",
}

for src_name, dest_name in mapping.items():
    src_path = os.path.join(src_dir, src_name)
    dest_path = os.path.join(dest_dir, dest_name)
    if os.path.exists(src_path):
        shutil.copy2(src_path, dest_path)
        print(f"Copied {src_name} -> {dest_name}")
    else:
        print(f"Not found: {src_path}")
