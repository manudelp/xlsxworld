from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

# Create a single Limiter instance to be used across the application.
limiter = Limiter(key_func=get_remote_address)
