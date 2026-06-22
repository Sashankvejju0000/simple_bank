from fastapi import FastAPI, Request, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from .routers import auth, customers, accounts

app = FastAPI(
    title="Bank Management System Backend API",
    description="Production-ready FastAPI backend with Pydantic and SQLAlchemy mapping to MySQL.",
    version="1.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers with exact prefixes matching Node.js route design
app.include_router(auth.router, prefix="/api/auth")
app.include_router(customers.router, prefix="/api/customers")
app.include_router(accounts.router, prefix="/api/accounts")

@app.get("/")
def read_root():
    return {
        "success": True,
        "message": "Welcome to the Bank Management System Backend API!",
        "documentation": "/docs"
    }

# 1. Custom HTTP Exception Handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail,
            "error": "HTTPException",
            "details": None
        }
    )

# 2. Custom Validation Error Handler (reformats Pydantic validation errors)
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    details = []
    for error in exc.errors():
        # Exclude root location 'body' from path representation
        path = error.get("loc", [])
        field = ".".join([str(p) for p in path[1:]]) if len(path) > 1 else ".".join([str(p) for p in path])
        details.append({
            "field": field,
            "message": error.get("msg")
        })
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "success": False,
            "message": "Validation failed",
            "error": "ValidationError",
            "details": details
        }
    )

# 3. Global General Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    traceback.print_exc()
    
    # Catch SQLAlchemy DB Constraint Errors and map to user-friendly messages
    error_class = exc.__class__.__name__
    message = "An internal server error occurred."
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR

    if "IntegrityError" in error_class:
        status_code = status.HTTP_409_CONFLICT
        message = "Integrity constraint violation (e.g. duplicate key or foreign key issue)."
        if "Duplicate entry" in str(exc):
            message = "A resource with this identifier already exists."
        elif "Cannot add or update a child row" in str(exc):
            message = "Foreign key constraint fail: Referenced record does not exist."
            status_code = status.HTTP_400_BAD_REQUEST
    
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "message": message,
            "error": error_class,
            "details": str(exc) if status_code != 500 else None
        }
    )
