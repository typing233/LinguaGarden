import base64
import json
import mimetypes

import anthropic

from app.config import settings


class VisionService:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    def process_image(self, image_path: str, user_language: str = "en") -> dict:
        with open(image_path, "rb") as f:
            image_data = base64.standard_b64encode(f.read()).decode("utf-8")

        mime_type, _ = mimetypes.guess_type(image_path)
        if mime_type not in ("image/jpeg", "image/png", "image/webp", "image/gif"):
            mime_type = "image/jpeg"

        prompt = (
            "Describe this image in 2-3 sentences. "
            "Then extract 5-10 useful vocabulary words visible or strongly associated with this image. "
            "For each word, provide: the English word, Chinese translation, and a brief definition. "
            "Return ONLY valid JSON in this format: "
            '{"description": "...", "words": [{"word": "...", "translation": "...", "definition": "..."}]}'
        )

        message = self.client.messages.create(
            model="claude-sonnet-4-20250514",
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

        response_text = message.content[0].text
        # Try to extract JSON from the response
        try:
            result = json.loads(response_text)
        except json.JSONDecodeError:
            # Try to find JSON in the response
            start = response_text.find("{")
            end = response_text.rfind("}") + 1
            if start != -1 and end > start:
                result = json.loads(response_text[start:end])
            else:
                result = {"description": response_text, "words": []}

        return result


vision_service = VisionService()
