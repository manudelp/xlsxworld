from app.tools.inspect import router as inspect_router
from app.tools.convert import router as convert_router
from app.tools.merge import router as merge_router
from app.tools.split import router as split_router

tool_routers = [inspect_router, convert_router, merge_router, split_router]
