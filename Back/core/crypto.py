import base64
import os
from typing import Optional, Union

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

ENC_PREFIX = "enc:v1:"
AAD = b"beescribe:v1"


def _read_master_key() -> Optional[bytes]:
    key_b64 = os.getenv("ENCRYPTION_MASTER_KEY", "").strip()
    if not key_b64:
        return None
    try:
        key = base64.urlsafe_b64decode(key_b64.encode("utf-8"))
    except Exception as exc:
        raise ValueError("ENCRYPTION_MASTER_KEY inválida (base64)") from exc
    if len(key) != 32:
        raise ValueError("ENCRYPTION_MASTER_KEY debe decodificar a 32 bytes")
    return key


def encryption_enabled() -> bool:
    env_val = os.getenv("ENCRYPTION_ENABLED", "False").strip().lower()
    return env_val in {"true", "1", "yes", "y"}


def encrypt_str(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    if not encryption_enabled():
        return value

    master_key = _read_master_key()
    if master_key is None:
        return value

    aesgcm = AESGCM(master_key)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, value.encode("utf-8"), AAD)
    token = base64.urlsafe_b64encode(nonce + ciphertext).decode("utf-8")
    return f"{ENC_PREFIX}{token}"


def decrypt_str(value: Optional[Union[str, bytes]]) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, bytes):
        value = value.decode("utf-8", errors="ignore")
    if not isinstance(value, str):
        return str(value)
    if not value.startswith(ENC_PREFIX):
        return value

    master_key = _read_master_key()
    if master_key is None:
        return value

    token = value[len(ENC_PREFIX) :]
    payload = base64.urlsafe_b64decode(token.encode("utf-8"))
    if len(payload) < 13:
        raise ValueError("Payload cifrado inválido")
    nonce = payload[:12]
    ciphertext = payload[12:]
    aesgcm = AESGCM(master_key)
    plaintext = aesgcm.decrypt(nonce, ciphertext, AAD)
    return plaintext.decode("utf-8")
