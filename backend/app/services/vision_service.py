import base64
import json
import mimetypes

import anthropic

from app.config import settings


class VisionService:
    def __init__(self):
        if not settings.anthropic_api_key:
            raise RuntimeError("ANTHROPIC_API_KEY is not configured")
        kwargs = {"api_key": settings.anthropic_api_key}
        if settings.anthropic_base_url:
            kwargs["base_url"] = settings.anthropic_base_url
        self.client = anthropic.Anthropic(**kwargs)
        self.model = settings.anthropic_model or "claude-sonnet-4-20250514"

    def process_image(self, image_path: str, user_language: str = "en") -> dict:
        with open(image_path, "rb") as f:
            image_data = base64.standard_b64encode(f.read()).decode("utf-8")

        mime_type, _ = mimetypes.guess_type(image_path)
        if mime_type not in ("image/jpeg", "image/png", "image/webp", "image/gif"):
            mime_type = "image/jpeg"

        if user_language == "zh":
            prompt = (
                "请用2-3句中文描述这张图片。"
                "然后提取5-10个与图片相关的实用英语词汇。"
                "对于每个词汇，提供：英文单词、中文翻译和简短的英文定义。"
                "只返回有效的JSON，格式如下："
                '{"description": "...", "words": [{"word": "...", "translation": "...", "definition": "..."}]}'
            )
        else:
            prompt = (
                "Describe this image in 2-3 sentences. "
                "Then extract 5-10 useful vocabulary words visible or strongly associated with this image. "
                "For each word, provide: the English word, Chinese translation, and a brief definition. "
                "Return ONLY valid JSON in this format: "
                '{"description": "...", "words": [{"word": "...", "translation": "...", "definition": "..."}]}'
            )

        message = self.client.messages.create(
            model=self.model,
            max_tokens=1500,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": mime_type,
                            "data": image_data,
                        }
                    },
                    {
                        "type": "text",
                        "text": prompt,
                    }
                ]
            }]
        )

        response_text = None
        for block in message.content:
            if block.type == "text" and block.text:
                response_text = block.text
                break
        if not response_text:
            raise RuntimeError("Vision API returned no text content")

        try:
            result = json.loads(response_text)
        except json.JSONDecodeError:
            start = response_text.find("{")
            end = response_text.rfind("}") + 1
            if start != -1 and end > start:
                result = json.loads(response_text[start:end])
            else:
                result = {"description": response_text, "words": []}

        if "words" not in result and "vocabulary" in result:
            result["words"] = [
                {"word": w, "translation": "", "definition": ""}
                if isinstance(w, str) else w
                for w in result["vocabulary"]
            ]

        return result
