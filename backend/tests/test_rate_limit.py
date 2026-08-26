from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.rate_limit import (
    RateLimitMiddleware,
    RATE_LIMITS,
)


def test_rate_limit_returns_429():
    test_path = "/test-rate-limit"

    original_limit = RATE_LIMITS.get(
        ("GET", test_path)
    )

    RATE_LIMITS[("GET", test_path)] = (2, 60)

    app = FastAPI()

    app.add_middleware(
        RateLimitMiddleware
    )

    @app.get(test_path)
    def test_endpoint():
        return {"message": "ok"}

    client = TestClient(app)

    try:
        response_1 = client.get(test_path)
        response_2 = client.get(test_path)
        response_3 = client.get(test_path)

        assert response_1.status_code == 200
        assert response_2.status_code == 200

        assert response_3.status_code == 429

        assert (
            response_3.json()["detail"]
            == "Rate limit exceeded. Please try again later."
        )

        assert "Retry-After" in response_3.headers

    finally:
        if original_limit is None:
            RATE_LIMITS.pop(
                ("GET", test_path),
                None,
            )
        else:
            RATE_LIMITS[
                ("GET", test_path)
            ] = original_limit