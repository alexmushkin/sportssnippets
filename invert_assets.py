from PIL import Image, ImageOps
import os

# List of assets to process
assets = [
    # The verified v26 Basketball (Original is White on Transparent/Black? Let's check)
    "assets/anim_front_basketball_v26_final.png",
    
    # The verified Football (Black BG version)
    "assets/anim_front_football_black_bg.png",
    
    # The new sports (assuming we want to keep their poses but just invert colors if they were 'different')
    # Actually, for Baseball/Tennis/Soccer, if the user said they are "different", 
    # I should try to find the original "v3" or "v2" that they liked and invert THOSE.
    # But for now, let's just invert what we have and see if the high-contrast version looks better.
    "assets/anim_front_baseball_black_bg.png",
    "assets/anim_front_tennis_black_bg.png",
    "assets/anim_front_soccer_black_bg.png"
]

def invert_image(path):
    try:
        if not os.path.exists(path):
            print(f"File not found: {path}")
            return

        img = Image.open(path).convert("RGBA")
        
        # Invert the RGB channels
        r, g, b, a = img.split()
        rgb_image = Image.merge('RGB', (r, g, b))
        inverted_image = ImageOps.invert(rgb_image)
        r2, g2, b2 = inverted_image.split()
        
        # Result: Black Figure (previously White) on White Background (previously Black)
        # If the original was Transparent, we might need to be careful.
        # But 'black_bg' implies opaque. v26 might be transparent.
        # PROPOSAL: Create a PURE WHITE background canvas and paste the INVERTED figure?
        # Let's try simple inversion first.
        # White Figure (255) -> Black (0).
        # Black BG (0) -> White (255).
        
        final_img = Image.merge('RGBA', (r2, g2, b2, a))
        
        # Save as "ink" version
        new_path = path.replace(".png", "_ink.png")
        final_img.save(new_path)
        print(f"Created: {new_path}")
        
    except Exception as e:
        print(f"Error processing {path}: {e}")

if __name__ == "__main__":
    for asset in assets:
        invert_image(asset)
