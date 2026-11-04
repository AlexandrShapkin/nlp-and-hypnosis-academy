"""HTTPS-only gateway to public free-model endpoints, with no LAN/host access."""
import ipaddress
import select
import socket
import socketserver
import subprocess
import sys
import threading

ALLOWED_HOSTS = {"opencode.ai", "api.opencode.ai", "models.dev"}


def relay(left, right):
    while True:
        ready, _, _ = select.select([left, right], [], [], 30)
        if not ready:
            return
        for source in ready:
            data = source.recv(65536)
            if not data:
                return
            (right if source is left else left).sendall(data)


class ProviderHandler(socketserver.BaseRequestHandler):
    def handle(self):
        self.request.settimeout(15)
        header = b""
        while b"\r\n\r\n" not in header and len(header) < 8192:
            part = self.request.recv(1024)
            if not part:
                return
            header += part
        try:
            first = header.split(b"\r\n", 1)[0].decode("ascii").split()
            if len(first) != 3 or first[0] != "CONNECT" or first[2] != "HTTP/1.1":
                raise ValueError("HTTPS CONNECT required")
            host, port = first[1].rsplit(":", 1)
            if host not in ALLOWED_HOSTS or port != "443":
                raise ValueError("Unapproved provider")
            addresses = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
            if not addresses or any(not ipaddress.ip_address(item[4][0]).is_global for item in addresses):
                raise ValueError("Non-public provider address")
            family, kind, protocol, _, address = addresses[0]
            with socket.socket(family, kind, protocol) as upstream:
                upstream.settimeout(15)
                upstream.connect(address)
                self.request.sendall(b"HTTP/1.1 200 Connection Established\r\n\r\n")
                relay(self.request, upstream)
        except (OSError, ValueError, UnicodeError):
            self.request.sendall(b"HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\n\r\n")


class Gateway(socketserver.ThreadingUnixStreamServer):
    daemon_threads = True


class BridgeHandler(socketserver.BaseRequestHandler):
    def handle(self):
        try:
            with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as upstream:
                upstream.connect("/gateway/provider.sock")
                relay(self.request, upstream)
        except OSError:
            pass


class Bridge(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    # Executed only inside the network namespace: its sole egress is a narrow Unix socket.
    with Bridge(("127.0.0.1", 8081), BridgeHandler) as bridge:
        threading.Thread(target=bridge.serve_forever, daemon=True).start()
        sys.exit(subprocess.call(sys.argv[1:]))
