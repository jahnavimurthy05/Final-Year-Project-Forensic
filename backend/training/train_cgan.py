import argparse
import json
import sys
from pathlib import Path

import torch
import torch.nn as nn
import torch.optim as optim
from torchvision.utils import save_image
from tqdm import tqdm

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from ai_models.cgan import CELEBA_CONDITION_DIM, Discriminator, Generator, weights_init
from datasets.celeba_traits_dataset import get_celeba_dataloader


def parse_args():
    parser = argparse.ArgumentParser(description="Train a CelebA-only conditional GAN.")
    parser.add_argument("--data-dir", default=str(ROOT_DIR / "data" / "raw" / "celeba"))
    parser.add_argument("--checkpoint-dir", default=str(ROOT_DIR / "checkpoints"))
    parser.add_argument("--sample-dir", default=str(ROOT_DIR / "training" / "samples"))
    parser.add_argument("--image-size", type=int, default=64)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--latent-dim", type=int, default=100)
    parser.add_argument("--lr", type=float, default=0.0002)
    parser.add_argument("--beta1", type=float, default=0.5)
    parser.add_argument("--num-workers", type=int, default=2)
    parser.add_argument("--sample-every", type=int, default=1)
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Continue training from checkpoint-dir/training_state.pth if it exists.",
    )
    parser.add_argument(
        "--max-batches",
        type=int,
        default=0,
        help="Stop each epoch after this many batches. Use for quick smoke tests.",
    )
    return parser.parse_args()


def train():
    args = parse_args()
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    checkpoint_dir = Path(args.checkpoint_dir)
    sample_dir = Path(args.sample_dir)
    checkpoint_dir.mkdir(parents=True, exist_ok=True)
    sample_dir.mkdir(parents=True, exist_ok=True)

    dataloader = get_celeba_dataloader(
        root_dir=args.data_dir,
        batch_size=args.batch_size,
        image_size=args.image_size,
        num_workers=args.num_workers,
    )

    generator = Generator(
        latent_dim=args.latent_dim,
        condition_dim=CELEBA_CONDITION_DIM,
        image_size=args.image_size,
    ).to(device)
    discriminator = Discriminator(
        condition_dim=CELEBA_CONDITION_DIM,
        image_size=args.image_size,
    ).to(device)

    generator.apply(weights_init)
    discriminator.apply(weights_init)

    criterion = nn.BCEWithLogitsLoss()
    optimizer_g = optim.Adam(generator.parameters(), lr=args.lr, betas=(args.beta1, 0.999))
    optimizer_d = optim.Adam(discriminator.parameters(), lr=args.lr, betas=(args.beta1, 0.999))

    state_path = checkpoint_dir / "training_state.pth"
    generator_path = checkpoint_dir / "generator.pth"
    discriminator_path = checkpoint_dir / "discriminator.pth"
    start_epoch = 1
    if args.resume and state_path.exists():
        state = torch.load(state_path, map_location=device)
        generator.load_state_dict(state["generator"])
        discriminator.load_state_dict(state["discriminator"])
        optimizer_g.load_state_dict(state["optimizer_g"])
        optimizer_d.load_state_dict(state["optimizer_d"])
        start_epoch = int(state.get("epoch", 0)) + 1
        print(f"Resuming training from epoch {start_epoch}")
    elif args.resume and generator_path.exists() and discriminator_path.exists():
        generator.load_state_dict(torch.load(generator_path, map_location=device))
        discriminator.load_state_dict(torch.load(discriminator_path, map_location=device))
        print("Resuming from generator.pth and discriminator.pth without optimizer state.")
    elif args.resume:
        print(f"No resume state found at {state_path}; starting fresh.")

    fixed_noise = torch.randn(16, args.latent_dim, device=device)
    fixed_conditions = torch.zeros(16, CELEBA_CONDITION_DIM, device=device)
    fixed_conditions[:, 0] = 1.0
    fixed_conditions[:, 1] = 1.0
    fixed_conditions[:, 2] = 1.0
    fixed_conditions[:, 5] = 1.0

    config = {
        "latent_dim": args.latent_dim,
        "condition_dim": CELEBA_CONDITION_DIM,
        "image_size": args.image_size,
        "data_dir": str(Path(args.data_dir).resolve()),
    }
    (checkpoint_dir / "cgan_config.json").write_text(json.dumps(config, indent=2), encoding="utf-8")

    end_epoch = start_epoch + args.epochs - 1
    for epoch in range(start_epoch, end_epoch + 1):
        progress = tqdm(dataloader, desc=f"Epoch {epoch}/{end_epoch}", leave=False)
        last_loss_g = 0.0
        last_loss_d = 0.0

        for batch_index, (real_images, conditions) in enumerate(progress, start=1):
            real_images = real_images.to(device)
            conditions = conditions.to(device)
            batch_size = real_images.size(0)

            real_targets = torch.ones(batch_size, 1, device=device)
            fake_targets = torch.zeros(batch_size, 1, device=device)

            optimizer_d.zero_grad(set_to_none=True)
            real_logits = discriminator(real_images, conditions)
            loss_real = criterion(real_logits, real_targets)

            noise = torch.randn(batch_size, args.latent_dim, device=device)
            fake_images = generator(noise, conditions)
            fake_logits = discriminator(fake_images.detach(), conditions)
            loss_fake = criterion(fake_logits, fake_targets)

            loss_d = loss_real + loss_fake
            loss_d.backward()
            optimizer_d.step()

            optimizer_g.zero_grad(set_to_none=True)
            noise = torch.randn(batch_size, args.latent_dim, device=device)
            fake_images = generator(noise, conditions)
            fake_logits = discriminator(fake_images, conditions)
            loss_g = criterion(fake_logits, real_targets)
            loss_g.backward()
            optimizer_g.step()

            last_loss_g = loss_g.item()
            last_loss_d = loss_d.item()
            progress.set_postfix(loss_g=f"{last_loss_g:.4f}", loss_d=f"{last_loss_d:.4f}")

            if args.max_batches and batch_index >= args.max_batches:
                break

        print(f"epoch={epoch} loss_g={last_loss_g:.4f} loss_d={last_loss_d:.4f}")

        if epoch % args.sample_every == 0:
            generator.eval()
            with torch.no_grad():
                samples = generator(fixed_noise, fixed_conditions)
                save_image(samples, sample_dir / f"epoch_{epoch:03d}.png", nrow=4, normalize=True)
            generator.train()

        torch.save(generator.state_dict(), checkpoint_dir / "generator.pth")
        torch.save(discriminator.state_dict(), checkpoint_dir / "discriminator.pth")
        torch.save(
            {
                "epoch": epoch,
                "generator": generator.state_dict(),
                "discriminator": discriminator.state_dict(),
                "optimizer_g": optimizer_g.state_dict(),
                "optimizer_d": optimizer_d.state_dict(),
                "config": config,
            },
            state_path,
        )


if __name__ == "__main__":
    train()
