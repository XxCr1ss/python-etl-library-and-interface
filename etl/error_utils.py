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
    message = str(error)
    # Remove the entire URL, including URLs with masked passwords.
    message = re.sub(r"\b[a-zA-Z][a-zA-Z0-9+.-]*://[^\s'\"<>]+", "[conexión omitida]", message)
    for secret in sorted(secrets, key=len, reverse=True):
        message = message.replace(secret, "[contraseña omitida]")
    return message
