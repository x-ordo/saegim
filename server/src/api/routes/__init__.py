from .public import router as public_router
from .admin import router as admin_router
from .products import router as products_router
from .couriers import router as couriers_router
from .driver import router as driver_router

__all__ = ["public_router", "admin_router", "products_router", "couriers_router", "driver_router"]
