import re
from typing import Tuple, List, Any
from app.models import StructuredQuery


def build_sql_from_json(query_obj: StructuredQuery, allowed_columns: List[str], table_name: str = "uploaded_data") -> Tuple[str, List[Any]]:
    """
    Parses a StructuredQuery JSON object into a parameterized SQL string and a list of parameters.
    Validates all columns against allowed_columns.
    """
    allowed_cols_set = set([c.lower() for c in allowed_columns])
    
    # 1. Select
    select_cols = []
    if not query_obj.select:
        query_obj.select = ["*"]

    for col in query_obj.select:
        clean_col = col.lower()
        base_col = clean_col
        # Extact inner column for basic aggregations like COUNT(id)
        if '(' in clean_col and ')' in clean_col:
            base_col = clean_col.split('(')[1].split(')')[0].strip()
            
        # Handle ' AS ' aliases if no parentheses were present or inside base_col
        if " as " in base_col:
            base_col = base_col.split(" as ")[0].strip()

        if base_col != '*' and base_col not in allowed_cols_set and base_col != "":
            # We strictly enforce only querying known columns natively or in functions.
            raise ValueError(f"Unauthorized or unknown column in SELECT: {base_col}")
        select_cols.append(col) 

    select_clause = ", ".join(select_cols)
    sql = f"SELECT {select_clause} FROM {table_name}"
    params = []
    
    # 2. Where
    if query_obj.where:
        where_clauses = []
        for filter_config in query_obj.where:
            if filter_config.column.lower() not in allowed_cols_set:
                raise ValueError(f"Unauthorized or unknown column in WHERE: {filter_config.column}")
            
            # Map LLM keywords to SQL operators
            OPERATOR_MAP = {
                'EQ': '=',
                'NE': '!=',
                'GT': '>',
                'LT': '<',
                'GE': '>=',
                'LE': '<=',
                'EQUALS': '=',
                'NOT_EQUALS': '!=',
            }
            op = filter_config.operator.upper()
            op = OPERATOR_MAP.get(op, op)
            
            allowed_ops = {'=', '!=', '>', '<', '>=', '<=', 'IN', 'LIKE'}
            if op not in allowed_ops:
                raise ValueError(f"Unsupported operator: {op}")
                
            if op == 'IN':
                if not isinstance(filter_config.value, list):
                    raise ValueError("Value for IN operator must be a list")
                if not filter_config.value:
                    # Empty IN clause is problematic, just add something that is false
                    where_clauses.append("1 = 0")
                else:
                    placeholders = ", ".join(["?"] * len(filter_config.value))
                    where_clauses.append(f"{filter_config.column} IN ({placeholders})")
                    params.extend(filter_config.value)
            else:
                where_clauses.append(f"{filter_config.column} {op} ?")
                params.append(filter_config.value)
                
        if where_clauses:
            sql += " WHERE " + " AND ".join(where_clauses)
            
    # 3. Group By
    if query_obj.group_by:
        for col in query_obj.group_by:
            clean_col = col.lower()
            if " as " in clean_col:
                clean_col = clean_col.split(" as ")[0].strip()
            if clean_col not in allowed_cols_set:
                 raise ValueError(f"Unauthorized or unknown column in GROUP BY: {col}")
        sql += " GROUP BY " + ", ".join(query_obj.group_by)
        
    # 4. Order By
    if query_obj.order_by:
        clean_col = query_obj.order_by.lower()
        base_col = clean_col
        if '(' in clean_col and ')' in clean_col:
            base_col = clean_col.split('(')[1].split(')')[0].strip()
            
        if base_col not in allowed_cols_set and base_col != "":
            # Verify it's safe if it's not a known column (e.g., an alias)
            if not re.match(r'^[a-zA-Z0-9_]+$', base_col):
                raise ValueError(f"Invalid ORDER BY column: {query_obj.order_by}")
        
        direction = query_obj.order_direction.upper() if query_obj.order_direction else "ASC"
        if direction not in ("ASC", "DESC"):
            direction = "ASC"
        sql += f" ORDER BY {query_obj.order_by} {direction}"
        
    # 5. Limit
    limit_val = 100
    if query_obj.limit is not None:
        if not isinstance(query_obj.limit, int) or query_obj.limit < 0:
            raise ValueError("LIMIT must be a positive integer")
        limit_val = min(query_obj.limit, 500) # Cap limit
    sql += f" LIMIT {limit_val}"

    return sql, params
