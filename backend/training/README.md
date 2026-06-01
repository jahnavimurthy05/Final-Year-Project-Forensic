# Local CGAN Training

This project now uses a local CelebA conditional GAN path instead of Pollinations for face generation.

## Dataset Placement

Download CelebA from the official project page:

https://mmlab.ie.cuhk.edu.hk/projects/CelebA.html

Required files:

```text
Img/img_align_celeba.zip
Anno/list_attr_celeba.txt
```

Place/extract them like this:

```text
backend/
  data/
    raw/
      celeba/
        img_align_celeba/
          000001.jpg
          000002.jpg
          ...
        list_attr_celeba.txt
```

CelebA is available for non-commercial research use. Do not commit or redistribute the dataset files.

If you put `img_align_celeba.zip` in `backend/data/raw/celeba/`, this command can extract and validate it:

```powershell
..\.venv\Scripts\python.exe training\prepare_celeba.py --extract
```

If you already extracted the images, validate only:

```powershell
..\.venv\Scripts\python.exe training\prepare_celeba.py
```

## Train

From `backend/`:

```powershell
..\.venv\Scripts\python.exe training\train_cgan.py --epochs 20 --batch-size 64
```

For a quick smoke test after placing only a tiny subset of images, use:

```powershell
..\.venv\Scripts\python.exe training\train_cgan.py --epochs 1 --batch-size 8 --num-workers 0 --max-batches 25
```

Outputs:

```text
backend/checkpoints/generator.pth
backend/checkpoints/discriminator.pth
backend/checkpoints/cgan_config.json
backend/training/samples/
```

## Inference

```powershell
..\.venv\Scripts\python.exe inference\generate_faces.py --traits-json "{\"sex\":\"male\",\"ageRange\":\"25-35\",\"hairColor\":\"black\",\"cheekboneShape\":\"high cheekbones\",\"noseShape\":\"big nose\",\"lipShape\":\"big lips\"}"
```

The script prints the same JSON shape that the Express route returns.
