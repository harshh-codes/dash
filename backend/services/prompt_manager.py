class PromptManager:
    """
    Reusable prompt templates manager for cleaning operations.
    """
    @staticmethod
    def get_quick_clean_prompt(summary_str: str) -> str:
        return f"""
You are an expert data cleaning system. Your task is to analyze the dataset summary below and generate a cleaning report in JSON format.

Dataset Summary:
{summary_str}

Please clean the dataset:
1. Handle duplicates
2. Address missing values
3. Identify datatype issues
4. Normalize column names (lowercase, no spaces)
5. Detect basic outliers

Generate the cleaning results in this EXACT JSON structure:
{{
  "cleaned_dataset_summary": "A brief overview of the cleaned dataset (e.g. shape, count, quality improvements).",
  "pandas_cleaning_code": "Complete, valid, clean Python pandas code to perform the exact cleaning steps on a DataFrame named 'df'. Only write code inside this string, using double quotes or escaped quotes appropriately. Do not include markdown code fences. Example: \\\"df = df.drop_duplicates()\\\\ndf.columns = [c.lower().replace(' ', '_') for c in df.columns]\\\"",
  "recommendations": [
    "A concise recommendation for further clean up.",
    "Another suggestion."
  ]
}}
"""

    @staticmethod
    def get_deep_clean_prompt(summary_str: str) -> str:
        return f"""
You are an expert senior data scientist. Analyze the dataset summary below and perform a deep analysis of dataset health, issues, and preprocessing suggestions.

Dataset Summary:
{summary_str}

Analyze:
1. Dataset Health Score (an integer from 0 to 100 representing readiness for machine learning/analysis)
2. Detailed health score explanation
3. Advanced anomaly detection (patterns that seem incorrect, impossible values)
4. Feature engineering suggestions
5. Imbalance analysis (check target columns or category distributions)
6. Skewness analysis
7. Target leakage & ML readiness
8. Preprocessing strategy recommendations
9. Business insights

Generate the deep analysis report in this EXACT JSON structure:
{{
  "health_score": 85,
  "health_explanation": "Explain why this score was given, citing specific metrics or issues.",
  "anomalies": [
    "Identify any anomaly or hidden data inconsistency here.",
    "Another anomaly."
  ],
  "feature_engineering_suggestions": [
    "Suggest a feature engineering idea (e.g., binning, interaction terms).",
    "Another suggestion."
  ],
  "imbalance_analysis": "Summary of category imbalances or target variable skew.",
  "skewness_analysis": "Summary of numeric feature distributions and skewness.",
  "target_leakage_and_ml_readiness": "Analysis of potential target leakage and readiness for training machine learning models.",
  "preprocessing_recommendations": [
    "Specific recommendation 1.",
    "Specific recommendation 2."
  ],
  "business_insights": [
    "Valuable business insight 1 from the correlations or distributions.",
    "Valuable business insight 2."
  ]
}}
"""
