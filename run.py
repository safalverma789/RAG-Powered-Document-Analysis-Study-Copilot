"""
AURA RAG Study Copilot - Single Terminal Concurrent Runner
Launches both FastAPI and Vite in the current console and cleans up on Ctrl+C.
"""
import os
import sys
import time
import subprocess
import threading
import webbrowser

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")

# Locate virtual environment python
VENV_PYTHON = os.path.join(BACKEND_DIR, ".venv", "Scripts", "python.exe")
if not os.path.exists(VENV_PYTHON):
    VENV_PYTHON = sys.executable

def stream_logs(pipe, prefix, color_code):
    try:
        for line in iter(pipe.readline, ''):
            if not line:
                break
            sys.stdout.write(f"\033[{color_code}m{prefix}\033[0m {line}")
            sys.stdout.flush()
    except Exception:
        pass

def main():
    print("\033[1;31m===================================================\033[0m")
    print("\033[1;37m  Starting AURA RAG Study Copilot (Single Terminal)\033[0m")
    print("\033[1;31m===================================================\033[0m")

    # 1. Start Backend
    print("\033[1;36m[1/2] Starting FastAPI Backend on http://127.0.0.1:8000...\033[0m")
    backend_proc = subprocess.Popen(
        [VENV_PYTHON, "-m", "uvicorn", "main:app", "--reload", "--host", "127.0.0.1", "--port", "8000"],
        cwd=BACKEND_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    # 2. Start Frontend
    print("\033[1;36m[2/2] Starting React + Vite Frontend on http://localhost:5173...\033[0m")
    frontend_proc = subprocess.Popen(
        ["npm.cmd", "run", "dev"],
        cwd=FRONTEND_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    # Stream logs
    t1 = threading.Thread(target=stream_logs, args=(backend_proc.stdout, "[API]", "35"), daemon=True)
    t2 = threading.Thread(target=stream_logs, args=(frontend_proc.stdout, "[WEB]", "36"), daemon=True)
    t1.start()
    t2.start()

    time.sleep(3)
    print("\033[1;32mOpening http://localhost:5173/ in browser...\033[0m")
    webbrowser.open("http://localhost:5173/")

    print("\033[1;33mPress Ctrl+C anytime to stop both servers.\033[0m\n")

    try:
        while backend_proc.poll() is None and frontend_proc.poll() is None:
            time.sleep(0.5)
    except KeyboardInterrupt:
        print("\n\033[1;31mStopping AURA services...\033[0m")
        backend_proc.terminate()
        frontend_proc.terminate()
        try:
            backend_proc.wait(timeout=3)
            frontend_proc.wait(timeout=3)
        except Exception:
            backend_proc.kill()
            frontend_proc.kill()
        print("\033[1;32mAll services stopped cleanly.\033[0m")

if __name__ == "__main__":
    main()
