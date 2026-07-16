# Kaggle Gallery Drop Folder

Extract `kaggle_face_gallery.zip` here so this directory contains:

```text
metadata.json
face_000001.png
face_000002.png
...
```

When `metadata.json` exists, `/api/generate-face` uses this gallery before the local CGAN fallback.
