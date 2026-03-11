import sys
import os

print(f"Python version: {sys.version}")
print(f"Current directory: {os.getcwd()}")
print(f"Directory contents: {os.listdir('.')}")

try:
    print("Attempting to change directory to 'backend'...")
    os.chdir('backend')
    print(f"New directory: {os.getcwd()}")
    print(f"Backend contents: {os.listdir('.')}")
    
    print("Adding current directory to sys.path...")
    sys.path.append(os.getcwd())
    
    print("Attempting to import app.main...")
    from app.main import app
    print("Import successful!")
except Exception as e:
    print(f"Error during import: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
