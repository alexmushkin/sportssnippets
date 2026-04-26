from PIL import Image
import os

# Configuration
# Format: 'filename': (rows, cols)
# We assume uniform grid.
assets = {
    'anim_front_basketball_ink.png': (2, 3), # 3x2 (6 Frames) - CONFIRMED
    'anim_front_football_ink.png': (2, 3),   # 3x2 (6 Frames) - CONFIRMED
    'anim_front_baseball_ink.png': (3, 3),   # 3x3 (9 Frames) -> Will filter to 6
    'anim_front_tennis_ink.png': (3, 3),     # 3x3 (9 Frames) -> Will filter to 6
    'anim_front_soccer_ink.png': (3, 3)      # 3x3 (9 Frames) -> Will filter to 6
}

# ... (Previous code) ...




# CSS analysis said:
# Basketball/Football: "3x2 Grid (6 Frames) - Skips bottom row" -> Wait.
# If it skips bottom row, finding the frames might be tricky if I don't know exact pixels.
# BUT, if I just flatten the whole grid into a strip, invalid frames will show up at the end.
# The user wants "linear strip so there is no movement".
# I'll convert the FULL grid.

# IMPORTANT: 
# Tuple is (ROWS, COLS) for splitting logic.
# Basketball 3x2 means 3 columns, 2 rows? 
# "3x2 Grid (6 Frames) - Skips bottom row" in CSS usually implies it WAS a 3x3 but used top 2.
# Let's assume standard grid logic:
# 6 frames = 3 Cols x 2 Rows.

def convert_to_linear(filename, rows, cols):
    path = os.path.join('assets', filename)
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return

    try:
        img = Image.open(path)
        width, height = img.size
        
        frame_width = width // cols
        frame_height = height // rows
        
        frames = []
        for r in range(rows):
            for c in range(cols):
                left = c * frame_width
                top = r * frame_height
                right = left + frame_width
                bottom = top + frame_height
                
                # Extract frame
                frame = img.crop((left, top, right, bottom))
                
                # CLEANING 1: Enforce Pure White background (>220 -> 255)
                data = frame.getdata()
                new_data = []
                for item in data:
                    if item[0] > 220 and item[1] > 220 and item[2] > 220:
                        new_data.append((255, 255, 255, 255))
                    else:
                        new_data.append(item)
                frame.putdata(new_data)

                # CLEANING 2: MASK EDGES (Erase 20px border)
                # This removes any black drawn boxes/frames from the source image
                from PIL import ImageDraw
                draw = ImageDraw.Draw(frame)
                mask_size = 20
                w, h = frame.size
                # Draw white rectangles on sides
                draw.rectangle([(0, 0), (w, mask_size)], fill=(255, 255, 255, 255)) # Top
                draw.rectangle([(0, h-mask_size), (w, h)], fill=(255, 255, 255, 255)) # Bottom
                draw.rectangle([(0, 0), (mask_size, h)], fill=(255, 255, 255, 255)) # Left
                draw.rectangle([(w-mask_size, 0), (w, h)], fill=(255, 255, 255, 255)) # Right
                
                frames.append(frame)
        
        # Filter Frames for specific sports
        # Baseball, Tennis, Soccer: Remove Middle Row (Indices 3, 4, 5)
        # 0 1 2
        # 3 4 5 (DROP)
        # 6 7 8
        if 'baseball' in filename or 'tennis' in filename or 'soccer' in filename:
            # Keep 0,1,2 and 6,7,8
            filtered_frames = []
            for i in range(len(frames)):
                if i not in [3, 4, 5]:
                    filtered_frames.append(frames[i])
            frames = filtered_frames
            print(f"Applied Skip-Middle-Row logic for {filename}. Keeping {len(frames)} frames.")

        # Create new linear image
        total_width = frame_width * len(frames)
        new_img = Image.new('RGBA', (total_width, frame_height))
        
        for i, frame in enumerate(frames):
            new_img.paste(frame, (i * frame_width, 0))
            
        # Save as _linear
        new_filename = filename.replace('.png', '_linear.png')
        new_path = os.path.join('assets', new_filename)
        new_img.save(new_path)
        print(f"Converted {filename} to {new_filename} ({len(frames)} frames)")
        
    except Exception as e:
        print(f"Error processing {filename}: {e}")

# Execute
convert_to_linear('anim_front_basketball_ink.png', 2, 3)
convert_to_linear('anim_front_football_ink.png', 2, 3)
convert_to_linear('anim_front_baseball_ink.png', 3, 3)
convert_to_linear('anim_front_tennis_ink.png', 3, 3)
convert_to_linear('anim_front_soccer_ink.png', 3, 3)
