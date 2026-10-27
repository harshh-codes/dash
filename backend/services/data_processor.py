import pandas as pd
import numpy as np

def process_dataframe(df: pd.DataFrame) -> dict:
    """
    Cleans and processes the uploaded dataframe.
    """
    # 1. Drop complete duplicates
    df = df.drop_duplicates()
    
    # 2. Basic Missing value handling
    # For numeric columns, fill with median. For categorical, fill with mode.
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            if df[col].isnull().sum() > 0:
                df[col] = df[col].fillna(df[col].median())
        else:
            if df[col].isnull().sum() > 0:
                mode_val = df[col].mode()
                if not mode_val.empty:
                    df[col] = df[col].fillna(mode_val[0])
                else:
                    df[col] = df[col].fillna("Unknown")
                    
    # Ensure numeric columns are actually floats/ints if they can be formatted
    columns_info = []
    for col in df.columns:
        col_type = "numeric" if pd.api.types.is_numeric_dtype(df[col]) else "categorical"
        col_info = {
            "name": col,
            "type": col_type,
            "uniqueIds": int(df[col].nunique())
        }
        if col_type == "numeric":
            col_info["min"] = float(df[col].min()) if not pd.isna(df[col].min()) else None
            col_info["max"] = float(df[col].max()) if not pd.isna(df[col].max()) else None
            col_info["mean"] = float(df[col].mean()) if not pd.isna(df[col].mean()) else None
            
        columns_info.append(col_info)
        
    return {
        "df": df,
        "columns": columns_info,
        "row_count": len(df),
        "col_count": len(df.columns)
    }
