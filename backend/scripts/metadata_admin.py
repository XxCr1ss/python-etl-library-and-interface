"""Operator tool: dry-run by default, no credentials/ciphertexts in stdout."""
import argparse
import asyncio
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fastapi import HTTPException
from services.crypto_service import CredentialCipher
from services.supabase_service import gateway


async def run(args):
    if args.operation == "maintenance":
        return await gateway().rpc("etl_metadata_maintenance", {"p_apply": args.apply, "p_retention_days": args.retention_days})
    version = os.getenv("CREDENTIAL_ENCRYPTION_KEY_VERSION", "v1")
    cipher = CredentialCipher() if args.apply else None
    after = None
    examined = rotated = conflicts = 0
    while True:
        rows = await gateway().rpc("etl_rotation_batch", {"p_active_version": version, "p_after": after, "p_limit": 100})
        if not rows:
            break
        for row in rows:
            examined += 1
            if cipher:
                encrypted = cipher.encrypt(cipher.decrypt(row))
                try:
                    await gateway().rpc("etl_rotate_secret", {"p_user_id": row["user_id"], "p_connection_id": row["connection_id"],
                        "p_version": row["connection_version"], "p_old_key_version": row["key_version"], "p_secret": encrypted})
                    rotated += 1
                except HTTPException as exc:
                    if exc.status_code != 409:
                        raise
                    conflicts += 1  # Never overwrite a concurrently edited credential.
        after = rows[-1]["connection_id"]
    return {"applied": args.apply, "examined": examined, "rotated": rotated, "concurrent_changes": conflicts}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("operation", choices=["maintenance", "rotate"])
    parser.add_argument("--apply", action="store_true", help="Apply changes to the configured environment (default: dry-run).")
    parser.add_argument("--retention-days", type=int, default=90)
    args = parser.parse_args()
    try:
        print(json.dumps(asyncio.run(run(args))))
    except HTTPException as exc:
        print("Metadata operation failed; verify environment, migrations and key versions.", file=sys.stderr)
        raise SystemExit(1) from None


if __name__ == "__main__":
    main()
