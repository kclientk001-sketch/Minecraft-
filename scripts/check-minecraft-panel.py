#!/usr/bin/env python3
"""Exercise panel authentication and command isolation without changing the live game or its credentials."""
from pathlib import Path
from http.server import ThreadingHTTPServer
import hashlib,importlib.util,json,secrets,tempfile,threading,types,urllib.error,urllib.request
ROOT=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('panel_test',ROOT/'minecraft-server/panel.py')
panel=importlib.util.module_from_spec(spec);spec.loader.exec_module(panel)
commands=[]
panel.service=types.SimpleNamespace(send_command=lambda command:commands.append(command))

def main():
 with tempfile.TemporaryDirectory(prefix='panel-check-',dir=ROOT/'.build-tools') as folder:
  panel.CREDENTIALS=Path(folder)/'credentials.json'
  server=ThreadingHTTPServer(('127.0.0.1',0),panel.Handler)
  panel.PORT=server.server_address[1]
  base='http://127.0.0.1:'+str(panel.PORT)
  thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
  def request(path,data=None,cookie=None,origin=None,host=None):
   headers={}
   if data is not None:headers={'Content-Type':'application/json','Origin':base if origin is None else origin}
   if cookie:headers['Cookie']=cookie
   if host:headers['Host']=host
   req=urllib.request.Request(base+path,data=None if data is None else json.dumps(data).encode(),headers=headers)
   try:
    with urllib.request.urlopen(req,timeout=5) as response:return response.status,response.headers,response.read()
   except urllib.error.HTTPError as error:return error.code,error.headers,error.read()
  try:
   assert request('/')[0]==200
   assert request('/panel.js')[0]==200 and request('/panel.css')[0]==200
   for route in ['/api/state','/api/logs']:
    assert request(route)[0]==401
   assert request('/api/action',{'action':'command','command':'stop'})[0]==401 and not commands
   assert request('/',host='untrusted.example')[0]==403
   assert request('/api/setup',{'password':secrets.token_urlsafe(16)},origin='https://untrusted.example')[0]==403
   assert not panel.CREDENTIALS.exists()
   assert request('/api/setup',{'password':'short'})[0]==400
   password=secrets.token_urlsafe(24)
   code,headers,_=request('/api/setup',{'password':password})
   assert code==200 and 'HttpOnly' in headers['Set-Cookie'] and 'SameSite=Strict' in headers['Set-Cookie']
   cookie=headers['Set-Cookie'].split(';')[0]
   stored=json.loads(panel.CREDENTIALS.read_text())
   assert password not in panel.CREDENTIALS.read_text() and stored['algorithm']=='scrypt'
   assert panel.CREDENTIALS.stat().st_mode&0o777==0o600
   assert request('/api/setup',{'password':password})[0]==409
   assert request('/api/login',{'password':secrets.token_urlsafe(24)})[0]==401
   assert request('/api/state',cookie=cookie)[0]==200
   assert request('/api/action',{'action':'command','command':'list'},cookie=cookie,origin='https://untrusted.example')[0]==403 and not commands
   assert request('/api/action',{'action':'command','command':'list\nstop'},cookie=cookie)[0]==409 and not commands
   assert request('/api/action',{'action':'command','command':'list'},cookie=cookie)[0]==200 and commands==['list']
   assert request('/.env',cookie=cookie)[0]==404
   assert request('/../eula.txt',cookie=cookie)[0]==404
   assert request('/api/logout',{},cookie=cookie)[0]==200
   assert request('/api/state',cookie=cookie)[0]==401
   assert request('/api/login',{'password':password})[0]==200
   print('PASS: local static UI, authentication, password hashing/permissions, session logout, Host/Origin checks, traversal rejection and command isolation.')
   print('Live Minecraft process, player accounts and panel operator password were not changed.')
  finally:
   server.shutdown();server.server_close();thread.join(timeout=3)
if __name__=='__main__':main()
