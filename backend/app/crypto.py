"""Transparent at-rest encryption for sensitive settings.

Any sensitive environment value (API keys, JWT secret, database URL, SMTP
password) can be stored as ciphertext instead of plaintext. Encrypted values
are prefixed with ``enc:`` and hold a Fernet token. The single master key used
to decrypt them lives in ``SECRET_ENCRYPTION_KEY`` and is the only value that
must be kept private.

Because every sensitive field is preceded with ``enc:``, plaintext values keep
working exactly as before, so enabling encryption is backward compatible.
"""
from __future__ import annotations

PREFIX = "enc:"
MASTER_KEY_ENV = "SECRET_ENCRYPTION_KEY"


class DecryptionError(RuntimeError):
    """Raised when an encrypted value cannot be decrypted with the master key."""


def is_encrypted(value: object) -> bool:
    """Return True when ``value`` is a value produced by :func:`encrypt`."""
    return isinstance(value, str) and value.startswith(PREFIX)


def generate_key() -> str:
    """Generate a fresh, url-safe base64 Fernet master key."""
    from cryptography.fernet import Fernet

    return Fernet.generate_key().decode("utf-8")


def _fernet(master_key: str | None):
    from cryptography.fernet import Fernet

    key = (master_key or "").strip()
    if not key:
        raise DecryptionError(
            "An encrypted value was found but SECRET_ENCRYPTION_KEY is not set. "
            "Add your master key to the environment (see .env.example)."
        )
    try:
        return Fernet(key.encode("utf-8"))
    except (ValueError, TypeError) as exc:
        raise DecryptionError(
            "SECRET_ENCRYPTION_KEY is not a valid Fernet key. Generate one with "
            "`python scripts/manage_secrets.py keygen`."
        ) from exc


def encrypt(value: str, master_key: str) -> str:
    """Encrypt ``value`` and return the ``enc:<token>`` representation."""
    token = _fernet(master_key).encrypt(value.encode("utf-8")).decode("utf-8")
    return PREFIX + token


def decrypt(value: str, master_key: str | None) -> str:
    """Decrypt an ``enc:<token>`` value, raising :class:`DecryptionError` on failure."""
    from cryptography.fernet import InvalidToken

    if not is_encrypted(value):
        return value
    token = value[len(PREFIX):].encode("utf-8")
    try:
        return _fernet(master_key).decrypt(token).decode("utf-8")
    except InvalidToken as exc:
        raise DecryptionError(
            "Could not decrypt a secret with the configured SECRET_ENCRYPTION_KEY."
        ) from exc


def maybe_decrypt(value: object, master_key: str | None) -> object:
    """Decrypt ``value`` only when it is encrypted; otherwise return it untouched."""
    if is_encrypted(value):
        return decrypt(value, master_key)  # type: ignore[arg-type]
    return value
