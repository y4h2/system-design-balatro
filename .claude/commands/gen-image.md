# 图片生成

根据描述生成图片，支持压缩和去除背景。

## 参数

$ARGUMENTS - 操作描述（生成/压缩/去背景）

## 功能列表

| 功能 | 说明 |
|------|------|
| 生成图片 | 使用 Gemini API 生成 |
| 压缩图片 | PNG → WebP，减少 60-80% 体积 |
| 去除背景 | 使用 rembg AI 模型抠图 |

---

## 1. 生成图片

### 模型选择

| 场景 | 模型 |
|------|------|
| 包含文字 | `gemini-3-pro-image-preview` |
| 纯图像 | `gemini-2.5-flash-image-preview` |

### 统一风格前缀

所有剧本图片使用统一风格：

```
Cinematic mystery illustration style, dark moody atmosphere,
dramatic lighting with strong shadows, detective novel aesthetic,
deep blue and purple tones with hints of gold, no text
```

### 图片规格

| 类型 | 尺寸 | 背景 |
|------|------|------|
| 封面图 | 1024×1024 | 场景背景 |
| 人物头像 | 512×512 | 中性灰 #808080（便于抠图） |

### 执行命令

```bash
# 文字相关
python .claude/scripts/image-generator.py "<prompt>" -m gemini-3-pro-image-preview -o <path>

# 纯图像
python .claude/scripts/image-generator.py "<prompt>" -m gemini-2.5-flash-image-preview -o <path>
```

### 输出路径

- 封面: `frontend/public/images/scenarios/<id>/cover.png`
- 人物: `frontend/public/images/scenarios/<id>/<role>.png`
- 线索: `frontend/public/clues/<clue_id>.png`
- 通用: `output/generated_imgs/`

### Rate Limit 处理

遇到限制时输出 prompt 让用户手动生成，不重试。

---

## 2. 压缩图片

将 PNG 转换为 WebP 格式，大幅减少文件大小。

### 单个文件

```bash
cwebp -q 80 input.png -o output.webp
```

### 批量压缩

```bash
.claude/scripts/compress_images.sh
```

### 压缩效果

- 质量: 80 (0-100)
- 典型压缩率: 60-80%

---

## 3. 去除背景

使用 rembg AI 模型智能抠图，效果最好。

### 安装

```bash
pip install rembg onnxruntime
```

### 使用

```python
from rembg import remove

with open("input.png", "rb") as f:
    input_data = f.read()

output_data = remove(input_data)

with open("output.png", "wb") as f:
    f.write(output_data)
```

### 批量处理

使用 rembg 对目录下所有图片去背景：

```python
from rembg import remove
from pathlib import Path

for img_path in Path("output/generated_imgs").glob("*.png"):
    with open(img_path, "rb") as f:
        output = remove(f.read())
    with open(img_path.with_suffix(".png"), "wb") as f:
        f.write(output)
```

### 背景色建议

生成人物图时使用 **中性灰 #808080**，抠图效果最佳：

```
solid neutral gray background #808080, no color spill
```

| 颜色 | 推荐 |
|------|------|
| 中性灰 #808080 | ✅ 推荐 |
| 纯绿 #00FF00 | ❌ 会产生绿色溢色 |
| 深色 | ⚠️ 深色头发易误删 |

---

## 详细文档

完整规范见: `.claude/docs/image-generation.md`

---

## 示例

**生成人物头像:**
```
/gen-image 生成 NPC 头像：40岁中国男性商人，狡猾眼神
```
→ 使用统一风格前缀 + 灰色背景 + 512×512

**压缩图片:**
```
/gen-image 压缩 frontend/public/images/scenarios/ 下所有 PNG
```
→ 执行 compress_images.sh

**去除背景:**
```
/gen-image 去除 output/generated_imgs/test.png 的背景
```
→ 使用 rembg 处理
