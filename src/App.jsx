import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Users, UserPlus, LayoutDashboard, BookOpen, Heart, Globe,
  Phone, Calendar, Search, ChevronRight, ArrowLeft, Check,
  MessageCircle, UserCheck, BarChart, Download, Plus, Award,
  ClipboardCheck, X, Loader2, Edit, Trash2, AlertTriangle, Shield,
  ArrowDownUp, Filter, Printer, Info, Settings, Moon, Sun, History, LogOut, Lock,
  Upload, Activity, FileSpreadsheet
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDZFYTWU12nNulTiuv0pMo4wpPrgaAdCqg",
  authDomain: "ministerio-conexion-miel.firebaseapp.com",
  projectId: "ministerio-conexion-miel",
  storageBucket: "ministerio-conexion-miel.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcd1234efgh5678"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const STORAGE_KEY_THEME = 'conexion:darkmode';

// AQUÍ ESTÁN LOS CORREOS DE ADMINISTRADOR (puedes agregar los que necesites)
const ADMIN_EMAILS = ['mmatusm8@gmail.com', 'carovargas.mf@gmail.com']; 

const MODULE_UI_DATA = {
  A: { icon: <Heart className="w-6 h-6" />, color: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800" },
  B: { icon: <BookOpen className="w-6 h-6" />, color: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800" },
  C: { icon: <Users className="w-6 h-6" />, color: "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800" },
  D: { icon: <Globe className="w-6 h-6" />, color: "bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800" }
};

const defaultModuleInfo = {
  A: { title: "Cristo nos recibe", verse: "Juan 3:16", desc: "Conocemos el Evangelio, la gracia de Dios y nuestra nueva identidad en Cristo." },
  B: { title: "Cristo transforma", verse: "Romanos 12:2", desc: "Aprendemos a leer la Biblia, orar y caminar cada día con el Espíritu Santo." },
  C: { title: "Cristo nos une", verse: "Hechos 2:42", desc: "Descubrimos la importancia de la iglesia, la comunión y los grupos pequeños." },
  D: { title: "Cristo nos envía", verse: "Mateo 28:19-20", desc: "Descubrimos nuestros dones, el servicio, el bautismo y los próximos pasos." }
};

const emptyModules = () => ({
  A: { done: false, date: null, stampedBy: null },
  B: { done: false, date: null, stampedBy: null },
  C: { done: false, date: null, stampedBy: null },
  D: { done: false, date: null, stampedBy: null }
});

const waLink = (phone, customMessage = "") => {
  const digits = (phone || '').replace(/[^0-9]/g, '');
  if (digits.length < 11) return null;
  const baseUrl = `https://wa.me/${digits}`;
  return customMessage ? `${baseUrl}?text=${encodeURIComponent(customMessage)}` : baseUrl;
};

const todayStr = () => new Date().toISOString().split('T')[0];

const formatChileanPhone = (val) => {
  if (!val) return '';
  let cleaned = val.replace(/\D/g, '');
  if (cleaned.startsWith('56')) cleaned = cleaned.slice(2);
  if (cleaned.startsWith('9')) cleaned = cleaned.slice(1);
  cleaned = cleaned.slice(0, 8);
  if (cleaned.length === 0) return '+56 9 ';
  let formatted = '+56 9 ';
  formatted += cleaned.substring(0, 4);
  if (cleaned.length > 4) formatted += ' ' + cleaned.substring(4, 8);
  return formatted;
};

const downloadCSV = (rowsArray, filename) => {
  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + rowsArray.map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const ConfirmModal = ({ confirmModal }) => {
  if (!confirmModal.show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
        <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          {confirmModal.title}
        </h3>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
          {confirmModal.message}
        </p>
        <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
          <button type="button" onClick={confirmModal.onCancel} className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            Cancelar
          </button>
          <button type="button" onClick={confirmModal.onConfirm} className="px-5 py-2 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg shadow-sm transition-colors">
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-20 md:bottom-10 right-4 md:right-10 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4 md:px-0">
      {toasts.map((toast) => (
        <div key={toast.id} className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-lg shadow-xl text-white font-medium animate-in slide-in-from-right-5 fade-in duration-300 ${toast.type === 'success' ? 'bg-emerald-600' : toast.type === 'error' ? 'bg-rose-600' : 'bg-slate-800'}`}>
          <div className="flex items-center gap-2.5">
            {toast.type === 'success' && <Check className="w-5 h-5 shrink-0" />}
            {toast.type === 'error' && <AlertTriangle className="w-5 h-5 shrink-0" />}
            <span className="text-sm font-semibold">{toast.msg}</span>
          </div>
          <button onClick={() => removeToast(toast.id)} className="hover:bg-white/20 p-1 rounded transition-colors" aria-label="Cerrar notificación"><X className="w-4 h-4" /></button>
        </div>
      ))}
    </div>
  );
};

const DashboardView = ({ currentUser, myAttendees, alertAttendees, goToAddEditAttendee, goToProfile, getInactiveDays }) => {
  const stats = {
    total: myAttendees.length,
    completed: myAttendees.filter(a => a.modules?.A?.done && a.modules?.B?.done && a.modules?.C?.done && a.modules?.D?.done).length,
    presented: myAttendees.filter(a => a.presented).length
  };
  stats.inProgress = stats.total - stats.completed;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 id="view-title" tabIndex={-1} className="text-2xl font-bold text-slate-800 dark:text-slate-100 focus:outline-none">
            {currentUser.role === 'admin' ? 'Panel de Control General' : 'Mi Panel de Anfitrión'}
          </h2>
          <p className="text-slate-600 dark:text-slate-400">Resumen de integración de la familia de la fe.</p>
        </div>
        <button onClick={() => goToAddEditAttendee(null)} className="bg-amber-500 hover:bg-amber-600 text-slate-900 px-4 py-2 rounded-lg shadow-sm flex items-center font-bold transition-colors">
          <UserPlus className="w-5 h-5 mr-2" /> Nuevo Asistente
        </button>
      </div>

      {alertAttendees.length > 0 && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 rounded-xl p-5 shadow-sm">
          <h3 className="text-rose-800 dark:text-rose-400 font-bold flex items-center mb-3"><AlertTriangle className="w-5 h-5 mr-2" /> Requieren Seguimiento ({alertAttendees.length})</h3>
          <p className="text-rose-600 dark:text-rose-300 text-sm mb-4">Llevan 7+ días sin registrar asistencia ni avanzar módulos. ¡Envíales un mensaje animándolos!</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {alertAttendees.map(a => {
              const alertMsg = `Hola ${a.name}, ¡te extrañamos en el ministerio Conexión! ¿Cómo has estado?`;
              const waAlertLink = waLink(a.phone, alertMsg);

              return (
                <div key={a.id} role="button" tabIndex={0} onKeyDown={(e)=>e.key==='Enter' && goToProfile(a.id)} onClick={() => goToProfile(a.id)} className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-rose-100 dark:border-slate-700 flex justify-between items-center cursor-pointer hover:border-rose-300 dark:hover:border-rose-500 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-amber-500">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{a.name}</p>
                    <p className="text-xs text-rose-500 dark:text-rose-400 font-medium">{getInactiveDays(a)} días sin actividad</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {waAlertLink && (
                      <a href={waAlertLink} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="p-2 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-full transition-colors" title="Enviar WhatsApp de seguimiento">
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <div><p className="text-sm font-medium text-slate-500 dark:text-slate-400">Asistentes</p><p className="text-3xl font-bold dark:text-slate-100">{stats.total}</p></div>
          <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400"><Users className="w-6 h-6" /></div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <div><p className="text-sm font-medium text-slate-500 dark:text-slate-400">En Proceso</p><p className="text-3xl font-bold dark:text-slate-100">{stats.inProgress}</p></div>
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400"><BookOpen className="w-6 h-6" /></div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <div><p className="text-sm font-medium text-slate-500 dark:text-slate-400">Completados</p><p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.completed}</p></div>
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400"><Check className="w-6 h-6" /></div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <div><p className="text-sm font-medium text-slate-500 dark:text-slate-400">Presentados</p><p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{stats.presented}</p></div>
          <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400"><Award className="w-6 h-6" /></div>
        </div>
      </div>
    </div>
  );
};

const ListView = ({ myAttendees, hosts, currentUser, goToProfile, goToAddEditAttendee, showToast, createLog }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date'); 
  const [visibleCount, setVisibleCount] = useState(12);
  const fileInputRef = useRef(null);

  let result = myAttendees.filter(a => {
    const host = hosts.find(h => h.id === a.hostId) || { name: '' };
    return a.name?.toLowerCase().includes(searchTerm.toLowerCase()) || host.name?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (sortBy === 'name') result.sort((a, b) => a.name.localeCompare(b.name));
  if (sortBy === 'date') result.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  if (sortBy === 'progress') {
    result.sort((a, b) => {
      const pA = Object.values(a.modules).filter(m => m.done).length;
      const pB = Object.values(b.modules).filter(m => m.done).length;
      return pB - pA;
    });
  }

  const paginatedResult = result.slice(0, visibleCount);

  const handleExportCSV = () => {
    if (result.length === 0) { showToast('No hay datos para exportar.', 'error'); return; }
    const rows = [["Nombre", "Telefono", "Fecha de Ingreso", "Anfitrión", "Progreso", "Estado"]];
    result.forEach(a => {
      const host = hosts.find(h => h.id === a.hostId)?.name || 'Sin asignar';
      const progress = Object.values(a.modules).filter(m => m.done).length;
      const state = a.presented ? 'Presentado' : (progress === 4 ? 'Listo' : 'En proceso');
      rows.push([a.name, a.phone || '', a.startDate, host, `${progress}/4`, state]);
    });
    downloadCSV(rows, `Asistentes_Conexion_${todayStr()}.csv`);
    showToast('Archivo CSV generado y descargado');
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
       const text = event.target.result;
       const lines = text.split('\n').filter(line => line.trim().length > 0);
       if (lines.length < 2) { showToast('El archivo está vacío o sin datos válidos', 'error'); return; }
       
       let count = 0;
       for (let i = 1; i < lines.length; i++) { // Salta la cabecera
           const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, '')); // Quita comillas si existen
           const name = cols[0];
           const phone = cols[1] || '';
           
           if (name) {
              const newAtt = {
                name: String(name), 
                phone: String(phone ? formatChileanPhone(phone) : ''), 
                startDate: String(todayStr()),
                hostId: currentUser.role === 'host' ? String(currentUser.hostId) : '', 
                notes: 'Importado masivamente vía CSV',
                modules: emptyModules(), attendance: [], presented: false, presentedDate: null,
                history: [createLog('Asistente importado masivamente vía CSV')]
              };
              await addDoc(collection(db, "attendees"), newAtt);
              count++;
           }
       }
       showToast(`Se han importado ${count} asistentes con éxito`, 'success');
       if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <h2 id="view-title" tabIndex={-1} className="text-2xl font-bold text-slate-800 dark:text-slate-100 focus:outline-none">Asistentes</h2>
        <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
            <input type="text" placeholder="Buscar por nombre..." className="w-full pl-10 pr-4 py-2 border dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white dark:bg-slate-800 dark:text-white" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setVisibleCount(12); }} />
          </div>
          <div className="relative w-full sm:w-auto flex gap-2">
            <div className="relative flex-1 sm:w-auto">
              <ArrowDownUp className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <select className="w-full pl-9 pr-8 py-2 border dark:border-slate-700 rounded-lg outline-none bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 appearance-none text-slate-700" value={sortBy} onChange={(e) => { setSortBy(e.target.value); setVisibleCount(12); }}>
                <option value="date">Más recientes</option><option value="name">Alfabético</option><option value="progress">Mayor progreso</option>
              </select>
            </div>
            
            <button onClick={handleExportCSV} title="Exportar a CSV/Excel" className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors border border-slate-200 dark:border-slate-700">
              <Download className="w-5 h-5" />
            </button>
            <button onClick={() => fileInputRef.current?.click()} title="Importar desde CSV (Columnas: Nombre, Telefono)" className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors border border-slate-200 dark:border-slate-700">
              <Upload className="w-5 h-5" />
            </button>
            <input type="file" accept=".csv" ref={fileInputRef} onChange={handleImportCSV} className="hidden" />
          </div>
        </div>
      </div>

      {result.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4"><Search className="w-8 h-8" /></div>
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">No se encontraron asistentes</h3>
          <button onClick={() => goToAddEditAttendee(null)} className="mt-4 text-amber-600 dark:text-amber-400 font-medium hover:text-amber-700 flex items-center justify-center w-full"><Plus className="w-4 h-4 mr-1"/> Agregar nuevo</button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedResult.map(a => {
              const progress = Object.values(a.modules).filter(m => m.done).length;
              const host = hosts.find(h => h.id === a.hostId) || { name: 'Sin asignar' };
              return (
                <div key={a.id} role="button" tabIndex={0} onKeyDown={(e)=>e.key==='Enter' && goToProfile(a.id)} onClick={() => goToProfile(a.id)} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-amber-400 dark:hover:border-amber-500 cursor-pointer transition-all group focus:outline-none focus:ring-2 focus:ring-amber-500">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400">{a.name}</h3>
                    {a.presented ? <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs px-2 py-1 rounded-full font-bold">Presentado</span>
                      : progress === 4 ? <span className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs px-2 py-1 rounded-full font-bold flex items-center"><Check className="w-3 h-3 mr-1"/>Listo</span>
                      : <span className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-xs px-2 py-1 rounded-full font-bold">{progress}/4 Mód.</span>}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 space-y-1 mb-4"><p className="flex items-center"><Calendar className="w-4 h-4 mr-2" /> Inicio: {a.startDate}</p>{currentUser.role === 'admin' && <p className="flex items-center"><UserCheck className="w-4 h-4 mr-2" /> Anfitrión: {host.name}</p>}</div>
                  <div className="flex gap-1">{['A', 'B', 'C', 'D'].map(mod => <div key={mod} className={`flex-1 h-1.5 rounded-full ${a.modules[mod]?.done ? 'bg-amber-400' : 'bg-slate-100 dark:bg-slate-700'}`} />)}</div>
                </div>
              );
            })}
          </div>
          {result.length > visibleCount && (
            <div className="flex justify-center pt-4">
              <button onClick={() => setVisibleCount(prev => prev + 12)} className="bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold py-2.5 px-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm transition-all text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> Mostrar más asistentes ({result.length - visibleCount} restantes)</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const AttendeeFormView = ({ selectedAttendeeId, attendees, hosts, currentUser, goToProfile, navigateTo, showToast, createLog, triggerConfirm }) => {
  const isEditing = selectedAttendeeId !== null;
  const attendeeToEdit = isEditing ? attendees.find(a => a.id === selectedAttendeeId) : null;

  const [form, setForm] = useState(attendeeToEdit || {
    name: '', phone: '', startDate: todayStr(), hostId: currentUser.role === 'host' ? currentUser.hostId : '', notes: ''
  });

  const handlePhoneChange = (e) => {
    const val = e.target.value;
    if (val === '' || val === '+56 9' || val === '+56 9 ') setForm({ ...form, phone: '' });
    else setForm({ ...form, phone: formatChileanPhone(val) });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const proceedSubmit = async () => {
      try {
        const cleanForm = {
          name: String(form.name || ''),
          phone: String(form.phone || ''),
          startDate: String(form.startDate || ''),
          hostId: String(form.hostId || ''),
          notes: String(form.notes || '')
        };

        if (isEditing) {
          const attendeeRef = doc(db, "attendees", selectedAttendeeId);
          await updateDoc(attendeeRef, {
            ...cleanForm, 
            history: [...(attendeeToEdit.history||[]), createLog('Editó datos del perfil')]
          });
          showToast('Cambios guardados correctamente en la nube');
          goToProfile(selectedAttendeeId);
        } else {
          const newAtt = {
            ...cleanForm, 
            modules: emptyModules(), attendance: [], presented: false, presentedDate: null,
            history: [createLog('Asistente registrado')]
          };
          const docRef = await addDoc(collection(db, "attendees"), newAtt);
          showToast('Asistente registrado con éxito');
          goToProfile(docRef.id);
        }
      } catch (error) {
        showToast('Error al guardar: ' + error.message, 'error');
      }
    };

    const isDuplicate = !isEditing && attendees.some(a => a.name.toLowerCase() === form.name.trim().toLowerCase() || (a.phone && form.phone && a.phone === form.phone));
    const host = hosts.find(h => h.id === form.hostId);
    const assignedCount = host ? attendees.filter(a => a.hostId === host.id && a.id !== selectedAttendeeId).length : 0;
    const isOverCapacity = host && assignedCount >= host.maxCapacity;

    if (isDuplicate) {
      triggerConfirm("⚠️ Posible Registro Duplicado", "Ya existe alguien con este nombre o teléfono en la base de datos. ¿Deseas guardarlo de todos modos?", () => {
          if (isOverCapacity) triggerConfirm("⚠️ Capacidad Excedida", `El anfitrión ya tiene ${assignedCount}/${host.maxCapacity} asistentes. ¿Sobrapasar límite?`, proceedSubmit);
          else proceedSubmit();
        });
    } else if (isOverCapacity) triggerConfirm("⚠️ Capacidad Excedida", `El anfitrión ya tiene ${assignedCount}/${host.maxCapacity} asistentes asignados. ¿Deseas sobrepasar el límite de cupos establecido?`, proceedSubmit);
    else proceedSubmit();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <button aria-label="Volver atrás" onClick={() => isEditing ? goToProfile(selectedAttendeeId) : navigateTo('list')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 transition-colors"><ArrowLeft className="w-6 h-6" /></button>
        <h2 id="view-title" tabIndex={-1} className="text-2xl font-bold dark:text-white focus:outline-none">{isEditing ? 'Editar Datos' : 'Nuevo Asistente'}</h2>
      </div>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div><label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Nombre Completo</label><input required type="text" className="w-full p-2.5 border dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 bg-transparent dark:text-white" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div><label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Teléfono (WhatsApp)</label><input type="text" placeholder="+56 9 1234 5678" className="w-full p-2.5 border dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 bg-transparent dark:text-white" value={form.phone} onChange={handlePhoneChange} /></div>
          <div className="md:col-span-2"><label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Fecha de Inicio en Conexión</label><input required type="date" className="w-full p-2.5 border dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 bg-transparent dark:text-white dark:[color-scheme:dark]" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} /></div>
          {currentUser.role === 'admin' ? (
            <div className="md:col-span-2 bg-amber-50 dark:bg-amber-900/10 p-4 rounded-lg border border-amber-100 dark:border-amber-800/30">
              <label className="block text-sm font-bold mb-1.5 text-amber-900 dark:text-amber-400">Anfitrión Asignado</label>
              <select required className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-slate-800 dark:text-white" value={form.hostId} onChange={e => setForm({...form, hostId: e.target.value})}><option value="" disabled>-- Seleccione un anfitrión --</option>{hosts.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select>
            </div>
          ) : <input type="hidden" value={form.hostId} />}
          <div className="md:col-span-2"><label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Notas / Observaciones</label><textarea rows="3" className="w-full p-2.5 border dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 resize-none bg-transparent dark:text-white" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
        </div>
        <div className="flex justify-end border-t border-slate-100 dark:border-slate-700 pt-5"><button type="submit" className="bg-amber-500 text-slate-900 px-6 py-2.5 rounded-lg font-bold hover:bg-amber-400 shadow-sm transition-colors">{isEditing ? 'Guardar Cambios' : 'Crear Registro'}</button></div>
      </form>
    </div>
  );
};

const ProfileView = ({ selectedAttendeeId, attendees, hosts, currentUser, modulesConfig, goToProfile, goToAddEditAttendee, navigateTo, showToast, createLog, triggerConfirm }) => {
  const a = attendees.find(x => x.id === selectedAttendeeId);
  if (!a) return null;
  const host = hosts.find(h => h.id === a.hostId) || { name: 'Sin anfitrión', phone: '' };
  const isCompleted = Object.values(a.modules).every(m => m.done);
  const sortedAtt = [...(a.attendance || [])].sort((x, y) => y.date.localeCompare(x.date));
  const attendedToday = (a.attendance || []).some(r => r.date === todayStr());
  const [activeTab, setActiveTab] = useState('resumen');

  const toggleMod = async (mod) => {
    try {
      const done = !a.modules[mod].done;
      const attendeeRef = doc(db, "attendees", a.id);
      await updateDoc(attendeeRef, {
        [`modules.${mod}.done`]: done,
        [`modules.${mod}.date`]: done ? String(todayStr()) : null,
        [`modules.${mod}.stampedBy`]: done ? String(host.name) : null,
        history: [...(a.history||[]), createLog(done ? `Completó Módulo ${mod}` : `Desmarcó Módulo ${mod}`)]
      });
    } catch(e) { showToast('Error de conexión', 'error'); }
  };

  const handleDelete = () => {
    triggerConfirm("⚠️ ACCIÓN IRREVERSIBLE", `¿Estás seguro de que deseas eliminar permanentemente a ${a.name}? Se perderá todo su historial.`, async () => {
        try {
          await deleteDoc(doc(db, "attendees", a.id));
          showToast('Registro eliminado de la nube', 'error');
          navigateTo('list');
        } catch(e) { showToast('No se pudo eliminar el registro', 'error'); }
      });
  };

  const handleAddAttendance = async () => {
    try {
      const newRecord = { id: String(Date.now()), date: String(todayStr()), present: true };
      await updateDoc(doc(db, "attendees", a.id), {
        attendance: [...a.attendance, newRecord],
        history: [...(a.history||[]), createLog('Registró asistencia')]
      });
    } catch(e) { showToast('Error al registrar', 'error'); }
  };

  const handleRemoveAttendance = (rId) => {
    triggerConfirm("Confirmar Eliminación", "¿Seguro que deseas eliminar esta fecha de asistencia del registro?", async () => {
        try {
          await updateDoc(doc(db, "attendees", a.id), {
            attendance: a.attendance.filter(y => y.id !== rId),
            history: [...(a.history||[]), createLog('Eliminó registro de asistencia')]
          });
          showToast('Asistencia removida');
        } catch(e) { showToast('Error al eliminar asistencia', 'error'); }
      });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3"><button aria-label="Volver atrás" onClick={() => navigateTo('list')} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 transition-colors"><ArrowLeft className="w-6 h-6" /></button><h2 id="view-title" tabIndex={-1} className="text-2xl font-bold dark:text-white focus:outline-none">Pasaporte Digital</h2></div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => goToAddEditAttendee(a.id)} className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-white shadow-sm transition-colors"><Edit className="w-4 h-4" /> Editar Datos</button>
          {currentUser.role === 'admin' && <button onClick={handleDelete} className="flex items-center gap-2 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/50 shadow-sm transition-colors"><Trash2 className="w-4 h-4" /> Eliminar</button>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-slate-900 dark:bg-slate-800 border dark:border-slate-700 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
            <div className="w-16 h-16 bg-amber-400 text-slate-900 rounded-full flex items-center justify-center mb-4 shadow-inner font-bold text-2xl">{a.name.charAt(0)}</div>
            <h3 className="text-xl font-bold">{a.name}</h3>
            <p className="text-slate-300 dark:text-slate-400 text-sm mt-3 flex items-center"><Phone className="w-4 h-4 mr-2 text-amber-400" /> {a.phone || 'Sin teléfono'}</p>
            <p className="text-slate-300 dark:text-slate-400 text-sm mt-1.5 flex items-center"><Calendar className="w-4 h-4 mr-2 text-amber-400" /> Desde: {a.startDate}</p>
            {waLink(a.phone) && <a href={waLink(a.phone)} target="_blank" rel="noreferrer" className="mt-5 bg-white/10 hover:bg-white/20 py-2.5 rounded-lg flex justify-center items-center text-sm font-medium transition-colors"><MessageCircle className="w-4 h-4 mr-2" /> Enviar WhatsApp</a>}
          </div>
          
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300 flex justify-between items-center pb-2 border-b dark:border-slate-700"><span className="flex items-center"><ClipboardCheck className="w-4 h-4 mr-1 text-amber-500"/> Asistencia</span><button aria-label="Agregar asistencia de hoy" onClick={handleAddAttendance} disabled={attendedToday} className="text-amber-600 dark:text-amber-500 font-bold hover:text-amber-700 disabled:text-slate-300 dark:disabled:text-slate-600 transition-colors">+ Hoy</button></h4>
            <ul className="mt-3 space-y-1.5">
              {sortedAtt.length === 0 && <p className="text-xs text-slate-400 py-2">Sin registros.</p>}
              {sortedAtt.map(r => (<li key={r.id} className="flex justify-between items-center text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 px-3 py-1.5 rounded-lg"><span className="text-emerald-600 dark:text-emerald-400 font-bold">{r.date}</span><button aria-label="Eliminar asistencia" onClick={() => handleRemoveAttendance(r.id)} className="text-slate-400 hover:text-rose-500 transition-colors"><X className="w-4 h-4"/></button></li>))}
            </ul>
          </div>
          {a.notes && <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 p-5 rounded-2xl shadow-sm"><h4 className="font-bold text-sm text-amber-900 dark:text-amber-400 mb-2">Notas / Observaciones</h4><p className="text-sm text-amber-800 dark:text-amber-200/70 whitespace-pre-wrap leading-relaxed">{a.notes}</p></div>}
        </div>

        <div className="md:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl shadow-sm">
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b dark:border-slate-700">
             <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
               <button onClick={()=>setActiveTab('resumen')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${activeTab==='resumen' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>Módulos</button>
               <button onClick={()=>setActiveTab('historial')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors flex items-center ${activeTab==='historial' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}><History className="w-3.5 h-3.5 mr-1"/> Historial</button>
             </div>
             <div className="mt-4 sm:mt-0">
               {a.presented ? <span className="bg-indigo-100 dark:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 px-4 py-1.5 rounded-full text-sm font-bold flex items-center shadow-sm"><Award className="w-4 h-4 mr-1.5"/> Presentado el {a.presentedDate}</span>
               : isCompleted && <button onClick={() => triggerConfirm("Presentar a la Iglesia", `¿Confirmas que deseas marcar a ${a.name} como ya presentado públicamente?`, async () => { try { await updateDoc(doc(db, "attendees", a.id), { presented:true, presentedDate:String(todayStr()), history: [...(a.history||[]), createLog('Marcado como presentado a la iglesia')] }); showToast('¡Marcado como presentado a la iglesia!'); } catch(e) { showToast('Error', 'error'); }})} className="bg-indigo-600 text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-indigo-700 shadow-md flex items-center transition-colors"><Award className="w-4 h-4 mr-1.5"/> Marcar Presentado</button>}
             </div>
           </div>
           
           {activeTab === 'resumen' ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {['A', 'B', 'C', 'D'].map(key => {
                  const info = { ...modulesConfig[key], ...MODULE_UI_DATA[key] };
                  const isDone = a.modules[key]?.done;
                  return (
                    <div key={key} className={`border-2 p-5 rounded-xl relative transition-all duration-300 ${isDone ? info.color + ' shadow-sm' : 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-500'}`}>
                      <div className="flex justify-between items-start mb-3"><div className={isDone ? 'bg-white/50 dark:bg-black/20 p-2 rounded-lg' : 'bg-white dark:bg-slate-800 border dark:border-slate-700 p-2 rounded-lg text-slate-400'}>{info.icon}</div><button aria-label={isDone ? `Desmarcar módulo ${key}` : `Marcar módulo ${key} completado`} onClick={() => toggleMod(key)} className={`w-12 h-12 rounded-full flex justify-center items-center transition-all duration-300 border-2 ${isDone ? 'bg-amber-400 border-amber-500 text-slate-900 shadow-lg scale-110' : 'border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-300 dark:text-slate-500 hover:border-amber-400 hover:text-amber-400'}`}><Check className="w-6 h-6" strokeWidth={3}/></button></div>
                      <div className="flex items-center gap-2 mb-1"><span className={`text-[10px] font-black px-2 py-0.5 rounded tracking-wide ${isDone ? 'bg-white/50 dark:bg-black/30' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>MÓDULO {key}</span></div>
                      <h4 className={`font-bold text-lg leading-tight mb-1 ${isDone ? '' : 'dark:text-white'}`}>{info.title}</h4>
                      <p className={`text-xs font-semibold mb-2 ${isDone ? 'opacity-80' : 'text-amber-600 dark:text-amber-500'}`}>{info.verse}</p>
                      <p className={`text-xs leading-relaxed ${isDone ? 'opacity-90' : 'text-slate-500 dark:text-slate-400'}`}>{info.desc}</p>
                      {isDone && <p className="text-[10px] mt-3 font-bold opacity-70 border-t border-black/10 dark:border-white/10 pt-2">Sellado el {a.modules[key]?.date} · {a.modules[key]?.stampedBy}</p>}
                    </div>
                  )
                })}
             </div>
           ) : (
             <div className="space-y-4">
               {(!a.history || a.history.length === 0) ? (<p className="text-center text-slate-400 py-10">No hay registros en el historial.</p>) : (
                 <div className="relative border-l border-slate-200 dark:border-slate-700 ml-3 space-y-6 pb-4">
                   {[...a.history].reverse().map((log) => (
                     <div key={log.id} className="relative pl-6">
                       <div className="absolute w-3 h-3 bg-amber-400 rounded-full -left-[6.5px] top-1.5 border-2 border-white dark:border-slate-800"></div>
                       <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                         <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{log.action}</p>
                         <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{log.date} · Registrado por: <span className="font-semibold text-slate-700 dark:text-slate-300">{log.user}</span></p>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

const HostsView = ({ currentUser, hosts, attendees, goToHostDetail, showToast, triggerConfirm }) => {
  if (currentUser.role !== 'admin') return <div className="text-center mt-10 text-slate-500">Acceso denegado. Solo administradores.</div>;
  const [form, setForm] = useState({ name: '', phone: '', email: '', maxCapacity: 5 });

  const handlePhoneChange = (e) => {
    const val = e.target.value;
    if (val === '' || val === '+56 9' || val === '+56 9 ') setForm({ ...form, phone: '' });
    else setForm({ ...form, phone: formatChileanPhone(val) });
  };

  const handleAdd = (e) => {
    e.preventDefault();
    const proceedAdd = async () => {
      try {
        const cleanHost = {
          name: String(form.name || ''),
          email: String(form.email || ''),
          phone: String(form.phone || ''),
          maxCapacity: Number(form.maxCapacity || 5)
        };
        await addDoc(collection(db, "hosts"), cleanHost);
        setForm({ name: '', phone: '', email: '', maxCapacity: 5 });
        showToast('Anfitrión agregado correctamente a la nube', 'success');
      } catch(err) { showToast('Error al guardar', 'error'); }
    };

    const isDuplicate = hosts.some(h => h.name.toLowerCase() === form.name.trim().toLowerCase() || (h.email && form.email && h.email.toLowerCase() === form.email.trim().toLowerCase()));
    if (isDuplicate) triggerConfirm("⚠️ Anfitrión Duplicado", "Ya existe un anfitrión con ese nombre o correo. ¿Deseas guardarlo de todos modos?", proceedAdd);
    else proceedAdd();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h2 id="view-title" tabIndex={-1} className="text-2xl font-bold text-slate-800 dark:text-white focus:outline-none">Gestión de Anfitriones</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {hosts.length === 0 && <div className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-slate-200 dark:border-slate-700 text-center text-slate-500">No hay anfitriones registrados.</div>}
          {hosts.map(h => {
            const assigned = attendees.filter(a => a.hostId === h.id).length;
            return (
              <div key={h.id} role="button" tabIndex={0} aria-label={`Ver detalle de anfitrión ${h.name}`} onKeyDown={(e)=>e.key==='Enter' && goToHostDetail(h.id)} onClick={() => goToHostDetail(h.id)} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4 cursor-pointer hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-md transition-all group focus:outline-none focus:ring-2 focus:ring-amber-500">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/40 rounded-full flex justify-center items-center text-amber-700 dark:text-amber-400 font-bold text-2xl shadow-inner">{h.name.charAt(0)}</div>
                  <div><h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">{h.name}</h3><p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">{h.email || 'Sin correo asignado'}</p><p className="text-sm text-slate-500 dark:text-slate-400 flex items-center"><Phone className="w-3.5 h-3.5 mr-1"/>{h.phone || 'Sin número'}</p></div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Carga de asistentes</p>
                  <p className={`font-bold text-lg ${assigned >= h.maxCapacity ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{assigned} <span className="text-slate-400 dark:text-slate-500 text-sm font-normal">/ {h.maxCapacity}</span></p>
                </div>
              </div>
            )
          })}
        </div>
        <div className="lg:col-span-1">
          <form onSubmit={handleAdd} className="bg-slate-900 dark:bg-slate-800 border dark:border-slate-700 p-6 rounded-2xl shadow-lg space-y-5 text-white sticky top-6">
            <h3 className="font-bold text-amber-400 text-lg flex items-center border-b border-slate-700 pb-3"><Plus className="w-5 h-5 mr-2"/> Nuevo Anfitrión</h3>
            <div><label className="block text-sm text-slate-400 mb-1.5">Nombre Familia / Líder</label><input required type="text" className="w-full p-2.5 bg-slate-800 dark:bg-slate-900 border border-slate-700 rounded-lg outline-none focus:border-amber-500 text-white" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
            <div><label className="block text-sm text-slate-400 mb-1.5">Correo de acceso (Login)</label><input type="email" placeholder="lider@correo.com" className="w-full p-2.5 bg-slate-800 dark:bg-slate-900 border border-slate-700 rounded-lg outline-none focus:border-amber-500 text-white" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div>
            <div><label className="block text-sm text-slate-400 mb-1.5">Teléfono (WhatsApp)</label><input type="text" placeholder="+56 9..." className="w-full p-2.5 bg-slate-800 dark:bg-slate-900 border border-slate-700 rounded-lg outline-none focus:border-amber-500 text-white" value={form.phone} onChange={handlePhoneChange}/></div>
            <div><label className="block text-sm text-slate-400 mb-1.5">Capacidad Máxima (Cupos)</label><input required type="number" min="1" className="w-full p-2.5 bg-slate-800 dark:bg-slate-900 border border-slate-700 rounded-lg outline-none focus:border-amber-500 text-white" value={form.maxCapacity} onChange={e=>setForm({...form,maxCapacity:e.target.value})}/></div>
            <button type="submit" className="w-full bg-amber-500 text-slate-900 font-bold py-3 rounded-lg hover:bg-amber-400 transition-colors mt-2">Guardar Anfitrión</button>
          </form>
        </div>
      </div>
    </div>
  );
};

const HostDetailView = ({ selectedHostId, hosts, attendees, currentUser, goToProfile, navigateTo, showToast, triggerConfirm }) => {
  const h = hosts.find(x => x.id === selectedHostId);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(h);
  const [visibleCount, setVisibleCount] = useState(12);

  if (!h) return null;
  const assigned = attendees.filter(a => a.hostId === h.id);
  const paginatedAssigned = assigned.slice(0, visibleCount);

  const handleSave = async () => {
    try {
      const cleanHost = {
        name: String(form.name || ''),
        email: String(form.email || ''),
        phone: String(form.phone || ''),
        maxCapacity: Number(form.maxCapacity || 5)
      };
      await updateDoc(doc(db, "hosts", h.id), cleanHost);
      setIsEditing(false);
      showToast('Datos del anfitrión actualizados', 'success');
    } catch(e) { showToast('Error al actualizar', 'error'); }
  };

  const handleDelete = () => {
    if (assigned.length > 0) { showToast("⚠️ No puedes eliminar un anfitrión con personas asignadas.", "error"); return; }
    triggerConfirm("⚠️ ACCIÓN IRREVERSIBLE", `¿Seguro que deseas eliminar a ${h.name} de la base de datos?`, async () => {
        try {
          await deleteDoc(doc(db, "hosts", h.id));
          showToast('Anfitrión eliminado', 'success');
          navigateTo('hosts');
        } catch(e) { showToast('Error al eliminar', 'error'); }
      });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4"><button aria-label="Volver atrás" onClick={() => navigateTo('hosts')} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors dark:text-slate-400"><ArrowLeft className="w-6 h-6" /></button><h2 id="view-title" tabIndex={-1} className="text-2xl font-bold text-slate-800 dark:text-white focus:outline-none">Detalle de Anfitrión</h2></div>
      <div className="bg-slate-900 dark:bg-slate-800 border dark:border-slate-700 text-white rounded-2xl p-6 shadow-lg relative">
        {isEditing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-xs text-slate-400 mb-1 block">Nombre</label><input type="text" className="w-full p-2.5 bg-slate-800 dark:bg-slate-900 rounded-lg outline-none border border-slate-700 text-white focus:border-amber-500" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} /></div>
            <div><label className="text-xs text-slate-400 mb-1 block">Correo de Acceso</label><input type="email" className="w-full p-2.5 bg-slate-800 dark:bg-slate-900 rounded-lg outline-none border border-slate-700 text-white focus:border-amber-500" value={form.email || ''} onChange={e=>setForm({...form, email: e.target.value})} /></div>
            <div><label className="text-xs text-slate-400 mb-1 block">Teléfono</label><input type="text" className="w-full p-2.5 bg-slate-800 dark:bg-slate-900 rounded-lg outline-none border border-slate-700 text-white focus:border-amber-500" value={form.phone} onChange={(e) => setForm({...form, phone: formatChileanPhone(e.target.value)})} /></div>
            <div><label className="text-xs text-slate-400 mb-1 block">Capacidad Max.</label><input type="number" className="w-full p-2.5 bg-slate-800 dark:bg-slate-900 rounded-lg outline-none border border-slate-700 text-white focus:border-amber-500" value={form.maxCapacity} onChange={e=>setForm({...form, maxCapacity: e.target.value})} /></div>
            <div className="md:col-span-2 flex gap-3 mt-2"><button onClick={handleSave} className="bg-emerald-600 px-6 py-2 rounded-lg font-bold text-sm hover:bg-emerald-500 transition-colors">Guardar</button><button onClick={() => setIsEditing(false)} className="bg-slate-700 px-6 py-2 rounded-lg font-bold text-sm hover:bg-slate-600 transition-colors">Cancelar</button></div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row justify-between items-start">
            <div className="flex items-center gap-4 mb-4 sm:mb-0">
              <div className="w-16 h-16 bg-amber-400 text-slate-900 rounded-full flex items-center justify-center font-bold text-3xl shadow-inner">{h.name.charAt(0)}</div>
              <div><h3 className="text-2xl font-bold text-white">{h.name}</h3><p className="text-slate-400 text-sm mt-1">{h.email || 'Sin correo de acceso'}</p><p className="text-amber-400 flex items-center mt-1 font-medium"><Phone className="w-4 h-4 mr-2"/> {h.phone || 'Sin número'}</p><p className="text-slate-400 mt-2 text-sm bg-slate-800 dark:bg-slate-900 inline-block px-3 py-1 rounded-full border border-slate-700">Capacidad: {h.maxCapacity} cupos</p></div>
            </div>
            {currentUser.role === 'admin' && (
              <div className="flex gap-2"><button onClick={() => setIsEditing(true)} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors text-sm font-semibold flex items-center"><Edit className="w-4 h-4 mr-2 text-amber-400"/> Editar</button><button onClick={handleDelete} className="bg-rose-500/20 hover:bg-rose-500/40 px-4 py-2 rounded-lg transition-colors text-sm font-semibold flex items-center text-rose-300"><Trash2 className="w-4 h-4 mr-2"/> Eliminar</button></div>
            )}
          </div>
        )}
      </div>

      <h3 className="font-bold text-lg mt-8 text-slate-800 dark:text-slate-200 flex items-center border-b dark:border-slate-700 pb-2"><Users className="w-5 h-5 mr-2 text-slate-400"/> Asistentes Asignados ({assigned.length}/{h.maxCapacity})</h3>
      {assigned.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-slate-200 dark:border-slate-700 text-center text-slate-500 dark:text-slate-400 shadow-sm">No tiene asistentes asignados.</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedAssigned.map(a => {
               const progress = Object.values(a.modules).filter(m => m.done).length;
               return (
                <div key={a.id} role="button" tabIndex={0} onKeyDown={(e)=>e.key==='Enter' && goToProfile(a.id)} onClick={() => goToProfile(a.id)} className="bg-white dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm cursor-pointer hover:border-amber-400 transition-all group focus:outline-none focus:ring-2 focus:ring-amber-500">
                  <div className="flex justify-between items-start mb-2"><h4 className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-700 dark:group-hover:text-amber-400">{a.name}</h4><span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] px-2 py-1 rounded-full font-bold">{progress}/4</span></div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center"><Calendar className="w-3.5 h-3.5 mr-1"/> Desde: {a.startDate}</p>
                </div>
               )
            })}
          </div>
          {assigned.length > visibleCount && (
            <div className="flex justify-center pt-4">
              <button onClick={() => setVisibleCount(prev => prev + 12)} className="bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold py-2.5 px-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm transition-all text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> Mostrar más asistentes ({assigned.length - visibleCount} restantes)</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ActivityFeedView = ({ attendees, currentUser }) => {
  if (currentUser.role !== 'admin') return null;

  const [visibleCount, setVisibleCount] = useState(30);

  const globalFeed = useMemo(() => {
    return attendees
      .flatMap(a => (a.history || []).map(h => ({ ...h, attendeeName: a.name, attendeeId: a.id })))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [attendees]);

  const paginatedFeed = globalFeed.slice(0, visibleCount);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <h2 id="view-title" tabIndex={-1} className="text-2xl font-bold text-slate-800 dark:text-white focus:outline-none">Feed Global de Actividad</h2>
      </div>
      <p className="text-slate-600 dark:text-slate-400">Auditoría en tiempo real de todas las acciones de los anfitriones y asistentes.</p>
      
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-6">
        {globalFeed.length === 0 ? (
          <p className="text-center text-slate-400 py-10">No hay actividad registrada aún.</p>
        ) : (
          <div className="relative border-l border-slate-200 dark:border-slate-700 ml-3 space-y-6 pb-4">
            {paginatedFeed.map((log) => (
              <div key={log.id + log.attendeeId} className="relative pl-6">
                <div className="absolute w-3 h-3 bg-amber-400 rounded-full -left-[6.5px] top-1.5 border-2 border-white dark:border-slate-800"></div>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
                  <div className="flex justify-between items-start mb-1.5">
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                      {log.action} <span className="font-normal text-slate-500 dark:text-slate-400">en el perfil de</span> <span className="text-amber-600 dark:text-amber-400">{log.attendeeName}</span>
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1" /> {log.date} &nbsp;&middot;&nbsp; 
                    <UserCheck className="w-3.5 h-3.5 mr-1 ml-2" /> Por: <span className="font-semibold text-slate-700 dark:text-slate-300 ml-1">{log.user}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        {globalFeed.length > visibleCount && (
          <div className="flex justify-center pt-6">
            <button onClick={() => setVisibleCount(prev => prev + 30)} className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold py-2.5 px-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm transition-all text-sm flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Mostrar más actividad ({globalFeed.length - visibleCount} restantes)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const ReportsView = ({ currentUser, attendees, hosts, showToast }) => {
  const [reportMonth, setReportMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [reportHostFilter, setReportHostFilter] = useState('all');
  const [reportStatusFilter, setReportStatusFilter] = useState('all');

  if (currentUser.role !== 'admin') return null;
  
  let filteredData = attendees.filter(a => {
    if (a.startDate?.startsWith(reportMonth)) return true;
    if (a.presentedDate?.startsWith(reportMonth)) return true;
    if (a.attendance?.some(att => att.date?.startsWith(reportMonth))) return true;
    if (Object.values(a.modules).some(m => m.date?.startsWith(reportMonth))) return true;
    return false;
  });

  if (reportHostFilter !== 'all') filteredData = filteredData.filter(a => a.hostId === reportHostFilter);
  if (reportStatusFilter === 'completed') filteredData = filteredData.filter(a => Object.values(a.modules).every(m=>m.done) && !a.presented);
  if (reportStatusFilter === 'pending') filteredData = filteredData.filter(a => !Object.values(a.modules).every(m=>m.done));
  if (reportStatusFilter === 'presented') filteredData = filteredData.filter(a => a.presented);

  const compThisMonth = filteredData.filter(a => a.modules?.A?.done && a.modules?.B?.done && a.modules?.C?.done && a.modules?.D?.done).length;
  const presThisMonth = filteredData.filter(a => a.presented).length;

  const handleExportCSV = () => {
    if (filteredData.length === 0) { showToast('No hay datos para exportar.', 'error'); return; }
    const rows = [["Nombre", "Telefono", "Fecha Ingreso", "Anfitrión", "Progreso", "Estado"]];
    filteredData.forEach(a => {
      const host = hosts.find(h => h.id === a.hostId)?.name || 'Sin asignar';
      const progress = Object.values(a.modules).filter(m => m.done).length;
      const state = a.presented ? 'Presentado' : (progress === 4 ? 'Listo' : 'En proceso');
      rows.push([a.name, a.phone || '', a.startDate, host, `${progress}/4`, state]);
    });
    downloadCSV(rows, `Reporte_Conexion_${reportMonth}.csv`);
    showToast('Reporte CSV generado correctamente', 'success');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
       <style>{`@media print { aside, nav, .no-print { display: none !important; } body { background-color: white !important; color: black !important; } .print-container { box-shadow: none !important; border: none !important; background: white !important; } * { color: black !important; border-color: #ccc !important; } }`}</style>
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div><h2 id="view-title" tabIndex={-1} className="text-2xl font-bold text-slate-800 dark:text-white focus:outline-none">Reportes de Actividad</h2><p className="text-slate-600 dark:text-slate-400">Visualiza y exporta la actividad mensual real.</p></div>
        <div className="flex gap-2">
          <button onClick={handleExportCSV} className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white rounded-lg shadow-sm font-bold transition-colors border border-slate-200 dark:border-slate-700"><FileSpreadsheet className="w-5 h-5" title="Exportar CSV"/></button>
          <button onClick={()=>window.print()} className="bg-slate-900 dark:bg-amber-500 dark:text-slate-900 text-white px-5 py-2.5 rounded-lg shadow-sm flex items-center font-bold hover:bg-slate-800 dark:hover:bg-amber-400 transition-colors"><Printer className="w-5 h-5 mr-2" /> Guardar PDF</button>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4 no-print">
        <div className="flex-1"><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Mes de Actividad Real</label><input type="month" className="w-full p-2 border dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 dark:bg-slate-900 dark:text-white dark:[color-scheme:dark]" value={reportMonth} onChange={e => setReportMonth(e.target.value)} /></div>
        <div className="flex-1"><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider flex items-center"><Filter className="w-3.5 h-3.5 mr-1"/> Anfitrión</label><select className="w-full p-2 border dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-slate-900 dark:text-white" value={reportHostFilter} onChange={e => setReportHostFilter(e.target.value)}><option value="all">Todos los anfitriones</option>{hosts.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select></div>
        <div className="flex-1"><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider flex items-center"><Filter className="w-3.5 h-3.5 mr-1"/> Estado</label><select className="w-full p-2 border dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-slate-900 dark:text-white" value={reportStatusFilter} onChange={e => setReportStatusFilter(e.target.value)}><option value="all">Cualquier estado</option><option value="pending">En proceso (Pendientes)</option><option value="completed">Listos (Completaron 4 mod.)</option><option value="presented">Ya presentados</option></select></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-xl border border-amber-200 dark:border-amber-800/30"><p className="text-amber-800 dark:text-amber-400 font-bold mb-1">Total Filtrados</p><p className="text-4xl font-black text-amber-600 dark:text-amber-500">{filteredData.length}</p></div>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-xl border border-emerald-200 dark:border-emerald-800/30"><p className="text-emerald-800 dark:text-emerald-400 font-bold mb-1">Completaron</p><p className="text-4xl font-black text-emerald-600 dark:text-emerald-500">{compThisMonth}</p></div>
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-xl border border-indigo-200 dark:border-indigo-800/30"><p className="text-indigo-800 dark:text-indigo-400 font-bold mb-1">Presentados</p><p className="text-4xl font-black text-indigo-600 dark:text-indigo-500">{presThisMonth}</p></div>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden print-container">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center"><h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg">Reporte Detallado</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
            <thead className="bg-white dark:bg-slate-800 border-b-2 border-slate-200 dark:border-slate-700"><tr><th className="p-4 font-bold text-slate-900 dark:text-slate-100">Nombre</th><th className="p-4 font-bold text-slate-900 dark:text-slate-100">Fecha Ingreso</th><th className="p-4 font-bold text-slate-900 dark:text-slate-100">Anfitrión</th><th className="p-4 font-bold text-slate-900 dark:text-slate-100 text-center">Progreso</th><th className="p-4 font-bold text-slate-900 dark:text-slate-100 text-center">Estado</th></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredData.length === 0 ? <tr><td colSpan="5" className="p-8 text-center text-slate-400">No hay registros.</td></tr> : filteredData.map(a => {
                  const host = hosts.find(h => h.id === a.hostId) || { name: 'Sin asignar' };
                  const progress = Object.values(a.modules).filter(m => m.done).length;
                  return (
                    <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="p-4 font-semibold">{a.name}</td><td className="p-4 text-slate-500 dark:text-slate-400">{a.startDate}</td><td className="p-4">{host.name}</td>
                      <td className="p-4 text-center"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${progress===4?'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300':'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>{progress}/4</span></td>
                      <td className="p-4 text-center">{a.presented ? <span className="text-indigo-600 dark:text-indigo-400 font-bold text-xs"><Award className="w-3.5 h-3.5 inline mr-1 -mt-0.5"/>Presentado</span> : progress === 4 ? <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs"><Check className="w-3.5 h-3.5 inline mr-1 -mt-0.5"/>Listo</span> : <span className="text-slate-400 text-xs italic">En proceso</span>}</td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
};

const SettingsView = ({ currentUser, modulesConfig, showToast }) => {
  if (currentUser.role !== 'admin') return null;
  const [localConfig, setLocalConfig] = useState(modulesConfig);
  
  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const cleanConfig = {
        A: { title: String(localConfig.A.title || ''), verse: String(localConfig.A.verse || ''), desc: String(localConfig.A.desc || '') },
        B: { title: String(localConfig.B.title || ''), verse: String(localConfig.B.verse || ''), desc: String(localConfig.B.desc || '') },
        C: { title: String(localConfig.C.title || ''), verse: String(localConfig.C.verse || ''), desc: String(localConfig.C.desc || '') },
        D: { title: String(localConfig.D.title || ''), verse: String(localConfig.D.verse || ''), desc: String(localConfig.D.desc || '') }
      };
      await updateDoc(doc(db, "settings", "modulesConfig"), cleanConfig);
      showToast('Textos guardados correctamente en Firebase', 'success');
    } catch(err) { showToast('Error al actualizar textos', 'error'); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4"><h2 id="view-title" tabIndex={-1} className="text-2xl font-bold text-slate-800 dark:text-white focus:outline-none">Configuración de Módulos</h2></div>
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 p-4 rounded-xl text-amber-800 dark:text-amber-300 text-sm flex items-center"><Info className="w-5 h-5 mr-3 shrink-0" /> Puedes personalizar el título, versículo y descripción. Se actualizará de forma segura en la base de datos.</div>
      <form onSubmit={handleSave} className="space-y-6">
        {['A', 'B', 'C', 'D'].map(mod => (
          <div key={mod} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="font-bold text-lg mb-4 flex items-center dark:text-white"><span className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center mr-3 text-slate-500 dark:text-slate-400">{mod}</span> Módulo {mod}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Título del Módulo</label><input required type="text" className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg outline-none focus:border-amber-500 bg-white dark:bg-slate-900 dark:text-white" value={localConfig[mod]?.title || ''} onChange={e => setLocalConfig({...localConfig, [mod]:{...localConfig[mod], title: e.target.value}})} /></div>
              <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Versículo Base</label><input required type="text" className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg outline-none focus:border-amber-500 bg-white dark:bg-slate-900 dark:text-white" value={localConfig[mod]?.verse || ''} onChange={e => setLocalConfig({...localConfig, [mod]:{...localConfig[mod], verse: e.target.value}})} /></div>
              <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Descripción Corta</label><textarea required rows="2" className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg outline-none focus:border-amber-500 bg-white dark:bg-slate-900 dark:text-white resize-none" value={localConfig[mod]?.desc || ''} onChange={e => setLocalConfig({...localConfig, [mod]:{...localConfig[mod], desc: e.target.value}})} /></div>
            </div>
          </div>
        ))}
        <div className="flex justify-end pb-8"><button type="submit" className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold shadow-sm hover:bg-emerald-700 transition-colors">Guardar Configuración en Nube</button></div>
      </form>
    </div>
  );
};

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [splashFadeOut, setSplashFadeOut] = useState(false);
  
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const [hosts, setHosts] = useState([]);
  const [attendees, setAttendees] = useState([]);
  const [modulesConfig, setModulesConfig] = useState(defaultModuleInfo);
  
  const [darkMode, setDarkMode] = useState(() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY_THEME)) || false; } catch(e) { return false; } });
  
  const [currentUser, setCurrentUser] = useState({ role: 'guest', hostId: null });
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedAttendeeId, setSelectedAttendeeId] = useState(null);
  const [selectedHostId, setSelectedHostId] = useState(null);
  const [toasts, setToasts] = useState([]);

  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null, onCancel: null });

  useEffect(() => localStorage.setItem(STORAGE_KEY_THEME, JSON.stringify(darkMode)), [darkMode]);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setSplashFadeOut(true), 1500);
    const hideTimer = setTimeout(() => setShowSplash(false), 2000);
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer); };
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUserAuth) => {
      setUser(currentUserAuth);
      setAuthLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubSettings = onSnapshot(doc(db, "settings", "modulesConfig"), (docSnap) => {
      if (docSnap.exists()) {
        const rawData = docSnap.data();
        const cleanedData = {};
        ['A', 'B', 'C', 'D'].forEach(key => {
          cleanedData[key] = {
            title: rawData[key]?.title || defaultModuleInfo[key].title,
            verse: rawData[key]?.verse || defaultModuleInfo[key].verse,
            desc: rawData[key]?.desc || defaultModuleInfo[key].desc
          };
        });
        setModulesConfig(cleanedData);
      } else {
        const safeInit = {
          A: { title: defaultModuleInfo.A.title, verse: defaultModuleInfo.A.verse, desc: defaultModuleInfo.A.desc },
          B: { title: defaultModuleInfo.B.title, verse: defaultModuleInfo.B.verse, desc: defaultModuleInfo.B.desc },
          C: { title: defaultModuleInfo.C.title, verse: defaultModuleInfo.C.verse, desc: defaultModuleInfo.C.desc },
          D: { title: defaultModuleInfo.D.title, verse: defaultModuleInfo.D.verse, desc: defaultModuleInfo.D.desc }
        };
        setDoc(doc(db, "settings", "modulesConfig"), safeInit);
      }
    });

    const unsubHosts = onSnapshot(collection(db, "hosts"), (snapshot) => {
      const hostsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHosts(hostsData);
      
      const currentUserEmail = user.email?.toLowerCase() || '';
      if (ADMIN_EMAILS.map(e => e.toLowerCase()).includes(currentUserEmail)) {
        setCurrentUser({ role: 'admin', hostId: null });
      } else {
        const matchingHost = hostsData.find(h => h.email?.toLowerCase() === currentUserEmail);
        if (matchingHost) setCurrentUser({ role: 'host', hostId: matchingHost.id });
        else setCurrentUser({ role: 'guest', hostId: null });
      }
    });

    const unsubAttendees = onSnapshot(collection(db, "attendees"), (snapshot) => {
      const attData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAttendees(attData);
    });

    return () => { unsubSettings(); unsubHosts(); unsubAttendees(); };
  }, [user]);

  const removeToast = useCallback((id) => { setToasts(prev => prev.filter(t => t.id !== id)); }, []);
  const showToast = useCallback((msg, type = 'success') => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => removeToast(id), 4000);
  }, [removeToast]);

  const triggerConfirm = useCallback((title, message, onConfirmCallback) => {
    setConfirmModal({
      show: true, title, message,
      onConfirm: () => { onConfirmCallback(); setConfirmModal(prev => ({ ...prev, show: false })); },
      onCancel: () => { setConfirmModal(prev => ({ ...prev, show: false })); }
    });
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      await signInWithEmailAndPassword(auth, loginForm.email, loginForm.password);
      showToast('Inicio de sesión exitoso', 'success');
    } catch (err) { setLoginError('Credenciales incorrectas o error de conexión.'); }
  };

  const handleGoogleLogin = async () => {
    setLoginError('');
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      showToast('Acceso con Google exitoso', 'success');
    } catch (err) { setLoginError('Error de autenticación con Google: ' + err.message); }
  };

  const handleLogout = async () => { await signOut(auth); setCurrentUser({ role: 'guest', hostId: null }); };
  
  const navigateTo = (view) => { 
    setCurrentView(view); 
    window.scrollTo(0, 0); 
    setTimeout(() => {
      const titleElement = document.getElementById('view-title');
      if (titleElement) titleElement.focus();
    }, 100);
  };
  
  const goToProfile = (id) => { setSelectedAttendeeId(id); navigateTo('profile'); };
  const goToHostDetail = (id) => { setSelectedHostId(id); navigateTo('hostDetail'); };
  const goToAddEditAttendee = (id = null) => { setSelectedAttendeeId(id); navigateTo('attendeeForm'); };

  const createLog = (actionDesc) => {
    const time = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    const userStr = currentUser.role === 'admin' ? 'Administrador' : (hosts.find(h=>h.id === currentUser.hostId)?.name || 'Anfitrión');
    return { id: Date.now().toString() + Math.random().toString(), date: `${todayStr()} ${time}`, action: String(actionDesc), user: String(userStr) };
  };

  const myAttendees = useMemo(() => {
    if (currentUser.role === 'admin') return attendees;
    return attendees.filter(a => a.hostId === currentUser.hostId);
  }, [attendees, currentUser]);

  const getInactiveDays = (attendee) => {
    let lastDate = attendee.startDate;
    if (attendee.attendance && attendee.attendance.length > 0) {
      const sorted = [...attendee.attendance].sort((a,b) => b.date.localeCompare(a.date));
      lastDate = sorted[0].date;
    }
    return Math.floor(Math.abs(new Date() - new Date(lastDate)) / (1000 * 60 * 60 * 24));
  };

  const alertAttendees = useMemo(() => {
    return myAttendees.filter(a => {
      if (a.presented) return false;
      if (a.modules?.A?.done && a.modules?.B?.done && a.modules?.C?.done && a.modules?.D?.done) return false;
      return getInactiveDays(a) >= 7;
    });
  }, [myAttendees]);

  if (showSplash || authLoading) {
    return (
      <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900 transition-opacity duration-500 ${(splashFadeOut && !authLoading) ? 'opacity-0' : 'opacity-100'}`}>
        <div className="animate-pulse"><img src="logo.png" alt="Logo" className="w-32 h-32 object-contain drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]" onError={(e) => { e.target.style.display='none'; }}/></div>
        <h1 className="mt-6 text-3xl font-bold text-white">Iglesia <span className="text-amber-400">Miel</span></h1>
        <p className="text-amber-200 mt-2 tracking-widest uppercase text-sm">Conexión</p>
        {authLoading && <Loader2 className="w-6 h-6 text-amber-500 animate-spin mt-8" />}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20"><Lock className="w-10 h-10 text-amber-400" /></div>
            <h1 className="text-2xl font-bold text-white">Acceso a Plataforma</h1>
            <p className="text-slate-400 text-sm mt-2">Ingresa tus credenciales para continuar</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && <div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 p-3 rounded-lg text-sm text-center">{loginError}</div>}
            <div><label className="block text-sm font-medium text-slate-400 mb-1">Correo electrónico</label><input required type="email" value={loginForm.email} onChange={e=>setLoginForm({...loginForm, email: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-amber-500 outline-none" autoComplete="username" /></div>
            <div><label className="block text-sm font-medium text-slate-400 mb-1">Contraseña</label><input required type="password" value={loginForm.password} onChange={e=>setLoginForm({...loginForm, password: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-amber-500 outline-none" autoComplete="current-password" /></div>
            <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3 rounded-lg transition-colors mt-2">Ingresar al Sistema</button>
          </form>

          <div className="relative my-6 flex items-center justify-center"><div className="absolute inset-0 border-t border-slate-800"></div><span className="relative bg-slate-900 px-3 text-xs text-slate-400 uppercase tracking-wider">o continuar con</span></div>
          <button type="button" onClick={handleGoogleLogin} className="w-full bg-slate-950 hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-lg border border-slate-800 transition-all flex items-center justify-center gap-3 shadow-md">
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.5 5.5 0 0 1 8.5 13a5.5 5.5 0 0 1 5.49-5.518c1.383 0 2.637.513 3.593 1.353l3.053-3.053C18.72 3.864 16.481 3 13.99 3A9 9 0 0 0 5 12a9 9 0 0 0 8.99 9c4.954 0 8.91-3.524 8.91-9 0-.648-.063-1.285-.18-1.714l-10.48-.001Z"/></svg>
            Ingresar con Google
          </button>
        </div>
      </div>
    );
  }

  if (currentUser.role === 'guest') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <AlertTriangle className="w-16 h-16 text-rose-500 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Acceso No Autorizado</h2>
        <p className="text-slate-400 max-w-md mb-6">Tu correo electrónico ({user.email}) no está asignado a ningún anfitrión registrado. Por favor, contacta al administrador.</p>
        <button onClick={handleLogout} className="bg-slate-800 text-white px-6 py-2 rounded-lg hover:bg-slate-700 transition-colors">Cerrar Sesión</button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans flex w-full transition-colors duration-300 ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <ConfirmModal confirmModal={confirmModal} />

      {/* SIDEBAR DESKTOP */}
      <aside className="hidden md:flex flex-col w-72 bg-slate-900 text-slate-300 border-r border-slate-800 shadow-xl h-screen sticky top-0 shrink-0 no-print">
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <img src="logo.png" alt="Logo" className="w-12 h-12 object-contain drop-shadow-[0_0_10px_rgba(251,191,36,0.3)]" onError={(e) => { e.target.style.display='none'; }}/>
          <div className="leading-tight">
            <span className="text-white text-xl font-bold block">Iglesia Miel</span>
            <span className="text-amber-400 text-xs font-medium tracking-widest uppercase">Conexión</span>
          </div>
        </div>

        <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500 mb-1 flex items-center"><Shield className="w-3 h-3 mr-1"/> Vista Autenticada</p>
            <p className="text-white text-sm font-bold truncate pr-2 max-w-[200px]" title={user.email}>{currentUser.role === 'admin' ? 'Administrador' : hosts.find(h=>h.id === currentUser.hostId)?.name}</p>
          </div>
          <button onClick={() => triggerConfirm("Cerrar Sesión", "¿Seguro que deseas salir del sistema actual?", handleLogout)} title="Cerrar Sesión" className="p-2 bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 rounded-lg transition-colors"><LogOut className="w-4 h-4"/></button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button onClick={() => navigateTo('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${currentView === 'dashboard' ? 'bg-amber-500 text-slate-900 font-bold' : 'hover:bg-slate-800 text-white'}`}><LayoutDashboard className="w-5 h-5" aria-hidden="true" /> Inicio</button>
          <button onClick={() => navigateTo('list')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${(currentView === 'list' || currentView === 'profile' || currentView === 'attendeeForm') ? 'bg-amber-500 text-slate-900 font-bold' : 'hover:bg-slate-800 text-white'}`}><Users className="w-5 h-5" aria-hidden="true" /> Asistentes</button>
          {currentUser.role === 'admin' && (
            <>
              <button onClick={() => navigateTo('hosts')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${(currentView === 'hosts' || currentView === 'hostDetail') ? 'bg-amber-500 text-slate-900 font-bold' : 'hover:bg-slate-800 text-white'}`}><UserCheck className="w-5 h-5" aria-hidden="true" /> Anfitriones</button>
              <button onClick={() => navigateTo('reports')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${currentView === 'reports' ? 'bg-amber-500 text-slate-900 font-bold' : 'hover:bg-slate-800 text-white'}`}><BarChart className="w-5 h-5" aria-hidden="true" /> Reportes</button>
              <button onClick={() => navigateTo('feed')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${currentView === 'feed' ? 'bg-amber-500 text-slate-900 font-bold' : 'hover:bg-slate-800 text-white'}`}><Activity className="w-5 h-5" aria-hidden="true" /> Actividad</button>
              <div className="pt-4 mt-4 border-t border-slate-800">
                <button onClick={() => navigateTo('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${currentView === 'settings' ? 'bg-slate-700 text-white font-bold' : 'hover:bg-slate-800 text-slate-400'}`}><Settings className="w-5 h-5" aria-hidden="true" /> Configurar Textos</button>
              </div>
            </>
          )}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button onClick={() => setDarkMode(!darkMode)} className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors" aria-label={darkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}>
            {darkMode ? <Sun className="w-5 h-5"/> : <Moon className="w-5 h-5"/>}
            <span className="text-sm font-medium">{darkMode ? 'Modo Claro' : 'Modo Oscuro'}</span>
          </button>
        </div>
      </aside>

      {}
      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 w-full min-h-screen relative">
        <div className="max-w-7xl mx-auto w-full">
          {currentView === 'dashboard' && <DashboardView currentUser={currentUser} myAttendees={myAttendees} alertAttendees={alertAttendees} goToAddEditAttendee={goToAddEditAttendee} goToProfile={goToProfile} getInactiveDays={getInactiveDays} />}
          {currentView === 'list' && <ListView myAttendees={myAttendees} hosts={hosts} currentUser={currentUser} goToProfile={goToProfile} goToAddEditAttendee={goToAddEditAttendee} showToast={showToast} createLog={createLog} />}
          {currentView === 'attendeeForm' && <AttendeeFormView selectedAttendeeId={selectedAttendeeId} attendees={attendees} hosts={hosts} currentUser={currentUser} goToProfile={goToProfile} navigateTo={navigateTo} showToast={showToast} createLog={createLog} triggerConfirm={triggerConfirm} />}
          {currentView === 'profile' && <ProfileView selectedAttendeeId={selectedAttendeeId} attendees={attendees} hosts={hosts} currentUser={currentUser} modulesConfig={modulesConfig} goToProfile={goToProfile} goToAddEditAttendee={goToAddEditAttendee} navigateTo={navigateTo} showToast={showToast} createLog={createLog} triggerConfirm={triggerConfirm} />}
          {currentView === 'hosts' && <HostsView currentUser={currentUser} hosts={hosts} attendees={attendees} goToHostDetail={goToHostDetail} showToast={showToast} triggerConfirm={triggerConfirm} />}
          {currentView === 'hostDetail' && <HostDetailView selectedHostId={selectedHostId} hosts={hosts} attendees={attendees} currentUser={currentUser} goToProfile={goToProfile} navigateTo={navigateTo} showToast={showToast} triggerConfirm={triggerConfirm} />}
          {currentView === 'reports' && <ReportsView currentUser={currentUser} attendees={attendees} hosts={hosts} showToast={showToast} />}
          {currentView === 'feed' && <ActivityFeedView attendees={attendees} currentUser={currentUser} />}
          {currentView === 'settings' && <SettingsView currentUser={currentUser} modulesConfig={modulesConfig} showToast={showToast} />}
        </div>
      </main>

      {/* NAVEGACIÓN MÓVIL */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 text-slate-400 border-t border-slate-800 flex justify-around p-2 pb-safe z-40 no-print">
        <button aria-label="Ir a Inicio" onClick={() => navigateTo('dashboard')} className={`flex flex-col items-center p-2 ${currentView === 'dashboard' ? 'text-amber-400' : 'hover:text-white'}`}><LayoutDashboard className="w-6 h-6 mb-1" /><span className="text-[10px]">Inicio</span></button>
        <button aria-label="Ir a Asistentes" onClick={() => navigateTo('list')} className={`flex flex-col items-center p-2 ${(currentView === 'list' || currentView === 'profile' || currentView === 'attendeeForm') ? 'text-amber-400' : 'hover:text-white'}`}><Users className="w-6 h-6 mb-1" /><span className="text-[10px]">Asistentes</span></button>
        {currentUser.role === 'admin' && (
          <button aria-label="Ir a Anfitriones" onClick={() => navigateTo('hosts')} className={`flex flex-col items-center p-2 ${(currentView === 'hosts' || currentView === 'hostDetail') ? 'text-amber-400' : 'hover:text-white'}`}><UserCheck className="w-6 h-6 mb-1" /><span className="text-[10px]">Anfitriones</span></button>
        )}
        <button aria-label="Menú de cuenta y sistema" onClick={() => triggerConfirm("Cerrar Sesión", "¿Seguro que deseas salir del sistema actual?", handleLogout)} className="flex flex-col items-center p-2 hover:text-white">
          <LogOut className="w-6 h-6 mb-1"/>
          <span className="text-[10px]">Salir</span>
        </button>
      </nav>
    </div>
  );
}