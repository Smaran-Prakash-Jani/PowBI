# Strategic Component: Maps business terms to physical columns
# Prevents hallucinations when users say "Revenue" but column is "amt_usd"

SEMANTIC_MAP = {
    "revenue": ["total_sales", "amt_usd", "revenue", "amount", "price", "value"],
    "sales": ["total_sales", "amt_usd", "quantity", "units_sold", "sales"],
    "region": ["region_id", "region_name", "location", "area", "territory"],
    "date": ["order_date", "timestamp", "date", "created_at", "period"],
    "product": ["product_id", "product_name", "sku", "item", "category"],
    "customer": ["customer_id", "customer_name", "client", "buyer"],
    "profit": ["profit", "margin", "net_income", "earnings"],
    "cost": ["cost", "expense", "cogs", "expenditure"],
}


def get_semantic_context(columns):
    """Enhances raw columns with business context for LLM prompts"""
    context = "Available Columns:\n"
    for col in columns:
        context += f"- {col}\n"
    context += (
        "\nBusiness Rules:\n"
        "- 'Revenue' usually refers to sum of monetary columns.\n"
        "- 'Recent' means last 30 days unless specified.\n"
        "- 'Top' means ORDER BY DESC LIMIT unless specified.\n"
        "- Always use the exact column names from the schema above.\n"
    )
    return context
