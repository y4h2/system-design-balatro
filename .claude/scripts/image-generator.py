import argparse
import os
from datetime import datetime

from google import genai
from google.genai import types


def generate_image(prompt: str, output_path: str = None, size: int = 1024, model: str = "gemini-2.5-flash-image-preview") -> str:
    """
    根据提示词生成图片

    Args:
        prompt: 图片生成提示词
        output_path: 输出文件路径，默认为 generated_imgs 目录下的时间戳文件名
        size: 图片尺寸 (正方形)，默认 1024
        model: 使用的模型，默认 gemini-2.5-flash-image-preview，文字相关用 gemini-3-pro-image-preview

    Returns:
        生成的图片路径
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("请设置环境变量 GEMINI_API_KEY")

    # 在 prompt 中添加尺寸说明
    sized_prompt = f"{prompt}, {size}x{size} pixels"

    client = genai.Client(api_key=api_key)

    response = client.models.generate_content(
        model=model,
        contents=[sized_prompt],
        config=types.GenerateContentConfig(
            response_modalities=["TEXT", "IMAGE"],
        ),
    )

    # 确定输出路径
    if output_path is None:
        output_dir = os.path.join(os.path.dirname(__file__), "../../generated_imgs")
        os.makedirs(output_dir, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = os.path.join(output_dir, f"generated_{timestamp}.png")

    # 处理响应
    for part in response.parts:
        if part.text is not None:
            print(f"模型回复: {part.text}")
        elif part.inline_data is not None:
            image = part.as_image()
            image.save(output_path)
            print(f"图片已保存至: {output_path}")
            return output_path

    return None


def main():
    parser = argparse.ArgumentParser(description="使用 Gemini 生成图片")
    parser.add_argument("prompt", type=str, help="图片生成提示词")
    parser.add_argument("-o", "--output", type=str, default=None, help="输出文件路径")
    parser.add_argument("-s", "--size", type=int, default=1024, help="图片尺寸 (默认 1024)")
    parser.add_argument("-m", "--model", type=str, default="gemini-2.5-flash-image-preview",
                        help="模型名称 (默认 gemini-2.5-flash-image-preview，文字相关用 gemini-3-pro-image-preview)")

    args = parser.parse_args()

    generate_image(args.prompt, args.output, args.size, args.model)


if __name__ == "__main__":
    main()