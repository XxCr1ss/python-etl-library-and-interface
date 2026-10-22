"""Versioned authenticated encryption. Keys stay outside the metadata database."""
import json
import os

from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException


class CredentialCipher:
    def __init__(self):
        self.version = os.getenv("CREDENTIAL_ENCRYPTION_KEY_VERSION", "v1")
        try:
            if not self.version or len(self.version) > 40:
                raise ValueError("version")
            previous = json.loads(os.getenv("CREDENTIAL_ENCRYPTION_PREVIOUS_KEYS", "{}"))
            self.keys = {name: Fernet(value.encode()) for name, value in previous.items()}
            self.keys[self.version] = Fernet(os.environ["CREDENTIAL_ENCRYPTION_KEY"].encode())
        except (KeyError, ValueError, TypeError, AttributeError):
            raise HTTPException(503, "El cifrado de credenciales no está configurado correctamente.") from None

    def encrypt(self, password: str):
        return {"encrypted_password": self.keys[self.version].encrypt(password.encode()).decode(),
                "key_version": self.version, "cipher_version": "fernet-v1"}

    def decrypt(self, secret: dict) -> str:
        try:
            if secret["cipher_version"] != "fernet-v1":
                raise ValueError("cipher")
            return self.keys[secret["key_version"]].decrypt(secret["encrypted_password"].encode()).decode()
        except (KeyError, ValueError, InvalidToken, UnicodeError, AttributeError):
            raise HTTPException(503, "No se pudo recuperar la credencial; revisa su clave de cifrado.") from None
