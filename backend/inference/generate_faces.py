import argparse
import base64
import io
import json
import sys
from pathlib import Path

import torch
from PIL import Image

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from ai_models.cgan import CELEBA_CONDITION_DIM, Generator, encode_celeba_traits


def parse_args():
    parser = argparse.ArgumentParser(description="Generate faces from a trained CelebA CGAN.")
    parser.add_argument("--traits-json", required=True)
    parser.add_argument("--checkpoint", default=str(ROOT_DIR / "checkpoints" / "generator.pth"))
    parser.add_argument("--config", default=str(ROOT_DIR / "checkpoints" / "cgan_config.json"))
    parser.add_argument("--count", type=int, default=4)
    parser.add_argument("--device", default="auto", choices=["auto", "cpu", "cuda"])
    return parser.parse_args()


def tensor_to_data_url(tensor):
    image = tensor.detach().cpu().clamp(-1, 1)
    image = ((image + 1) / 2 * 255).byte()
    image = image.permute(1, 2, 0).numpy()
    pil_image = Image.fromarray(image)

    buffer = io.BytesIO()
    pil_image.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{encoded}"


def main():
    args = parse_args()
    checkpoint = Path(args.checkpoint)
    config_path = Path(args.config)

    if not checkpoint.exists():
        print(json.dumps({"error": f"Missing trained generator checkpoint: {checkpoint}"}))
        sys.exit(2)

    config = {
        "latent_dim": 100,
        "condition_dim": CELEBA_CONDITION_DIM,
        "image_size": 64,
    }
    if config_path.exists():
        config.update(json.loads(config_path.read_text(encoding="utf-8")))

    if args.device == "auto":
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    else:
        device = torch.device(args.device)

    traits = json.loads(args.traits_json)
    generator = Generator(
        latent_dim=config["latent_dim"],
        condition_dim=config["condition_dim"],
        image_size=config["image_size"],
    ).to(device)
    generator.load_state_dict(torch.load(checkpoint, map_location=device))
    generator.eval()

    condition = encode_celeba_traits(traits, device=device).repeat(args.count, 1)
    noise = torch.randn(args.count, config["latent_dim"], device=device)

    with torch.no_grad():
        images = generator(noise, condition)

    print(
        json.dumps(
            {
                "status": "success",
                "variations": [tensor_to_data_url(image) for image in images],
                "metadata": {
                    "traits_used": traits,
                    "model": "celeba-cgan",
                    "condition_dim": config["condition_dim"],
                },
            }
        )
    )


if __name__ == "__main__":
    main()
