"""
Generate High-Resolution (1024x1024) Faces using NVIDIA StyleGAN2-ADA FFHQ Checkpoint
Pre-trained on 70,000 Flickr-Faces-HQ images.

Usage examples:
    # Generate 5 faces (seeds 1 to 5) locally:
    python generate_stylegan_faces.py --seeds 1-5 --outdir ./generated_faces

    # Generate specific seeds:
    python generate_stylegan_faces.py --seeds 42,101,2024,9999 --outdir ./generated_faces

    # Generate 100 faces starting from seed 1:
    python generate_stylegan_faces.py --count 100 --seed-start 1 --outdir ./dataset_100

    # Custom truncation (0.7 = realistic balance, 1.0 = higher diversity, 0.5 = more average faces):
    python generate_stylegan_faces.py --seeds 1-10 --truncation 0.7
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image
import torch

STYLEGAN_REPO_URL = "https://github.com/NVlabs/stylegan2-ada-pytorch.git"
FFHQ_CHECKPOINT_URL = "https://nvlabs-fi-cdn.nvidia.com/stylegan2-ada-pytorch/pretrained/ffhq.pkl"


def parse_seed_list(seeds_arg, count=None, seed_start=1):
    """Parses seeds argument which can be ranges ('1-10'), lists ('1,2,5'), or generated via count."""
    if seeds_arg:
        seeds = []
        for part in seeds_arg.split(","):
            part = part.strip()
            if "-" in part:
                start, end = part.split("-")
                seeds.extend(range(int(start), int(end) + 1))
            else:
                seeds.append(int(part))
        return seeds
    elif count is not None:
        return list(range(seed_start, seed_start + count))
    else:
        return [1]


def download_with_progress(url, dest_path):
    dest_path = Path(dest_path)
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    if dest_path.exists() and dest_path.stat().st_size > 300 * 1024 * 1024:
        print(f"[+] Found existing checkpoint: {dest_path} ({dest_path.stat().st_size / (1024*1024):.1f} MB)")
        return dest_path

    print(f"[*] Downloading pre-trained FFHQ checkpoint from:\n    {url}")
    print(f"[*] Saving to: {dest_path}")

    def report_hook(block_num, block_size, total_size):
        downloaded = block_num * block_size
        if total_size > 0:
            percent = downloaded / total_size * 100
            mb = downloaded / (1024 * 1024)
            total_mb = total_size / (1024 * 1024)
            sys.stdout.write(f"\r    -> Downloading: {mb:.1f} MB / {total_mb:.1f} MB ({percent:.1f}%)")
            sys.stdout.flush()

    urllib.request.urlretrieve(url, str(dest_path), reporthook=report_hook)
    print("\n[+] Download complete!")
    return dest_path


def ensure_stylegan_repo(repo_dir):
    repo_path = Path(repo_dir).resolve()
    if repo_path.exists() and (repo_path / "legacy.py").exists():
        return repo_path

    print(f"[*] Cloning NVIDIA StyleGAN2-ADA PyTorch repository to: {repo_path}")
    subprocess.check_call(["git", "clone", STYLEGAN_REPO_URL, str(repo_path)])
    print("[+] StyleGAN2-ADA repository ready.")
    return repo_path


def generate_faces(
    network_path,
    repo_path,
    seeds,
    outdir,
    truncation_psi=0.7,
    device_name="auto",
    noise_mode="const",
):
    repo_path = ensure_stylegan_repo(repo_path)
    sys.path.insert(0, str(repo_path))

    import dnnlib
    import legacy

    outdir = Path(outdir).resolve()
    outdir.mkdir(parents=True, exist_ok=True)

    # Determine device
    if device_name == "auto":
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    else:
        device = torch.device(device_name)

    print(f"[*] Using compute device: {device}")
    if device.type == "cpu":
        print("    [!] WARNING: Running on CPU. High-resolution (1024x1024) generation will take ~1-2 min per face.")
        print("    [!] TIP: For large batches (100+ faces), run on Google Colab or Kaggle with a free GPU.")

    # Load generator network
    print(f"[*] Loading StyleGAN2-ADA FFHQ generator...")
    with dnnlib.util.open_url(str(network_path)) as f:
        network_dict = legacy.load_network_pkl(f)
        G = network_dict["G_ema"].to(device)

    # Label dimension is 0 for FFHQ unconditional model
    label = torch.zeros([1, G.c_dim], device=device)

    metadata = []
    total = len(seeds)
    print(f"[*] Generating {total} face(s) with truncation_psi={truncation_psi}...")

    for i, seed in enumerate(seeds):
        # Deterministic latent vector from seed
        rng = np.random.RandomState(seed)
        z = torch.from_numpy(rng.randn(1, G.z_dim)).to(device)

        with torch.no_grad():
            img_tensor = G(z, label, truncation_psi=truncation_psi, noise_mode=noise_mode)

        # Convert [-1, 1] tensor to [0, 255] uint8 image
        img_np = (img_tensor * 127.5 + 128).clamp(0, 255).to(torch.uint8)
        img_np = img_np[0].permute(1, 2, 0).cpu().numpy()

        img_file = outdir / f"seed_{seed:06d}.png"
        Image.fromarray(img_np, "RGB").save(img_file)

        record = {
            "file": img_file.name,
            "seed": seed,
            "resolution": "1024x1024",
            "truncation_psi": truncation_psi,
            "model": "NVIDIA StyleGAN2-ADA FFHQ",
        }
        metadata.append(record)
        print(f"    [{i+1}/{total}] Generated {img_file.name} (seed {seed})")

    # Save summary metadata
    meta_path = outdir / "metadata.json"
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"[+] All faces saved to: {outdir}")
    print(f"[+] Metadata written to: {meta_path}")


def main():
    parser = argparse.ArgumentParser(
        description="Generate unlimited 1024x1024 faces using NVIDIA pre-trained StyleGAN2-ADA FFHQ."
    )
    parser.add_argument("--seeds", type=str, default="", help="Seeds to generate, e.g. '1-10' or '42,100,500'")
    parser.add_argument("--count", type=int, default=5, help="Number of faces to generate (if --seeds not specified)")
    parser.add_argument("--seed-start", type=int, default=1, help="Starting seed (default: 1)")
    parser.add_argument("--truncation", type=float, default=0.7, help="Truncation psi (default: 0.7 for realistic faces)")
    parser.add_argument("--outdir", type=str, default="./generated_faces", help="Output directory for generated PNGs")
    parser.add_argument(
        "--network",
        type=str,
        default="",
        help=f"Path or URL to ffhq.pkl (default: auto-download from NVIDIA CDN)",
    )
    default_repo = (
        Path(__file__).resolve().parent / "backend" / "models" / "stylegan2-ada-pytorch"
        if (Path(__file__).resolve().parent / "backend" / "models" / "stylegan2-ada-pytorch").exists()
        else "./stylegan2-ada-pytorch"
    )
    parser.add_argument(
        "--repo-dir",
        type=str,
        default=str(default_repo),
        help="Path to cloned stylegan2-ada-pytorch repository (auto-cloned if missing)",
    )
    parser.add_argument("--device", type=str, default="auto", choices=["auto", "cuda", "cpu"])

    args = parser.parse_args()

    seeds = parse_seed_list(args.seeds, count=args.count, seed_start=args.seed_start)

    # Handle network checkpoint download
    if not args.network:
        # Default destination in local backend/checkpoints if available or ./checkpoints
        repo_root = Path(__file__).resolve().parent
        potential_cp = repo_root / "backend" / "checkpoints" / "stylegan2-ada-ffhq.pkl"
        if potential_cp.parent.exists():
            checkpoint_path = potential_cp
        else:
            checkpoint_path = repo_root / "checkpoints" / "ffhq.pkl"

        network_file = download_with_progress(FFHQ_CHECKPOINT_URL, checkpoint_path)
    else:
        network_file = args.network

    generate_faces(
        network_path=network_file,
        repo_path=args.repo_dir,
        seeds=seeds,
        outdir=args.outdir,
        truncation_psi=args.truncation,
        device_name=args.device,
    )


if __name__ == "__main__":
    main()
