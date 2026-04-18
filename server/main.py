# Force the DB engine to be created BEFORE truststore monkey-patches ssl.
# session.py builds its own SSLContext(PROTOCOL_TLS_CLIENT) at import time,
# which is unaffected by truststore's later injection.
import app.db.session  # noqa: F401

try:
    import truststore

    truststore.inject_into_ssl()
except Exception:
    pass

from app.core.app_factory import create_app

app = create_app()
