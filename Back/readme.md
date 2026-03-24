# Bee-Scribe Backend

## Setup (Mac/Linux)
```bash
python3 -m venv venv
source ./venv/bin/activate
pip install -r requirements.txt
```

## Running
```bash
source ./venv/bin/activate
uvicorn api.main:app --reload
```