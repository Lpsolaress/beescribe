import mlx_whisper
import os

def test_models():
    print("Methods in mlx_whisper:", dir(mlx_whisper))
    # Test if load_models exists or load_model
    try:
        # Check signature or help
        import inspect
        if "load_models" in dir(mlx_whisper):
            print("load_models signature:", inspect.signature(mlx_whisper.load_models))
        if "load_model" in dir(mlx_whisper):
            print("load_model signature:", inspect.signature(mlx_whisper.load_model))
        print("transcribe signature:", inspect.signature(mlx_whisper.transcribe))
    except Exception as e:
        print("Error getting signatures:", e)

if __name__ == "__main__":
    test_models()
