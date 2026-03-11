import pytest
from app.models import StructuredQuery, FilterConfig
from app.query_builder import build_sql_from_json

def test_build_sql_basic_select():
    query_obj = StructuredQuery(select=["id", "name"])
    sql, params = build_sql_from_json(query_obj, ["id", "name", "age"])
    assert sql == "SELECT id, name FROM uploaded_data LIMIT 100"
    assert params == []

def test_build_sql_where_clause():
    query_obj = StructuredQuery(
        select=["name"],
        where=[FilterConfig(column="age", operator=">=", value=18)]
    )
    sql, params = build_sql_from_json(query_obj, ["id", "name", "age"])
    assert sql == "SELECT name FROM uploaded_data WHERE age >= ? LIMIT 100"
    assert params == [18]

def test_build_sql_in_operator():
    query_obj = StructuredQuery(
        select=["name"],
        where=[FilterConfig(column="status", operator="IN", value=["active", "pending"])]
    )
    sql, params = build_sql_from_json(query_obj, ["id", "name", "status"])
    assert sql == "SELECT name FROM uploaded_data WHERE status IN (?, ?) LIMIT 100"
    assert params == ["active", "pending"]

def test_build_sql_group_by():
    query_obj = StructuredQuery(
        select=["department", "COUNT(id)"],
        group_by=["department"],
        order_by="COUNT(id)",
        order_direction="DESC"
    )
    sql, params = build_sql_from_json(query_obj, ["id", "department"])
    assert "GROUP BY department" in sql
    assert "ORDER BY COUNT(id) DESC" in sql

def test_build_sql_unauthorized_column():
    query_obj = StructuredQuery(select=["secret_column"])
    with pytest.raises(ValueError, match="Unauthorized or unknown column"):
        build_sql_from_json(query_obj, ["id", "name"])

def test_build_sql_unauthorized_where_column():
    query_obj = StructuredQuery(
        select=["name"],
        where=[FilterConfig(column="secret_column", operator="=", value="test")]
    )
    with pytest.raises(ValueError, match="Unauthorized or unknown column"):
        build_sql_from_json(query_obj, ["id", "name"])
        
def test_build_sql_invalid_operator():
    query_obj = StructuredQuery(
        select=["name"],
        where=[FilterConfig(column="age", operator="DROP TABLE", value=18)]
    )
    with pytest.raises(ValueError, match="Unsupported operator"):
        build_sql_from_json(query_obj, ["id", "name", "age"])
