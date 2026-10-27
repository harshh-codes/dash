from fastapi import FastAPI, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import pandas as pd
import json
import io
import base64
import traceback

from services.data_processor import process_dataframe
from services.llm_service import generate_insights, process_chat_query
from services.cleaning_service import perform_quick_clean, calculate_health_score, generate_cleaning_visualizations
from services.gemini_service import route_gemini_request
from services.prompt_manager import PromptManager
from services.llm_service import _get_dataframe_summary

app = FastAPI(title="AI Data Analyst API")

# Configure CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For production, update this
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for currently uploaded datasets (for demo purposes)
current_datasets = {}

@app.get("/")
def read_root():
    return {"message": "Welcome to AI-Powered Data Analyst Platform"}

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        filename = file.filename
        
        sheets_info = []
        is_multi_sheet = False
        default_processed = None
        default_dataset_id = None
        
        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
            processed = process_dataframe(df)
            dataset_id = filename
            current_datasets[dataset_id] = processed["df"]
            default_processed = processed
            default_dataset_id = dataset_id
        elif filename.endswith((".xls", ".xlsx")):
            excel_dict = pd.read_excel(io.BytesIO(contents), sheet_name=None)
            if len(excel_dict) > 1:
                is_multi_sheet = True
            
            for i, (sheet_name, sheet_df) in enumerate(excel_dict.items()):
                # process each sheet
                processed = process_dataframe(sheet_df)
                # create a unique dataset id for the sheet
                dataset_id = f"{filename}_{sheet_name}"
                current_datasets[dataset_id] = processed["df"]
                
                # generate basic stats for this sheet
                preview = processed["df"].head(10).fillna("").to_dict(orient="records")
                sheet_data = {
                    "sheetName": sheet_name,
                    "datasetId": dataset_id,
                    "rowCount": processed["row_count"],
                    "colCount": processed["col_count"],
                    "columns": processed["columns"],
                    "preview": preview
                }
                sheets_info.append(sheet_data)
                
                if i == 0:
                    default_processed = processed
                    default_dataset_id = dataset_id
        elif filename.endswith(".json"):
            df = pd.read_json(io.BytesIO(contents))
            processed = process_dataframe(df)
            dataset_id = filename
            current_datasets[dataset_id] = processed["df"]
            default_processed = processed
            default_dataset_id = dataset_id
        else:
            return {"error": "Unsupported file format. Please upload CSV, Excel, or JSON."}
            
        # Get basic stats and types to send to frontend for the default/first sheet
        preview = default_processed["df"].head(10).fillna("").to_dict(orient="records")
        columns = default_processed["columns"]
        
        # Generate initial insights
        insights = generate_insights(default_processed["df"])

        return {
            "status": "success",
            "datasetId": default_dataset_id,
            "filename": filename,
            "rowCount": default_processed["row_count"],
            "colCount": default_processed["col_count"],
            "columns": columns,
            "preview": preview,
            "insights": insights,
            "isMultiSheet": is_multi_sheet,
            "sheets": sheets_info
        }
    except Exception as e:
        traceback.print_exc()
        return {"error": f"Error processing file: {str(e)}"}

@app.post("/api/chat")
async def chat(query: str = Form(...), datasetId: str = Form(...), mode: str = Form(None)):
    try:
        if datasetId not in current_datasets:
            return {"error": "Dataset not found. Please upload again."}
            
        df = current_datasets[datasetId]
        response = process_chat_query(query, df, mode=mode)
        
        return {"status": "success", "response": response}
    except Exception as e:
        return {"error": str(e)}

@app.post("/quick-clean")
@app.post("/api/quick-clean")
async def quick_clean(datasetId: str = Form(...), mode: str = Form("quick")):
    try:
        if datasetId not in current_datasets:
            return {"error": "Dataset not found. Please upload again."}
            
        df = current_datasets[datasetId]
        
        # 1. Perform programmatic cleaning
        df_cleaned, stats = perform_quick_clean(df)
        
        # 2. Store cleaned dataframe in memory
        cleaned_dataset_id = f"cleaned_{datasetId}"
        current_datasets[cleaned_dataset_id] = df_cleaned
        
        # 3. Create prompt and call Gemini 2.0 Flash
        summary_str = _get_dataframe_summary(df)
        prompt = PromptManager.get_quick_clean_prompt(summary_str)
        gemini_response = route_gemini_request(prompt, mode=mode)
        
        # 4. Generate CSV string for download
        csv_buffer = io.StringIO()
        df_cleaned.to_csv(csv_buffer, index=False)
        csv_str = csv_buffer.getvalue()
        csv_base64 = base64.b64encode(csv_str.encode('utf-8')).decode('utf-8')
        
        # 5. Format preview and column info
        from services.data_processor import process_dataframe
        processed = process_dataframe(df_cleaned)
        preview = df_cleaned.head(10).fillna("").to_dict(orient="records")
        
        return {
            "status": "success",
            "datasetId": cleaned_dataset_id,
            "filename": f"cleaned_{datasetId.replace('cleaned_', '')}",
            "rowCount": len(df_cleaned),
            "colCount": len(df_cleaned.columns),
            "columns": processed["columns"],
            "preview": preview,
            "before_stats": {
                "rows": stats["rows_before"],
                "cols": stats["cols_before"],
                "duplicates": stats["duplicates_removed"],
                "missing": stats["missing_values_fixed"],
                "outliers": stats["outliers_detected"]
            },
            "after_stats": {
                "rows": stats["rows_after"],
                "cols": stats["cols_after"],
                "duplicates": 0,
                "missing": 0,
                "outliers": 0
            },
            "stats": stats,
            "downloadCsvBase64": csv_base64,
            "ai_report": gemini_response
        }
    except Exception as e:
        traceback.print_exc()
        return {"error": f"Error performing quick clean: {str(e)}"}

@app.post("/deep-clean")
@app.post("/api/deep-clean")
async def deep_clean(datasetId: str = Form(...), mode: str = Form("deep")):
    try:
        if datasetId not in current_datasets:
            return {"error": "Dataset not found. Please upload again."}
            
        df = current_datasets[datasetId]
        
        # 1. Calculate Programmatic Health Score
        score, health_details = calculate_health_score(df)
        
        # 2. Get Deep Clean Prompt & Route to Gemini 2.5 Pro
        summary_str = _get_dataframe_summary(df)
        prompt = PromptManager.get_deep_clean_prompt(summary_str)
        gemini_response = route_gemini_request(prompt, mode=mode)
        
        # Overwrite health score if gemini returned it, otherwise fallback
        if "health_score" in gemini_response:
            score = gemini_response["health_score"]
            
        # 3. Generate visual charts
        charts = generate_cleaning_visualizations(df)
        
        return {
            "status": "success",
            "datasetId": datasetId,
            "health_score": score,
            "health_details": health_details,
            "analysis": gemini_response,
            "charts": charts
        }
    except Exception as e:
        traceback.print_exc()
        return {"error": f"Error performing deep clean: {str(e)}"}

@app.get("/analysis-report")
@app.get("/api/analysis-report")
async def analysis_report(datasetId: str = Query(...)):
    try:
        if datasetId not in current_datasets:
            return {"error": "Dataset not found."}
            
        df = current_datasets[datasetId]
        
        # Compute basic dataset information
        from services.data_processor import process_dataframe
        processed = process_dataframe(df)
        
        score, health_details = calculate_health_score(df)
        
        return {
            "status": "success",
            "datasetId": datasetId,
            "rowCount": len(df),
            "colCount": len(df.columns),
            "columns": processed["columns"],
            "health_score": score,
            "health_details": health_details,
            "missing_values": int(df.isnull().sum().sum()),
            "duplicates": int(df.duplicated().sum())
        }
    except Exception as e:
        traceback.print_exc()
        return {"error": f"Error retrieving analysis report: {str(e)}"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
