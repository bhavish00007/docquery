from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.core import deps


class FakeQuery:
    def __init__(self, user):
        self.user = user

    def filter(self, *args, **kwargs):
        return self

    def first(self):
        return self.user


class FakeDB:
    def __init__(self, user=None):
        self.user = user

    def query(self, model):
        return FakeQuery(self.user)


def make_credentials(token):
    return HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials=token,
    )


def test_get_current_user_accepts_valid_token(monkeypatch):
    class FakeUser:
        id = 10
        company_id = 20

    fake_user = FakeUser()
    fake_db = FakeDB(user=fake_user)

    monkeypatch.setattr(
        deps,
        "decode_access_token",
        lambda token: {
            "user_id": 10,
            "company_id": 20,
        },
    )

    result = deps.get_current_user(
        credentials=make_credentials("valid-token"),
        db=fake_db,
    )

    assert result is fake_user


def test_get_current_user_rejects_token_without_user_id(monkeypatch):
    fake_db = FakeDB()

    monkeypatch.setattr(
        deps,
        "decode_access_token",
        lambda token: {
            "company_id": 20,
        },
    )

    try:
        deps.get_current_user(
            credentials=make_credentials("invalid-token"),
            db=fake_db,
        )
        assert False, "Expected authentication error"
    except HTTPException as exc:
        assert exc.status_code == 401
        assert exc.detail == "Could not validate credentials"


def test_get_current_user_rejects_nonexistent_user(monkeypatch):
    fake_db = FakeDB(user=None)

    monkeypatch.setattr(
        deps,
        "decode_access_token",
        lambda token: {
            "user_id": 999,
            "company_id": 20,
        },
    )

    try:
        deps.get_current_user(
            credentials=make_credentials("valid-token"),
            db=fake_db,
        )
        assert False, "Expected authentication error"
    except HTTPException as exc:
        assert exc.status_code == 401
        assert exc.detail == "Could not validate credentials"


def test_get_current_user_rejects_invalid_token(monkeypatch):
    fake_db = FakeDB()

    def raise_decode_error(token):
        raise ValueError("Invalid token")

    monkeypatch.setattr(
        deps,
        "decode_access_token",
        raise_decode_error,
    )

    try:
        deps.get_current_user(
            credentials=make_credentials("bad-token"),
            db=fake_db,
        )
        assert False, "Expected authentication error"
    except HTTPException as exc:
        assert exc.status_code == 401
        assert exc.detail == "Could not validate credentials"