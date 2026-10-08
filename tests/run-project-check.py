"""Run browser integration checks using a local Chromium/Edge executable.
Usage: python tests/run-project-check.py [--browser PATH]
"""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.request import urlopen
from urllib.parse import urlparse
import argparse, base64, json, os, shutil, socket, struct, subprocess, tempfile, threading, time

root = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
candidates = [shutil.which('chromium'), shutil.which('google-chrome'), shutil.which('msedge'),
              r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe']
candidates.extend(str(path) for path in (Path.home()/'AppData/Local/ms-playwright').glob('chromium-*/chrome-win/chrome.exe'))
parser.add_argument('--browser', default=os.environ.get('CHROME_BINARY') or next((path for path in candidates if path and Path(path).is_file()), None))
args = parser.parse_args()
if not args.browser: parser.error('Specify a Chromium browser with --browser PATH')
class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs): super().__init__(*args, directory=str(root), **kwargs)
    def do_GET(self):
        if self.path == '/_project_check.html':
            html = (root/'index.html').read_text(encoding='utf-8').replace('</body>', '<script src="tests/project-check.js"></script></body>')
            self.send_response(200)
            self.send_header('Content-Type','text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(html.encode())
        else: super().do_GET()
    def log_message(self, *args): pass

class CDP:
    def __init__(self, url):
        endpoint=urlparse(url)
        self.sock=socket.create_connection((endpoint.hostname,endpoint.port),timeout=5)
        key=base64.b64encode(os.urandom(16)).decode()
        self.sock.sendall((f'GET {endpoint.path} HTTP/1.1\r\nHost: {endpoint.netloc}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n').encode())
        header=b''
        while not header.endswith(b'\r\n\r\n'): header+=self.sock.recv(1)
        if b'HTTP/1.1 101 ' not in header: raise RuntimeError(header.decode())
        self.sequence=0
    def read(self,count):
        result=b''
        while len(result)<count:
            data=self.sock.recv(count-len(result))
            if not data: raise RuntimeError('Browser disconnected')
            result+=data
        return result
    def call(self,method,params=None):
        self.sequence+=1
        data=json.dumps({'id':self.sequence,'method':method,'params':params or {}}).encode()
        length=len(data)
        header=bytes([0x81,0x80|length]) if length<126 else bytes([0x81,0xfe])+struct.pack('!H',length)
        mask=os.urandom(4)
        self.sock.sendall(header+mask+bytes(byte^mask[i%4] for i,byte in enumerate(data)))
        while True:
            head=self.read(2); length=head[1]&127
            if length==126: length=struct.unpack('!H',self.read(2))[0]
            elif length==127: length=struct.unpack('!Q',self.read(8))[0]
            message=json.loads(self.read(length))
            if message.get('id')==self.sequence: return message

server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
profile=Path(tempfile.mkdtemp(prefix='_project_check_',dir=root)).resolve()
process=None
try:
    process=subprocess.Popen([args.browser,'--headless','--disable-gpu','--no-sandbox','--remote-debugging-port=0','--user-data-dir='+str(profile),'--window-size=1600,1200','about:blank'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    deadline=time.monotonic()+45
    while not (profile/'DevToolsActivePort').exists():
        if time.monotonic()>deadline: raise TimeoutError('Browser failed to start')
        time.sleep(.1)
    port=(profile/'DevToolsActivePort').read_text().splitlines()[0]
    with urlopen(f'http://127.0.0.1:{port}/json') as response: tabs=json.load(response)
    cdp=CDP(next(tab['webSocketDebuggerUrl'] for tab in tabs if tab['type']=='page'))
    cdp.call('Page.navigate',{'url':f'http://127.0.0.1:{server.server_port}/_project_check.html'})
    result=''
    while time.monotonic()<deadline:
        response=cdp.call('Runtime.evaluate',{'expression':'document.getElementById("verification")?.textContent || ""','returnByValue':True})
        result=response.get('result',{}).get('result',{}).get('value','')
        if result.startswith(('PASS:', 'FAIL:')): break
        time.sleep(.1)
    print(result or 'FAIL: no browser test result')
    if not result.startswith('PASS:'): raise SystemExit(1)
finally:
    if process:
        process.terminate()
        process.wait(timeout=10)
    server.shutdown()
    if profile.parent != root or not profile.name.startswith('_project_check_'): raise RuntimeError('Unsafe cleanup path')
    shutil.rmtree(profile,ignore_errors=True)

