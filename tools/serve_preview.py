#!/usr/bin/env python3
"""Loopback-only static preview; exact case checks approximate a Linux host."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit
import argparse


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.server.strict:
            parts = Path(unquote(urlsplit(self.path).path).lstrip("/")).parts
            current = Path(self.directory)
            for part in parts:
                if part in {".", ".."} or part not in {p.name for p in current.iterdir()}:
                    self.send_error(404, "Exact path absent")
                    return
                current = current / part
                if not current.is_dir() and part != parts[-1]:
                    self.send_error(404)
                    return
        super().do_GET()

    def list_directory(self, path):
        self.send_error(403, "Directory listing disabled")
        return None

    def log_message(self, fmt, *args):
        if len(args) > 1 and str(args[1]) not in {"200", "304", "301"}:
            super().log_message(fmt, *args)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("directory", type=Path)
    parser.add_argument("--port", type=int, required=True)
    parser.add_argument("--strict", action="store_true")
    args = parser.parse_args()
    root = args.directory.resolve()
    handler = partial(Handler, directory=str(root))
    server = ThreadingHTTPServer(("127.0.0.1", args.port), handler)
    server.strict = args.strict
    print(f"Serving {root} at http://127.0.0.1:{args.port}/ (strict={args.strict})", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
