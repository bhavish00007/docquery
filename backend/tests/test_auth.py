from app.routes import auth


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

    def add(self, obj):
        if hasattr(obj, "id") and obj.id is None:
            obj.id = 1

    def commit(self):
        pass

    def refresh(self, obj):
        if getattr(obj, "id", None) is None:
            obj.id = 1


def test_signup_creates_user_and_returns_token(monkeypatch):
    fake_db = FakeDB()

    monkeypatch.setattr(
        auth,
        "hash_password",
        lambda password: "hashed-password",
    )

    monkeypatch.setattr(
        auth,
        "create_access_token",
        lambda data: "test-token",
    )

    request = auth.SignupRequest(
        company_name="Test Company",
        email="test@example.com",
        password="password123",
    )

    response = auth.signup(
        request=request,
        db=fake_db,
    )

    assert response["access_token"] == "test-token"
    assert response["token_type"] == "bearer"


def test_signup_rejects_duplicate_email():
    fake_user = object()
    fake_db = FakeDB(user=fake_user)

    request = auth.SignupRequest(
        company_name="Test Company",
        email="existing@example.com",
        password="password123",
    )

    try:
        auth.signup(
            request=request,
            db=fake_db,
        )
        assert False, "Expected duplicate email error"
    except Exception as exc:
        assert exc.status_code == 400
        assert exc.detail == "Email already registered"


def test_login_with_correct_password_returns_token(monkeypatch):
    class FakeUser:
        id = 10
        company_id = 20
        hashed_password = "hashed-password"

    fake_db = FakeDB(user=FakeUser())

    monkeypatch.setattr(
        auth,
        "verify_password",
        lambda password, hashed_password: True,
    )

    monkeypatch.setattr(
        auth,
        "create_access_token",
        lambda data: "login-token",
    )

    request = auth.LoginRequest(
        email="user@example.com",
        password="correct-password",
    )

    response = auth.login(
        request=request,
        db=fake_db,
    )

    assert response["access_token"] == "login-token"
    assert response["token_type"] == "bearer"


def test_login_with_wrong_password_is_rejected(monkeypatch):
    class FakeUser:
        id = 10
        company_id = 20
        hashed_password = "hashed-password"

    fake_db = FakeDB(user=FakeUser())

    monkeypatch.setattr(
        auth,
        "verify_password",
        lambda password, hashed_password: False,
    )

    request = auth.LoginRequest(
        email="user@example.com",
        password="wrong-password",
    )

    try:
        auth.login(
            request=request,
            db=fake_db,
        )
        assert False, "Expected invalid credentials error"
    except Exception as exc:
        assert exc.status_code == 401
        assert exc.detail == "Invalid email or password"