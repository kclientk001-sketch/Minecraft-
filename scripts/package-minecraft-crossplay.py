#!/usr/bin/env python3
"""Package installable game software without exporting live accounts, world, keys or EULA consent."""
from datetime import datetime, timezone
from pathlib import Path
import hashlib,json,os,re,shutil,subprocess,tempfile,zipfile

ROOT=Path(__file__).resolve().parent.parent
SERVER=ROOT/'minecraft-server'
RELEASE=ROOT/'release'
DEFAULT_EULA=b'# Read https://www.minecraft.net/en-us/eula before accepting.\n# Each new operator must accept independently.\neula=false\n'

def sha256(path):
    with path.open('rb') as stream:return hashlib.file_digest(stream,'sha256').hexdigest()

def main():
    subprocess.run(['python3',str(SERVER/'install.py'),'--verify'],check=True)
    subprocess.run(['node','-e',
        "const fs=require('fs'),y=require('./imports/ai-github/node_modules/js-yaml');"
        "const c=y.load(fs.readFileSync('minecraft-server/plugins/Geyser-Spigot/config.yml','utf8'));"
        "const a=y.load(fs.readFileSync('minecraft-server/plugins/AuthMe/config.yml','utf8'));"
        "const v=y.load(fs.readFileSync('minecraft-server/plugins/ViaVersion/config.yml','utf8'));"
        "const s=y.load(fs.readFileSync('minecraft-server/spigot.yml','utf8'));"
        "if(c.java['auth-type']!=='floodgate'||c.bedrock.transport!=='both'||"
        "c.bedrock.port!==19132||c.bedrock['webrtc-port']!==19133||"
        "a.DataSource.backend!=='SQLITE'||a.settings.security.passwordHash!=='BCRYPT'||"
        "a.settings.registration.enabled!==true||a.settings.registration.force!==true||"
        "a.settings.registration.dialog.preJoin.enable!==false||"
        "a.settings.registration.dialog.postJoin.enable!==false||"
        "!v['block-versions'].includes('<1.21')||s.commands.log!==false)"
        "throw Error('Crossplay or authentication configuration invalid');"],cwd=ROOT,check=True)
    lock=json.loads((SERVER/'artifacts.lock.json').read_text())
    names=['README.md','artifacts.lock.json','install.py','start.sh','accept-eula.sh',
           'server.properties','spigot.yml','eula.txt','status.py','service.py','run-linux.sh','.gitignore',
           'plugins/Geyser-Spigot/config.yml','plugins/AuthMe/config.yml','plugins/ViaVersion/config.yml',
           'panel.py','panel/index.html','panel/panel.css','panel/panel.js']
    names += [item['file'] for item in lock['artifacts']]
    props=dict(line.split('=',1) for line in (SERVER/'server.properties').read_text().splitlines() if line and not line.startswith('#'))
    assert props['online-mode'] in {'true','false'} and props['enforce-secure-profile']=='false'
    assert props.get('management-server-enabled','false')=='false'
    assert props['enable-rcon']=='false' and props['enable-query']=='false'
    for name in ['start.sh','accept-eula.sh','run-linux.sh']:
        subprocess.run(['sh','-n',str(SERVER/name)],check=True)
    temp_root=ROOT/'.build-tools';temp_root.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='minecraft-gate-',dir=temp_root) as folder:
        stage=Path(folder)
        for name in ['start.sh','accept-eula.sh']:shutil.copyfile(SERVER/name,stage/name)
        (stage/'eula.txt').write_bytes(DEFAULT_EULA)
        assert subprocess.run(['sh',str(stage/'start.sh')],capture_output=True).returncode==3
        assert subprocess.run(['sh',str(stage/'accept-eula.sh')],capture_output=True).returncode==2
        assert (stage/'eula.txt').read_bytes()==DEFAULT_EULA
    candidates=dict(os.environ)
    env_path=ROOT/'.env'
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line and not line.lstrip().startswith('#') and '=' in line:
                key,value=line.split('=',1);candidates[key.strip()]=value.strip().strip('\"\'')
    secrets=[v.encode() for k,v in candidates.items() if re.search(r'(TOKEN|PASSWORD|SECRET|API_KEY)$',k) and len(v)>=12]
    private_property_keys={'management-server-secret','management-server-tls-keystore-password','rcon.password'}
    secrets += [v.encode() for k,v in props.items() if k in private_property_keys and len(v)>=12]
    RELEASE.mkdir(exist_ok=True)
    archive=RELEASE/'ryuuworl-minecraft-crossplay.zip';hashes={};sizes={}
    with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as out:
        for name in sorted(names):
            path=SERVER/name
            assert path.is_file() and not path.is_symlink()
            data=DEFAULT_EULA if name=='eula.txt' else path.read_bytes()
            if name=='server.properties':
                # Each new host generates its own management credential; never export live credentials.
                data=('\n'.join(line.split('=',1)[0]+'=' if line.split('=',1)[0] in private_property_keys else line
                                for line in data.decode().splitlines())+'\n').encode()
            if name=='plugins/Geyser-Spigot/config.yml':
                # Do not export the live machine's network advertisement to another host.
                data=subprocess.check_output(['node','-e',
                    "const fs=require('fs'),y=require('./imports/ai-github/node_modules/js-yaml');"
                    "const c=y.load(fs.readFileSync(process.argv[1],'utf8'));"
                    "c.bedrock.signaling.builtin['advertise-addresses']=[];"
                    "process.stdout.write(y.dump(c));",str(path)],cwd=ROOT)
            if any(secret in data for secret in secrets):raise ValueError('Secret detected; no value displayed')
            hashes[name]=hashlib.sha256(data).hexdigest();sizes[name]=len(data)
            info=zipfile.ZipInfo('minecraft-server/'+name,(2026,10,19,0,0,0))
            info.compress_type=zipfile.ZIP_DEFLATED
            info.external_attr=(0o100755 if name.endswith('.sh') else 0o100644)<<16
            out.writestr(info,data,compresslevel=6)
    with zipfile.ZipFile(archive) as check:
        assert check.testzip() is None and len(check.namelist())==len(names)
        assert check.read('minecraft-server/eula.txt')==DEFAULT_EULA
    runtime_path=RELEASE/'ryuuworl-minecraft-runtime.json'
    runtime=json.loads(runtime_path.read_text()) if runtime_path.exists() else None
    report={
        'packagedAt':datetime.now(timezone.utc).isoformat(),'serverName':'Ryuuworl',
        'intendedHostname':'ryuuworl.id.vn','worldVersion':lock['minecraft'],
        'javaClients':'1.21 through 26.3, as currently supported by ViaVersion and ViaBackwards',
        'bedrockClients':'26.30 through 26.52, as currently supported by Geyser',
        'javaMajorMinimum':21,'ports':{'javaTcp':25565,'bedrockTcpAndUdp':19132,'nethernetUdp':19133},
        'authentication':('Mojang authentication and AuthMe login for Java; Xbox/Floodgate and AuthMe for Bedrock' if props['online-mode']=='true' else 'Java premium and offline clients use AuthMe registration/login; Bedrock uses Xbox/Floodgate and AuthMe'),
        'javaOnlineMode':props['online-mode']=='true',
        'passwordStorage':'SQLite, BCrypt cost 12; account data excluded from archive',
        'components':[{k:v for k,v in item.items() if k!='url'} for item in lock['artifacts']],
        'checks':{'officialSha256':'passed','yamlConfiguration':'passed','shellSyntax':'passed',
                  'distributionEulaGate':'passed','explicitAcceptanceFlag':'passed',
                  'secretScan':'passed','archiveIntegrity':'passed'},
        'liveEulaAccepted':'eula=true' in (SERVER/'eula.txt').read_text().splitlines(),
        'archiveEulaAccepted':False,'runtimeValidation':runtime,
        'archive':archive.relative_to(ROOT).as_posix(),'archiveBytes':archive.stat().st_size,
        'archiveSha256':sha256(archive),'fileCount':len(names),'expandedBytes':sum(sizes.values()),
        'fileSha256':hashes,'dnsOrRouterChangesPerformed':False
    }
    (RELEASE/'ryuuworl-minecraft-crossplay.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    (RELEASE/'ryuuworl-minecraft-crossplay.zip.sha256').write_text(report['archiveSha256']+'  '+archive.name+'\n')
    print('Package ready:',archive.relative_to(ROOT),f'({archive.stat().st_size:,} bytes; {len(names)} files)')
    print('Official SHA256, crossplay/auth configuration, EULA gate, secret scan and ZIP: PASS')
    print('Live server consent unchanged. Archive contains no world, accounts, Floodgate key or private logs.')

if __name__=='__main__':main()
