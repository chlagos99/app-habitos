import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import { getAuth, signInWithRedirect, getRedirectResult, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBVg6aLGD4sHQ85Pup_soUIrcjzZKnx6w8",
    authDomain: "app-habitos-8a146.web.app", 
    projectId: "app-habitos-8a146",
    storageBucket: "app-habitos-8a146.firebasestorage.app",
    messagingSenderId: "258984410226",
    appId: "1:258984410226:web:ccb26c8831fba88c7ad6eb"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

getRedirectResult(auth).catch((error) => {
    console.error("Error en redirección:", error.code);
    alert("Error de autenticación: " + error.message);
});

let currentUser = null;
let data = { habits: [], completions: {} };
let isSyncing = false;
let dragSourceIndex = null;

const APP_VERSION = "v1.3"; 

function updateGroupList() {
    const select = document.getElementById('grupoHabito');
    if(!select) return;
    
    const gruposBase = ['General', 'Salud', 'Estudios', 'Trabajo'];
    const gruposUsuario = data.habits.map(h => h.grupo || 'General');
    const gruposUnicos = [...new Set([...gruposBase, ...gruposUsuario])];
    
    select.innerHTML = gruposUnicos.map(g => `<option value="${g}">${g}</option>`).join('');
}

function verificarActualizacion() {
    if (localStorage.getItem("appVersion") !== APP_VERSION) {
        document.getElementById("changelogModal").style.display = "flex";
        localStorage.setItem("appVersion", APP_VERSION);
    }
}
verificarActualizacion(); // Ejecución directa adaptada para type="module"

function cerrarChangelog() {
    document.getElementById("changelogModal").style.display = "none";
}

const getLocalToday = () => {
    const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
};
const today = getLocalToday();

const fill = document.getElementById('progressFill');
const loadingUI = document.getElementById('loadingUI');
const loginBtn = document.getElementById('loginBtn');
const splash = document.getElementById('splashScreen');
const loadingText = document.getElementById('loadingText');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        loadingUI.classList.remove('hidden');
        loginBtn.classList.add('hidden');
        loadingText.innerText = "Sincronizando...";
        fill.style.width = "40%";
        await loadUserData();
    } else {
        currentUser = null;
        loadingUI.classList.add('hidden');
        loginBtn.classList.remove('hidden');
        loginBtn.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Ingresar con Google`;
        loginBtn.style.opacity = "1";
        loginBtn.style.pointerEvents = "auto";
    }
});

async function iniciarSesion() {
    try { 
        loadingBtn();
        await signInWithRedirect(auth, provider); 
    } 
    catch (error) { 
        console.error("Error Login:", error); 
        alert("Bloqueo detectado: " + error.message);
        loginBtn.innerHTML = "Ingresar con Google";
        loginBtn.style.opacity = "1";
        loginBtn.style.pointerEvents = "auto";
    }
}

function loadingBtn() {
    loginBtn.innerHTML = "Redirigiendo...";
    loginBtn.style.opacity = "0.7";
    loginBtn.style.pointerEvents = "none";
}

async function cerrarSesion() {
    if(confirm("¿Seguro que deseas salir?")) {
        try {
            await signOut(auth);
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = "/";
        } catch (error) {
            console.error("Error al salir:", error);
        }
    }
}

async function loadUserData() {
    try {
        fill.style.width = "70%";
        const userDoc = doc(db, "usuarios", currentUser.uid);
        const docSnap = await getDoc(userDoc);
        
        if (docSnap.exists()) {
            data = docSnap.data();
        } else {
            data = { habits: [], completions: {} };
            await setDoc(userDoc, data);
        }
        
        fill.style.width = "100%";
        setTimeout(() => {
            splash.classList.add('fade-out');
            setTimeout(() => splash.classList.add('hidden'), 600);
            document.getElementById('mainView').classList.remove('hidden');
            renderMain();
        }, 400);

    } catch (error) {
        console.error("Error cargando DB:", error);
        loadingText.innerText = "Error de conexión";
        fill.style.backgroundColor = "#ff453a";
    }
}

async function saveData() {
    if (isSyncing || !currentUser) return;
    isSyncing = true;
    try {
        const userDoc = doc(db, "usuarios", currentUser.uid);
        await setDoc(userDoc, data);
    } catch (error) { console.error("Error guardando:", error); } 
    finally { isSyncing = false; }
}

function toggleView(viewId) {
    document.getElementById('mainView').classList.add('hidden');
    document.getElementById('dashboardView').classList.add('hidden');
    document.getElementById(viewId).classList.remove('hidden');
    if(viewId === 'dashboardView') initDashboard();
}

function handleDragStart(e, index) { dragSourceIndex = index; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', index); setTimeout(() => e.target.classList.add('dragging'), 0); }
function handleDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
async function handleDrop(e, targetIndex) {
    e.preventDefault();
    if (dragSourceIndex === null || dragSourceIndex === targetIndex) return;
    const habit = data.habits.splice(dragSourceIndex, 1)[0];
    data.habits.splice(targetIndex, 0, habit);
    renderMain(); await saveData();
}
function handleDragEnd(e) { e.target.classList.remove('dragging'); dragSourceIndex = null; }

function openModal(id) {
    const habit = data.habits.find(h => h.id === id);
    if(!habit) return;
    
    document.getElementById('editHabitId').value = habit.id;
    document.getElementById('editHabitName').value = habit.name;
    
    const groupSelect = document.getElementById('editHabitGroup');
    if (groupSelect) groupSelect.value = habit.grupo || "General";

    renderModalDays(id);
    document.getElementById('editModal').classList.remove('hidden');
}

function renderModalDays(id) {
    const container = document.getElementById('modalPastDays'); container.innerHTML = '';
    const completions = data.completions[id] || [];
    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
    const localNow = new Date(Date.now() - tzOffset);
    
    const days = [];
    for (let i = 13; i >= 0; i--) { const temp = new Date(localNow); temp.setDate(temp.getDate() - i); days.push(temp); }

    days.forEach(dateObj => {
        const dateStr = dateObj.toISOString().slice(0, 10);
        const isDone = completions.includes(dateStr);
        const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'short' }).charAt(0);
        const dayNum = dateObj.getDate();

        const cell = document.createElement('div');
        cell.className = `past-day-cell ${isDone ? 'active' : ''}`;
        cell.onclick = () => togglePastDayFromModal(id, dateStr);
        cell.innerHTML = `<span class="past-day-name">${dayName}</span><span class="past-day-num">${dayNum}</span>`;
        container.appendChild(cell);
    });
}

async function togglePastDayFromModal(id, dateStr) {
    if (!data.completions[id]) data.completions[id] = [];
    const index = data.completions[id].indexOf(dateStr);
    if (index > -1) data.completions[id].splice(index, 1); else data.completions[id].push(dateStr);
    renderModalDays(id); renderMain(); await saveData();
}

async function saveEdit() {
    const id = document.getElementById('editHabitId').value;
    const newName = document.getElementById('editHabitName').value.trim();
    const newGroup = document.getElementById('editHabitGroup').value;
    
    if(!newName) return;
    
    const habit = data.habits.find(h => h.id === id);
    if(habit) { 
        habit.name = newName; 
        habit.grupo = newGroup; 
        renderMain(); 
        await saveData(); 
    }
    document.getElementById('editModal').classList.add('hidden');
}

async function deleteFromModal() {
    if(confirm('¿Eliminar definitivamente este hábito y su historial?')) {
        const id = document.getElementById('editHabitId').value;
        data.habits = data.habits.filter(h => h.id !== id); delete data.completions[id];
        renderMain(); await saveData(); document.getElementById('editModal').classList.add('hidden');
    }
}

async function moveHabitFromModal(direction) {
    const id = document.getElementById('editHabitId').value;
    const index = data.habits.findIndex(h => h.id === id);
    if (index === -1) return;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= data.habits.length) return;
    const temp = data.habits[index]; data.habits[index] = data.habits[newIndex]; data.habits[newIndex] = temp;
    renderMain(); await saveData();
}

function renderMain() {
    const dateStr = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    document.getElementById('dateHeader').innerText = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    const list = document.getElementById('habitList'); list.innerHTML = '';

    data.habits.forEach((habit, index) => {
        const isDone = data.completions[habit.id]?.includes(today);
        const div = document.createElement('div'); div.className = 'habit-row'; div.draggable = true;
        div.addEventListener('dragstart', (e) => handleDragStart(e, index));
        div.addEventListener('dragover', handleDragOver);
        div.addEventListener('drop', (e) => handleDrop(e, index));
        div.addEventListener('dragend', handleDragEnd);

        div.innerHTML = `
            <div class="habit-name-container" onclick="openModal('${habit.id}')">
                <span class="drag-handle">≡</span>
                <span class="habit-name">
                    ${habit.name} 
                    <small style="color: #888; font-size: 0.75rem; margin-left: 8px; background: #eee; padding: 2px 6px; border-radius: 4px; color: #333;">${habit.grupo || 'General'}</small>
                </span>
            </div>
            <div class="checkbox ${isDone ? 'checked' : ''}" onclick="toggleHabit('${habit.id}')"></div>`;
        list.appendChild(div);
    });
    updateGroupList(); 
}

async function addHabit() {
    const input = document.getElementById('newHabit'); 
    const selectGrupo = document.getElementById('grupoHabito'); 
    const name = input.value.trim(); 
    
    if (!name) return;

    const grupo = selectGrupo.value || 'General'; 
    const id = 'h_' + Date.now(); 
    
    data.habits.push({ id, name, grupo }); 
    data.completions[id] = [];
    
    input.value = ''; 
    renderMain(); 
    await saveData();
}

async function toggleHabit(id) {
    if (!data.completions[id]) data.completions[id] = [];
    const index = data.completions[id].indexOf(today);
    if (index > -1) data.completions[id].splice(index, 1); else data.completions[id].push(today);
    renderMain(); await saveData();
}

function renderGroupSummary() {
    const container = document.getElementById('groupSummaryContainer');
    if(!container) return;

    const grupos = data.habits.reduce((acc, hab) => {
        const g = hab.grupo || 'General';
        if (!acc[g]) acc[g] = { total: 0, completados: 0 };
        acc[g].total++;
        if (data.completions[hab.id]?.includes(today)) {
            acc[g].completados++;
        }
        return acc;
    }, {});

    let html = '';
    for (const [grupo, stats] of Object.entries(grupos)) {
        const porcentaje = stats.total === 0 ? 0 : Math.round((stats.completados / stats.total) * 100);
        html += `
        <div style="margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 6px;">
                <span style="font-weight: 500;">${grupo}</span>
                <span style="color: var(--gray);">${stats.completados}/${stats.total} (${porcentaje}%)</span>
            </div>
            <div style="width: 100%; height: 8px; background: #333; border-radius: 4px; overflow: hidden;">
                <div style="width: ${porcentaje}%; height: 100%; background: var(--primary); transition: width 0.4s ease;"></div>
            </div>
        </div>`;
    }
    container.innerHTML = html || '<div style="color: #888; font-size: 14px;">No hay hábitos.</div>';
}

function updateDashboardHabits() {
    const groupSelect = document.getElementById('groupSelect');
    const habitSelect = document.getElementById('habitSelect');
    const selectedGroup = groupSelect.value;

    const habitosDelGrupo = data.habits.filter(h => (h.grupo || 'General') === selectedGroup);
    
    let html = `<option value="todos">Todos (${habitosDelGrupo.length})</option>`;
    html += habitosDelGrupo.map(h => `<option value="${h.id}">${h.name}</option>`).join('');
    
    habitSelect.innerHTML = html;
    renderDashboard();
}

function initDashboard() {
    const groupSelect = document.getElementById('groupSelect');
    const gruposUsuario = data.habits.map(h => h.grupo || 'General');
    const gruposUnicos = [...new Set(gruposUsuario)];
    if (gruposUnicos.length === 0) gruposUnicos.push('General'); 
    groupSelect.innerHTML = gruposUnicos.map(g => `<option value="${g}">${g}</option>`).join('');

    const monthSelect = document.getElementById('monthSelect');
    const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    monthSelect.innerHTML = months.map((m, i) => `<option value="${i+1}" ${new Date().getMonth() === i ? 'selected' : ''}>${m}</option>`).join('');
    const yearSelect = document.getElementById('yearSelect'); const currentYear = new Date().getFullYear();
    yearSelect.innerHTML = `<option value="${currentYear}">${currentYear}</option><option value="${currentYear-1}">${currentYear-1}</option>`;
    
    updateDashboardHabits(); 
    renderGroupSummary(); 
}

function renderDashboard() {
    const groupSelect = document.getElementById('groupSelect');
    const habitSelect = document.getElementById('habitSelect');
    if (!groupSelect || !habitSelect) return;
    
    const selectedGroup = groupSelect.value;
    const habitId = habitSelect.value;
    
    let habitosAVisualizar = [];
    if (habitId === 'todos') {
        habitosAVisualizar = data.habits.filter(h => (h.grupo || 'General') === selectedGroup);
    } else {
        habitosAVisualizar = data.habits.filter(h => h.id === habitId);
    }

    const totalHabits = habitosAVisualizar.length;

    const getDayCompletionRatio = (dateStr) => {
        if (totalHabits === 0) return 0;
        let completed = 0;
        habitosAVisualizar.forEach(h => {
            if (data.completions[h.id] && data.completions[h.id].includes(dateStr)) completed++;
        });
        return completed / totalHabits;
    };

    const heatContainer = document.getElementById('heatmapContainer');
    heatContainer.innerHTML = `
        <div class="heatmap-wrapper">
            <div class="heatmap-months" id="heatmapMonths"></div>
            <div class="heatmap-body">
                <div class="heatmap-y-axis"><div>L</div><div>M</div><div>M</div><div>J</div><div>V</div><div>S</div><div>D</div></div>
                <div class="heatmap-grid" id="heatmapColumns"></div>
            </div>
        </div>`;
    const monthsContainer = document.getElementById('heatmapMonths'); const colsContainer = document.getElementById('heatmapColumns');
    const tzOffset = (new Date()).getTimezoneOffset() * 60000; const localNow = new Date(Date.now() - tzOffset);
    const daysToMonday = (localNow.getDay() + 6) % 7; const startMonday = new Date(localNow); startMonday.setDate(localNow.getDate() - daysToMonday - (17 * 7));
    const todayStr = localNow.toISOString().slice(0, 10);

    for (let w = 0; w < 18; w++) {
        const col = document.createElement('div'); col.className = 'heatmap-col';
        let isNewMonth = false; let monthName = '';
        for (let d = 0; d < 7; d++) {
            const cellDate = new Date(startMonday); cellDate.setDate(startMonday.getDate() + (w * 7) + d);
            const dateStr = cellDate.toISOString().slice(0, 10);
            if (cellDate.getDate() === 1 || (w === 0 && d === 0)) { isNewMonth = true; monthName = cellDate.toLocaleString('es-ES', { month: 'short' }); }
            
            const isFuture = dateStr > todayStr; 
            const ratio = getDayCompletionRatio(dateStr);
            
            const square = document.createElement('div'); 
            square.className = 'heatmap-square';
            if (isFuture) {
                square.classList.add('future');
            } else if (ratio > 0) {
                square.style.backgroundColor = `rgba(52, 199, 89, ${ratio})`;
            }
            col.appendChild(square);
        }
        colsContainer.appendChild(col);
        if (isNewMonth) {
            const label = document.createElement('div'); label.className = 'heatmap-month-label';
            label.innerText = monthName; label.style.left = (w * 18) + 'px'; monthsContainer.appendChild(label);
        }
    }

    const calContainer = document.getElementById('calendarGrid'); calContainer.innerHTML = '';
    const month = parseInt(document.getElementById('monthSelect').value), year = parseInt(document.getElementById('yearSelect').value);
    const daysInMonth = new Date(year, month, 0).getDate(); const firstDayIndex = (new Date(year, month - 1, 1).getDay() + 6) % 7; 
    for(let blank = 0; blank < firstDayIndex; blank++) calContainer.appendChild(document.createElement('div'));
    
    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const ratio = getDayCompletionRatio(dateStr);
        const isFuture = dateStr > todayStr;
        
        const square = document.createElement('div'); 
        square.className = 'day-square';
        square.innerText = i;
        
        if (!isFuture && ratio > 0) {
            square.style.backgroundColor = `rgba(52, 199, 89, ${ratio})`;
            square.style.color = ratio > 0.4 ? '#fff' : '#aaa'; 
            if (ratio === 1) square.style.fontWeight = 'bold';
        }
        calContainer.appendChild(square);
    }
}

window.iniciarSesion = iniciarSesion;
window.cerrarSesion = cerrarSesion;
window.toggleView = toggleView;
window.openModal = openModal;
window.togglePastDayFromModal = togglePastDayFromModal;
window.saveEdit = saveEdit;
window.deleteFromModal = deleteFromModal;
window.moveHabitFromModal = moveHabitFromModal;
window.toggleHabit = toggleHabit;
window.addHabit = addHabit;
window.renderDashboard = renderDashboard;
window.cerrarChangelog = cerrarChangelog;
window.updateDashboardHabits = updateDashboardHabits;

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.log('Error SW', err));
}