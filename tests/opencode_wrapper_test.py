"""Worker safety tests, with no network/model requests."""
import importlib.util
from pathlib import Path
import subprocess
import sys
import tempfile
import shutil
import socket
import threading
from unittest.mock import Mock
sys.path.insert(0, str(Path(__file__).parents[1] / "scripts"))
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("worker", Path(__file__).parents[1] / "scripts/opencode_free_task.py")
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)


class WorkerSafety(unittest.TestCase):
    def test_path_and_secret_rejection(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "safe.ts").write_text('export const label = "Hello";')
            (root / "secret.ts").write_text('export const value = "private";')
            (root / "linked.ts").symlink_to(root / "safe.ts")
            for path in ["../safe.ts", "/etc/passwd", ".env.local", "data/site.sqlite", "secret.ts", "linked.ts"]:
                with self.subTest(path=path), self.assertRaises(ValueError):
                    worker.checked_path(root, path)
            self.assertEqual(worker.checked_path(root, "safe.ts"), Path("safe.ts"))
            (root / "safe.ts").write_text('const api_key = "a-very-private-key-value";')
            with self.assertRaises(ValueError):
                worker.checked_path(root, "safe.ts")
            for content in ['{"password":"a-very-private-password"}', 'const api_key = `a-very-private-key`;', 'Bearer eyVeryLongSyntheticCredential']:
                (root / "safe.ts").write_text(content)
                with self.assertRaises(ValueError):
                    worker.checked_path(root, "safe.ts")

    def delegation(self, malicious):
        real_run = subprocess.run
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "copy.ts"
            source.write_text('export const label = "Hello";')
            output = root / "result.patch"
            def fake_run(argv, **kwargs):
                if argv[0] != "bwrap":
                    return real_run(argv, **kwargs)
                work = Path(argv[argv.index("--bind") + 1])
                self.assertNotIn(str(root), argv)
                self.assertIn("--clearenv", argv)
                self.assertIn("--unshare-net", argv)
                self.assertIn("--ro-bind", argv)
                if argv[-1] == "models":
                    return subprocess.CompletedProcess(argv, 0, "opencode/glm-5.3-flash-free\n", "")
                self.assertEqual(sorted(p.name for p in work.iterdir()), [".git", "WORKER_INSTRUCTIONS.md", "copy.ts"])
                (work / ("unexpected.ts" if malicious else "copy.ts")).write_text('export const label = "Здравствуйте";')
                return subprocess.CompletedProcess(argv, 0, "done", "")
            args = ["worker", "--task", "Translate label", "--allow", "copy.ts", "--output", str(output)]
            with patch.object(Path, "cwd", return_value=root), patch.object(sys, "argv", args), patch.object(worker.subprocess, "run", side_effect=fake_run):
                if malicious:
                    with self.assertRaisesRegex(RuntimeError, "disallowed"):
                        worker.main()
                    self.assertFalse(output.exists())
                else:
                    worker.main()
                    self.assertIn("Здравствуйте", output.read_text())
            self.assertEqual(source.read_text(), 'export const label = "Hello";')

    def test_scoped_patch_without_original_mutation(self):
        self.delegation(False)

    def test_disallowed_worker_change_rejects_entire_patch(self):
        self.delegation(True)

    @unittest.skipUnless(shutil.which("bwrap"), "Bubblewrap unavailable; wrapper itself fails closed")
    def test_real_filesystem_and_network_isolation(self):
        with tempfile.TemporaryDirectory() as directory:
            sentinel = Path(directory) / "private.txt"
            sentinel.write_text("synthetic private data")
            listener = socket.socket()
            self.addCleanup(listener.close)
            listener.bind(("127.0.0.1", 0))
            listener.listen(1)
            port = listener.getsockname()[1]
            probe = "import pathlib,socket; p=pathlib.Path(" + repr(str(sentinel)) + "); assert not p.exists(); s=socket.socket(); assert s.connect_ex(('127.0.0.1'," + str(port) + ")) != 0"
            result = subprocess.run(["bwrap", "--unshare-all", "--ro-bind", "/usr", "/usr", "--symlink", "usr/bin", "/bin", "--symlink", "usr/lib", "/lib", "--symlink", "usr/lib", "/lib64", "--proc", "/proc", "--dev", "/dev", "--tmpfs", "/tmp", "/usr/bin/python3", "-c", probe], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(sentinel.read_text(), "synthetic private data")

    def test_provider_gateway_rejects_host_lan_and_unapproved_hosts(self):
        from opencode_gateway import Gateway, ProviderHandler
        with tempfile.TemporaryDirectory() as directory:
            address = str(Path(directory) / "provider.sock")
            with Gateway(address, ProviderHandler) as gateway:
                thread = threading.Thread(target=gateway.serve_forever, daemon=True)
                thread.start()
                try:
                    for target in ["127.0.0.1:8080", "169.254.169.254:443", "github.com:443", "opencode.ai:80", "api.opencode.ai.attacker.test:443"]:
                        with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as client:
                            client.connect(address)
                            client.sendall(f"CONNECT {target} HTTP/1.1\r\n\r\n".encode())
                            self.assertIn(b"403 Forbidden", client.recv(1024))
                    with patch("opencode_gateway.socket.getaddrinfo", return_value=[(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("127.0.0.1", 443))]):
                        with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as client:
                            client.connect(address)
                            client.sendall(b"CONNECT opencode.ai:443 HTTP/1.1\r\n\r\n")
                            self.assertIn(b"403 Forbidden", client.recv(1024))
                finally:
                    gateway.shutdown()

    def test_paid_model_rejected(self):
        with patch.object(sys, "argv", ["worker", "--task", "x", "--allow", "x.ts", "--output", "/tmp/x.patch", "--model", "paid/model"]):
            with self.assertRaises(SystemExit):
                worker.main()


if __name__ == "__main__":
    unittest.main()
