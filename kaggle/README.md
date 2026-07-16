# Kaggle Face Gallery Workflow

Use Kaggle as a temporary GPU worker. Do not depend on a live Kaggle notebook from the local Express API.

## Kaggle Steps

1. Create a Kaggle Notebook with GPU enabled.
2. Upload or copy `generate_stylegan_gallery.py` into the notebook.
3. Run:

```bash
python generate_stylegan_gallery.py --count 64 --out-dir /kaggle/working/kaggle_face_gallery
```

4. Download `/kaggle/working/kaggle_face_gallery.zip`.

## Local Project Steps

Extract the zip here:

```text
backend/generated_faces/kaggle/
  metadata.json
  face_000001.png
  face_000002.png
  ...
```

Then start the backend. `/api/generate-face` will use this gallery first. If the gallery is missing, it falls back to the current local CGAN checkpoint path.

## Metadata Format

`metadata.json` must be an array:

```json
[
  {
    "file": "face_000001.png",
    "traits": {
      "sex": "male",
      "hairColor": "black",
      "eyeColor": "brown",
      "skinTone": "medium",
      "noseStructure": "broad",
      "lipStructure": "full",
      "cheekboneStructure": "high",
      "eyebrowDistance": "wide"
    }
  }
]
```

The starter script writes `"unknown"` traits. For best matching, label the generated faces manually or extend the Kaggle notebook with attribute classifiers/editors.
