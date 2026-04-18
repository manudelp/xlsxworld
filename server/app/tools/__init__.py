from app.tools.inspect import pagination_router as inspect_pagination_router
from app.tools.inspect import router as inspect_router
from app.tools.convert import router as convert_router
from app.tools.merge import router as merge_router
from app.tools.split import router as split_router
from app.tools.clean import router as clean_router
from app.tools.analyze import router as analyze_router
from app.tools.format import router as format_router
from app.tools.data import router as data_router
from app.tools.validate import router as validate_router
from app.tools.security import router as security_router

tool_routers = [
    inspect_router, convert_router, merge_router, split_router,
    clean_router, analyze_router, format_router, data_router,
    validate_router, security_router,
]

# Routers that serve internal pagination / batch-loading for tools.
# These must NOT be quota-enforced: they are part of an already-counted job.
tool_pagination_routers = [
    inspect_pagination_router,
]
