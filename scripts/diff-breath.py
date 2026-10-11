import glob, sys
from PIL import Image
import numpy as np

# 用 RGB 三个通道分别比较，而不是灰度 ——
# 色相变化在灰度上会被抵消，恰恰是判断「颜色像不像」的关键
files = sorted(glob.glob(r".breath-frames/f*.png"))
if not files:
    print("没有帧，先跑 node scripts/capture-breath.mjs")
    sys.exit(0)

imgs = [np.asarray(Image.open(f).convert("RGB"), dtype=np.float32) for f in files]

# 统计每帧的平均色相（用色度坐标粗略表达），看整幅画面的色调摆动范围
def hue_spread(im):
    r, g, b = im[..., 0].mean(), im[..., 1].mean(), im[..., 2].mean()
    # 蓝-黄轴：b - r。正值偏蓝，负值偏暖
    return b - r

warm = [hue_spread(im) for im in imgs]

base = imgs[0]
lum = [float(np.abs(im.mean(axis=2) - base.mean(axis=2)).mean()) for im in imgs]
rgb = [float(np.abs(im - base).mean()) for im in imgs]

peak_lum = max(lum)
peak_rgb = max(rgb)
# 单位时间内有多少变化量（帧间隔 1.4s）
i_lum = lum.index(peak_lum)
i_rgb = rgb.index(peak_rgb)

print("逐帧相对首帧的差异（帧间隔 1.4s）")
print("  灰度   " + " ".join(f"{v:5.2f}" for v in lum))
print("  RGB    " + " ".join(f"{v:5.2f}" for v in rgb))
print()
print(f"灰度峰值   {peak_lum:6.2f}   每秒 {peak_lum / max(i_lum * 1.4, 1.4):5.2f}")
print(f"RGB 峰值   {peak_rgb:6.2f}   每秒 {peak_rgb / max(i_rgb * 1.4, 1.4):5.2f}")
print()
print("色调摆动（蓝-黄轴 b-r，越大越蓝、越小越暖）")
print("  " + " ".join(f"{v:6.2f}" for v in warm))
print(f"  摆动幅度 {max(warm) - min(warm):5.2f}  （这个值小 = 整幅画颜色太像，看不出在动）")
