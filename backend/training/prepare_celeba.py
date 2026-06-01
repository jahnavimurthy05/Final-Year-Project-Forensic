import argparse
import sys
import zipfile
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.append(str(ROOT_DIR))

from ai_models.cgan import CELEBA_TRAITS


def parse_args():
    parser = argparse.ArgumentParser(description="Prepare and validate the local CelebA dataset.")
    parser.add_argument("--data-dir", default=str(ROOT_DIR / "data" / "raw" / "celeba"))
    parser.add_argument("--extract", action="store_true", help="Extract img_align_celeba.zip if present.")
    return parser.parse_args()


def main():
    args = parse_args()
    data_dir = Path(args.data_dir)
    image_dir = data_dir / "img_align_celeba"
    zip_path = data_dir / "img_align_celeba.zip"
    attr_path = data_dir / "list_attr_celeba.txt"

    data_dir.mkdir(parents=True, exist_ok=True)

    if args.extract and zip_path.exists() and not image_dir.exists():
        print(f"Extracting {zip_path}...")
        with zipfile.ZipFile(zip_path) as archive:
            archive.extractall(data_dir)

    problems = []
    if not attr_path.exists():
        problems.append(f"missing attribute file: {attr_path}")
    if not image_dir.exists():
        problems.append(f"missing image directory: {image_dir}")

    if problems:
        print("CelebA is not ready:")
        for problem in problems:
            print(f"- {problem}")
        print("\nExpected layout:")
        print("backend/data/raw/celeba/img_align_celeba/000001.jpg")
        print("backend/data/raw/celeba/list_attr_celeba.txt")
        sys.exit(2)

    image_count = len(list(image_dir.glob("*.jpg")))
    if image_count == 0:
        print(f"CelebA image directory exists but contains no .jpg files: {image_dir}")
        sys.exit(2)

    with attr_path.open("r", encoding="utf-8") as file:
        lines = [line.strip() for line in file if line.strip()]

    attr_names = lines[1].split()
    missing_attrs = [attr for attr in CELEBA_TRAITS if attr not in attr_names]
    if missing_attrs:
        print(f"Missing required attributes: {', '.join(missing_attrs)}")
        sys.exit(2)

    print("CelebA is ready.")
    print(f"Images found: {image_count}")
    print(f"Attribute rows: {len(lines) - 2}")
    print(f"Training traits: {', '.join(CELEBA_TRAITS)}")


if __name__ == "__main__":
    main()
