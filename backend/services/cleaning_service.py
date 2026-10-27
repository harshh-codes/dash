import os
import io
import base64
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
from typing import Dict, Any, Tuple
# No external services imports needed since this file only performs local programmatic operations

def set_dark_theme():
    """Sets a beautiful dark glassmorphism aesthetic for matplotlib charts."""
    plt.style.use('dark_background')
    plt.rcParams['figure.facecolor'] = '#0b0f19'
    plt.rcParams['axes.facecolor'] = '#111827'
    plt.rcParams['axes.edgecolor'] = '#374151'
    plt.rcParams['text.color'] = '#f3f4f6'
    plt.rcParams['axes.labelcolor'] = '#9ca3af'
    plt.rcParams['xtick.color'] = '#9ca3af'
    plt.rcParams['ytick.color'] = '#9ca3af'
    plt.rcParams['grid.color'] = '#1f2937'
    plt.rcParams['grid.linestyle'] = '--'
    plt.rcParams['grid.linewidth'] = 0.5

def fig_to_base64(fig) -> str:
    """Converts a matplotlib figure to base64 string."""
    buf = io.BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight', dpi=150)
    buf.seek(0)
    img_str = base64.b64encode(buf.read()).decode('utf-8')
    plt.close(fig)
    return img_str

def perform_quick_clean(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Performs fast, deterministic data cleaning using Pandas.
    Returns the cleaned DataFrame and a dictionary of stats.
    """
    stats = {}
    df_clean = df.copy()
    
    # 1. Row count before
    stats["rows_before"] = len(df)
    stats["cols_before"] = len(df.columns)
    
    # 2. Duplicate rows
    dup_count = int(df_clean.duplicated().sum())
    stats["duplicates_removed"] = dup_count
    df_clean = df_clean.drop_duplicates()
    
    # 3. Trim whitespaces & empty rows/columns
    for col in df_clean.columns:
        if df_clean[col].dtype == 'object':
            df_clean[col] = df_clean[col].apply(lambda x: x.strip() if isinstance(x, str) else x)
            
    # Remove empty rows and columns
    df_clean = df_clean.dropna(how='all')
    df_clean = df_clean.dropna(axis=1, how='all')
    
    # 4. Handle missing values
    missing_fixed = 0
    for col in df_clean.columns:
        nulls = df_clean[col].isnull().sum()
        if nulls > 0:
            missing_fixed += int(nulls)
            if pd.api.types.is_numeric_dtype(df_clean[col]):
                df_clean[col] = df_clean[col].fillna(df_clean[col].median())
            else:
                mode_val = df_clean[col].mode()
                if not mode_val.empty:
                    df_clean[col] = df_clean[col].fillna(mode_val[0])
                else:
                    df_clean[col] = df_clean[col].fillna("Unknown")
                    
    stats["missing_values_fixed"] = missing_fixed
    
    # 5. Fix datatypes
    datatype_changes = []
    for col in df_clean.columns:
        # Check if numeric but stored as object (excluding pure string/categorical)
        if df_clean[col].dtype == 'object':
            # Attempt numeric conversion
            converted = pd.to_numeric(df_clean[col], errors='coerce')
            # If less than 20% are NaNs after conversion (meaning it was mostly numbers), keep it
            if converted.isnull().sum() < 0.2 * len(df_clean):
                df_clean[col] = converted
                # Fill new NaNs with median
                df_clean[col] = df_clean[col].fillna(df_clean[col].median())
                datatype_changes.append(f"Converted '{col}' to numeric")
                
    stats["datatype_changes"] = datatype_changes
    
    # 6. Normalize column names
    old_columns = df_clean.columns.tolist()
    new_columns = [str(c).strip().lower().replace(" ", "_").replace("-", "_").replace(".", "_") for c in old_columns]
    df_clean.columns = new_columns
    
    normalized_count = sum(1 for o, n in zip(old_columns, new_columns) if o != n)
    stats["columns_normalized"] = normalized_count
    
    # 7. Outliers (Basic IQR detection)
    outliers_detected = 0
    numeric_cols = df_clean.select_dtypes(include=[np.number]).columns
    for col in numeric_cols:
        q1 = df_clean[col].quantile(0.25)
        q3 = df_clean[col].quantile(0.75)
        iqr = q3 - q1
        if iqr > 0:
            lower = q1 - 1.5 * iqr
            upper = q3 + 1.5 * iqr
            outlier_mask = (df_clean[col] < lower) | (df_clean[col] > upper)
            outliers_detected += int(outlier_mask.sum())
            
    stats["outliers_detected"] = outliers_detected
    stats["rows_after"] = len(df_clean)
    stats["cols_after"] = len(df_clean.columns)
    
    return df_clean, stats

def calculate_health_score(df: pd.DataFrame) -> Tuple[int, Dict[str, Any]]:
    """
    Programmatically computes a dataset health score (0-100) and details.
    """
    score = 100
    deductions = []
    
    # 1. Missing Values (max deduction 25)
    total_cells = df.size
    total_nulls = df.isnull().sum().sum()
    null_pct = (total_nulls / total_cells * 100) if total_cells > 0 else 0
    if null_pct > 0:
        deduct = min(25, int(null_pct * 1.5))
        score -= deduct
        deductions.append(f"Missing Values: -{deduct} pts ({null_pct:.1f}% missing)")
        
    # 2. Duplicates (max deduction 15)
    dup_rows = df.duplicated().sum()
    dup_pct = (dup_rows / len(df) * 100) if len(df) > 0 else 0
    if dup_pct > 0:
        deduct = min(15, int(dup_pct * 2))
        score -= deduct
        deductions.append(f"Duplicate Rows: -{deduct} pts ({dup_rows} duplicates)")
        
    # 3. Outliers (max deduction 15)
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    outlier_cols_count = 0
    total_outliers = 0
    for col in numeric_cols:
        q1 = df[col].quantile(0.25)
        q3 = df[col].quantile(0.75)
        iqr = q3 - q1
        if iqr > 0:
            lower = q1 - 1.5 * iqr
            upper = q3 + 1.5 * iqr
            col_outliers = ((df[col] < lower) | (df[col] > upper)).sum()
            if col_outliers > 0:
                outlier_cols_count += 1
                total_outliers += col_outliers
                
    if outlier_cols_count > 0:
        deduct = min(15, outlier_cols_count * 2)
        score -= deduct
        deductions.append(f"Outliers: -{deduct} pts ({total_outliers} outliers across {outlier_cols_count} numeric columns)")
        
    # 4. Imbalance / Skewness (max deduction 15)
    skewed_cols = 0
    for col in numeric_cols:
        col_skew = df[col].skew()
        if abs(col_skew) > 1.5:
            skewed_cols += 1
    if skewed_cols > 0:
        deduct = min(15, skewed_cols * 3)
        score -= deduct
        deductions.append(f"Skewed Features: -{deduct} pts ({skewed_cols} highly skewed numeric features)")
        
    # 5. Datatype consistency (max deduction 15)
    # Check for mixed object columns
    mixed_cols = 0
    for col in df.columns:
        if df[col].dtype == 'object':
            # check if contains both numeric and alphabetic
            has_num = df[col].apply(lambda x: any(c.isdigit() for c in str(x)) if pd.notnull(x) else False).any()
            has_alpha = df[col].apply(lambda x: any(c.isalpha() for c in str(x)) if pd.notnull(x) else False).any()
            if has_num and has_alpha:
                mixed_cols += 1
    if mixed_cols > 0:
        deduct = min(15, mixed_cols * 3)
        score -= deduct
        deductions.append(f"Mixed Types: -{deduct} pts ({mixed_cols} columns with mixed text/numeric types)")
        
    # Boundary check
    score = max(0, min(100, score))
    
    details = {
        "score": score,
        "deductions": deductions,
        "null_pct": null_pct,
        "dup_count": int(dup_rows),
        "outlier_count": int(total_outliers),
        "skewed_columns_count": skewed_cols,
        "mixed_columns_count": mixed_cols
    }
    
    return score, details

def generate_cleaning_visualizations(df: pd.DataFrame) -> Dict[str, str]:
    """
    Generates premium dark-themed visualizations for the data dashboard.
    Returns a dictionary of image labels and their base64 string values.
    """
    set_dark_theme()
    charts = {}
    
    # 1. Correlation Heatmap (only if there are numeric columns)
    numeric_df = df.select_dtypes(include=[np.number])
    if len(numeric_df.columns) > 1:
        fig, ax = plt.subplots(figsize=(6, 4))
        # Limit to 10 features to keep it clean
        corr = numeric_df.corr()
        if len(corr.columns) > 10:
            corr = corr.iloc[:10, :10]
            
        sns.heatmap(
            corr, 
            annot=True, 
            fmt=".2f", 
            cmap="crest", 
            cbar=True, 
            square=True,
            linewidths=0.5, 
            ax=ax,
            annot_kws={"size": 8}
        )
        ax.set_title("Feature Correlation Matrix", fontsize=12, fontweight='bold', pad=12)
        plt.xticks(rotation=45, ha='right', fontsize=8)
        plt.yticks(fontsize=8)
        charts["correlation_heatmap"] = fig_to_base64(fig)
        
    # 2. Missing Values Chart
    nulls_series = df.isnull().sum()
    nulls_series = nulls_series[nulls_series > 0]
    if not nulls_series.empty:
        fig, ax = plt.subplots(figsize=(6, 4))
        # limit to top 10
        nulls_series = nulls_series.sort_values(ascending=False).head(10)
        
        bars = ax.bar(nulls_series.index, nulls_series.values, color='#2563eb', edgecolor='#22d3ee', alpha=0.85, width=0.6)
        ax.set_title("Missing Values Count (Top Features)", fontsize=12, fontweight='bold', pad=12)
        ax.set_ylabel("Count of Missing Values", fontsize=9)
        plt.xticks(rotation=45, ha='right', fontsize=8)
        ax.grid(axis='y', alpha=0.3)
        # Add values on top of bars
        for bar in bars:
            height = bar.get_height()
            ax.annotate(f'{int(height)}',
                        xy=(bar.get_x() + bar.get_width() / 2, height),
                        xytext=(0, 3),  # 3 points vertical offset
                        textcoords="offset points",
                        ha='center', va='bottom', fontsize=8, color='#f3f4f6')
        charts["missing_values_bar"] = fig_to_base64(fig)
        
    # 3. Outliers Distribution Boxplot
    if len(numeric_df.columns) > 0:
        fig, ax = plt.subplots(figsize=(6, 4))
        # Select top 4 numeric columns by variance or simply first 4
        cols_to_plot = list(numeric_df.columns[:4])
        
        # Standardize data briefly for visual boxplot comparison
        scaled_df = pd.DataFrame()
        for col in cols_to_plot:
            col_std = numeric_df[col].std()
            if col_std > 0:
                scaled_df[col] = (numeric_df[col] - numeric_df[col].mean()) / col_std
            else:
                scaled_df[col] = 0.0
                
        if not scaled_df.empty:
            sns.boxplot(data=scaled_df, palette="mako", ax=ax, width=0.5, linewidth=1.5, fliersize=4)
            ax.set_title("Outlier Distribution (Standardized)", fontsize=12, fontweight='bold', pad=12)
            plt.xticks(rotation=45, ha='right', fontsize=8)
            ax.grid(axis='y', alpha=0.3)
            charts["outlier_boxplot"] = fig_to_base64(fig)
            
    # 4. Skewness density plot
    if len(numeric_df.columns) > 0:
        # Find the most skewed column
        skews = numeric_df.skew().abs().sort_values(ascending=False)
        if not skews.empty:
            skewed_col = skews.index[0]
            fig, ax = plt.subplots(figsize=(6, 4))
            
            sns.histplot(numeric_df[skewed_col], kde=True, color='#818cf8', edgecolor='#c084fc', alpha=0.5, ax=ax)
            ax.set_title(f"Distribution of '{skewed_col}' (Skew: {numeric_df[skewed_col].skew():.2f})", fontsize=12, fontweight='bold', pad=12)
            ax.set_xlabel(skewed_col, fontsize=9)
            ax.grid(axis='y', alpha=0.3)
            charts["skewness_density"] = fig_to_base64(fig)
            
    return charts
