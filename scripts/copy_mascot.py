import os
import shutil

src_dir = r"C:\Users\yoges\.gemini\antigravity-ide\brain\3bac1337-11d9-4fd1-9972-73c0fbdda786"
dest_dir = os.path.join(os.getcwd(), "public", "images", "mascot")
os.makedirs(dest_dir, exist_ok=True)

files = [
    ("robo_celebrate_trophy_1790198782963.jpg", "robo_celebrate_trophy.jpg"),
    ("robo_explaining_guide_1790198804504.jpg", "robo_explaining_guide.jpg"),
    ("robo_gift_mystery_1790198820448.jpg", "robo_gift_mystery.jpg"),
    ("robo_deals_shopping_1790198923707.jpg", "robo_deals_shopping.jpg"),
]

for src_name, dest_name in files:
    src_path = os.path.join(src_dir, src_name)
    dest_path = os.path.join(dest_dir, dest_name)
    if os.path.exists(src_path):
        shutil.copy2(src_path, dest_path)
        print(f"Copied {src_name} -> {dest_name}")
    else:
        print(f"File not found: {src_path}")
