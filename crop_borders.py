from PIL import Image, ImageChops
import os

def trim(im):
    bg = Image.new(im.mode, im.size, (255, 255, 255, 0)) # Compare against white/transparent
    diff = ImageChops.difference(im, bg)
    diff = ImageChops.add(diff, diff, 2.0, -100)
    bbox = diff.getbbox()
    if bbox:
        return im.crop(bbox)
    return im

files = [
    ('assets/foil-frame.png', 'assets/foil-fullbleed.png'),
    ('assets/junkwax-frame.png', 'assets/junkwax-fullbleed.png'),
    ('assets/vintage-frame.png', 'assets/vintage-fullbleed.png')
]

for in_path, out_path in files:
    if os.path.exists(in_path):
        try:
            img = Image.open(in_path)
            # Thresholding to ensure we catch "near white" (compression artifacts)
            # Convert to RGBA
            img = img.convert('RGBA')
            
            # Simple bounding box on non-white pixels
            # Create a mask of non-white pixels
            # We assume the border is "white-ish" or transparent
            
            # Helper: get bbox of content that is NOT white
            # Convert to grayscale
            gray = img.convert('L')
            # Threshold: anything closer to 255 is white
            # Invert: so content is white, background is black
            bw = gray.point(lambda x: 0 if x > 240 else 255, '1')
            bbox = bw.getbbox()
            
            if bbox:
                cropped = img.crop(bbox)
                cropped.save(out_path)
                print(f"Cropped {in_path} -> {out_path} (bbox: {bbox})")
            else:
                 # If no border found, just copy
                img.save(out_path)
                print(f"No border detected for {in_path}, copied.")
                
        except Exception as e:
            print(f"Error processing {in_path}: {e}")
    else:
        print(f"File not found: {in_path}")
