# Bee-Scribe Backend

## Setup

### Mac/Linux
```bash
python3 -m venv venv
source ./venv/bin/activate
pip install -r requirements.txt
```

### Windows
```bash
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

## Running

### Mac/Linux
```bash
source ./venv/bin/activate
uvicorn api.main:app --reload
```

### Windows
```bash
.\venv\Scripts\activate
uvicorn api.main:app --reload
```