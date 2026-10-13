"""Manage encrypted secrets for the ResumeAid backend.

Usage (run from the ``backend`` directory):

    # 1. Generate a master key and put it in the environment / .env
    python scripts/manage_secrets.py keygen

    # 2. Encrypt a single value and print the "enc:..." result
    python scripts/manage_secrets.py encrypt "sk-my-secret-value"

    # 3. Encrypt every sensitive value inside .env in place
    python scripts/manage_secrets.py encrypt-env

After running ``encrypt-env`` the ``.env`` file holds only ciphertext for the
sensitive keys, while the plaintext master key lives in
``SECRET_ENCRYPTION_KEY``. Keep that master key private (never commit it).
"""
from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.crypto import MASTER_KEY_ENV, encrypt, generate_key, is_encrypted  # noqa: E402

# Environment keys that should be encrypted by ``encrypt-env``.
SENSITIVE_KEYS = (
    "GEMINI_API_KEY",
    "OPENAI_API_KEY",
    "GROQ_API_KEY",
    "JWT_SECRET",
    "SMTP_PASSWORD",
    "DATABASE_URL",
)

LINE_RE = re.compile(r"^(\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*)(.*)$")


def _read_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for line in path.read_text(encoding="utf-8").splitlines():
        match = LINE_RE.match(line)
        if match:
            values[match.group(2)] = match.group(3).strip().strip('"').strip("'")
    return values


def _resolve_master_key(env_values: dict[str, str]) -> str:
    key = env_values.get(MASTER_KEY_ENV) or os.environ.get(MASTER_KEY_ENV, "")
    return key.strip()


def cmd_keygen(_: argparse.Namespace) -> int:
    key = generate_key()
    print(key)
    print(
        f"\nAdd this to your environment (or .env) as:\n  {MASTER_KEY_ENV}={key}\n"
        "Keep it private - it is the only value that can decrypt your secrets.",
        file=sys.stderr,
    )
    return 0


def cmd_encrypt(args: argparse.Namespace) -> int:
    env_values = _read_env_file(Path(args.file))
    master_key = _resolve_master_key(env_values)
    if not master_key:
        print(
            f"error: {MASTER_KEY_ENV} is not set (checked {args.file} and the environment).\n"
            "Run `python scripts/manage_secrets.py keygen` first.",
            file=sys.stderr,
        )
        return 2
    print(encrypt(args.value, master_key))
    return 0


def cmd_encrypt_env(args: argparse.Namespace) -> int:
    path = Path(args.file)
    if not path.exists():
        print(f"error: {path} not found.", file=sys.stderr)
        return 2

    lines = path.read_text(encoding="utf-8").splitlines()
    env_values = _read_env_file(path)
    master_key = _resolve_master_key(env_values)
    generated = False
    if not master_key:
        master_key = generate_key()
        generated = True
        print(f"Generated a new {MASTER_KEY_ENV}.", file=sys.stderr)

    out: list[str] = []
    encrypted_count = 0
    master_seen = False
    for line in lines:
        match = LINE_RE.match(line)
        if not match:
            out.append(line)
            continue
        key, value = match.group(2), match.group(3).strip().strip('"').strip("'")
        if key == MASTER_KEY_ENV:
            out.append(f"{MASTER_KEY_ENV}={master_key}")
            master_seen = True
            continue
        if key in SENSITIVE_KEYS and value and not is_encrypted(value):
            out.append(f"{key}={encrypt(value, master_key)}")
            encrypted_count += 1
            continue
        out.append(line)

    if not master_seen:
        out.insert(0, f"{MASTER_KEY_ENV}={master_key}")

    path.write_text("\n".join(out) + "\n", encoding="utf-8")
    print(f"Encrypted {encrypted_count} value(s) in {path}.", file=sys.stderr)
    if generated:
        print(
            f"  {MASTER_KEY_ENV} was written to {path} as well. Move it to your "
            "deployment environment's secret store before sharing the file.",
            file=sys.stderr,
        )
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Manage encrypted ResumeAid secrets.")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("keygen", help="Print a new master key.").set_defaults(func=cmd_keygen)

    p_enc = sub.add_parser("encrypt", help="Encrypt a single value.")
    p_enc.add_argument("value")
    p_enc.add_argument("--file", default=".env", help="Optional .env to read the master key from.")
    p_enc.set_defaults(func=cmd_encrypt)

    p_env = sub.add_parser("encrypt-env", help="Encrypt sensitive values in .env in place.")
    p_env.add_argument("--file", default=".env")
    p_env.set_defaults(func=cmd_encrypt_env)

    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
