import os
import pandas as pd
import numpy as np
from dotenv import load_dotenv
import base64
import matplotlib
matplotlib.use('Agg')
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_experimental.agents.agent_toolkits import create_pandas_dataframe_agent
from langchain_community.chat_models import ChatOllama

# NEW Gemini SDK
from google import genai
from services.ai_router import select_model

# Load environment variables
load_dotenv()

# Simple cache for dataframe summaries
_summary_cache = {}


# ✅ NEW Gemini Client (REPLACES LangChain)
def get_gemini_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    return genai.Client(api_key=api_key)


def _get_dataframe_summary(df: pd.DataFrame) -> str:
    df_id = id(df)
    if df_id in _summary_cache:
        return _summary_cache[df_id]

    try:
        # Shape
        shape_str = f"Rows: {df.shape[0]}, Columns: {df.shape[1]}"

        # Column metadata
        col_meta = ", ".join(
            [f"{col} ({str(dtype)})" for col, dtype in zip(df.columns, df.dtypes)]
        )

        # Missing values
        missing_vals = df.isnull().sum()
        missing_str = (
            missing_vals[missing_vals > 0].to_string()
            if missing_vals.sum() > 0
            else "No missing values"
        )

        # ✅ Optimized describe (avoid token explosion)
        describe_str = df.describe().to_string()

        # ✅ Limited correlation matrix
        numeric_cols = df.select_dtypes(include=[np.number])
        if not numeric_cols.empty:
            corr = numeric_cols.corr()
            if len(corr.columns) > 6:
                corr = corr.iloc[:6, :6]
            corr_str = corr.to_string()
        else:
            corr_str = "No numeric columns for correlation"

        # Smart sampling
        if len(df) > 100:
            sample_df = df.sample(n=10, random_state=42)
        else:
            sample_df = df.head(10)

        sample_str = sample_df.to_string()

        summary = f"""--- Dataset Summary ---
Shape: {shape_str}
Columns & Data Types: {col_meta}

Missing Values:
{missing_str}

Summary Statistics:
{describe_str}

Correlation Matrix:
{corr_str}

Sample Data:
{sample_str}
-----------------------"""

        _summary_cache[df_id] = summary
        return summary

    except Exception as e:
        return f"Error computing dataset summary: {str(e)}"


# ✅ GENERATE INSIGHTS
def generate_insights(df: pd.DataFrame) -> list:
    client = get_gemini_client()

    if not client:
        return [
            "GEMINI_API_KEY missing. Mock insight: Dataset appears structured."
        ]

    try:
        summary = _get_dataframe_summary(df)

        prompt = f"""
You are an expert AI Data Analyst.

Analyze the dataset summary below:

{summary}

Generate exactly 3 insights:
- Focus on trends, anomalies, correlations
- Keep each insight short (1 line)
- Do NOT add extra text
"""

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        response_text = getattr(response, "text", str(response))

        insights = [
            line.strip().lstrip("-* ").strip()
            for line in response_text.split("\n")
            if line.strip()
        ]

        return insights[:3]

    except Exception as e:
        import traceback
        traceback.print_exc()

        return [
            "AI insights unavailable (API issue)",
            f"Dataset has {len(df)} rows and {len(df.columns)} columns",
        ]


def is_complex_query(query: str) -> bool:
    """Determine if a query requires advanced capabilities."""
    complex_keywords = [
        "forecast", "predict", "model", "anomaly", "advanced", 
        "reason", "correlate", "trend", "multi-step", "cluster", "outlier"
    ]
    query_lower = query.lower()
    for kw in complex_keywords:
        if kw in query_lower:
            return True
    if len(query.split()) > 15:
        return True
    return False

def _run_agent(llm, query: str, df: pd.DataFrame, prefix: str):
    """Encapsulates the agent running logic independently of the model."""
    df_copy = df.copy()
    agent = create_pandas_dataframe_agent(
        llm, 
        df_copy, 
        verbose=True, 
        allow_dangerous_code=True, 
        prefix=prefix,
        handle_parsing_errors=True,
        max_iterations=5,
        early_stopping_method="generate"
    )
    
    # Clean up any leftover charts
    if os.path.exists("output_chart.png"):
        os.remove("output_chart.png")
        
    response = agent.invoke(query)
    output_text = response.get("output", "Done.")
    
    chart_base64 = None
    if os.path.exists("output_chart.png"):
        with open("output_chart.png", "rb") as f:
            chart_base64 = base64.b64encode(f.read()).decode("utf-8")
        os.remove("output_chart.png")
        
    return output_text, chart_base64


# ✅ CHAT WITH DATA
def process_chat_query(query: str, df: pd.DataFrame, mode: str = None) -> dict:
    prefix_gemini = """
    You are an expert Data Analysis Agent. 
    If the user asks a question about the dataset, use matplotlib.pyplot or calculate using pandas.
    If asked to draw a chart, plot, or graph, you MUST:
    1. Use matplotlib.pyplot
    2. DO NOT use plt.show()
    3. Save the plot EXACTLY to 'output_chart.png' (e.g. plt.savefig('output_chart.png', bbox_inches='tight'))
    4. Close the plot with plt.close()
    5. Finish your thought by stating the chart has been created.
    """
    
    prefix_local = """
    You are a Python pandas data analyst.
    Use dataframe named df.
    Return concise final answer only.
    If graph requested:
    Generate matplotlib code and save chart as output_chart.png
    Do not output Thought/Action text.
    Do not output markdown code fences unless requested.
    """
    
    # Route model selection dynamically
    model_name, routing_desc = select_model(query=query, mode=mode)
    
    # Instantiate models
    gemini_llm = None
    if "GEMINI_API_KEY" in os.environ and os.environ["GEMINI_API_KEY"]:
        gemini_llm = ChatGoogleGenerativeAI(model=model_name, temperature=0, max_retries=3)
    
    mistral_llm = ChatOllama(model="mistral:latest", temperature=0)
    llama_llm = ChatOllama(model="llama3.2", temperature=0)

    # Build model routing chain
    model_chain = []
    if gemini_llm:
        model_chain.append((model_name, gemini_llm, prefix_gemini))
    
    # Append local fallbacks
    model_chain.extend([
        ("mistral:latest", mistral_llm, prefix_local), 
        ("llama3.2", llama_llm, prefix_local)
    ])
    
    print(f"Routing logic: {routing_desc}. Chain sequence: {model_chain}")

    last_error = None
    for model_name_item, llm, active_prefix in model_chain:
        try:
            print(f"Attempting query with model: {model_name_item}...")
            output_text, chart_base64 = _run_agent(llm, query, df, active_prefix)
            
            print(f"Success! Model {model_name_item} answered the query.")
            chart_title = query if len(query) < 40 else query[:37] + "..."
            return {
                "type": "text",
                "text": output_text,
                "chartBase64": chart_base64,
                "chartTitle": chart_title,
                "model_used": model_name_item,
                "routing_desc": routing_desc
            }
        except Exception as e:
            print(f"WARNING: Model {model_name_item} failed with error: {str(e)}")
            last_error = e
            continue

    # If all models fail
    import traceback
    traceback.print_exc()

    return {
        "type": "text",
        "text": f"Error executing query. All fallback models failed. Last error: {str(last_error)}",
        "model_used": "none",
        "routing_desc": "All routing options failed"
    }