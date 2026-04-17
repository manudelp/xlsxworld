try:
    import truststore

    truststore.inject_into_ssl()
except Exception:
    pass

from app.core.app_factory import create_app

app = create_app()
