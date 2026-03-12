import pandas as pd
import sys

file_path = "temp_Nykaa Digital Marketing.csv"
encodings = ['utf-8', 'latin-1', 'cp1252']

for enc in encodings:
    print(f"Trying {enc}...")
    try:
        df = pd.read_csv(file_path, encoding=enc, engine='python', on_bad_lines='skip')
        print(f"Success with {enc}!")
        print("Columns:", df.columns.tolist())
        print("First 2 rows:\n", df.head(2))
        sys.exit(0)
    except Exception as e:
        print(f"Failed {enc}: {e}")

print("All encodings failed.")
