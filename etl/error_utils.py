"""Redact connection secrets before public responses or diagnostic messages."""
import re
from urllib.parse import quote, quote_plus


def public_error(error, payload=None):
    secrets = set()

    def collect(value):
        if isinstance(value, dict):
            for key, item in value.items():
                if key == "password" and isinstance(item, str) and item:
                    secrets.update((item, quote(item, safe=""), quote_plus(item)))
                else:
                    collect(item)
        elif isinstance(value, (list, tuple)):
            for item in value:
                collect(item)

    collect(payload)
    if isinstance(error, UnicodeDecodeError) and isinstance(getattr(error, "object", None), bytes):
        for enc in ("cp1252", "iso-8859-1", "latin-1", "utf-8"):
            try:
                message = error.object.decode(enc)
                break
            except Exception:
                pass
        else:
            message = error.object.decode("latin-1", errors="replace")
    else:
        message = str(error)
    # Remove the entire URL, including URLs with masked passwords.
    message = re.sub(r"\b[a-zA-Z][a-zA-Z0-9+.-]*://[^\s'\"<>]+", "[conexión omitida]", message)
    for secret in sorted(secrets, key=len, reverse=True):
        message = message.replace(secret, "[contraseña omitida]")
    return message
