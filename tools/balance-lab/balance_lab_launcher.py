#!/usr/bin/env python3
"""Small Tkinter launcher for local Balance Lab experiments."""

from __future__ import annotations

import os
import queue
import re
import subprocess
import sys
import threading
import tkinter as tk
from pathlib import Path
from tkinter import messagebox, ttk


def configure_utf8_stdio() -> None:
    """Prefer UTF-8 for any console attached to the GUI launcher."""
    os.environ.setdefault("PYTHONUTF8", "1")
    os.environ.setdefault("PYTHONIOENCODING", "utf-8")
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure is None:
            continue
        try:
            reconfigure(encoding="utf-8", errors="replace")
        except (OSError, ValueError):
            pass


def utf8_subprocess_env() -> dict[str, str]:
    """Launch Balance Lab CLI with UTF-8 Python stdio even from Windows GUI shells."""
    env = os.environ.copy()
    env.setdefault("PYTHONUTF8", "1")
    env.setdefault("PYTHONIOENCODING", "utf-8")
    return env


APP_TITLE = "Gridfall Tactics Balance Lab"
EXPERIMENTS_RELATIVE_PATH = Path("tools") / "balance-lab" / "experiments"
REPORTS_RELATIVE_PATH = Path("tools") / "balance-lab" / "reports"
RUNNER_RELATIVE_PATH = Path("tools") / "balance-lab" / "run_balance_lab.py"
REQUIRED_REPO_PATHS = (
    Path("package.json"),
    Path("scripts") / "simulate-battles.mjs",
    Path("src") / "data" / "factions",
)
REPORT_LINE_PATTERN = re.compile(r"^(?:Report folder|Batch summary folder):\s*(.+?)\s*$")


class BalanceLabLauncher(tk.Tk):
    """Tkinter app that runs the existing Balance Lab CLI without blocking."""

    def __init__(self) -> None:
        super().__init__()
        self.title(APP_TITLE)
        self.minsize(860, 560)

        self.repo_root = detect_repo_root()
        self.experiments_dir = self.repo_root / EXPERIMENTS_RELATIVE_PATH
        self.reports_dir = self.repo_root / REPORTS_RELATIVE_PATH
        self.runner_path = self.repo_root / RUNNER_RELATIVE_PATH
        self.output_queue: queue.Queue[tuple[str, str | int | None]] = queue.Queue()
        self.run_thread: threading.Thread | None = None
        self.running = False
        self.last_report_folder: Path | None = find_newest_report_folder(self.reports_dir)

        self.repo_root_var = tk.StringVar(value=str(self.repo_root))
        self.status_var = tk.StringVar(value="Ready.")
        self.last_report_var = tk.StringVar(value=self.format_last_report_text())

        self.create_widgets()
        self.refresh_experiments()
        self.after(100, self.process_output_queue)

    def create_widgets(self) -> None:
        root_frame = ttk.Frame(self, padding=12)
        root_frame.grid(row=0, column=0, sticky="nsew")
        self.columnconfigure(0, weight=1)
        self.rowconfigure(0, weight=1)
        root_frame.columnconfigure(0, weight=1)
        root_frame.rowconfigure(2, weight=1)

        header = ttk.Label(root_frame, text=APP_TITLE, font=("Segoe UI", 16, "bold"))
        header.grid(row=0, column=0, sticky="w")

        repo_label = ttk.Label(root_frame, textvariable=self.repo_root_var)
        repo_label.grid(row=1, column=0, sticky="ew", pady=(2, 10))

        main_pane = ttk.PanedWindow(root_frame, orient=tk.HORIZONTAL)
        main_pane.grid(row=2, column=0, sticky="nsew")

        left_frame = ttk.Frame(main_pane, padding=(0, 0, 8, 0))
        right_frame = ttk.Frame(main_pane, padding=(8, 0, 0, 0))
        main_pane.add(left_frame, weight=1)
        main_pane.add(right_frame, weight=3)

        left_frame.columnconfigure(0, weight=1)
        left_frame.rowconfigure(1, weight=1)
        ttk.Label(left_frame, text="Experiment JSON files").grid(row=0, column=0, sticky="w")

        list_frame = ttk.Frame(left_frame)
        list_frame.grid(row=1, column=0, sticky="nsew", pady=(4, 8))
        list_frame.columnconfigure(0, weight=1)
        list_frame.rowconfigure(0, weight=1)
        self.experiment_listbox = tk.Listbox(list_frame, exportselection=False, height=12)
        self.experiment_listbox.grid(row=0, column=0, sticky="nsew")
        list_scrollbar = ttk.Scrollbar(list_frame, orient=tk.VERTICAL, command=self.experiment_listbox.yview)
        list_scrollbar.grid(row=0, column=1, sticky="ns")
        self.experiment_listbox.configure(yscrollcommand=list_scrollbar.set)

        button_frame = ttk.Frame(left_frame)
        button_frame.grid(row=2, column=0, sticky="ew")
        button_frame.columnconfigure(0, weight=1)
        self.run_selected_button = ttk.Button(
            button_frame,
            text="Run selected experiment",
            command=self.run_selected_experiment,
        )
        self.run_selected_button.grid(row=0, column=0, sticky="ew", pady=2)
        self.run_all_button = ttk.Button(
            button_frame,
            text="Run all experiments in folder",
            command=self.run_all_experiments,
        )
        self.run_all_button.grid(row=1, column=0, sticky="ew", pady=2)
        self.open_reports_button = ttk.Button(
            button_frame,
            text="Open reports folder",
            command=lambda: self.open_folder(self.reports_dir),
        )
        self.open_reports_button.grid(row=2, column=0, sticky="ew", pady=2)
        self.open_experiments_button = ttk.Button(
            button_frame,
            text="Open experiments folder",
            command=lambda: self.open_folder(self.experiments_dir),
        )
        self.open_experiments_button.grid(row=3, column=0, sticky="ew", pady=2)
        self.refresh_button = ttk.Button(button_frame, text="Refresh list", command=self.refresh_experiments)
        self.refresh_button.grid(row=4, column=0, sticky="ew", pady=2)

        right_frame.columnconfigure(0, weight=1)
        right_frame.rowconfigure(1, weight=1)
        ttk.Label(right_frame, text="Log").grid(row=0, column=0, sticky="w")
        log_frame = ttk.Frame(right_frame)
        log_frame.grid(row=1, column=0, sticky="nsew", pady=(4, 0))
        log_frame.columnconfigure(0, weight=1)
        log_frame.rowconfigure(0, weight=1)
        self.log_text = tk.Text(log_frame, wrap="word", state="disabled", height=18)
        self.log_text.grid(row=0, column=0, sticky="nsew")
        log_scrollbar = ttk.Scrollbar(log_frame, orient=tk.VERTICAL, command=self.log_text.yview)
        log_scrollbar.grid(row=0, column=1, sticky="ns")
        self.log_text.configure(yscrollcommand=log_scrollbar.set)

        status_frame = ttk.Frame(root_frame)
        status_frame.grid(row=3, column=0, sticky="ew", pady=(10, 0))
        status_frame.columnconfigure(0, weight=1)
        ttk.Label(status_frame, textvariable=self.status_var).grid(row=0, column=0, sticky="w")
        ttk.Label(status_frame, textvariable=self.last_report_var).grid(row=1, column=0, sticky="w")

    def refresh_experiments(self) -> None:
        current_selection = self.get_selected_experiment_name()
        self.experiment_listbox.delete(0, tk.END)
        self.experiment_paths = sorted(self.experiments_dir.glob("*.json")) if self.experiments_dir.exists() else []
        for experiment_path in self.experiment_paths:
            self.experiment_listbox.insert(tk.END, experiment_path.name)

        if self.experiment_paths:
            selected_index = 0
            if current_selection:
                for index, experiment_path in enumerate(self.experiment_paths):
                    if experiment_path.name == current_selection:
                        selected_index = index
                        break
            self.experiment_listbox.selection_set(selected_index)
            self.experiment_listbox.activate(selected_index)
            self.status_var.set(f"Ready. Found {len(self.experiment_paths)} experiment file(s).")
        else:
            self.status_var.set(f"No experiment JSON files found in {self.experiments_dir}")

    def get_selected_experiment_name(self) -> str | None:
        selection = self.experiment_listbox.curselection()
        if not selection:
            return None
        return str(self.experiment_listbox.get(selection[0]))

    def get_selected_experiment_path(self) -> Path | None:
        selection = self.experiment_listbox.curselection()
        if not selection:
            return None
        index = selection[0]
        if index >= len(self.experiment_paths):
            return None
        return self.experiment_paths[index]

    def run_selected_experiment(self) -> None:
        experiment_path = self.get_selected_experiment_path()
        if experiment_path is None:
            messagebox.showwarning(APP_TITLE, "Select an experiment JSON file first.")
            return
        self.start_run(experiment_path, f"Running selected experiment: {experiment_path.name}")

    def run_all_experiments(self) -> None:
        self.start_run(self.experiments_dir, "Running all experiments in folder")

    def start_run(self, target_path: Path, description: str) -> None:
        if self.running:
            messagebox.showinfo(APP_TITLE, "Balance Lab is already running.")
            return
        if not self.validate_launcher_paths():
            return

        self.running = True
        self.set_run_buttons_enabled(False)
        self.status_var.set(description)
        self.append_log(f"\n=== {description} ===\n")
        self.append_log(f"Repository: {self.repo_root}\n")
        self.append_log(f"Command: {sys.executable} {self.runner_path} {target_path}\n\n")

        self.run_thread = threading.Thread(target=self.run_cli_worker, args=(target_path,), daemon=True)
        self.run_thread.start()

    def validate_launcher_paths(self) -> bool:
        missing = [path for path in REQUIRED_REPO_PATHS if not (self.repo_root / path).exists()]
        if missing:
            messagebox.showerror(
                APP_TITLE,
                "Could not find the Gridfall Tactics repository root.\n\n"
                + "Missing:\n"
                + "\n".join(str(path) for path in missing),
            )
            return False
        if not self.runner_path.exists():
            messagebox.showerror(APP_TITLE, f"Balance Lab runner not found:\n{self.runner_path}")
            return False
        if not self.experiments_dir.exists():
            messagebox.showerror(APP_TITLE, f"Experiments folder not found:\n{self.experiments_dir}")
            return False
        return True

    def run_cli_worker(self, target_path: Path) -> None:
        command = [sys.executable, str(self.runner_path), str(target_path)]
        try:
            process = subprocess.Popen(
                command,
                cwd=str(self.repo_root),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                errors="replace",
                bufsize=1,
                env=utf8_subprocess_env(),
            )
        except OSError as error:
            self.output_queue.put(("error", f"Could not start Balance Lab: {error}"))
            self.output_queue.put(("done", 1))
            return

        assert process.stdout is not None
        for line in process.stdout:
            self.output_queue.put(("line", line))
        exit_code = process.wait()
        self.output_queue.put(("done", exit_code))

    def process_output_queue(self) -> None:
        try:
            while True:
                event, value = self.output_queue.get_nowait()
                if event == "line" and isinstance(value, str):
                    self.append_log(value)
                    maybe_report_folder = parse_report_folder(value, self.repo_root)
                    if maybe_report_folder is not None:
                        self.last_report_folder = maybe_report_folder
                        self.last_report_var.set(self.format_last_report_text())
                elif event == "error" and isinstance(value, str):
                    self.append_log(value + "\n")
                    self.status_var.set(value)
                elif event == "done":
                    self.finish_run(int(value) if value is not None else 1)
        except queue.Empty:
            pass
        self.after(100, self.process_output_queue)

    def finish_run(self, exit_code: int) -> None:
        self.running = False
        self.set_run_buttons_enabled(True)
        latest_report = find_newest_report_folder(self.reports_dir)
        if latest_report is not None:
            self.last_report_folder = latest_report
            self.last_report_var.set(self.format_last_report_text())

        if exit_code == 0:
            message = "Balance Lab finished successfully."
            self.status_var.set(message)
            self.append_log(f"\n=== {message} ===\n")
            messagebox.showinfo(APP_TITLE, self.finish_message(message))
        else:
            message = f"Balance Lab failed with exit code {exit_code}."
            self.status_var.set(message)
            self.append_log(f"\n=== {message} ===\n")
            messagebox.showerror(APP_TITLE, self.finish_message(message))

    def finish_message(self, message: str) -> str:
        if self.last_report_folder is None:
            return message
        return f"{message}\n\nLast report folder:\n{self.last_report_folder}"

    def set_run_buttons_enabled(self, enabled: bool) -> None:
        state = tk.NORMAL if enabled else tk.DISABLED
        self.run_selected_button.configure(state=state)
        self.run_all_button.configure(state=state)
        self.refresh_button.configure(state=state)

    def append_log(self, text: str) -> None:
        self.log_text.configure(state="normal")
        self.log_text.insert(tk.END, text)
        self.log_text.see(tk.END)
        self.log_text.configure(state="disabled")

    def format_last_report_text(self) -> str:
        if self.last_report_folder is None:
            return "Last report folder: none detected yet."
        return f"Last report folder: {self.last_report_folder}"

    def open_folder(self, folder: Path) -> None:
        try:
            folder.mkdir(parents=True, exist_ok=True)
            open_path(folder)
        except OSError as error:
            messagebox.showerror(APP_TITLE, f"Could not open folder:\n{folder}\n\n{error}")


def detect_repo_root() -> Path:
    """Find the repo root from this file location, falling back to cwd."""
    candidates = [Path(__file__).resolve(), *Path(__file__).resolve().parents, Path.cwd().resolve()]
    for candidate in candidates:
        directory = candidate if candidate.is_dir() else candidate.parent
        if all((directory / path).exists() for path in REQUIRED_REPO_PATHS):
            return directory
    return Path.cwd().resolve()


def parse_report_folder(line: str, repo_root: Path) -> Path | None:
    match = REPORT_LINE_PATTERN.match(line.strip())
    if not match:
        return None
    path = Path(match.group(1).strip())
    if not path.is_absolute():
        path = repo_root / path
    return path


def find_newest_report_folder(reports_dir: Path) -> Path | None:
    if not reports_dir.exists():
        return None
    report_folders = [path for path in reports_dir.iterdir() if path.is_dir()]
    if not report_folders:
        return None
    return max(report_folders, key=lambda path: path.stat().st_mtime)


def open_path(path: Path) -> None:
    if sys.platform.startswith("win"):
        os.startfile(path)  # type: ignore[attr-defined]
        return
    if sys.platform == "darwin":
        subprocess.Popen(["open", str(path)])
        return
    subprocess.Popen(["xdg-open", str(path)])


def main() -> int:
    configure_utf8_stdio()

    app = BalanceLabLauncher()
    app.mainloop()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
