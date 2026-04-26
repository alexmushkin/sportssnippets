from PIL import Image, ImageDraw, ImageFont
import os

# Files to verify
files = [
    'anim_front_football_ink_linear.png', # Working (6 frames)
    'anim_front_basketball_ink_linear.png', # Broken? (4 frames)
    'anim_front_baseball_ink_linear.png',   # Broken? (4 frames)
    'anim_front_tennis_ink_linear.png',     # Broken? (4 frames)
    'anim_front_soccer_ink_linear.png'      # Broken? (4 frames)
]

images = []
max_width = 0
total_height = 0

# Load images
for f in files:
    path = os.path.join('assets', f)
    if os.path.exists(path):
        img = Image.open(path)
        images.append((f, img))
        max_width = max(max_width, img.width)
        total_height += img.height + 40 # +40 for label
    else:
        print(f"File not found: {f}")

# Create canvas
# Background Gray to see transparency
canvas = Image.new('RGBA', (max_width + 20, total_height + 20), (200, 200, 200, 255))
draw = ImageDraw.Draw(canvas)

# Attempt to load a font, fall back to default
try:
    font = ImageFont.truetype("Arial.ttf", 24)
except:
    font = ImageFont.load_default()

y_offset = 10
for name, img in images:
    # Draw Label
    draw.text((10, y_offset), f"{name} ({img.width}x{img.height})", fill=(0, 0, 0, 255), font=font)
    y_offset += 30
    
    # Draw Image
    canvas.paste(img, (10, y_offset), img)
    
    # Draw Frame Borders (Red) for debugging
    frame_count = 6 if 'football' in name or 'basketball' in name else 6 # All are 6 now
    frame_width = img.width // frame_count
    
    for i in range(frame_count + 1):
        x = 10 + (i * frame_width)
        draw.line([(x, y_offset), (x, y_offset + img.height)], fill=(255, 0, 0, 128), width=2)
        
    y_offset += img.height + 10

# Save
output_path = 'animation_debug_sheet.png'
canvas.save(output_path)
print(f"Debug sheet saved to {output_path}")
