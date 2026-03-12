# Strategic Component: Maps business terms to physical columns
# Prevents hallucinations when users say "Revenue" but column is "amt_usd"

SEMANTIC_MAP = {
    "revenue": ["total_sales", "amt_usd", "revenue", "amount", "price", "value", "sales_amount"],
    "sales": ["total_sales", "amt_usd", "quantity", "units_sold", "sales", "qty"],
    "region": ["region_id", "region_name", "location", "area", "territory", "city", "state"],
    "date": ["order_date", "timestamp", "date", "created_at", "period", "year", "month"],
    "product": ["product_id", "product_name", "sku", "item", "category", "brand"],
    "customer": ["customer_id", "customer_name", "client", "buyer", "user_id"],
    "profit": ["profit", "margin", "net_income", "earnings", "gross_profit"],
    "cost": ["cost", "expense", "cogs", "expenditure", "spend"],
}


def get_semantic_context(columns):
    """Enhances raw columns with business context for LLM prompts"""
    context = "Available Columns:\n"
    for col in columns:
        context += f"- {col}\n"
    context += (
        "\nProfessional Analytics Rules:\n"
        "- ROI: (SUM(revenue) - SUM(cost)) / SUM(cost) * 100. Always use exact column names for revenue/cost.\n"
        "- CAGR: Compound Annual Growth Rate. Requires specific year-over-year calculation.\n"
        "- RETAIN: (Total Customers - New Customers) / Total Customers.\n"
        "- GROWTH: (Current period - Previous period) / Previous period * 100.\n"
        "- If the user asks for a metric you can't calculate exactly, use the closest SUM() or AVG() of a numeric column.\n"
        "- NEVER return a dummy year like '2024' as a placeholder.\n"
    )
    return context
