from typing import Any

from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi


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


def attach_custom_openapi(app: FastAPI) -> None:
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
            "Body_append_workbooks_api_v1_tools_append_workbooks_post": "AppendWorkbooksRequest",
            "Body_csv_to_xlsx_api_v1_tools_convert_csv_to_xlsx_post": "CsvToXlsxRequest",
            "Body_merge_sheets_api_v1_tools_merge_sheets_post": "MergeSheetsRequest",
            "Body_preview_workbook_api_v1_tools_inspect_preview_post": "PreviewWorkbookRequest",
            "Body_split_sheet_api_v1_tools_split_sheet_post": "SplitSheetRequest",
            "Body_split_workbook_api_v1_tools_split_workbook_post": "SplitWorkbookRequest",
            "Body_xlsx_to_csv_api_v1_tools_convert_xlsx_to_csv_post": "XlsxToCsvRequest",
            "Body_xlsx_to_csv_zip_api_v1_tools_convert_xlsx_to_csv_zip_post": "XlsxToCsvZipRequest",
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
            "XlsxToCsvRequest": "XLSX to CSV Request",
            "XlsxToCsvZipRequest": "XLSX to CSV ZIP Request",
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
