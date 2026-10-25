const OWNER = 'AmagaiRei';
const REPO = 'WorkSpace';
const API = `https://api.github.com/repos/${OWNER}/${REPO}`;
const API_VERSION = '2022-11-28';
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ui = Object.fromEntries(['token','connect','disconnect','connection-status','file-picker','drop-zone','file-list','commit-message','push','clear-files','push-status','sync-log','stat-files','stat-selected','stat-errors'].map(id => [id, document.getElementById(id)]));
let token = '', branch = '', baseCommit = '', stagedFiles = [], errorCount = 0, busy = false;
function status(el, message, type = 'info') { el.textContent = message; el.dataset.type = type; }
function log(message, type = 'info') {
  const item = document.createElement('div'); item.className = 'sync-log-item'; item.dataset.type = type;
  const time = document.createElement('time'); time.dateTime = new Date().toISOString(); time.textContent = new Date().toLocaleString('ru-RU');
  const text = document.createElement('span'); text.textContent = message; item.append(time, text);
  if (ui['sync-log'].firstElementChild?.textContent.includes('Операции ещё не выполнялись')) ui['sync-log'].replaceChildren();
  ui['sync-log'].prepend(item);
  if (type === 'error') { errorCount++; ui['stat-errors'].textContent = String(errorCount); }
}
async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, { ...options, headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': API_VERSION, ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers } });
  const raw = await response.text(); let data;
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = { message: raw }; }
  if (!response.ok) {
    const hint = response.status === 401 ? ' Проверь токен.' : response.status === 403 ? ' Проверь срок действия и разрешение Contents: Read and write.' : response.status === 404 ? ' Проверь доступ к репозиторию и настройки токена.' : '';
    throw new Error(`${response.status}: ${data.message || response.statusText}.${hint}`);
  }
  return data;
}
function safePath(path) {
  const normalized = path.replaceAll('\\','/').replace(/^\/+/, '');
  if (!normalized || normalized.split('/').some(part => !part || part === '.' || part === '..') || normalized === '.git' || normalized.startsWith('.git/')) throw new Error(`Недопустимый путь: ${path}`);
  return normalized;
}
function size(bytes) { return bytes < 1024 ? `${bytes} Б` : bytes < 1048576 ? `${(bytes/1024).toFixed(1)} КБ` : `${(bytes/1048576).toFixed(1)} МБ`; }
function updateStats() { ui['stat-selected'].textContent = String(stagedFiles.filter(file => file.enabled).length); ui.push.disabled = busy || !token || !stagedFiles.some(file => file.enabled) || !branch; }
function renderFiles() {
  ui['file-list'].replaceChildren();
  if (!stagedFiles.length) { const empty = document.createElement('p'); empty.className='sync-muted'; empty.textContent='Пока нет выбранных файлов.'; ui['file-list'].append(empty); updateStats(); return; }
  stagedFiles.forEach(file => {
    const row=document.createElement('div'); row.className='sync-file';
    const check=document.createElement('input'); check.type='checkbox'; check.checked=file.enabled; check.setAttribute('aria-label',`Включить ${file.path}`); check.addEventListener('change',()=>{file.enabled=check.checked;updateStats();});
    const details=document.createElement('div'); details.className='sync-file-name';
    const path=document.createElement('input'); path.className='sync-input'; path.value=file.path; path.setAttribute('aria-label',`Путь для ${file.file.name}`);
    path.addEventListener('change',()=>{try{file.path=safePath(path.value.trim());path.value=file.path;path.setCustomValidity('');}catch(error){path.setCustomValidity(error.message);path.reportValidity();}});
    const name=document.createElement('div'); name.className='sync-muted'; name.textContent=file.file.name; details.append(path,name);
    const fileSize=document.createElement('span'); fileSize.className='sync-file-size'; fileSize.textContent=size(file.file.size); row.append(check,details,fileSize); ui['file-list'].append(row);
  }); updateStats();
}
function addFiles(list) {
  const keys=new Set(stagedFiles.map(x=>`${x.file.name}:${x.file.size}:${x.file.lastModified}`));
  for(const file of list){const key=`${file.name}:${file.size}:${file.lastModified}`;if(keys.has(key))continue;let path=file.webkitRelativePath||file.name;try{path=safePath(path);}catch{path=safePath(file.name);}stagedFiles.push({file,path,enabled:true});keys.add(key);}
  renderFiles();
}
async function connect() {
  const entered=ui.token.value.trim(); if(!entered){status(ui['connection-status'],'Сначала введи токен.','warning');return;}
  token=entered; ui.connect.disabled=true; status(ui['connection-status'],'Проверяю токен и репозиторий…');
  try {
    const repo=await api(''); if(repo.full_name?.toLowerCase()!==`${OWNER}/${REPO}`.toLowerCase())throw new Error('GitHub вернул неожиданный репозиторий.');
    branch=repo.default_branch; const ref=await api(`/git/ref/heads/${encodeURIComponent(branch)}`); baseCommit=ref.object.sha;
    const tree=await api(`/git/trees/${baseCommit}?recursive=1`); if(tree.truncated)throw new Error('GitHub обрезал список файлов. Для безопасности синхронизация остановлена.');
    ui['stat-files'].textContent=String(tree.tree.filter(x=>x.type==='blob').length); ui.disconnect.disabled=false;
    status(ui['connection-status'],`Подключено: ${repo.full_name} · ветка ${branch}. Чтение работает; право записи подтвердится при создании коммита.`,'success'); log(`Подключение подтверждено: ${repo.full_name}, ветка ${branch}.`); updateStats();
  } catch(error){token='';branch='';baseCommit='';ui.disconnect.disabled=true;status(ui['connection-status'],error.message,'error');log(`Не удалось подключиться: ${error.message}`,'error');}
  finally{ui.connect.disabled=false;}
}
function bytesToBase64(bytes){let binary='';for(let offset=0;offset<bytes.length;offset+=0x8000)binary+=String.fromCharCode(...bytes.subarray(offset,offset+0x8000));return btoa(binary);}
async function createCommit(){
  const enabled=stagedFiles.filter(x=>x.enabled);if(!token||!branch||!enabled.length){status(ui['push-status'],'Подключись к GitHub и выбери хотя бы один файл.','warning');return;}
  const message=ui['commit-message'].value.trim();if(!message){status(ui['push-status'],'Введи сообщение коммита.','warning');ui['commit-message'].focus();return;}
  const paths=new Set();for(const item of enabled){item.path=safePath(item.path);if(paths.has(item.path))throw new Error(`Путь указан дважды: ${item.path}`);paths.add(item.path);if(item.file.size>MAX_FILE_SIZE)throw new Error(`${item.path}: файл больше 20 МБ. Используй GitHub Desktop или Git CLI.`);}
  busy=true;updateStats();ui.connect.disabled=true;ui['clear-files'].disabled=true;
  try{
    const blobs=[];
    for(let i=0;i<enabled.length;i++){const item=enabled[i];status(ui['push-status'],`Подготавливаю файл ${i+1}/${enabled.length}: ${item.path}`);const content=bytesToBase64(new Uint8Array(await item.file.arrayBuffer()));const blob=await api('/git/blobs',{method:'POST',body:JSON.stringify({content,encoding:'base64'})});blobs.push({path:item.path,mode:'100644',type:'blob',sha:blob.sha});}
    status(ui['push-status'],'Создаю дерево файлов…');const tree=await api('/git/trees',{method:'POST',body:JSON.stringify({base_tree:baseCommit,tree:blobs})});
    status(ui['push-status'],'Создаю один коммит…');const commit=await api('/git/commits',{method:'POST',body:JSON.stringify({message,tree:tree.sha,parents:[baseCommit]})});
    status(ui['push-status'],'Публикую коммит в ветку…');await api(`/git/refs/heads/${encodeURIComponent(branch)}`,{method:'PATCH',body:JSON.stringify({sha:commit.sha,force:false})});
    const url=`https://github.com/${OWNER}/${REPO}/commit/${commit.sha}`;status(ui['push-status'],`Готово! ${enabled.length} файл(ов) опубликовано одним коммитом.`,'success');const link=document.createElement('a');link.className='sync-commit-link';link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Открыть коммит на GitHub';ui['push-status'].append(document.createElement('br'),link);log(`Коммит опубликован: ${message}; файлов: ${enabled.length}. ${url}`);stagedFiles=stagedFiles.filter(x=>!x.enabled);
    const ref=await api(`/git/ref/heads/${encodeURIComponent(branch)}`);baseCommit=ref.object.sha;const fresh=await api(`/git/trees/${baseCommit}?recursive=1`);ui['stat-files'].textContent=String(fresh.tree.filter(x=>x.type==='blob').length);renderFiles();
  }catch(error){status(ui['push-status'],error.message,'error');log(`Ошибка синхронизации: ${error.message}`,'error');}
  finally{busy=false;ui.connect.disabled=false;ui['clear-files'].disabled=false;updateStats();}
}
function disconnect(){token='';branch='';baseCommit='';ui.token.value='';ui.disconnect.disabled=true;ui['stat-files'].textContent='—';status(ui['connection-status'],'Токен очищен из памяти этой вкладки.');log('Токен очищен из памяти.');updateStats();}
ui.connect.addEventListener('click',connect);ui.disconnect.addEventListener('click',disconnect);ui['file-picker'].addEventListener('change',e=>{addFiles(e.target.files);e.target.value='';});ui['clear-files'].addEventListener('click',()=>{stagedFiles=[];renderFiles();status(ui['push-status'],'Список файлов очищен.');});ui.push.addEventListener('click',()=>createCommit().catch(error=>{status(ui['push-status'],error.message,'error');log(error.message,'error');}));
ui['drop-zone'].addEventListener('dragover',e=>{e.preventDefault();ui['drop-zone'].classList.add('is-dragging');});ui['drop-zone'].addEventListener('dragleave',()=>ui['drop-zone'].classList.remove('is-dragging'));ui['drop-zone'].addEventListener('drop',e=>{e.preventDefault();ui['drop-zone'].classList.remove('is-dragging');addFiles(e.dataTransfer.files);});updateStats();

// !Service Worker регистрация для офлайн поддержки
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[SW] Зарегистрирован:', registration.scope);
      })
      .catch((error) => {
        console.warn('[SW] Ошибка регистрации:', error);
      });
  });
}
