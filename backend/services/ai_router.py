import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AIRouter")

def select_model(query: str = None, mode: str = None) -> tuple[str, str]:
    """
    Selects the appropriate model and routing description based on the query and/or mode.
    Rules:
    - Mode 'quick' -> gemini-2.5-flash
    - Mode 'deep' -> gemini-2.5-pro
    - Query containing specific complex terms -> automatically switch to gemini-2.5-pro
    - Otherwise -> gemini-2.5-flash
    
    Returns:
        tuple[str, str]: (model_name, description)
    """
    # 1. Mode check first
    if mode == "quick":
        model = "gemini-2.5-flash"
        desc = "Using Gemini 2.5 Flash for fast preprocessing"
        logger.info(f"Routed to {model} via mode == '{mode}'")
        return model, desc
        
    if mode == "deep":
        model = "gemini-2.5-pro"
        desc = "Using Gemini 2.5 Pro for advanced reasoning"
        logger.info(f"Routed to {model} via mode == '{mode}'")
        return model, desc

    # 2. Query check (intelligent auto-routing)
    if query:
        query_lower = query.lower()
        complex_terms = [
            "advanced",
            "deep analysis",
            "feature engineering",
            "business insights",
            "anomaly",
            "ml recommendation",
            "correlation reasoning"
        ]
        
        for term in complex_terms:
            if term in query_lower:
                model = "gemini-2.5-pro"
                desc = f"Auto-switched to Gemini 2.5 Pro due to '{term}' keyword"
                logger.info(f"Routed to {model} via query keyword matching '{term}'")
                return model, desc
                
    # 3. Fallback
    model = "gemini-2.5-flash"
    desc = "Using Gemini 2.5 Flash for fast query processing"
    logger.info(f"Routed to {model} by default")
    return model, desc
