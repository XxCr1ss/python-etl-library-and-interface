"""Redact connection secrets before public responses or diagnostic messages."""
import re
from urllib.parse import quote, quote_plus


def decode_error_bytes(raw):
    """Decode Windows driver diagnostics with the historical encoding preference."""
    try:
        return raw.decode("cp1252")
    except UnicodeDecodeError:
        # Latin-1 maps every byte, including the undefined Windows-1252 values.
        return raw.decode("latin-1")


def public_error(error, payload=None):
    secrets = set()

    def collect(value):
        if isinstance(value, dict):
            for key, item in value.items():
                if key in {"password", "pair_token"} and isinstance(item, str) and item:
                    secrets.update((item, quote(item, safe=""), quote_plus(item)))
                else:
                    collect(item)
        elif isinstance(value, (list, tuple)):
            for item in value:
                collect(item)

    collect(payload)
    if isinstance(error, UnicodeDecodeError) and isinstance(getattr(error, "object", None), bytes):
        message = decode_error_bytes(error.object)
    else:
        message = str(error)
    # Remove the entire URL, including URLs with masked passwords.
    message = re.sub(r"\b[a-zA-Z][a-zA-Z0-9+.-]*://[^\s'\"<>]+", "[conexión omitida]", message)
    for secret in sorted(secrets, key=len, reverse=True):
        message = message.replace(secret, "[contraseña omitida]")
    return message
