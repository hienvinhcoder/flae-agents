from unittest.mock import MagicMock

from app.services.storage import gcs


def test_storage_client_uses_owner_credentials_for_emulator(monkeypatch):
    client = MagicMock()
    client_factory = MagicMock(return_value=client)
    monkeypatch.setenv("STORAGE_EMULATOR_HOST", "http://firebase-emulator:9199")
    monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "flae-agents")
    monkeypatch.setattr(gcs.storage, "Client", client_factory)
    monkeypatch.setattr(gcs, "_storage_client", None)

    assert gcs._get_client() is client

    client_factory.assert_called_once()
    kwargs = client_factory.call_args.kwargs
    assert kwargs["project"] == "flae-agents"
    assert kwargs["credentials"].token == "owner"


def test_storage_client_keeps_default_credentials_outside_emulator(monkeypatch):
    client = MagicMock()
    client_factory = MagicMock(return_value=client)
    monkeypatch.delenv("STORAGE_EMULATOR_HOST", raising=False)
    monkeypatch.setattr(gcs.storage, "Client", client_factory)
    monkeypatch.setattr(gcs, "_storage_client", None)

    assert gcs._get_client() is client

    client_factory.assert_called_once_with()
