import pandas as pd
import sys

file_path = "temp_annual-enterprise-survey-2024-financial-year-provisional.csv"
try:
    df = pd.read_csv(file_path)
    print("Columns:", df.columns.tolist())
    for col in df.columns:
        if str(col).startswith("Unnamed:"):
            print(f"Error: Unnamed header detected: {col}")
    if df.empty:
        print("Error: Empty DF")
except Exception as e:
    print(f"Error: {e}")
