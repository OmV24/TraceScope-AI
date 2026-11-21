"""
TraceScope AI - Main FastAPI Application
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import CORS_ORIGINS
from .api.routes import router, initialize_graph


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load and index telemetry graph
    print("[TraceScope] Bootstrapping telemetry provenance DAG...")
    initialize_graph()
    yield
    print("[TraceScope] Shutting down...")


app = FastAPI(
    title="TraceScope AI - Investigation & Attack Reconstruction Framework",
    description="Evidence-Driven Windows Endpoint Attack Reconstruction and Incident Investigation API",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for React Flow frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
def root():
    return {
        "message": "TraceScope AI Investigation Engine is Running",
        "docs_url": "/docs",
        "health_check": "/api/v1/health"
    }


if __name__ == "__main__":
    import uvicorn
    from .config import API_HOST, API_PORT
    uvicorn.run("app.main:app", host=API_HOST, port=API_PORT, reload=True)
