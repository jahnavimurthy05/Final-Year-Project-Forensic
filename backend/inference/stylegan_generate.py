import argparse
import base64
import importlib.util
import io
import json
import sys
from pathlib import Path

import numpy as np
import torch
from PIL import Image


def parse_args():
    parser = argparse.ArgumentParser(description="Generate StyleGAN2-ADA FFHQ face variations.")
    parser.add_argument("--traits-json", required=True)
    parser.add_argument("--network", required=True)
    parser.add_argument("--stylegan-repo", required=True)
    parser.add_argument("--directions-dir", default="")
    parser.add_argument("--count", type=int, default=4)
    parser.add_argument("--truncation", type=float, default=0.7)
    parser.add_argument("--seed", type=int, default=1)
    parser.add_argument("--device", default="auto", choices=["auto", "cpu", "cuda"])
    return parser.parse_args()


def configured(args):
    repo = Path(args.stylegan_repo)
    network = Path(args.network)
    if not repo.exists():
        return False, f"StyleGAN2-ADA repo not found: {repo}"
    if not network.exists():
        return False, f"StyleGAN2-ADA FFHQ network pickle not found: {network}"
    if not (repo / "legacy.py").exists():
        return False, f"StyleGAN2-ADA repo is missing legacy.py: {repo}"
    return True, ""


def tensor_to_data_url(tensor):
    image = (tensor * 127.5 + 128).clamp(0, 255).to(torch.uint8)
    image = image[0].permute(1, 2, 0).cpu().numpy()
    pil_image = Image.fromarray(image, "RGB")
    buffer = io.BytesIO()
    pil_image.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{encoded}"


def direction_strengths(traits):
    hair = str(traits.get("hairColor", "")).lower()
    sex = str(traits.get("sex", "")).lower()
    age = str(traits.get("ageRange", "")).lower()
    skin = str(traits.get("skinTone", "")).lower()

    strengths = {}
    if sex in {"male", "female"}:
        strengths["gender"] = 1.0 if sex == "male" else -1.0
    if age:
        strengths["age"] = -0.6 if age in {"young", "13-19", "20-24"} else 0.4
    if hair in {"black", "brown", "blonde", "blond", "red"}:
        strengths[f"hair_{'blonde' if hair == 'blond' else hair}"] = 0.8
    if skin in {"fair", "medium", "olive", "brown", "dark"}:
        strengths[f"skin_{skin}"] = 0.5
    return strengths


def apply_latent_edits(w, traits, directions_dir):
    if not directions_dir:
        return w, []

    directions_path = Path(directions_dir)
    if not directions_path.exists():
        return w, []

    applied = []
    for name, strength in direction_strengths(traits).items():
        direction_path = directions_path / f"{name}.npy"
        if not direction_path.exists():
            continue

        direction = torch.from_numpy(np.load(direction_path)).to(device=w.device, dtype=w.dtype)
        while direction.ndim < w.ndim:
            direction = direction.unsqueeze(0)
        w = w + direction * strength
        applied.append({"direction": name, "strength": strength})

    return w, applied


def main():
    args = parse_args()
    ok, message = configured(args)
    if not ok:
        print(
            json.dumps(
                {
                    "status": "not_configured",
                    "error": message,
                    "metadata": {"model": "stylegan2-ada-ffhq"},
                }
            )
        )
        sys.exit(3)

    sys.path.insert(0, str(Path(args.stylegan_repo).resolve()))
    if importlib.util.find_spec("dnnlib") is None:
        print(json.dumps({"status": "error", "error": "Unable to import dnnlib from StyleGAN repo."}))
        sys.exit(2)

    import dnnlib
    import legacy

    traits = json.loads(args.traits_json)
    if args.device == "auto":
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    else:
        device = torch.device(args.device)

    with dnnlib.util.open_url(str(Path(args.network).resolve())) as file:
        generator = legacy.load_network_pkl(file)["G_ema"].to(device)

    label = torch.zeros([1, generator.c_dim], device=device)
    variations = []
    edit_metadata = []

    for index in range(args.count):
        rng = np.random.RandomState(args.seed + index)
        z = torch.from_numpy(rng.randn(1, generator.z_dim)).to(device)

        with torch.no_grad():
            w = generator.mapping(z, label, truncation_psi=args.truncation)
            w, applied = apply_latent_edits(w, traits, args.directions_dir)
            image = generator.synthesis(w, noise_mode="const")

        variations.append(tensor_to_data_url(image))
        edit_metadata.append({"seed": args.seed + index, "latentEdits": applied})

    print(
        json.dumps(
            {
                "status": "success",
                "variations": variations,
                "metadata": {
                    "traits_used": traits,
                    "model": "stylegan2-ada-ffhq",
                    "truncation": args.truncation,
                    "edits": edit_metadata,
                },
            }
        )
    )


if __name__ == "__main__":
    main()
