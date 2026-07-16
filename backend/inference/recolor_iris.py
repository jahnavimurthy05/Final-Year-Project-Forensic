import base64
import io
import json
import sys

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageStat


EYE_COLORS = {
    "brown": (92, 55, 28),
    "dark brown": (62, 38, 22),
    "blue": (70, 125, 180),
    "green": (75, 135, 85),
    "hazel": (128, 100, 52),
    "gray": (110, 125, 135),
    "grey": (110, 125, 135),
}


def parse_data_url(data_url):
    if "," not in data_url:
        raise ValueError("Expected image data URL.")

    header, encoded = data_url.split(",", 1)
    image = Image.open(io.BytesIO(base64.b64decode(encoded))).convert("RGB")
    return image


def to_data_url(image):
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{encoded}"


def ellipse_mask(size, box, fill=255):
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse(box, fill=fill)
    return mask


def dark_pixel_mask(region):
    grayscale = region.convert("L")
    stat = ImageStat.Stat(grayscale)
    threshold = max(35, min(95, int(stat.mean[0] * 0.72)))
    return grayscale.point(lambda value: 255 if value <= threshold else 0)


def recolor_eye_region(image, center, radius_x, radius_y, color):
    width, height = image.size
    cx, cy = center
    box = (
        max(0, cx - radius_x),
        max(0, cy - radius_y),
        min(width, cx + radius_x),
        min(height, cy + radius_y),
    )
    if box[2] <= box[0] or box[3] <= box[1]:
        return image

    region = image.crop(box)
    local_size = region.size
    iris_shape = ellipse_mask(
        local_size,
        (
            int(local_size[0] * 0.18),
            int(local_size[1] * 0.08),
            int(local_size[0] * 0.82),
            int(local_size[1] * 0.92),
        ),
    )
    iris_pixels = ImageChops.multiply(iris_shape, dark_pixel_mask(region))
    iris_pixels = iris_pixels.filter(ImageFilter.GaussianBlur(radius=max(1, int(radius_x * 0.12))))

    color_layer = Image.new("RGB", local_size, color)
    blended = Image.blend(region, color_layer, 0.46)

    highlights = region.convert("L").point(lambda value: 255 if value >= 175 else 0)
    final_mask = ImageChops.subtract(iris_pixels, highlights.filter(ImageFilter.GaussianBlur(1)))

    output = image.copy()
    output.paste(blended, box, final_mask)
    return output


def recolor_iris(image, eye_color):
    color = EYE_COLORS.get(str(eye_color).strip().lower())
    if not color:
        return image

    width, height = image.size

    # Approximate iris positions for aligned, front-facing FFHQ/StyleGAN portraits.
    # The local dark-pixel mask keeps recoloring inside the iris/pupil area when possible.
    iris_radius_x = max(4, int(width * 0.034))
    iris_radius_y = max(3, int(height * 0.026))
    centers = [
        (int(width * 0.375), int(height * 0.43)),
        (int(width * 0.625), int(height * 0.43)),
    ]

    output = ImageEnhance.Color(image).enhance(1.02)
    for center in centers:
        output = recolor_eye_region(output, center, iris_radius_x, iris_radius_y, color)

    return output


def main():
    try:
        payload = json.load(sys.stdin)
        eye_color = payload.get("eyeColor") or payload.get("eye_color")
        variations = payload.get("variations") or []

        processed = [to_data_url(recolor_iris(parse_data_url(item), eye_color)) for item in variations]
        print(
            json.dumps(
                {
                    "status": "success",
                    "variations": processed,
                    "metadata": {
                        "method": "aligned-eye-dark-pixel-mask",
                        "eyeColor": eye_color,
                    },
                }
            )
        )
    except Exception as error:
        print(json.dumps({"status": "error", "error": str(error)}))
        sys.exit(2)


if __name__ == "__main__":
    main()
