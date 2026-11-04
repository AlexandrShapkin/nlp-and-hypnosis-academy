#!/usr/bin/env python3
"""Run a bounded free-model task in a filesystem sandbox; emit a review-only patch."""
import argparse
from contextlib import ExitStack
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import threading
from opencode_gateway import Gateway, ProviderHandler

SECRET_PATTERN = re.compile(r"-----BEGIN .*PRIVATE KEY|(?:api[_-]?key|password|token|secret)['\"]?\s*[:=]\s*['\"`][^'\"`]{8,}|(?:authorization['\"]?\s*[:=]\s*['\"]?\s*)?Bearer\s+[a-zA-Z0-9._~-]{12,}", re.I)

APPROVED = {"opencode/glm-5.3-flash-free", "opencode/deepseek-v4.1-flash-free"}
DENIED = {".git", ".env", ".env.local", "node_modules", "data", "uploads", "backups", "auth", "credentials"}
EXTENSIONS = {".ts", ".tsx", ".css", ".md", ".json"}


def checked_path(root, value):
    path = Path(value)
    if path.is_absolute() or any(p in {"..", "."} or p.startswith(".") or p.lower() in DENIED for p in path.parts):
        raise ValueError("Only explicit public source-file paths are allowed")
    target = root / path
    if any(p.is_symlink() for p in [target, *target.parents]) or not target.is_file():
        raise ValueError("Allowed files must exist and must not use symbolic links")
    if path.suffix not in EXTENSIONS or any(word in str(path).lower() for word in ["secret", "credential", "contact", "inquir", "auth", "lead"]):
        raise ValueError("Sensitive paths and non-source files cannot be delegated")
    data = target.read_text()
    if len(data.encode()) > 100_000 or SECRET_PATTERN.search(data):
        raise ValueError("File exceeds context limit or contains a potential secret")
    return path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check-only", action="store_true", help="Verify isolated catalog access without invoking a model")
    parser.add_argument("--task", required=True)
    parser.add_argument("--model", default="opencode/glm-5.3-flash-free", choices=sorted(APPROVED))
    parser.add_argument("--allow", action="append", required=True, help="One existing public source file; repeat as needed")
    parser.add_argument("--output", required=True, help="New patch file outside the isolated worker")
    args = parser.parse_args()
    if not 1 <= len(args.task) <= 8000 or "\x00" in args.task:
        parser.error("Task must contain 1–8000 characters")
    if SECRET_PATTERN.search(args.task):
        parser.error("Task text may contain credentials; supply public instructions only")
    for tool in ["opencode", "bwrap", "git"]:
        if not shutil.which(tool):
            parser.error(f"Required tool unavailable: {tool}; no unsafe fallback is permitted")
    executable = Path(shutil.which("opencode")).resolve()
    if not str(executable).startswith("/usr/"):
        parser.error("OpenCode must be installed under /usr for the minimal sandbox")
    root = Path.cwd().resolve()
    paths = list(dict.fromkeys(checked_path(root, value) for value in args.allow))
    output = Path(args.output).resolve()
    if output.exists() or output.suffix != ".patch":
        parser.error("Output must be a new .patch file")
    with tempfile.TemporaryDirectory(prefix="academy-opencode-") as temporary, ExitStack() as cleanup:
        base = Path(temporary)
        gateway_directory = base / "gateway"
        gateway_directory.mkdir()
        gateway = Gateway(str(gateway_directory / "provider.sock"), ProviderHandler)
        threading.Thread(target=gateway.serve_forever, daemon=True).start()
        cleanup.callback(gateway.server_close)
        cleanup.callback(gateway.shutdown)
        work = base / "work"
        work.mkdir()
        for path in paths:
            (work / path).parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(root / path, work / path)
        context = work / "WORKER_INSTRUCTIONS.md"
        context.write_text("Public project: Russian-language Next.js TypeScript CMS. Edit only the explicitly supplied source files. Do not access credentials, install packages, use paid models, deploy, or perform Git operations. Return concise results.\nAllowed paths:\n" + "\n".join(map(str, paths)))
        def git(*argv):
            return subprocess.run(["git", *argv], cwd=work, check=True, capture_output=True)
        git("init", "-q")
        git("add", ".")
        git("-c", "user.name=Isolated worker", "-c", "user.email=worker@example.invalid", "commit", "-qm", "Public context")
        command = ["bwrap", "--die-with-parent", "--new-session", "--unshare-net", "--unshare-pid", "--unshare-ipc", "--unshare-uts", "--unshare-cgroup", "--ro-bind", "/usr", "/usr", "--symlink", "usr/bin", "/bin", "--symlink", "usr/lib", "/lib", "--symlink", "usr/lib", "/lib64", "--proc", "/proc", "--dev", "/dev", "--tmpfs", "/tmp", "--tmpfs", "/home", "--dir", "/home/worker", "--dir", "/etc", "--bind", str(work), "/work", "--ro-bind", str(gateway_directory), "/gateway", "--ro-bind", str(Path(__file__).with_name("opencode_gateway.py").resolve()), "/worker_launcher.py", "--ro-bind", str(work / ".git"), "/work/.git", "--chdir", "/work", "--clearenv", "--setenv", "PATH", "/usr/bin", "--setenv", "HOME", "/home/worker", "--setenv", "XDG_DATA_HOME", "/tmp/data", "--setenv", "XDG_CACHE_HOME", "/tmp/cache", "--setenv", "XDG_STATE_HOME", "/tmp/state", "--setenv", "XDG_CONFIG_HOME", "/tmp/config", "--setenv", "HTTPS_PROXY", "http://127.0.0.1:8081", "--setenv", "HTTP_PROXY", "http://127.0.0.1:8081", "--setenv", "ALL_PROXY", "http://127.0.0.1:8081"]
        for entry in ["/etc/resolv.conf", "/etc/hosts", "/etc/ssl/certs", "/etc/ca-certificates"]:
            if Path(entry).exists():
                command += ["--ro-bind", entry, entry]
        def run(*argv, timeout=120):
            return subprocess.run(command + ["/usr/bin/python3", "/worker_launcher.py", str(executable), "--standalone", *argv], capture_output=True, text=True, timeout=timeout)
        catalog = run("models", timeout=45)
        if catalog.returncode or args.model not in catalog.stdout.split():
            raise RuntimeError("Free model catalog verification failed; no model was invoked: " + (catalog.stderr or catalog.stdout)[-1000:])
        if args.check_only:
            print(f"Isolated catalog verified: {args.model}. No model invocation or patch.")
            return
        result = run("run", "--model", args.model, "--auto", "Read WORKER_INSTRUCTIONS.md. " + args.task, timeout=180)
        if result.returncode:
            raise RuntimeError("Free model execution failed; no patch returned: " + (result.stderr or result.stdout)[-1200:])
        changed = git("diff", "--name-only").stdout.decode().splitlines()
        untracked = git("ls-files", "--others", "--exclude-standard").stdout.decode().splitlines()
        if set(changed) - set(map(str, paths)) or untracked:
            raise RuntimeError("Worker modified disallowed paths; patch rejected")
        for path in paths:
            if (work / path).is_symlink() or not (work / path).is_file():
                raise RuntimeError("Worker replaced an allowed file unsafely")
        patch = git("diff", "--no-ext-diff", "--binary").stdout
        if not patch:
            raise RuntimeError("Worker produced no changes; no implementation claimed")
        with output.open("xb") as target:
            target.write(patch)
        print(f"Model: {args.model}\nChanged files: {len(changed)}\nPatch: {output}\nReview and validate before applying. No original files were changed.")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, RuntimeError, subprocess.SubprocessError, OSError) as error:
        print(f"Delegation stopped: {error}", file=sys.stderr)
        sys.exit(1)
