import hashlib


def hash_content(content: str) -> str:
    return hashlib.sha256(content.encode()).hexdigest()


def detect_change(old_hash: str, new_content: str) -> bool:
    return old_hash != hash_content(new_content)
