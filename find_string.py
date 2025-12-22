
import os

file_path = r'c:\Users\HP\OneDrive\Desktop\GIT1\EduNexus-AI\server\python_service\main.py'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for i, line in enumerate(lines):
        if 'user_settings' in line:
            print(f"Line {i+1}: {line.strip()}")
