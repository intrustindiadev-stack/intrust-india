import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUBLIC_DIR = ROOT / "public"
BANNERS_DIR = PUBLIC_DIR / "banners"
ICONS_DIR = PUBLIC_DIR / "icons"
ARTIFACT_DIR = Path(r"C:\Users\yoges\.gemini\antigravity-ide\brain\cb127022-9acd-497e-86b2-37bb42fcc8ea")

def run():
    print("--- InTrust Banner Logo Replacement ---")
    try:
        from PIL import Image
    except ImportError:
        print("Pillow (PIL) not found in current Python environment. Please run:")
        print("  npm run update-banners  OR  node scripts/update_banners.js")
        return

    logo_path = ICONS_DIR / "intrustLogo.png"
    if not logo_path.exists():
        print(f"Error: Logo not found at {logo_path}")
        return

    official_logo = Image.open(logo_path).convert("RGBA")
    print(f"Loaded official InTrust logo: {official_logo.size}")

    configs = [
        {
            "filename": "banner_intrust_mart_deals.jpeg",
            "logo_rel_x": 0.046,
            "logo_rel_y": 0.088,
            "logo_rel_h": 0.082,
            "bg_box": (0.042, 0.075, 0.094, 0.200),
            "bg_color": (243, 247, 253, 255),
            "secondary": {
                "rel_x": 0.458,
                "rel_y": 0.605,
                "rel_h": 0.065,
                "bg_box": (0.448, 0.595, 0.508, 0.705),
                "bg_color": (255, 255, 255, 255)
            }
        },
        {
            "filename": "banner_wallet_pay_save.jpeg",
            "logo_rel_x": 0.051,
            "logo_rel_y": 0.088,
            "logo_rel_h": 0.082,
            "bg_box": (0.045, 0.075, 0.097, 0.200),
            "bg_color": (246, 249, 254, 255)
        },
        {
            "filename": "banner_solarsquare_green.jpeg",
            "logo_rel_x": 0.045,
            "logo_rel_y": 0.088,
            "logo_rel_h": 0.082,
            "bg_box": (0.040, 0.075, 0.092, 0.200),
            "bg_color": (232, 242, 254, 255)
        }
    ]

    for cfg in configs:
        fpath = BANNERS_DIR / cfg["filename"]
        if not fpath.exists():
            continue

        backup_path = BANNERS_DIR / f"backup_{cfg['filename']}"
        if not backup_path.exists():
            import shutil
            shutil.copyfile(fpath, backup_path)
            print(f"Created backup: {backup_path.name}")

        img = Image.open(backup_path).convert("RGBA")
        w, h = img.size

        # 1. Primary Top-Left Brand Logo Patch
        bx1 = int(w * cfg["bg_box"][0])
        by1 = int(h * cfg["bg_box"][1])
        bx2 = int(w * cfg["bg_box"][2])
        by2 = int(h * cfg["bg_box"][3])

        patch = Image.new("RGBA", (bx2 - bx1, by2 - by1), cfg["bg_color"])
        img.paste(patch, (bx1, by1))

        # Paste official logo
        target_h = int(h * cfg["logo_rel_h"])
        aspect = official_logo.width / official_logo.height
        target_w = int(target_h * aspect)
        resized_logo = official_logo.resize((target_w, target_h), Image.Resampling.LANCZOS)

        lx = int(w * cfg["logo_rel_x"])
        ly = int(h * cfg["logo_rel_y"])
        img.paste(resized_logo, (lx, ly), resized_logo)

        # 2. Secondary Logo Patch (if present)
        if "secondary" in cfg:
            sec = cfg["secondary"]
            sbx1 = int(w * sec["bg_box"][0])
            sby1 = int(h * sec["bg_box"][1])
            sbx2 = int(w * sec["bg_box"][2])
            sby2 = int(h * sec["bg_box"][3])

            sec_patch = Image.new("RGBA", (sbx2 - sbx1, sby2 - sby1), sec["bg_color"])
            img.paste(sec_patch, (sbx1, sby1))

            s_target_h = int(h * sec["rel_h"])
            s_target_w = int(s_target_h * aspect)
            s_resized_logo = official_logo.resize((s_target_w, s_target_h), Image.Resampling.LANCZOS)
            slx = int(w * sec["rel_x"])
            sly = int(h * sec["rel_y"])
            img.paste(s_resized_logo, (slx, sly), s_resized_logo)

        # Save back as JPEG
        rgb_img = img.convert("RGB")
        rgb_img.save(fpath, "JPEG", quality=96, optimize=True)
        print(f"✅ Successfully updated {cfg['filename']} with official InTrust logo!")

    print("All banner replacements finished!")

if __name__ == "__main__":
    run()
