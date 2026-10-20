'use strict';
const $=id=>document.getElementById(id);
let configured=false,authenticated=false,fetching=false;
async function api(path,data){
 const opts={credentials:'same-origin',cache:'no-store'};
 if(data!==undefined){opts.method='POST';opts.headers={'Content-Type':'application/json'};opts.body=JSON.stringify(data);}
 const response=await fetch(path,opts);
 const result=await response.json();
 if(!response.ok){if(response.status===401&&path!=='/api/login')showLogin(true);throw new Error(result.error||'Chưa kết nối được bảng điều khiển.');}
 return result;
}
function toast(message,error=false){$('toast').textContent=message;$('toast').classList.toggle('error',error);$('toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').hidden=true,5000);}
function showLogin(isConfigured){
 authenticated=false;configured=isConfigured;$('logs').textContent='';$('login').hidden=false;$('dashboard').hidden=true;$('login-form').hidden=false;
 $('login-title').textContent=configured?'Chào mừng trở lại':'Đặt mật khẩu quản trị';
 $('login-description').textContent=configured?'Đăng nhập để quản lý Ryuuworl trên thiết bị này.':'Tạo mật khẩu riêng để mở bảng điều khiển server.';
 $('confirmation').hidden=configured;$('confirm-password').required=!configured;
 $('password').autocomplete=configured?'current-password':'new-password';
 $('login-submit').textContent=configured?'Đăng nhập':'Đặt mật khẩu & mở bảng';
}
async function showDashboard(){authenticated=true;$('login').hidden=true;$('dashboard').hidden=false;$('password').value='';$('confirm-password').value='';await refresh();}
async function refresh(){
 if(!authenticated||fetching||document.hidden)return;
 fetching=true;
 try{
  const state=await api('/api/state');if(!authenticated)return;
  const names={checking:'Đang kiểm tra',running:'Đang chạy',starting:'Đang khởi động',stopped:'Đã dừng'};
  $('server-state').textContent=names[state.state]||'Đang kiểm tra';$('server-state').style.color=state.state==='running'?'#a3e779':state.state==='starting'?'#ffd893':'#b0bdb5';
  $('state-detail').textContent=state.state==='running'?'Java và Bedrock đang phản hồi':state.state==='starting'?'Chờ Minecraft nạp xong':'Có thể bật server từ bảng điều khiển';
  $('players').textContent=state.players===null||state.players===undefined?'— / —':`${state.players} / ${state.maxPlayers}`;
  $('led').classList.toggle('on',state.state==='running');
  $('java-status').textContent=state.java?'● Java đang phản hồi':'○ Java chưa sẵn sàng';
  $('bedrock-status').textContent=state.bedrock&&state.signaling?'● RakNet + signaling đã mở':state.bedrock?'● RakNet đã mở':'○ Bedrock chưa sẵn sàng';
  const alive=state.state==='running'||state.state==='starting';$('start').disabled=alive;$('stop').disabled=!alive;$('send-command').disabled=!alive;
  document.querySelectorAll('[data-command]').forEach(button=>button.disabled=!alive);
  if(!$('pause').checked){const logs=await api('/api/logs');if(!authenticated)return;const box=$('logs'),bottom=box.scrollHeight-box.scrollTop-box.clientHeight<65||box.dataset.loaded!=='true';box.textContent=logs.text||'Chưa có log server.';box.dataset.loaded='true';if(bottom)box.scrollTop=box.scrollHeight;}
 }catch(error){toast(error.message,true);}finally{fetching=false;}
}
async function action(data){try{const result=await api('/api/action',data);toast(result.message);await refresh();return true;}catch(error){toast(error.message,true);return false;}}
$('login-form').addEventListener('submit',async event=>{
 event.preventDefault();$('login-error').textContent='';
 const password=$('password').value;
 if(!configured&&password!==$('confirm-password').value){$('login-error').textContent='Hai mật khẩu chưa khớp.';return;}
 $('login-submit').disabled=true;
 try{await api(configured?'/api/login':'/api/setup',{password});configured=true;await showDashboard();}
 catch(error){$('login-error').textContent=error.message;}finally{$('login-submit').disabled=false;}
});
$('command-form').addEventListener('submit',async event=>{event.preventDefault();const command=$('command').value.trim();if(command&&await action({action:'command',command}))$('command').value='';});
$('start').addEventListener('click',()=>action({action:'start'}));$('stop').addEventListener('click',()=>action({action:'stop'}));
document.querySelectorAll('[data-command]').forEach(button=>button.addEventListener('click',()=>action({action:'command',command:button.dataset.command})));
$('logout').addEventListener('click',async()=>{try{await api('/api/logout',{});showLogin(true);}catch(error){toast(error.message,true);}});
$('pause').addEventListener('change',()=>refresh());document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
api('/api/session').then(session=>session.authenticated?showDashboard():showLogin(session.configured)).catch(error=>{$('login-title').textContent='Chưa kết nối được';$('login-error').textContent=error.message;});
setInterval(refresh,3000);
