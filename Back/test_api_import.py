import importlib
import sys


def main() -> None:
    importlib.import_module("api.main")
    assert "torch" not in sys.modules, "torch se importó durante el arranque de la API"
    assert "whisper" not in sys.modules, "whisper se importó durante el arranque de la API"
    assert "mlx_whisper" not in sys.modules, "mlx_whisper se importó durante el arranque de la API"
    print("✅ OK: api.main se importa sin cargar Torch/Whisper/MLX en el arranque.")


if __name__ == "__main__":
    main()
