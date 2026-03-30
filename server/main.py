import os
from pathlib import Path
from typing import Any
try:
    from dotenv import load_dotenv  # type: ignore
except Exception:
    def load_dotenv(*_args, **_kwargs):
        return False
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
import schemas  # type: ignore
import tools_inspect  # type: ignore
import tools_convert  # type: ignore
import tools_merge_split  # type: ignore

app = FastAPI(title="XLSX World API", version="0.1.0")

base_dir = Path(__file__).resolve().parent
load_dotenv(base_dir / ".env")

raw_origins = os.getenv("CORS_ORIGINS", "")
origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

if origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


def _replace_schema_refs(node: Any, schema_rename_map: dict[str, str]) -> None:
    if isinstance(node, dict):
        for key, value in node.items():
            if key == "$ref" and isinstance(value, str):
                for old_name, new_name in schema_rename_map.items():
                    old_ref = f"#/components/schemas/{old_name}"
                    if value == old_ref:
                        node[key] = f"#/components/schemas/{new_name}"
                        break
            else:
                _replace_schema_refs(value, schema_rename_map)
    elif isinstance(node, list):
        for item in node:
            _replace_schema_refs(item, schema_rename_map)


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description="XLSX World backend API for Excel inspection, conversion, merge and split tools.",
        routes=app.routes,
    )

    schema_rename_map = {
        "Body_append_workbooks_api_tools_append_workbooks_post": "AppendWorkbooksRequest",
        "Body_csv_to_xlsx_api_convert_csv_to_xlsx_post": "CsvToXlsxRequest",
        "Body_merge_sheets_api_tools_merge_sheets_post": "MergeSheetsRequest",
        "Body_preview_workbook_api_tools_inspect_preview_post": "PreviewWorkbookRequest",
        "Body_split_sheet_api_tools_split_sheet_post": "SplitSheetRequest",
        "Body_split_workbook_api_tools_split_workbook_post": "SplitWorkbookRequest",
    }

    components = openapi_schema.setdefault("components", {}).setdefault("schemas", {})
    effective_rename_map: dict[str, str] = {}

    for old_name, new_name in schema_rename_map.items():
        if old_name in components and new_name not in components:
            components[new_name] = components.pop(old_name)
            effective_rename_map[old_name] = new_name

    _replace_schema_refs(openapi_schema, effective_rename_map)

    title_overrides = {
        "AppendWorkbooksRequest": "Append Workbooks Request",
        "CsvToXlsxRequest": "CSV to XLSX Request",
        "MergeSheetsRequest": "Merge Sheets Request",
        "PreviewWorkbookRequest": "Preview Workbook Request",
        "SplitSheetRequest": "Split Sheet Request",
        "SplitWorkbookRequest": "Split Workbook Request",
        "HTTPValidationError": "HTTP Validation Error",
        "ValidationError": "Validation Error",
    }

    description_overrides = {
        "HTTPValidationError": "Returned when the request payload, query params, or form-data fail validation.",
        "ValidationError": "Details about a single validation issue.",
    }

    for schema_name, title in title_overrides.items():
        if schema_name in components:
            components[schema_name]["title"] = title

    for schema_name, description in description_overrides.items():
        if schema_name in components:
            components[schema_name]["description"] = description

    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi

@app.get(
    "/",
    tags=["root"],
    summary="API Status",
    description="Returns a short status message confirming the XLSX World backend is running.",
)
def read_root():
    return {"message": "XLSX World backend running"}

@app.get(
    "/health",
    tags=["meta"],
    summary="Health Check",
    description="Returns a simple health signal for uptime checks and monitoring.",
)
def health():
    return {"status": "ok"}

app.include_router(tools_inspect.router)
app.include_router(tools_convert.router)
app.include_router(tools_merge_split.router)