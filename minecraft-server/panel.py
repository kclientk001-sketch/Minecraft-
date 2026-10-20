#!/usr/bin/env python3
"""Private, loopback-only Minecraft dashboard; credentials stay in .runtime."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from http.cookies import SimpleCookie
from pathlib import Path
import contextlib, hashlib, hmac, importlib.util, io, json, os, re, secrets, socket, subprocess, sys, threading, time
from urllib.parse import urlsplit

ROOT=Path(__file__).resolve().parent
RUNTIME=ROOT/'.runtime'
CREDENTIALS=RUNTIME/'panel-auth.json'
LOCK=threading.RLock()
SESSIONS={}
COOKIE='ryuuworl_panel'
HOST='127.0.0.1'
PORT=8765

def module(name,path):
    spec=importlib.util.spec_from_file_location(name,path)
    item=importlib.util.module_from_spec(spec);spec.loader.exec_module(item);return item

service=module('ryuuworl_service',ROOT/'service.py')
mc=module('ryuuworl_status',ROOT/'status.py')
STATE={'state':'checking','players':None,'maxPlayers':None,'java':False,'bedrock':False,'signaling':False}

def digest(password,salt):
    return hashlib.scrypt(password.encode(),salt=bytes.fromhex(salt),n=16384,r=8,p=1,dklen=32).hex()

def new_session():
    now=time.time()
    for key in list(SESSIONS):
        if SESSIONS[key]<now:del SESSIONS[key]
    token=secrets.token_urlsafe(32);SESSIONS[token]=now+8*3600
    return token

def refresh_state():
    global STATE
    while True:
        alive=bool(service.owned_process());java={};bedrock={};signaling=False
        if alive:
            try:java=mc.java_status(HOST,25565)
            except (OSError,ValueError,KeyError):pass
            try:bedrock=mc.bedrock_status(HOST,19132)
            except (OSError,ValueError,IndexError):pass
            try:
                with socket.create_connection((HOST,19132),timeout=1):signaling=True
            except OSError:pass
        players=java.get('players',{})
        STATE={'state':('running' if java.get('ok') and bedrock.get('ok') else 'starting') if alive else 'stopped',
               'players':players.get('online'),'maxPlayers':players.get('max'),
               'java':bool(java.get('ok')),'bedrock':bool(bedrock.get('ok')),'signaling':signaling,
               'worldVersion':'1.21.11','javaVersions':'1.21 – 26.3','bedrockVersions':'26.30 – 26.52',
               'updatedAt':int(time.time())}
        time.sleep(5)

def private_values():
    values=[]
    env=ROOT.parent/'.env'
    if env.is_file():
        for line in env.read_text().splitlines():
            if '=' not in line or line.lstrip().startswith('#'):continue
            key,value=line.split('=',1);value=value.strip().strip('\"\'')
            if re.search(r'(TOKEN|SECRET|PASSWORD|API_KEY)$',key.strip()) and len(value)>=8:values.append(value)
    return values

PRIVATE_VALUES=private_values()

def log_tail():
    path=ROOT/'logs/console.log'
    if not path.is_file():return ''
    with path.open('rb') as stream:
        stream.seek(max(0,path.stat().st_size-45000));text=stream.read().decode('utf-8',errors='replace')
    # Only show the current startup; never return raw config files or log private values.
    start=text.rfind('Starting org.bukkit.craftbukkit.Main')
    if start>=0:text=text[start:]
    text=re.sub(r'\x1b\[[0-?]*[ -/]*[@-~]','',text)
    for value in PRIVATE_VALUES:text=text.replace(value,'[đã ẩn]')
    text=re.sub(r'-----BEGIN [^-]*PRIVATE KEY-----.*?-----END [^-]*PRIVATE KEY-----','[khóa riêng đã ẩn]',text,flags=re.S)
    text=re.sub(r'(?i)(Bearer\s+)[A-Za-z0-9._~+/-]+=*',r'\1[đã ẩn]',text)
    text=re.sub(r'(?i)((?:access_token|refresh_token|agent_token|password|secret)\s*[=:]\s*)[^\s,;]+',r'\1[đã ẩn]',text)
    text=re.sub(r'(?i)(/(?:register|login|changepassword)\s+)[^\n]+',r'\1[đối số đã ẩn]',text)
    return '\n'.join(text.splitlines()[-180:])

class Handler(BaseHTTPRequestHandler):
    server_version='RyuuworlPanel'
    sys_version=''
    def log_message(self,*_args):pass
    def host_ok(self):return self.headers.get('Host','') in {f'127.0.0.1:{PORT}',f'localhost:{PORT}'}
    def authenticated(self):
        try:
            cookie=SimpleCookie();cookie.load(self.headers.get('Cookie',''))
            token=cookie[COOKIE].value
            return SESSIONS.get(token,0)>time.time()
        except (KeyError,ValueError):return False
    def reply(self,status,data,content_type='application/json; charset=utf-8',cookie=None):
        if isinstance(data,(dict,list)):data=json.dumps(data,ensure_ascii=False).encode()
        elif isinstance(data,str):data=data.encode()
        self.send_response(status)
        self.send_header('Content-Type',content_type)
        self.send_header('Content-Length',str(len(data)))
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('X-Frame-Options','DENY')
        self.send_header('Referrer-Policy','no-referrer')
        self.send_header('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
        if cookie:self.send_header('Set-Cookie',cookie)
        self.end_headers()
        try:self.wfile.write(data)
        except (BrokenPipeError,ConnectionResetError):pass
    def do_GET(self):
        if not self.host_ok():return self.reply(403,{'error':'Host không hợp lệ.'})
        path=urlsplit(self.path).path
        if path=='/api/session':return self.reply(200,{'configured':CREDENTIALS.is_file(),'authenticated':self.authenticated()})
        static={'/':('index.html','text/html; charset=utf-8'),'/panel.css':('panel.css','text/css; charset=utf-8'),'/panel.js':('panel.js','text/javascript; charset=utf-8')}
        if path in static:
            name,mime=static[path];return self.reply(200,(ROOT/'panel'/name).read_bytes(),mime)
        if not self.authenticated():return self.reply(401,{'error':'Vui lòng đăng nhập bảng điều khiển.'})
        if path=='/api/state':return self.reply(200,STATE)
        if path=='/api/logs':return self.reply(200,{'text':log_tail()})
        return self.reply(404,{'error':'Không tìm thấy.'})
    def do_OPTIONS(self):self.reply(403,{'error':'Không cho phép truy cập từ trang khác.'})
    def do_POST(self):
        if not self.host_ok():return self.reply(403,{'error':'Host không hợp lệ.'})
        origin=self.headers.get('Origin','')
        if origin not in {f'http://127.0.0.1:{PORT}',f'http://localhost:{PORT}'}:
            return self.reply(403,{'error':'Chỉ thao tác từ bảng điều khiển cục bộ.'})
        if self.headers.get('Content-Type','').split(';')[0]!='application/json':return self.reply(415,{'error':'Yêu cầu JSON.'})
        try:
            size=int(self.headers.get('Content-Length','0'))
            if size<2 or size>4096:raise ValueError()
            data=json.loads(self.rfile.read(size))
            if not isinstance(data,dict):raise ValueError()
        except (ValueError,UnicodeError):return self.reply(400,{'error':'Dữ liệu không hợp lệ.'})
        path=urlsplit(self.path).path
        with LOCK:
            if path in ('/api/setup','/api/login'):
                password=data.get('password','')
                if not isinstance(password,str) or not 8<=len(password)<=128:
                    return self.reply(400,{'error':'Mật khẩu cần từ 8 đến 128 ký tự.'})
                if path=='/api/setup':
                    if CREDENTIALS.exists():return self.reply(409,{'error':'Đã có mật khẩu quản trị. Hãy đăng nhập.'})
                    salt=secrets.token_hex(16)
                    encoded=json.dumps({'salt':salt,'hash':digest(password,salt),'algorithm':'scrypt'})
                    fd=os.open(CREDENTIALS,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
                    with os.fdopen(fd,'w') as stream:stream.write(encoded+'\n')
                else:
                    if not CREDENTIALS.exists():return self.reply(409,{'error':'Cần đặt mật khẩu lần đầu.'})
                    saved=json.loads(CREDENTIALS.read_text())
                    if not hmac.compare_digest(digest(password,saved['salt']),saved['hash']):
                        return self.reply(401,{'error':'Mật khẩu không đúng.'})
                token=new_session()
                return self.reply(200,{'ok':True},cookie=f'{COOKIE}={token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800')
            if not self.authenticated():return self.reply(401,{'error':'Phiên đăng nhập đã hết hạn.'})
            if path=='/api/logout':
                cookie=SimpleCookie();cookie.load(self.headers.get('Cookie',''))
                if COOKIE in cookie:SESSIONS.pop(cookie[COOKIE].value,None)
                return self.reply(200,{'ok':True},cookie=f'{COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0')
            if path!='/api/action':return self.reply(404,{'error':'Không tìm thấy.'})
            action=data.get('action')
            try:
                if action=='start':
                    result=subprocess.run([sys.executable,str(ROOT/'service.py'),'start'],cwd=ROOT,capture_output=True,timeout=15)
                    if result.returncode:raise ValueError('Không khởi động được; xem log server.')
                    message='Đã yêu cầu khởi động. Chờ server nạp xong.'
                elif action in ('stop','command'):
                    command='stop' if action=='stop' else data.get('command','')
                    if not isinstance(command,str) or not command.strip() or len(command)>500 or '\n' in command or '\r' in command:
                        raise ValueError('Nhập một lệnh, tối đa 500 ký tự.')
                    with contextlib.redirect_stdout(io.StringIO()):service.send_command(command.lstrip('/'))
                    message='Đã yêu cầu lưu và dừng server.' if action=='stop' else 'Đã gửi lệnh tới server.'
                else:raise ValueError('Thao tác không hợp lệ.')
            except (OSError,ValueError,SystemExit,subprocess.TimeoutExpired):
                return self.reply(409,{'error':'Chưa thực hiện được. Kiểm tra trạng thái và log server.'})
            return self.reply(200,{'ok':True,'message':message})

def main():
    os.umask(0o077);RUNTIME.mkdir(mode=0o700,exist_ok=True)
    server=ThreadingHTTPServer((HOST,PORT),Handler)
    server.daemon_threads=True
    (RUNTIME/'panel.pid').write_text(str(os.getpid())+'\n')
    threading.Thread(target=refresh_state,daemon=True).start()
    print('Ryuuworl panel listening at http://127.0.0.1:8765 (local device only)',flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()
if __name__=='__main__':main()
