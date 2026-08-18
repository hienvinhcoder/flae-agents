import re

def clean_entity_name(name: str) -> str:
    if not name:
        return ""
    # Strip whitespace, newlines, tabs, and wrapping single/double quotes
    cleaned = name.strip().strip('"').strip("'").strip()
    # Replace multiple spaces (including newlines and tabs) with a single space
    cleaned = re.sub(r'\s+', ' ', cleaned)
    return cleaned
