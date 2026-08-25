import time
from collections import defaultdict, deque

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware


RATE_LIMITS = {
    ("POST", "/auth/login"): (5, 60),
    ("POST", "/auth/signup"): (5, 60),
    ("POST", "/query"): (30, 60),
    ("POST", "/documents/upload"): (10, 60 * 60),
}


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)

        self.requests = defaultdict(deque)

    async def dispatch(self, request: Request, call_next):
        method = request.method.upper()
        path = request.url.path

        limit_config = RATE_LIMITS.get(
            (method, path)
        )

        # No rate limit configured for this endpoint
        if limit_config is None:
            return await call_next(request)

        max_requests, window_seconds = limit_config

        client_ip = (
            request.client.host
            if request.client
            else "unknown"
        )

        key = f"{client_ip}:{method}:{path}"

        now = time.time()

        request_times = self.requests[key]

        # Remove requests outside the current window
        while request_times and (
            now - request_times[0] >= window_seconds
        ):
            request_times.popleft()

        if len(request_times) >= max_requests:
            retry_after = max(
                1,
                int(
                    window_seconds
                    - (now - request_times[0])
                ),
            )

            return JSONResponse(
                status_code=429,
                content={
                    "detail": (
                        "Rate limit exceeded. "
                        "Please try again later."
                    )
                },
                headers={
                    "Retry-After": str(retry_after)
                },
            )

        request_times.append(now)

        return await call_next(request)