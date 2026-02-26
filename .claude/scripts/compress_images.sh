#!/bin/bash

# 图片压缩脚本
# 将 PNG 转换为 WebP 格式，大幅减少文件大小

IMAGES_DIR="frontend/public/images/scenarios"
QUALITY=80  # WebP 质量 (0-100)

echo "开始压缩图片..."
echo "源目录: $IMAGES_DIR"
echo "WebP 质量: $QUALITY"
echo ""

# 计数器
converted=0
skipped=0

# 遍历所有 PNG 文件（排除 _original 文件）
find "$IMAGES_DIR" -name "*.png" ! -name "*_original*" | while read png_file; do
    webp_file="${png_file%.png}.webp"

    # 如果 WebP 已存在且比 PNG 新，跳过
    if [ -f "$webp_file" ] && [ "$webp_file" -nt "$png_file" ]; then
        echo "跳过 (已存在): $webp_file"
        ((skipped++))
        continue
    fi

    # 转换为 WebP
    echo "转换: $png_file"
    cwebp -q $QUALITY "$png_file" -o "$webp_file" 2>/dev/null

    if [ $? -eq 0 ]; then
        # 显示压缩比
        png_size=$(stat -f%z "$png_file" 2>/dev/null || stat -c%s "$png_file")
        webp_size=$(stat -f%z "$webp_file" 2>/dev/null || stat -c%s "$webp_file")
        ratio=$((100 - webp_size * 100 / png_size))
        echo "  → $webp_file (节省 ${ratio}%)"
        ((converted++))
    else
        echo "  ✗ 转换失败"
    fi
done

echo ""
echo "完成！"

# 统计压缩后大小
echo ""
echo "=== 压缩统计 ==="
echo "PNG 总大小:"
find "$IMAGES_DIR" -name "*.png" ! -name "*_original*" -exec du -ch {} + | tail -1
echo "WebP 总大小:"
find "$IMAGES_DIR" -name "*.webp" -exec du -ch {} + 2>/dev/null | tail -1
