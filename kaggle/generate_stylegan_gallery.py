import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image
import torch


STYLEGAN_REPO = "https://github.com/NVlabs/stylegan2-ada-pytorch.git"
FFHQ_PICKLE = "https://nvlabs-fi-cdn.nvidia.com/stylegan2-ada-pytorch/pretrained/ffhq.pkl"


def parse_args():
    parser = argparse.ArgumentParser(description="Generate a StyleGAN2-ADA FFHQ face gallery on Kaggle.")
    parser.add_argument("--count", type=int, default=64)
    parser.add_argument("--out-dir", default="/kaggle/working/kaggle_face_gallery")
    parser.add_argument("--network", default=FFHQ_PICKLE)
    parser.add_argument("--repo-dir", default="/kaggle/working/stylegan2-ada-pytorch")
    parser.add_argument("--truncation", type=float, default=0.7)
    parser.add_argument("--seed-start", type=int, default=1)
    return parser.parse_args()


def ensure_stylegan_repo(repo_dir):
    repo_dir = Path(repo_dir)
    if repo_dir.exists():
        return repo_dir

    subprocess.check_call(["git", "clone", STYLEGAN_REPO, str(repo_dir)])
    return repo_dir


def main():
    args = parse_args()
    repo_dir = ensure_stylegan_repo(args.repo_dir)
    sys.path.insert(0, str(repo_dir))

    import dnnlib
    import legacy

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    with dnnlib.util.open_url(args.network) as file:
        generator = legacy.load_network_pkl(file)["G_ema"].to(device)

    metadata = []
    label = torch.zeros([1, generator.c_dim], device=device)

    for index in range(args.count):
        seed = args.seed_start + index
        rng = np.random.RandomState(seed)
        z = torch.from_numpy(rng.randn(1, generator.z_dim)).to(device)

        with torch.no_grad():
            image = generator(z, label, truncation_psi=args.truncation, noise_mode="const")

        image = (image * 127.5 + 128).clamp(0, 255).to(torch.uint8)
        image = image[0].permute(1, 2, 0).cpu().numpy()

        file_name = f"face_{index + 1:06d}.png"
        Image.fromarray(image, "RGB").save(out_dir / file_name)
        metadata.append(
            {
                "file": file_name,
                "seed": seed,
                "model": "stylegan2-ada-ffhq",
                "traits": {
                    "sex": "unknown",
                    "hairColor": "unknown",
                    "eyeColor": "unknown",
                    "skinTone": "unknown",
                    "noseStructure": "unknown",
                    "lipStructure": "unknown",
                    "cheekboneStructure": "unknown",
                    "eyebrowDistance": "unknown",
                },
            }
        )

    (out_dir / "metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    archive_base = shutil.make_archive(str(out_dir), "zip", out_dir)
    print(f"Generated {len(metadata)} faces in {out_dir}")
    print(f"Download archive: {archive_base}")


if __name__ == "__main__":
    os.environ.setdefault("TORCH_CUDA_ARCH_LIST", "")
    main()
