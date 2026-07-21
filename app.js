/* =========================================================
   Project Track — lógica principal
   Dados salvos 100% no localStorage do navegador.
   ========================================================= */

const LS_USER = 'pt_user';
const LS_PROJECTS = 'pt_projects';
const LS_ACTIVE = 'pt_active_project';

let state = {
  user: null,
  projects: [],
  activeProjectId: null
};

function uid(){ return Math.random().toString(36).slice(2,10); }
function todayISO(){ return new Date().toISOString().slice(0,10); }
function fmtDate(d){ if(!d) return '—'; const dt = new Date(d+'T00:00:00'); return dt.toLocaleDateString('pt-BR'); }
function daysBetween(a,b){ return Math.round((new Date(b)-new Date(a))/86400000); }

/* ---------------- Persistence ---------------- */
function loadAll(){
  try{ state.user = JSON.parse(localStorage.getItem(LS_USER)||'null'); }catch(e){ state.user = null; }
  try{ state.projects = JSON.parse(localStorage.getItem(LS_PROJECTS)||'[]'); }catch(e){ state.projects = []; }
  state.activeProjectId = localStorage.getItem(LS_ACTIVE) || null;
}
function saveAll(){
  localStorage.setItem(LS_PROJECTS, JSON.stringify(state.projects));
  if(state.activeProjectId) localStorage.setItem(LS_ACTIVE, state.activeProjectId);
}
function saveUser(){ localStorage.setItem(LS_USER, JSON.stringify(state.user)); }
function currentProject(){ return state.projects.find(p=>p.id===state.activeProjectId); }

/* ---------------- Boot ---------------- */
window.addEventListener('DOMContentLoaded', ()=>{
  loadAll();
  if(state.user && state.user.name){
    showScreen('screen-portfolio');
    renderPortfolio();
  } else {
    showScreen('screen-id');
  }
});

function showScreen(id){
  ['screen-id','screen-portfolio','screen-project'].forEach(s=>{
    document.getElementById(s).classList.toggle('hidden', s!==id);
  });
}

/* ---------------- Identification ---------------- */
function submitIdentification(){
  const name = document.getElementById('input-name').value.trim();
  if(!name){ alert('Por favor, informe seu nome.'); return; }
  const role = document.getElementById('input-role').value.trim();
  state.user = {name, role};
  saveUser();
  showScreen('screen-portfolio');
  renderPortfolio();
}

/* ---------------- Portfolio ---------------- */
function renderPortfolio(){
  const grid = document.getElementById('project-grid');
  if(state.projects.length===0){
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <h3>Nenhum projeto ainda</h3>
      <p>Crie um novo projeto ou carregue um exemplo para explorar a ferramenta.</p>
    </div>`;
    return;
  }
  grid.innerHTML = state.projects.map(p=>{
    const statusClass = 'status-'+p.status.replace(/\s+/g,'');
    return `<div class="project-card" onclick="openProject('${p.id}')">
      <h3>${escapeHtml(p.name)}</h3>
      <div style="color:var(--muted);font-size:12.5px;">${escapeHtml(p.client||'Cliente não definido')}</div>
      <span class="status-pill ${statusClass}">${p.status}</span>
    </div>`;
  }).join('');
}

function openModal(id){ document.getElementById(id).classList.remove('hidden'); }
function closeModal(id){ document.getElementById(id).classList.add('hidden'); }

function newProjectSkeleton(name){
  return {
    id: uid(), name, client:'', startDate:'', endDate:'', manager:'', status:'Ativo', notes:'',
    tasks:[], milestones:[], consultants:[], risks:[], notesList:[]
  };
}

function createProject(){
  const name = document.getElementById('new-proj-name').value.trim();
  if(!name){ alert('Informe um nome para o projeto.'); return; }
  const proj = newProjectSkeleton(name);
  state.projects.push(proj);
  state.activeProjectId = proj.id;
  saveAll();
  document.getElementById('new-proj-name').value='';
  closeModal('modal-new-project');
  openProject(proj.id);
}

function loadSampleProject(){
  const proj = newProjectSkeleton('Projeto Exemplo — Implantação ERP');
  proj.client = 'Cliente Fictício S.A.';
  proj.manager = state.user ? state.user.name : 'Gerente Exemplo';
  const start = new Date(); start.setDate(start.getDate()-30);
  const end = new Date(); end.setDate(end.getDate()+60);
  proj.startDate = start.toISOString().slice(0,10);
  proj.endDate = end.toISOString().slice(0,10);
  proj.status = 'Ativo';

  const phases = ['Planejamento','Desenho','Construção','Testes','Go-Live'];
  let cursor = new Date(start);
  proj.tasks = phases.flatMap((phase, pi)=>{
    return [0,1,2].map(i=>{
      const s = new Date(cursor); s.setDate(s.getDate()+i*10);
      const e = new Date(s); e.setDate(e.getDate()+8);
      const statuses = ['Concluído','Em progresso','Não iniciado'];
      const status = pi < 2 ? 'Concluído' : (pi===2 ? statuses[i%2] : 'Não iniciado');
      return {
        id: uid(), wbs:`${pi+1}.${i+1}`, name:`${phase} — Atividade ${i+1}`, phase,
        start: s.toISOString().slice(0,10), end: e.toISOString().slice(0,10),
        duration: 8, responsible:'Consultor '+(i+1), status, note:'', milestone:false
      };
    });
  });
  proj.tasks.forEach((t,i)=>{ if(i%6===0) t.milestone = true; });

  proj.consultants = ['Ana Souza','Bruno Lima','Carla Reis'].map(n=>({
    id: uid(), name:n, profile:'Consultor Funcional', forecastTotal:200, valueHour:250,
    forecastByMonth:{}, actualByMonth:{}
  }));
  const monthKey = (offset)=>{ const d=new Date(); d.setMonth(d.getMonth()+offset); return d.toISOString().slice(0,7); };
  proj.consultants.forEach(c=>{
    [-1,0,1].forEach((off,idx)=>{
      c.forecastByMonth[monthKey(off)] = 60;
      if(off<=0) c.actualByMonth[monthKey(off)] = 55 + idx*5;
    });
  });

  proj.milestones = [
    {id:uid(), name:'Kick-off', phase:'Planejamento', planned: proj.startDate, actual: proj.startDate, status:'Concluído'},
    {id:uid(), name:'Aprovação do Desenho', phase:'Desenho', planned: monthKey(0)+'-15', actual:'', status:'Em andamento'},
    {id:uid(), name:'Go-Live', phase:'Go-Live', planned: proj.endDate, actual:'', status:'Futuro'}
  ];

  proj.risks = [
    {id:uid(), description:'Disponibilidade da equipe do cliente para testes', probability:'Média', impact:'Alto', status:'Mitigando', date: todayISO(), plan:'Alinhar agenda com sponsor.'}
  ];
  proj.notesList = [
    {id:uid(), text:'Reunião de kick-off realizada com todas as áreas.', date: proj.startDate, category:'Reunião'}
  ];

  state.projects.push(proj);
  state.activeProjectId = proj.id;
  saveAll();
  openProject(proj.id);
}

function goToPortfolio(){
  showScreen('screen-portfolio');
  renderPortfolio();
}

/* ---------------- Project shell ---------------- */
function openProject(id){
  state.activeProjectId = id;
  saveAll();
  showScreen('screen-project');
  document.getElementById('sidebar-proj-name').textContent = currentProject().name;
  showPane('dashboard');
}

let activePane = 'dashboard';
function showPane(pane){
  activePane = pane;
  document.querySelectorAll('.pane').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active', n.dataset.pane===pane));
  document.getElementById('pane-'+pane).classList.add('active');
  const renderers = {
    config: renderConfig, tarefas: renderTarefas, cronograma: renderCronograma,
    horas: renderHoras, marcos: renderMarcos, notas: renderNotas, dashboard: renderDashboard
  };
  if(renderers[pane]) renderers[pane]();
}

function escapeHtml(s){ return (s||'').toString().replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ---------------- Config ---------------- */
function renderConfig(){
  const p = currentProject();
  document.getElementById('cfg-name').value = p.name||'';
  document.getElementById('cfg-client').value = p.client||'';
  document.getElementById('cfg-start').value = p.startDate||'';
  document.getElementById('cfg-end').value = p.endDate||'';
  document.getElementById('cfg-manager').value = p.manager||'';
  document.getElementById('cfg-status').value = p.status||'Ativo';
  document.getElementById('cfg-notes').value = p.notes||'';
}
function saveConfig(){
  const p = currentProject();
  p.name = document.getElementById('cfg-name').value.trim() || p.name;
  p.client = document.getElementById('cfg-client').value.trim();
  p.startDate = document.getElementById('cfg-start').value;
  p.endDate = document.getElementById('cfg-end').value;
  p.manager = document.getElementById('cfg-manager').value.trim();
  p.status = document.getElementById('cfg-status').value;
  p.notes = document.getElementById('cfg-notes').value;
  saveAll();
  document.getElementById('sidebar-proj-name').textContent = p.name;
  alert('Configurações salvas.');
}
function clearProject(){
  if(!confirm('Tem certeza? Isso apaga todos os dados deste projeto permanentemente.')) return;
  const p = currentProject();
  p.tasks=[]; p.milestones=[]; p.consultants=[]; p.risks=[]; p.notesList=[];
  saveAll();
  showPane('dashboard');
  alert('Projeto limpo.');
}

/* ---------------- Task status % logic ---------------- */
function taskPercent(t){
  if(t.status==='Concluído') return 100;
  if(t.status==='Não iniciado') return 0;
  if(t.status==='Em atraso'){
    return t._frozenPercent!=null ? t._frozenPercent : computeDatePercent(t);
  }
  // Em progresso
  return computeDatePercent(t);
}
function computeDatePercent(t){
  if(!t.start || !t.end) return 0;
  const s = new Date(t.start), e = new Date(t.end), now = new Date();
  if(now<=s) return 0;
  if(now>=e) return 100;
  return Math.round(((now-s)/(e-s))*100);
}
function statusChipClass(status){
  return {'Não iniciado':'chip-nao','Em progresso':'chip-prog','Concluído':'chip-ok','Em atraso':'chip-atraso'}[status]||'chip-nao';
}

/* ---------------- Tarefas ---------------- */
function renderTarefas(){
  const p = currentProject();
  const el = document.getElementById('tarefas-content');
  if(p.tasks.length===0){
    el.innerHTML = `<div class="empty-state"><h3>Nenhuma tarefa</h3><p>Importe o cronograma ou adicione manualmente.</p></div>`;
    return;
  }
  el.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>WBS</th><th>Tarefa</th><th>Fase</th><th>Início</th><th>Término</th><th>Responsável</th><th>Status</th><th>%</th><th>🚩</th><th></th></tr></thead>
    <tbody>${p.tasks.map(t=>`
      <tr>
        <td>${escapeHtml(t.wbs||'')}</td>
        <td>${escapeHtml(t.name)}</td>
        <td>${escapeHtml(t.phase||'')}</td>
        <td>${fmtDate(t.start)}</td>
        <td>${fmtDate(t.end)}</td>
        <td>${escapeHtml(t.responsible||'')}</td>
        <td><select onchange="changeTaskStatus('${t.id}', this.value)" style="width:auto;padding:4px 8px;">
          ${['Não iniciado','Em progresso','Concluído','Em atraso'].map(s=>`<option ${t.status===s?'selected':''}>${s}</option>`).join('')}
        </select></td>
        <td>${taskPercent(t)}%</td>
        <td><button class="flag-btn" onclick="toggleMilestoneFlag('${t.id}')" title="Marcar como marco crítico">${t.milestone?'🚩':'⚑'}</button></td>
        <td style="white-space:nowrap;">
          <button class="btn-ghost" onclick="openTaskModal('${t.id}')">Editar</button>
          <button class="btn-ghost" style="color:var(--crit)" onclick="deleteTask('${t.id}')">Excluir</button>
        </td>
      </tr>`).join('')}
    </tbody></table></div>`;
}
function changeTaskStatus(id, status){
  const p = currentProject();
  const t = p.tasks.find(x=>x.id===id);
  if(status==='Em atraso') t._frozenPercent = computeDatePercent(t);
  else t._frozenPercent = null;
  t.status = status;
  saveAll();
  renderTarefas();
}
function toggleMilestoneFlag(id){
  const p = currentProject();
  const t = p.tasks.find(x=>x.id===id);
  t.milestone = !t.milestone;
  if(t.milestone){
    p.milestones.push({id:uid(), name:t.name, phase:t.phase, planned:t.end, actual: t.status==='Concluído'?t.end:'', status: t.status==='Concluído'?'Concluído':(t.status==='Em atraso'?'Atrasado':'Futuro'), fromTaskId:t.id});
  } else {
    p.milestones = p.milestones.filter(m=>m.fromTaskId!==t.id);
  }
  saveAll();
  renderTarefas();
}
function deleteTask(id){
  if(!confirm('Excluir esta tarefa?')) return;
  const p = currentProject();
  p.tasks = p.tasks.filter(t=>t.id!==id);
  saveAll();
  renderTarefas();
}
function openTaskModal(id){
  const p = currentProject();
  document.getElementById('task-modal-title').textContent = id ? 'Editar tarefa' : 'Nova tarefa';
  document.getElementById('task-id').value = id||'';
  const t = id ? p.tasks.find(x=>x.id===id) : null;
  document.getElementById('task-name').value = t? t.name:'';
  document.getElementById('task-phase').value = t? (t.phase||''):'';
  document.getElementById('task-start').value = t? (t.start||''):'';
  document.getElementById('task-end').value = t? (t.end||''):'';
  document.getElementById('task-resp').value = t? (t.responsible||''):'';
  document.getElementById('task-status').value = t? t.status : 'Não iniciado';
  document.getElementById('task-note').value = t? (t.note||''):'';
  openModal('modal-task');
}
function saveTask(){
  const p = currentProject();
  const id = document.getElementById('task-id').value;
  const name = document.getElementById('task-name').value.trim();
  if(!name){ alert('Informe o nome da tarefa.'); return; }
  const start = document.getElementById('task-start').value;
  const end = document.getElementById('task-end').value;
  const duration = (start && end) ? Math.max(1, daysBetween(start,end)) : 0;
  const data = {
    name, phase: document.getElementById('task-phase').value.trim(),
    start, end, duration,
    responsible: document.getElementById('task-resp').value.trim(),
    status: document.getElementById('task-status').value,
    note: document.getElementById('task-note').value.trim()
  };
  if(id){
    Object.assign(p.tasks.find(t=>t.id===id), data);
  } else {
    p.tasks.push({id: uid(), wbs:'', milestone:false, ...data});
  }
  saveAll();
  closeModal('modal-task');
  renderTarefas();
}

/* ---------------- Cronograma (Gantt + import) ---------------- */
function renderCronograma(){
  const p = currentProject();
  const el = document.getElementById('gantt-content');
  if(p.tasks.length===0){
    el.innerHTML = `<div class="empty-state"><h3>Sem cronograma</h3><p>Importe o cronograma ou adicione tarefas com datas de início e término.</p></div>`;
    return;
  }
  const dated = p.tasks.filter(t=>t.start && t.end);
  if(dated.length===0){
    el.innerHTML = `<div class="empty-state"><h3>Sem datas suficientes</h3><p>Adicione datas de início e término às tarefas para ver o Gantt.</p></div>`;
    return;
  }
  const minDate = new Date(Math.min(...dated.map(t=>new Date(t.start))));
  const maxDate = new Date(Math.max(...dated.map(t=>new Date(t.end))));
  const totalDays = Math.max(1, daysBetween(minDate, maxDate));
  const barClass = {'Não iniciado':'bar-nao','Em progresso':'bar-prog','Concluído':'bar-ok','Em atraso':'bar-atraso'};
  el.innerHTML = dated.map(t=>{
    const left = (daysBetween(minDate, t.start)/totalDays)*100;
    const width = Math.max(1.5, (daysBetween(t.start, t.end)/totalDays)*100);
    return `<div class="gantt-row">
      <div class="gantt-label" title="${escapeHtml(t.name)}">${t.milestone?'🚩 ':''}${escapeHtml(t.name)}</div>
      <div class="gantt-track"><div class="gantt-bar ${barClass[t.status]||'bar-nao'}" style="left:${left}%;width:${width}%" title="${t.status} — ${taskPercent(t)}%"></div></div>
    </div>`;
  }).join('');
}

function handleCronogramaFile(evt){
  const file = evt.target.files[0];
  if(!file) return;
  Papa.parse(file, {
    header:true, skipEmptyLines:true, delimiter:';',
    complete: (res)=>{
      const p = currentProject();
      const statusMap = (raw)=>{
        if(!raw) return 'Não iniciado';
        const v = raw.toLowerCase();
        if(v.includes('conclu')) return 'Concluído';
        if(v.includes('andamento')||v.includes('progresso')) return 'Em progresso';
        if(v.includes('atras')) return 'Em atraso';
        return 'Não iniciado';
      };
      const parseDate = (s)=>{
        if(!s) return '';
        s = s.trim();
        if(/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10);
        const m = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
        if(m){ let [,d,mo,y]=m; if(y.length===2) y='20'+y; return `${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`; }
        return '';
      };
      let count=0;
      res.data.forEach(row=>{
        const name = row['Nome da tarefa'] || row['Nome'] || row['Task Name'];
        if(!name) return;
        const start = parseDate(row['Início']||row['Inicio']||row['Start']);
        const end = parseDate(row['Término']||row['Termino']||row['Finish']);
        p.tasks.push({
          id: uid(), wbs: row['WBS']||'', name, phase: row['Fase']||'',
          start, end, duration: (row['Duração']||row['Duracao']||'').replace(/\D/g,'') || (start&&end?daysBetween(start,end):0),
          responsible: row['Responsável']||row['Responsavel']||'',
          status: statusMap(row['Status']), note:'', milestone:false
        });
        count++;
      });
      saveAll();
      alert(`${count} tarefa(s) importada(s) com sucesso.`);
      evt.target.value='';
      renderTarefas(); renderCronograma();
    }
  });
}

/* ---------------- Horas Consultores ---------------- */
function renderHoras(){
  const p = currentProject();
  const el = document.getElementById('horas-content');
  if(p.consultants.length===0){
    el.innerHTML = `<div class="empty-state"><h3>Nenhum consultor</h3><p>Adicione consultores ou importe o forecast de horas.</p></div>`;
    return;
  }
  el.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Consultor</th><th>Perfil</th><th>Forecast (h)</th><th>Realizado (h)</th><th>Saldo (h)</th><th>Valor/h</th><th></th></tr></thead>
    <tbody>${p.consultants.map(c=>{
      const realizado = sumValues(c.actualByMonth);
      const forecast = c.forecastTotal || sumValues(c.forecastByMonth);
      const saldo = forecast - realizado;
      return `<tr>
        <td>${escapeHtml(c.name)}</td>
        <td>${escapeHtml(c.profile||'')}</td>
        <td>${forecast}</td>
        <td>${realizado}</td>
        <td style="color:${saldo<0?'var(--crit)':'var(--text)'}">${saldo}</td>
        <td>R$ ${(c.valueHour||0).toLocaleString('pt-BR')}</td>
        <td><button class="btn-ghost" style="color:var(--crit)" onclick="deleteConsultant('${c.id}')">Excluir</button></td>
      </tr>`;
    }).join('')}</tbody></table></div>`;
}
function sumValues(obj){ return Object.values(obj||{}).reduce((a,b)=>a+Number(b||0),0); }
function deleteConsultant(id){
  if(!confirm('Excluir este consultor?')) return;
  const p = currentProject();
  p.consultants = p.consultants.filter(c=>c.id!==id);
  saveAll(); renderHoras();
}
function openConsultantModal(){
  document.getElementById('cons-id').value='';
  document.getElementById('cons-name').value='';
  document.getElementById('cons-profile').value='';
  document.getElementById('cons-hours').value='';
  document.getElementById('cons-value').value='';
  openModal('modal-consultant');
}
function saveConsultant(){
  const p = currentProject();
  const name = document.getElementById('cons-name').value.trim();
  if(!name){ alert('Informe o nome do consultor.'); return; }
  p.consultants.push({
    id: uid(), name, profile: document.getElementById('cons-profile').value.trim(),
    forecastTotal: Number(document.getElementById('cons-hours').value)||0,
    valueHour: Number(document.getElementById('cons-value').value)||0,
    forecastByMonth:{}, actualByMonth:{}
  });
  saveAll();
  closeModal('modal-consultant');
  renderHoras();
}
function openLaunchHoursModal(){
  const p = currentProject();
  const sel = document.getElementById('launch-consultant');
  if(p.consultants.length===0){ alert('Cadastre um consultor primeiro.'); return; }
  sel.innerHTML = p.consultants.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  document.getElementById('launch-month').value = new Date().toISOString().slice(0,7);
  document.getElementById('launch-hours').value='';
  openModal('modal-launch-hours');
}
function saveLaunchHours(){
  const p = currentProject();
  const c = p.consultants.find(x=>x.id===document.getElementById('launch-consultant').value);
  const month = document.getElementById('launch-month').value;
  const hours = Number(document.getElementById('launch-hours').value)||0;
  if(!month){ alert('Selecione o mês.'); return; }
  c.actualByMonth[month] = hours;
  saveAll();
  closeModal('modal-launch-hours');
  renderHoras();
}
function handleForecastFile(evt){
  const file = evt.target.files[0];
  if(!file) return;
  Papa.parse(file, {
    header:true, skipEmptyLines:true,
    complete: (res)=>{
      const p = currentProject();
      let count=0;
      res.data.forEach(row=>{
        const name = row['Consultor'];
        if(!name) return;
        const monthCols = Object.keys(row).filter(k=>!['Consultor','Módulos/Fase','Modulos/Fase','Valor/hora (R$)','Total'].includes(k));
        const forecastByMonth = {};
        monthCols.forEach(k=>{ if(row[k]) forecastByMonth[k]=Number(row[k])||0; });
        p.consultants.push({
          id: uid(), name, profile: row['Módulos/Fase']||row['Modulos/Fase']||'',
          forecastTotal: Number(row['Total'])|| Object.values(forecastByMonth).reduce((a,b)=>a+b,0),
          valueHour: Number(row['Valor/hora (R$)'])||0,
          forecastByMonth, actualByMonth:{}
        });
        count++;
      });
      saveAll();
      alert(`${count} consultor(es) importado(s).`);
      evt.target.value='';
      renderHoras();
    }
  });
}

/* ---------------- Marcos ---------------- */
function renderMarcos(){
  const p = currentProject();
  const el = document.getElementById('marcos-content');
  if(p.milestones.length===0){
    el.innerHTML = `<div class="empty-state"><h3>Nenhum marco</h3><p>Adicione marcos e entregas críticas.</p></div>`;
    return;
  }
  el.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Marco</th><th>Fase</th><th>Planejado</th><th>Realizado</th><th>Status</th><th></th></tr></thead>
    <tbody>${p.milestones.map(m=>`
      <tr>
        <td>${escapeHtml(m.name)}</td>
        <td>${escapeHtml(m.phase||'')}</td>
        <td>${fmtDate(m.planned)}</td>
        <td>${fmtDate(m.actual)}</td>
        <td><span class="chip ${m.status==='Concluído'?'chip-ok':m.status==='Atrasado'?'chip-atraso':'chip-prog'}">${m.status}</span></td>
        <td><button class="btn-ghost" onclick="openMilestoneModal('${m.id}')">Editar</button>
        <button class="btn-ghost" style="color:var(--crit)" onclick="deleteMilestone('${m.id}')">Excluir</button></td>
      </tr>`).join('')}</tbody></table></div>`;
}
function openMilestoneModal(id){
  const p = currentProject();
  const m = id ? p.milestones.find(x=>x.id===id):null;
  document.getElementById('ms-id').value = id||'';
  document.getElementById('ms-name').value = m? m.name:'';
  document.getElementById('ms-phase').value = m? (m.phase||''):'';
  document.getElementById('ms-planned').value = m? (m.planned||''):'';
  document.getElementById('ms-actual').value = m? (m.actual||''):'';
  document.getElementById('ms-status').value = m? m.status:'Futuro';
  openModal('modal-milestone');
}
function saveMilestone(){
  const p = currentProject();
  const id = document.getElementById('ms-id').value;
  const name = document.getElementById('ms-name').value.trim();
  if(!name){ alert('Informe o nome do marco.'); return; }
  const data = {
    name, phase: document.getElementById('ms-phase').value.trim(),
    planned: document.getElementById('ms-planned').value,
    actual: document.getElementById('ms-actual').value,
    status: document.getElementById('ms-status').value
  };
  if(id) Object.assign(p.milestones.find(m=>m.id===id), data);
  else p.milestones.push({id:uid(), ...data});
  saveAll();
  closeModal('modal-milestone');
  renderMarcos();
}
function deleteMilestone(id){
  if(!confirm('Excluir este marco?')) return;
  const p = currentProject();
  p.milestones = p.milestones.filter(m=>m.id!==id);
  saveAll(); renderMarcos();
}

/* ---------------- Notas & Riscos ---------------- */
function renderNotas(){
  const p = currentProject();
  const riskEl = document.getElementById('risks-content');
  const noteEl = document.getElementById('notes-content');
  riskEl.innerHTML = p.risks.length===0 ? `<p style="color:var(--muted);font-size:13.5px;">Nenhum risco cadastrado.</p>` :
    p.risks.map(r=>`<div class="risk-card">
      <div><span class="tag tag-${r.probability.toLowerCase().replace('média','media')}">${r.probability}</span><span class="tag tag-${r.impact.toLowerCase().replace('médio','media')}">${r.impact}</span> ${escapeHtml(r.description)}</div>
      <div class="meta">Status: ${r.status} · Identificado em ${fmtDate(r.date)} ${r.plan?(' · Ação: '+escapeHtml(r.plan)):''}
        <button class="btn-ghost" style="color:var(--crit)" onclick="deleteRisk('${r.id}')">Excluir</button></div>
    </div>`).join('');
  noteEl.innerHTML = p.notesList.length===0 ? `<p style="color:var(--muted);font-size:13.5px;">Nenhuma nota cadastrada.</p>` :
    p.notesList.map(n=>`<div class="note-card">
      <div>${escapeHtml(n.text)}</div>
      <div class="meta">${n.category} · ${fmtDate(n.date)}
        <button class="btn-ghost" style="color:var(--crit)" onclick="deleteNote('${n.id}')">Excluir</button></div>
    </div>`).join('');
}
function openRiskModal(){
  document.getElementById('risk-desc').value='';
  document.getElementById('risk-prob').value='Alta';
  document.getElementById('risk-impact').value='Alto';
  document.getElementById('risk-status').value='Identificado';
  document.getElementById('risk-date').value = todayISO();
  document.getElementById('risk-plan').value='';
  openModal('modal-risk');
}
function saveRisk(){
  const p = currentProject();
  const description = document.getElementById('risk-desc').value.trim();
  if(!description){ alert('Descreva o risco.'); return; }
  p.risks.push({
    id: uid(), description, probability: document.getElementById('risk-prob').value,
    impact: document.getElementById('risk-impact').value, status: document.getElementById('risk-status').value,
    date: document.getElementById('risk-date').value, plan: document.getElementById('risk-plan').value.trim()
  });
  saveAll(); closeModal('modal-risk'); renderNotas();
}
function deleteRisk(id){ const p=currentProject(); p.risks=p.risks.filter(r=>r.id!==id); saveAll(); renderNotas(); }
function openNoteModal(){
  document.getElementById('note-text').value='';
  document.getElementById('note-date').value = todayISO();
  document.getElementById('note-category').value='Geral';
  openModal('modal-note');
}
function saveNote(){
  const p = currentProject();
  const text = document.getElementById('note-text').value.trim();
  if(!text){ alert('Escreva a nota.'); return; }
  p.notesList.push({id:uid(), text, date: document.getElementById('note-date').value, category: document.getElementById('note-category').value});
  saveAll(); closeModal('modal-note'); renderNotas();
}
function deleteNote(id){ const p=currentProject(); p.notesList=p.notesList.filter(n=>n.id!==id); saveAll(); renderNotas(); }

/* ---------------- Dashboard ---------------- */
let charts = {};
function destroyCharts(){ Object.values(charts).forEach(c=>c && c.destroy()); charts={}; }

function computeIndicators(p){
  const tasks = p.tasks;
  if(tasks.length===0) return null;
  const totalDuration = tasks.reduce((a,t)=>a+(Number(t.duration)||1),0) || 1;
  const now = new Date();
  let planejadoSum=0, realizadoSum=0;
  tasks.forEach(t=>{
    const dur = Number(t.duration)||1;
    // planejado: proporção do tempo decorrido dentro da janela da tarefa
    let planPct = 0;
    if(t.start && t.end){
      const s=new Date(t.start), e=new Date(t.end);
      if(now>=e) planPct=100; else if(now>s) planPct = Math.round(((now-s)/(e-s))*100); else planPct=0;
    }
    planejadoSum += planPct*dur;
    realizadoSum += taskPercent(t)*dur;
  });
  const planejado = planejadoSum/totalDuration;
  const realizado = realizadoSum/totalDuration;
  const spi = planejado>0 ? realizado/planejado : (realizado>0?1:0);

  // horas
  const forecastTotal = p.consultants.reduce((a,c)=>a+(c.forecastTotal||sumValues(c.forecastByMonth)),0);
  const realizadoHoras = p.consultants.reduce((a,c)=>a+sumValues(c.actualByMonth),0);
  const pctHorasConsumidas = forecastTotal>0 ? (realizadoHoras/forecastTotal)*100 : 0;
  const cpi = pctHorasConsumidas>0 ? realizado/pctHorasConsumidas : (realizado>0?1:0);

  // prazo
  let diasRestantes=null, previsao=null, desvio=null;
  if(p.endDate){
    diasRestantes = daysBetween(now, p.endDate);
    if(p.startDate){
      const totalDiasProjeto = Math.max(1, daysBetween(p.startDate, p.endDate));
      const diasDecorridos = Math.max(0, daysBetween(p.startDate, now));
      const ritmo = spi>0 ? spi : 0.01;
      const diasProjetados = diasDecorridos>0 ? diasDecorridos/(realizado>0?(realizado/100):0.0001) : totalDiasProjeto;
      const diasEstimadosTotal = realizado>0 ? (diasDecorridos/(realizado/100)) : totalDiasProjeto/Math.max(ritmo,0.05);
      const prevDate = new Date(p.startDate); prevDate.setDate(prevDate.getDate()+Math.round(diasEstimadosTotal));
      previsao = prevDate.toISOString().slice(0,10);
      desvio = daysBetween(p.endDate, previsao);
    }
  }
  const eacHoras = cpi>0 ? forecastTotal/cpi : forecastTotal;

  return {planejado, realizado, spi, cpi, diasRestantes, previsao, desvio, forecastTotal, realizadoHoras, pctHorasConsumidas, eacHoras};
}

function semaforoClass(v){ if(v==null) return 'sg'; if(v>=1) return 'sg'; if(v>=0.85) return 'sy'; return 'sr'; }
function semaforoIcon(v){ if(v==null) return '⚪'; if(v>=1) return '🟢'; if(v>=0.85) return '🟡'; return '🔴'; }

function renderDashboard(){
  const p = currentProject();
  const el = document.getElementById('dashboard-content');
  destroyCharts();
  if(p.tasks.length===0){
    el.innerHTML = `<div class="empty-state"><h3>Projeto vazio</h3><p>Vá em Importar para carregar o cronograma.</p></div>`;
    return;
  }
  const k = computeIndicators(p);
  const milestonesTotal = p.milestones.length;
  const milestonesDone = p.milestones.filter(m=>m.status==='Concluído').length;
  const milestonesAtrasados = p.milestones.filter(m=>m.status==='Atrasado').length;
  const risksAltos = p.risks.filter(r=>r.probability==='Alta' && r.impact==='Alto').length;

  const overallHealth = Math.min(
    k.spi>=1?2:(k.spi>=0.85?1:0),
    k.cpi>=1?2:(k.cpi>=0.85?1:0),
    milestonesAtrasados>0?0:2,
    risksAltos>0?1:2
  );
  const healthIcon = overallHealth===2?'🟢':overallHealth===1?'🟡':'🔴';

  el.innerHTML = `
    <div class="section-block">
      <h3>📊 Visão Geral</h3>
      <div class="desc">Resumo do andamento geral do projeto hoje</div>
      <div class="kpi-grid">
        <div class="kpi-card"><h4>Saúde do projeto</h4><div class="kpi-big">${healthIcon}</div><div class="kpi-sub">Combina prazo, esforço, riscos e marcos</div></div>
        <div class="kpi-card"><h4>SPI — Índice de Prazo</h4><div class="kpi-big">${semaforoIcon(k.spi)} ${k.spi.toFixed(2)}</div><div class="kpi-sub">% realizado ÷ % planejado</div></div>
        <div class="kpi-card"><h4>CPI — Índice de Custo/Esforço</h4><div class="kpi-big">${semaforoIcon(k.cpi)} ${k.cpi.toFixed(2)}</div><div class="kpi-sub">% entregue ÷ % horas consumidas</div></div>
      </div>
    </div>

    <div class="section-block">
      <h3>📅 Prazo</h3>
      <div class="desc">Se o projeto vai terminar na data prevista</div>
      <div class="kpi-grid">
        <div class="kpi-card"><h4>Dias restantes</h4><div class="kpi-big">${k.diasRestantes!=null?k.diasRestantes:'—'}</div><div class="kpi-sub">até a data de término prevista</div></div>
        <div class="kpi-card"><h4>Previsão de conclusão</h4><div class="kpi-big" style="font-size:18px;">${k.previsao?fmtDate(k.previsao):'—'}</div><div class="kpi-sub">data estimada com base no ritmo atual</div></div>
        <div class="kpi-card"><h4>Desvio estimado</h4><div class="kpi-big" style="color:${k.desvio>0?'var(--crit)':'var(--ok)'}">${k.desvio!=null?(k.desvio>0?'+':'')+k.desvio+' dias':'—'}</div><div class="kpi-sub">diferença entre previsão e data original</div></div>
      </div>
    </div>

    <div class="section-block">
      <h3>💰 Esforço & Custo</h3>
      <div class="desc">Se o projeto vai caber nas horas e no orçamento contratados</div>
      <div class="kpi-grid">
        <div class="kpi-card"><h4>Horas forecast</h4><div class="kpi-big">${k.forecastTotal}h</div></div>
        <div class="kpi-card"><h4>Horas realizadas</h4><div class="kpi-big">${k.realizadoHoras}h</div><div class="kpi-sub">${k.pctHorasConsumidas.toFixed(0)}% do forecast</div></div>
        <div class="kpi-card"><h4>EAC — projeção no término</h4><div class="kpi-big">${k.eacHoras.toFixed(0)}h</div><div class="kpi-sub">mantido o ritmo atual</div></div>
      </div>
    </div>

    <div class="section-block">
      <h3>📈 Progresso</h3>
      <div class="desc">Quanto já foi concluído em cada fase do projeto</div>
      <canvas id="chart-progresso" height="90"></canvas>
    </div>

    <div class="section-block">
      <h3>🔍 Status das tarefas</h3>
      <canvas id="chart-status" height="90"></canvas>
    </div>

    <div class="section-block">
      <h3>🎯 Marcos</h3>
      <div class="desc">Entregas críticas — o que já foi atingido e o que está atrasado</div>
      <p>${milestonesDone}/${milestonesTotal} marcos concluídos · <span style="color:var(--crit)">${milestonesAtrasados} atrasado(s)</span></p>
    </div>

    <div class="section-block">
      <h3>⚠️ Riscos</h3>
      <div class="desc">Ameaças identificadas que podem impactar o prazo ou resultado do projeto</div>
      <p>${p.risks.length} risco(s) aberto(s) · <span style="color:var(--crit)">${risksAltos} de alta criticidade</span></p>
    </div>

    <div class="section-block">
      <h3>🕐 Horas Consultores — Burn Acumulado</h3>
      <div class="desc">Evolução do consumo de horas da equipe ao longo do projeto</div>
      <canvas id="chart-burn" height="90"></canvas>
    </div>
  `;

  renderProgressChart(p);
  renderStatusChart(p);
  renderBurnChart(p);
}

function renderProgressChart(p){
  const phases = [...new Set(p.tasks.map(t=>t.phase||'Sem fase'))];
  const planned = phases.map(ph=>{
    const ts = p.tasks.filter(t=>(t.phase||'Sem fase')===ph);
    const now = new Date();
    const vals = ts.map(t=>{
      if(!t.start||!t.end) return 0;
      const s=new Date(t.start), e=new Date(t.end);
      if(now>=e) return 100; if(now<=s) return 0; return ((now-s)/(e-s))*100;
    });
    return Math.round(vals.reduce((a,b)=>a+b,0)/vals.length);
  });
  const realized = phases.map(ph=>{
    const ts = p.tasks.filter(t=>(t.phase||'Sem fase')===ph);
    const vals = ts.map(t=>taskPercent(t));
    return Math.round(vals.reduce((a,b)=>a+b,0)/vals.length);
  });
  const ctx = document.getElementById('chart-progresso');
  charts.progresso = new Chart(ctx, {
    type:'bar',
    data:{labels:phases, datasets:[
      {label:'Planejado', data:planned, backgroundColor:'#a9c2ee'},
      {label:'Realizado', data:realized, backgroundColor:'#2e6bd6'}
    ]},
    options:{responsive:true, scales:{y:{beginAtZero:true,max:100}}}
  });
}
function renderStatusChart(p){
  const statuses = ['Não iniciado','Em progresso','Concluído','Em atraso'];
  const colors = ['#c7cede','#8a5cf0','#1e9e6b','#d64545'];
  const counts = statuses.map(s=>p.tasks.filter(t=>t.status===s).length);
  const ctx = document.getElementById('chart-status');
  charts.status = new Chart(ctx, {
    type:'doughnut',
    data:{labels:statuses, datasets:[{data:counts, backgroundColor:colors}]},
    options:{responsive:true}
  });
}
function renderBurnChart(p){
  const monthsSet = new Set();
  p.consultants.forEach(c=>{
    Object.keys(c.forecastByMonth||{}).forEach(m=>monthsSet.add(m));
    Object.keys(c.actualByMonth||{}).forEach(m=>monthsSet.add(m));
  });
  const months = [...monthsSet].sort();
  if(months.length===0){
    document.getElementById('chart-burn').closest('.section-block').innerHTML += '<p style="color:var(--muted);font-size:13px;">Sem dados de horas lançadas ainda.</p>';
    return;
  }
  let accForecast=0, accReal=0;
  const forecastAcc=[], realAcc=[];
  months.forEach(m=>{
    accForecast += p.consultants.reduce((a,c)=>a+(c.forecastByMonth[m]||0),0);
    accReal += p.consultants.reduce((a,c)=>a+(c.actualByMonth[m]||0),0);
    forecastAcc.push(accForecast);
    realAcc.push(accReal);
  });
  const ctx = document.getElementById('chart-burn');
  charts.burn = new Chart(ctx, {
    type:'line',
    data:{labels:months, datasets:[
      {label:'Forecast original', data:forecastAcc, borderColor:'#a9c2ee', tension:.3},
      {label:'Realizado acumulado', data:realAcc, borderColor:'#2e6bd6', tension:.3}
    ]},
    options:{responsive:true}
  });
}

function exportReport(){
  const p = currentProject();
  const k = computeIndicators(p);
  if(!k){ alert('Projeto sem dados suficientes para exportar.'); return; }
  const lines = [
    `Relatório — ${p.name}`,
    `Data: ${fmtDate(todayISO())}`,
    `Cliente: ${p.client||'—'} | Gerente: ${p.manager||'—'}`,
    `Status: ${p.status}`,
    ``,
    `SPI (prazo): ${k.spi.toFixed(2)}`,
    `CPI (custo/esforço): ${k.cpi.toFixed(2)}`,
    `Dias restantes: ${k.diasRestantes!=null?k.diasRestantes:'—'}`,
    `Previsão de conclusão: ${k.previsao?fmtDate(k.previsao):'—'}`,
    `Desvio estimado: ${k.desvio!=null?k.desvio+' dias':'—'}`,
    `Horas forecast: ${k.forecastTotal}h | Horas realizadas: ${k.realizadoHoras}h`,
    `EAC: ${k.eacHoras.toFixed(0)}h`,
    ``,
    `Marcos: ${p.milestones.length} | Riscos abertos: ${p.risks.length}`
  ];
  const blob = new Blob([lines.join('\n')], {type:'text/plain'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `relatorio-${p.name.replace(/\s+/g,'-').toLowerCase()}-${todayISO()}.txt`;
  a.click();
}
