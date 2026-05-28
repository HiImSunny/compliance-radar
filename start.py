"""
ComplianceRadar - TUI launcher
Run: python start.py
"""
from __future__ import annotations

import os
import subprocess
import sys
import threading
import time
from pathlib import Path

from rich import box
from rich.columns import Columns
from rich.console import Console
from rich.live import Live
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.prompt import Confirm, Prompt
from rich.table import Table
from rich.text import Text

# Paths
ROOT = Path(__file__).parent
BACKEND_DIR = ROOT / "backend"
FRONTEND_DIR = ROOT / "frontend"
WEB_DIR = ROOT / "web"
ENV_FILE = ROOT / ".env"

console = Console()


# Helpers
def header():
    console.print()
    console.print(
        Panel.fit(
            "[bold white]ComplianceRadar[/bold white]  [dim]v1.0.0[/dim]\n"
            "[dim]Real-time regulatory compliance monitoring[/dim]",
            border_style="blue",
            padding=(0, 2),
        )
    )
    console.print()


def section(title: str):
    console.rule(f"[bold blue]{title}[/bold blue]")
    console.print()


def ok(msg: str):
    console.print(f"  [bold green][OK][/bold green]  {msg}")


def warn(msg: str):
    console.print(f"  [bold yellow]![/bold yellow]  {msg}")


def err(msg: str):
    console.print(f"  [bold red][X][/bold red]  {msg}")


def info(msg: str):
    console.print(f"  [dim]->[/dim]  {msg}")


def decode_text_kwargs() -> dict[str, str | bool]:
    return {
        "text": True,
        "encoding": "utf-8",
        "errors": "replace",
    }


# Step 1: Check .env
def check_env() -> dict[str, str]:
    section("Environment Check")

    if not ENV_FILE.exists():
        warn(".env not found - copying from .env.example")
        example = ROOT / ".env.example"
        if example.exists():
            ENV_FILE.write_text(example.read_text())
            ok("Created .env from .env.example")
        else:
            err(".env.example missing too. Create .env manually.")
            sys.exit(1)

    env: dict[str, str] = {}
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            env[k.strip()] = v.strip()

    required = [
        "SUPABASE_URL",
        "SUPABASE_KEY",
        "BRIGHTDATA_TOKEN",
        "BRIGHTDATA_ZONE",
        "GEMINI_API_KEY",
    ]
    optional = ["SLACK_WEBHOOK_URL"]

    table = Table(box=box.SIMPLE, show_header=True, header_style="bold dim")
    table.add_column("Variable", style="cyan", no_wrap=True)
    table.add_column("Status")
    table.add_column("Value", style="dim")

    all_ok = True
    for key in required:
        val = env.get(key, "")
        if val and not val.startswith("your_"):
            table.add_row(key, "[green]set[/green]", val[:30] + "..." if len(val) > 30 else val)
        else:
            table.add_row(key, "[red]missing[/red]", "[dim]not set[/dim]")
            all_ok = False

    for key in optional:
        val = env.get(key, "")
        if val and not val.startswith("your_"):
            table.add_row(key, "[green]set[/green]", val[:30] + "..." if len(val) > 30 else val)
        else:
            table.add_row(key, "[dim]optional[/dim]", "[dim]not set (stub mode)[/dim]")

    console.print(table)

    if not all_ok:
        err("Some required variables are missing. Edit .env and re-run.")
        sys.exit(1)

    ok("All required environment variables are set.")
    console.print()
    return env


# Step 2: Install dependencies
def install_deps():
    section("Installing Dependencies")

    info("Installing Backend packages...")
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        transient=True,
        console=console,
    ) as progress:
        task = progress.add_task("  pip install Backend...", total=None)
        result = subprocess.run(
            [sys.executable, "-m", "pip", "install", "-r", str(BACKEND_DIR / "requirements.txt"), "-q"],
            capture_output=True,
            **decode_text_kwargs(),
        )
        progress.remove_task(task)

    if result.returncode == 0:
        ok("Backend dependencies installed.")
    else:
        err("Backend install failed:")
        console.print(result.stderr[-800:], style="red dim")
        if not Confirm.ask("  Continue anyway?", default=False):
            sys.exit(1)

    if not WEB_DIR.exists():
        err(f"Next.js frontend not found at {WEB_DIR}. Run the setup steps in README.")
        sys.exit(1)

    info("Installing Next.js frontend packages (npm install)...")
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        transient=True,
        console=console,
    ) as progress:
        task = progress.add_task("  npm install...", total=None)
        result = subprocess.run(
            ["npm", "install"],
            cwd=str(WEB_DIR),
            capture_output=True,
            shell=True,
            **decode_text_kwargs(),
        )
        progress.remove_task(task)

    if result.returncode == 0:
        ok("Frontend dependencies installed.")
    else:
        err("npm install failed:")
        console.print(result.stderr[-800:], style="red dim")
        if not Confirm.ask("  Continue anyway?", default=False):
            sys.exit(1)

    console.print()


# Step 3: Launch processes
_procs: list[subprocess.Popen] = []


def stream_output(proc: subprocess.Popen, prefix: str, color: str):
    """Stream process stdout to console with a colored prefix."""
    assert proc.stdout is not None
    for line in proc.stdout:
        line = line.rstrip()
        if line:
            console.print(f"  [{color}]{prefix}[/{color}]  {line}")


def launch_backend() -> subprocess.Popen:
    info("Starting backend on http://localhost:8000 ...")
    env = os.environ.copy()
    env["PYTHONUNBUFFERED"] = "1"
    env["PYTHONUTF8"] = "1"

    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--reload", "--port", "8000"],
        cwd=str(BACKEND_DIR),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        env=env,
        **decode_text_kwargs(),
    )
    _procs.append(proc)
    threading.Thread(target=stream_output, args=(proc, "backend", "blue"), daemon=True).start()
    return proc


def launch_frontend() -> subprocess.Popen:
    info("Starting Next.js frontend on http://localhost:3000 ...")
    env = os.environ.copy()
    env["NEXT_PUBLIC_API_URL"] = "http://localhost:8000"
    env["PYTHONUTF8"] = "1"

    proc = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=str(WEB_DIR),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        env=env,
        shell=True,
        **decode_text_kwargs(),
    )
    _procs.append(proc)
    threading.Thread(target=stream_output, args=(proc, "frontend", "magenta"), daemon=True).start()
    return proc


def wait_for_ready(url: str, label: str, timeout: int = 30) -> bool:
    """Poll a URL until it responds or timeout."""
    import urllib.error
    import urllib.request

    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            urllib.request.urlopen(url, timeout=2)
            return True
        except Exception:
            time.sleep(1)
    return False


def launch_services():
    section("Launching Services")

    backend_proc = launch_backend()

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        transient=True,
        console=console,
    ) as progress:
        task = progress.add_task("  Waiting for backend to start...", total=None)
        ready = wait_for_ready("http://localhost:8000/health", "backend", timeout=30)
        progress.remove_task(task)

    if ready:
        ok("Backend is up at [link=http://localhost:8000]http://localhost:8000[/link]")
    else:
        warn("Backend did not respond in 30s - check logs above. Continuing anyway...")

    frontend_proc = launch_frontend()

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        transient=True,
        console=console,
    ) as progress:
        task = progress.add_task("  Waiting for frontend to start...", total=None)
        ready = wait_for_ready("http://localhost:3000", "frontend", timeout=30)
        progress.remove_task(task)

    if ready:
        ok("Frontend is up at [link=http://localhost:3000]http://localhost:3000[/link]")
    else:
        warn("Frontend did not respond in 30s - check logs above.")

    console.print()
    return backend_proc, frontend_proc


# Step 4: Status panel
def show_status():
    section("ComplianceRadar is Running")

    table = Table(box=box.ROUNDED, show_header=False, padding=(0, 2))
    table.add_column("", style="bold")
    table.add_column("")

    table.add_row("Dashboard", "[link=http://localhost:3000]http://localhost:3000[/link]")
    table.add_row("API", "[link=http://localhost:8000]http://localhost:8000[/link]")
    table.add_row("Health check", "[link=http://localhost:8000/health]http://localhost:8000/health[/link]")
    table.add_row("API docs", "[link=http://localhost:8000/docs]http://localhost:8000/docs[/link]")

    console.print(table)
    console.print()

    console.print(
        Panel(
            "[bold]Quick actions:[/bold]\n\n"
            "  [cyan]Load demo data[/cyan]   ->  Click [bold]Load Demo[/bold] on the dashboard home page\n"
            "  [cyan]Trigger scan[/cyan]     ->  Click [bold]Scan Now[/bold] on the Overview or Alerts page\n"
            "  [cyan]Stop everything[/cyan]  ->  Press [bold]Ctrl+C[/bold] here",
            border_style="dim",
            padding=(0, 2),
        )
    )
    console.print()


# Cleanup
def cleanup():
    console.print()
    info("Shutting down...")
    for proc in _procs:
        try:
            proc.terminate()
            proc.wait(timeout=5)
        except Exception:
            try:
                proc.kill()
            except Exception:
                pass
    ok("All processes stopped. Goodbye.")


# Main
def main():
    header()

    skip_install = "--no-install" in sys.argv or "-n" in sys.argv

    check_env()

    if skip_install:
        warn("Skipping dependency install (--no-install flag).")
        console.print()
    else:
        install_deps()

    backend_proc, frontend_proc = launch_services()

    show_status()

    # Keep alive - stream logs until Ctrl+C
    console.print("[dim]Logs from both services appear below. Press Ctrl+C to stop.[/dim]")
    console.print()

    try:
        while True:
            if backend_proc.poll() is not None:
                err("Backend process exited unexpectedly. Check logs above.")
                break
            if frontend_proc.poll() is not None:
                err("Frontend process exited unexpectedly. Check logs above.")
                break
            time.sleep(2)
    except KeyboardInterrupt:
        pass
    finally:
        cleanup()


if __name__ == "__main__":
    main()
