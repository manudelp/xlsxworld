"""Per-file envelope encryption using AES-256-GCM.

Each file is encrypted with a random data encryption key (DEK). The DEK
is then encrypted with the application's master key (KEK) and stored
alongside the job metadata. This ensures files at rest in object storage
are unreadable without access to both the database row and the KEK.
"""

from __future__ import annotations

import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import get_settings

# KEK must be exactly 32 bytes (256 bits) for AES-256.
_KEK_BYTES = 32


def _get_kek() -> bytes:
    """Load the master key-encryption-key from settings."""
    settings = get_settings()
    raw = settings.file_encryption_key
    if not raw:
        raise RuntimeError("FILE_ENCRYPTION_KEY is not configured")
    key = bytes.fromhex(raw)
    if len(key) != _KEK_BYTES:
        raise RuntimeError("FILE_ENCRYPTION_KEY must be 64 hex chars (32 bytes)")
    return key


def encrypt_file(plaintext: bytes) -> tuple[bytes, bytes]:
    """Encrypt file content with a fresh DEK.

    Returns:
        (ciphertext, encrypted_dek_blob)

    The encrypted_dek_blob contains: dek_nonce (12) + encrypted_dek (48) + file_nonce (12)
    Total blob: 72 bytes.
    """
    # Generate a random DEK
    dek = AESGCM.generate_key(bit_length=256)
    file_nonce = os.urandom(12)

    # Encrypt the file with the DEK
    file_cipher = AESGCM(dek)
    ciphertext = file_cipher.encrypt(file_nonce, plaintext, None)

    # Encrypt the DEK with the KEK
    kek = _get_kek()
    dek_nonce = os.urandom(12)
    kek_cipher = AESGCM(kek)
    encrypted_dek = kek_cipher.encrypt(dek_nonce, dek, None)

    # Pack: dek_nonce + encrypted_dek + file_nonce
    blob = dek_nonce + encrypted_dek + file_nonce
    return ciphertext, blob


def decrypt_file(ciphertext: bytes, encrypted_dek_blob: bytes) -> bytes:
    """Decrypt file content using the encrypted DEK blob.

    Args:
        ciphertext: The encrypted file bytes from storage.
        encrypted_dek_blob: The 72-byte blob from the database row.
    """
    # Unpack blob
    dek_nonce = encrypted_dek_blob[:12]
    encrypted_dek = encrypted_dek_blob[12:60]
    file_nonce = encrypted_dek_blob[60:72]

    # Decrypt the DEK with the KEK
    kek = _get_kek()
    kek_cipher = AESGCM(kek)
    dek = kek_cipher.decrypt(dek_nonce, encrypted_dek, None)

    # Decrypt the file with the DEK
    file_cipher = AESGCM(dek)
    return file_cipher.decrypt(file_nonce, ciphertext, None)
