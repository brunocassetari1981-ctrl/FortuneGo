#!/usr/bin/env python3
"""
Gera app/src/main/assets/img/manifest.json com o inventário real de imagens.

O fortune-enhance.js usa esse índice para casar caminhos errados do HTML com os
arquivos que existem de verdade. O build Gradle já roda isso automaticamente
(task generateAssetManifest); este script serve para rodar à mão:

    python3 tools/gen-asset-manifest.py
"""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
ASSETS = ROOT / "app" / "src" / "main" / "assets"
EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".avif", ".bmp"}


def main() -> int:
    if not ASSETS.is_dir():
        print(f"pasta de assets não encontrada: {ASSETS}", file=sys.stderr)
        return 1

    files = sorted(
        p.relative_to(ASSETS).as_posix()
        for p in ASSETS.rglob("*")
        if p.is_file() and p.suffix.lower() in EXTS
    )

    target = ASSETS / "img" / "manifest.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(files, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"{len(files)} imagens indexadas em {target.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
