from PIL import Image
img = Image.open(r"C:\Users\yoges\.gemini\antigravity-ide\brain\a87cccbf-af9a-407e-b80f-9c3a59e5d648\.user_uploaded\media_1789221131332.png")
w, h = img.size
# In media_1789221131332.png, the robot is roughly from y = 0.11 * h to y = 0.49 * h
box = (int(w * 0.05), int(h * 0.10), int(w * 0.95), int(h * 0.495))
cropped = img.crop(box)
cropped.save(r"E:\Intrust\intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f\public\banners\empty-cart-robot.png", "PNG")
print(f"Success: {w}x{h} -> {cropped.size}")
