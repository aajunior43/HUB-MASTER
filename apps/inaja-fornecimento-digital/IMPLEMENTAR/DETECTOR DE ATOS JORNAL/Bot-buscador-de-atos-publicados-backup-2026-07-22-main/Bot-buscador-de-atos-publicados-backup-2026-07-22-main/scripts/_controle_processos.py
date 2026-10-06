"""Controle seguro do conjunto WEB + BOT do projeto (Windows/Linux)."""
from __future__ import annotations

import argparse
import os
import signal
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MARKERS = ("iniciar_tudo.py", "run_interface.py", "main.py")


def processos() -> list[tuple[int, str, str]]:
    if os.name == "nt":
        cmd = "Get-CimInstance Win32_Process | Select-Object ProcessId,Name,CommandLine | ConvertTo-Json -Compress"
        try:
            import json
            raw = subprocess.check_output(["powershell", "-NoProfile", "-Command", cmd], text=True)
            data = json.loads(raw) if raw.strip() else []
            if isinstance(data, dict): data = [data]
            return [(int(x["ProcessId"]), x.get("Name", ""), x.get("CommandLine", ""))
                    for x in data if str(x.get("CommandLine", "")).find(str(ROOT)) >= 0]
        except Exception:
            return []
    return []


def ativos() -> list[tuple[int, str, str]]:
    return [p for p in processos() if any(m in p[2] for m in MARKERS)]


def parar() -> int:
    atuais = [p for p in ativos() if p[0] != os.getpid()]
    if not atuais:
        print("Nenhum processo do sistema está ativo.")
        return 0
    for pid, _name, _cmd in atuais:
        if os.name == "nt":
            subprocess.run(["taskkill", "/PID", str(pid), "/T", "/F"], capture_output=True)
        else:
            try: os.kill(pid, signal.SIGTERM)
            except OSError: pass
    print(f"Processos encerrados: {len(atuais)}")
    return 0


def iniciar() -> int:
    if ativos():
        print("O sistema já está ativo; nenhuma nova instância foi iniciada.")
        for pid, name, _ in ativos(): print(f"  PID {pid} {name}")
        return 0
    py = sys.executable
    flags = getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0) if os.name == "nt" else 0
    # Mantém stdout/stderr herdados do menu. Assim o launcher pode encaminhar
    # as linhas [BOT] e [WEB] para esta mesma janela, em vez de descartá-las.
    subprocess.Popen([py, "iniciar_tudo.py"], cwd=ROOT, creationflags=flags)
    print("Sistema iniciado; o progresso aparecerá nesta janela.")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("acao", choices=("status", "iniciar", "parar", "reiniciar"))
    args = ap.parse_args()
    if args.acao == "status":
        rows = ativos()
        print(f"Sistema {'ATIVO' if rows else 'PARADO'}")
        for pid, name, cmd in rows: print(f"  PID={pid} {name} | {cmd}")
        return 0
    if args.acao == "parar": return parar()
    if args.acao == "reiniciar":
        parar(); time.sleep(1)
    return iniciar()


if __name__ == "__main__": raise SystemExit(main())
