/**
 * ==========================================
 * DIARIO EMOCIONAL INTELIGENTE
 * Aplicación web completa
 * ==========================================
 */

// ==========================================
// CONFIGURACIÓN GLOBAL
// ==========================================
const CONFIG = {
    emotions: {
        felicidad: { emoji: '😊', name: 'Felicidad', color: '#f39c12' },
        tristeza: { emoji: '😢', name: 'Tristeza', color: '#0984e3' },
        miedo: { emoji: '😨', name: 'Miedo', color: '#6c5ce7' },
        angustia: { emoji: '😰', name: 'Angustia', color: '#e84393' },
        calma: { emoji: '😌', name: 'Calma', color: '#00b894' },
        ansiedad: { emoji: '😟', name: 'Ansiedad', color: '#ff6b6b' }
    },
    storageKeys: {
        users: 'diario_users',
        currentUser: 'diario_currentUser',
        notes: 'diario_notes_',
        settings: 'diario_settings'
    }
};

// ==========================================
// GESTOR DE ALMACENAMIENTO
// ==========================================
class StorageManager {
    static get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error al obtener:', error);
            return null;
        }
    }

    static set(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error al guardar:', error);
            return false;
        }
    }

    static remove(key) {
        localStorage.removeItem(key);
    }
}

// ==========================================
// GESTOR DE USUARIOS
// ==========================================
class UserManager {
    static getAll() {
        return StorageManager.get(CONFIG.storageKeys.users) || [];
    }

    static saveAll(users) {
        StorageManager.set(CONFIG.storageKeys.users, users);
    }

    static register(userData) {
        const users = this.getAll();
        if (users.find(u => u.email === userData.email)) {
            return { success: false, message: 'Este correo ya está registrado' };
        }

        const newUser = {
            id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: userData.name,
            email: userData.email,
            password: userData.password,
            role: userData.role || 'usuario',
            avatar: null,
            bio: '',
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        this.saveAll(users);

        // Crear notas iniciales de ejemplo para el nuevo usuario
        this.createSampleNotes(newUser.id, newUser.role === 'admin');

        return { success: true, user: newUser };
    }

    static createSampleNotes(userId, isAdmin) {
        const sampleNotes = [
            {
                title: 'Mi primer día aquí',
                description: 'Hoy empecé a usar esta aplicación para expresar mis emociones. Parece muy útil para reflexionar sobre cómo me siento.',
                emotion: 'calma',
                createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
            },
            {
                title: 'Un momento hermoso',
                description: 'Paseamos por el parque con mi familia. El clima estaba perfecto y disfrutamos mucho juntos.',
                emotion: 'felicidad',
                createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
            },
            {
                title: 'Pensando en el futuro',
                description: 'Tengo algunas preocupaciones sobre el trabajo, pero sé que podré manejarlo. Necesito mantener la calma.',
                emotion: 'ansiedad',
                createdAt: new Date(Date.now() - 86400000).toISOString()
            }
        ];

        const notes = sampleNotes.map(note => ({
            ...note,
            id: 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            updatedAt: note.createdAt
        }));

        StorageManager.set(CONFIG.storageKeys.notes + userId, notes);
    }

    static login(email, password) {
        const users = this.getAll();
        const user = users.find(u => u.email === email && u.password === password);

        if (!user) {
            return { success: false, message: 'Correo o contraseña incorrectos' };
        }

        user.lastLogin = new Date().toISOString();
        this.saveAll(users);

        return { success: true, user };
    }

    static getById(id) {
        return this.getAll().find(u => u.id === id);
    }

    static update(id, updates) {
        const users = this.getAll();
        const index = users.findIndex(u => u.id === id);
        if (index === -1) return { success: false };

        users[index] = { ...users[index], ...updates };
        this.saveAll(users);
        return { success: true, user: users[index] };
    }

    static delete(id) {
        let users = this.getAll();
        users = users.filter(u => u.id !== id);
        this.saveAll(users);
        StorageManager.remove(CONFIG.storageKeys.notes + id);
    }
}

// ==========================================
// GESTOR DE NOTAS
// ==========================================
class NotesManager {
    static getByUser(userId) {
        return StorageManager.get(CONFIG.storageKeys.notes + userId) || [];
    }

    static saveForUser(userId, notes) {
        StorageManager.set(CONFIG.storageKeys.notes + userId, notes);
    }

    static create(userId, noteData) {
        const notes = this.getByUser(userId);

        const newNote = {
            id: 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            title: noteData.title,
            description: noteData.description,
            emotion: noteData.emotion,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        notes.unshift(newNote);
        this.saveForUser(userId, notes);

        return { success: true, note: newNote };
    }

    static update(userId, noteId, updates) {
        const notes = this.getByUser(userId);
        const index = notes.findIndex(n => n.id === noteId);
        if (index === -1) return { success: false };

        notes[index] = { ...notes[index], ...updates, updatedAt: new Date().toISOString() };
        this.saveForUser(userId, notes);

        return { success: true, note: notes[index] };
    }

    static delete(userId, noteId) {
        let notes = this.getByUser(userId);
        notes = notes.filter(n => n.id !== noteId);
        this.saveForUser(userId, notes);
    }

    static search(userId, query) {
        const notes = this.getByUser(userId);
        const q = query.toLowerCase();
        return notes.filter(n =>
            n.title.toLowerCase().includes(q) ||
            n.description.toLowerCase().includes(q)
        );
    }

    static getAllGlobal() {
        const users = UserManager.getAll();
        let allNotes = [];
        users.forEach(user => {
            const notes = this.getByUser(user.id);
            notes.forEach(note => {
                allNotes.push({ ...note, userId: user.id, userName: user.name });
            });
        });
        return allNotes;
    }

    static export(userId) {
        const notes = this.getByUser(userId);
        const blob = new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `diario_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    }

    static import(userId, file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const imported = JSON.parse(e.target.result);
                    const current = this.getByUser(userId);
                    const ids = current.map(n => n.id);
                    const newNotes = imported.filter(n => !ids.includes(n.id));
                    this.saveForUser(userId, [...current, ...newNotes]);
                    resolve({ count: newNotes.length });
                } catch (error) {
                    reject(error);
                }
            };
            reader.readAsText(file);
        });
    }
}

// ==========================================
// GESTOR DE SESIÓN
// ==========================================
class SessionManager {
    static start(user) {
        const { password, ...safeUser } = user;
        StorageManager.set(CONFIG.storageKeys.currentUser, safeUser);
    }

    static getCurrent() {
        return StorageManager.get(CONFIG.storageKeys.currentUser);
    }

    static end() {
        StorageManager.remove(CONFIG.storageKeys.currentUser);
    }

    static isLoggedIn() {
        return !!this.getCurrent();
    }
}

// ==========================================
// GESTOR DE UI
// ==========================================
class UIController {
    constructor() {
        this.currentUser = null;
        this.currentSection = 'dashboard';
        this.editingNoteId = null;
        this.confirmCallback = null;
    }

    init() {
        // Crear usuarios de prueba
        this.initTestUsers();

        // Verificar sesión
        if (SessionManager.isLoggedIn()) {
            this.currentUser = SessionManager.getCurrent();
            this.showMainApp();
        } else {
            this.showAuthScreen();
        }

        this.setupEventListeners();
        this.applyTheme();
    }

    initTestUsers() {
        const users = UserManager.getAll();
        if (users.length === 0) {
            // Usuario normal
            UserManager.register({
                name: 'María García',
                email: 'usuario@ejemplo.com',
                password: 'usuario123',
                role: 'usuario'
            });

            // Admin
            UserManager.register({
                name: 'Administrador',
                email: 'admin@diario.com',
                password: 'admin123',
                role: 'admin'
            });
        }
    }

    showAuthScreen() {
        document.getElementById('authScreen').classList.remove('hidden');
        document.getElementById('mainApp').classList.add('hidden');
    }

    showMainApp() {
        document.getElementById('authScreen').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        this.updateUserUI();
        this.navigateTo('dashboard');
        this.loadDashboard();
    }

    updateUserUI() {
        if (!this.currentUser) return;

        const fullUser = UserManager.getById(this.currentUser.id) || this.currentUser;
        const initials = fullUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

        // Sidebar
        document.getElementById('sidebarUserName').textContent = fullUser.name;
        document.getElementById('sidebarUserRole').textContent = fullUser.role;
        document.getElementById('sidebarAvatarInitial').textContent = initials;

        if (fullUser.avatar) {
            document.getElementById('sidebarAvatarImg').src = fullUser.avatar;
            document.getElementById('sidebarAvatarImg').style.display = 'block';
            document.getElementById('sidebarAvatarInitial').style.display = 'none';
        } else {
            document.getElementById('sidebarAvatarImg').style.display = 'none';
            document.getElementById('sidebarAvatarInitial').style.display = 'block';
        }

        // Navbar
        document.getElementById('navbarAvatarInitial').textContent = initials;
        if (fullUser.avatar) {
            document.getElementById('navbarAvatarImg').src = fullUser.avatar;
            document.getElementById('navbarAvatarImg').style.display = 'block';
            document.getElementById('navbarAvatarInitial').style.display = 'none';
        }

        // Mostrar/ocultar sección admin
        const adminNav = document.querySelector('.admin-only');
        if (fullUser.role === 'admin') {
            adminNav.classList.remove('hidden');
        } else {
            adminNav.classList.add('hidden');
        }
    }

    navigateTo(section) {
        this.currentSection = section;

        // Actualizar navegación
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.section === section) {
                item.classList.add('active');
            }
        });

        // Mostrar sección correcta
        document.querySelectorAll('.content-section').forEach(sec => {
            sec.classList.remove('active');
        });
        document.getElementById(section + 'Section').classList.add('active');

        // Actualizar título
        const titles = {
            dashboard: 'Dashboard',
            notes: 'Mis Notas',
            statistics: 'Estadísticas',
            settings: 'Configuración',
            admin: 'Panel de Administración'
        };
        document.getElementById('pageTitle').textContent = titles[section] || 'Dashboard';

        // Cargar contenido
        switch (section) {
            case 'dashboard': this.loadDashboard(); break;
            case 'notes': this.loadNotes(); break;
            case 'statistics': this.loadStatistics(); break;
            case 'settings': this.loadSettings(); break;
            case 'admin': this.loadAdmin(); break;
        }
    }

    setupEventListeners() {
        // Tabs de autenticación
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(btn.dataset.tab + 'Tab').classList.add('active');
            });
        });

        // Toggle password visibility
        document.querySelectorAll('.toggle-password').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = btn.parentElement.querySelector('input');
                input.type = input.type === 'password' ? 'text' : 'password';
                btn.querySelector('i').className = input.type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
            });
        });

        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Register form
        document.getElementById('registerTab').querySelector('form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        // Agregar listener al formulario de registro
        document.querySelectorAll('#registerTab .btn-auth').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        });

        // Role selection
        document.querySelectorAll('.role-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.role-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
            });
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());

        // Navegación
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateTo(item.dataset.section);
            });
        });

        // Nueva nota
        ['newNoteBtn', 'quickNoteBtn', 'emptyNewNoteBtn'].forEach(id => {
            document.getElementById(id)?.addEventListener('click', () => this.openNoteModal());
        });

        // Cerrar modal de nota
        document.getElementById('closeNoteModal')?.addEventListener('click', () => this.closeNoteModal());
        document.getElementById('cancelNoteBtn')?.addEventListener('click', () => this.closeNoteModal());

        // Guardar nota
        document.getElementById('noteForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveNote();
        });

        // Selección de emoción
        document.querySelectorAll('.emotion-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.emotion-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
            });
        });

        // Filtros de notas
        document.getElementById('emotionFilter')?.addEventListener('change', () => this.applyNoteFilters());
        document.getElementById('dateFilter')?.addEventListener('change', () => this.applyNoteFilters());
        document.getElementById('resetFilters')?.addEventListener('click', () => this.resetNoteFilters());

        // Búsqueda global
        document.getElementById('globalSearch')?.addEventListener('input', (e) => {
            const clearBtn = document.getElementById('searchClear');
            clearBtn.classList.toggle('hidden', !e.target.value);
            this.handleGlobalSearch(e.target.value);
        });
        document.getElementById('searchClear')?.addEventListener('click', () => {
            document.getElementById('globalSearch').value = '';
            document.getElementById('searchClear').classList.add('hidden');
            this.navigateTo('notes');
        });

        // Ver todas las notas
        document.getElementById('viewAllNotesBtn')?.addEventListener('click', () => this.navigateTo('notes'));

        // Exportar/Importar notas
        document.getElementById('exportNotesBtn')?.addEventListener        ('click', () => NotesManager.export(this.currentUser.id));
        document.getElementById('importNotesBtn')?.addEventListener('click', () => {
            document.getElementById('importFileInput').click();
        });
        document.getElementById('importFileInput')?.addEventListener('change', async (e) => {
            if (e.target.files[0]) {
                try {
                    const result = await NotesManager.import(this.currentUser.id, e.target.files[0]);
                    Toast.show('success', 'Importación exitosa', `${result.count} notas importadas`);
                    this.loadNotes();
                } catch (error) {
                    Toast.show('error', 'Error', 'No se pudo importar el archivo');
                }
            }
        });

        // Modal de confirmación
        document.getElementById('confirmCancelBtn')?.addEventListener('click', () => {
            document.getElementById('confirmModal').classList.add('hidden');
        });

        // Cambio de tema
        document.getElementById('themeToggle')?.addEventListener('click', () => this.toggleTheme());

        // Theme options
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                this.setTheme(option.dataset.theme);
            });
        });

        // Accent colors
        document.querySelectorAll('.color-option').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.color-option').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                this.setAccentColor(btn.dataset.color);
            });
        });

        // Guardar perfil
        document.getElementById('saveProfileBtn')?.addEventListener('click', () => this.saveProfile());

        // Cambiar contraseña
        document.getElementById('changePasswordBtn')?.addEventListener('click', () => this.changePassword());

        // Avatar
        document.getElementById('avatarInput')?.addEventListener('change', (e) => this.handleAvatarChange(e));

        // Datos
        document.getElementById('exportAllDataBtn')?.addEventListener('click', () => NotesManager.export(this.currentUser.id));
        document.getElementById('importAllDataInput')?.addEventListener('change', async (e) => {
            if (e.target.files[0]) {
                try {
                    const result = await NotesManager.import(this.currentUser.id, e.target.files[0]);
                    Toast.show('success', 'Importación exitosa', `${result.count} notas importadas`);
                    this.loadNotes();
                } catch (error) {
                    Toast.show('error', 'Error', 'No se pudo importar');
                }
            }
        });

        document.getElementById('deleteAllNotesBtn')?.addEventListener('click', () => {
            this.showConfirm('Eliminar todas las notas', '¿Estás seguro de eliminar todas tus notas?', () => {
                NotesManager.saveForUser(this.currentUser.id, []);
                Toast.show('success', 'Eliminadas', 'Todas las notas han sido eliminadas');
                this.loadNotes();
            });
        });

        document.getElementById('deleteAccountBtn')?.addEventListener('click', () => {
            this.showConfirm('Eliminar cuenta', '¿Eliminar tu cuenta permanentemente?', () => {
                UserManager.delete(this.currentUser.id);
                SessionManager.end();
                Toast.show('success', 'Cuenta eliminada', 'Redirigiendo...');
                setTimeout(() => location.reload(), 1500);
            });
        });

        // Admin
        document.getElementById('adminUserSearch')?.addEventListener('input', (e) => this.filterUsers(e.target.value));
    }

    handleLogin() {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const remember = document.getElementById('rememberMe').checked;

        if (!email || !password) {
            Toast.show('error', 'Campos requeridos', 'Completa todos los campos');
            return;
        }

        const result = UserManager.login(email, password);
        if (result.success) {
            SessionManager.start(result.user);
            this.currentUser = result.user;
            Toast.show('success', '¡Bienvenido!', `Hola ${result.user.name}`);
            this.showMainApp();
        } else {
            Toast.show('error', 'Error', result.message);
        }
    }

    handleRegister() {
        const name = document.getElementById('registerName').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;
        const role = document.querySelector('input[name="userRole"]:checked').value;

        if (!name || !email || !password) {
            Toast.show('error', 'Campos requeridos', 'Completa todos los campos');
            return;
        }

        if (password.length < 6) {
            Toast.show('warning', 'Contraseña débil', 'Mínimo 6 caracteres');
            return;
        }

        if (password !== confirmPassword) {
            Toast.show('error', 'Error', 'Las contraseñas no coinciden');
            return;
        }

        const result = UserManager.register({ name, email, password, role });
        if (result.success) {
            SessionManager.start(result.user);
            this.currentUser = result.user;
            Toast.show('success', '¡Registro exitoso!', 'Bienvenido a tu diario emocional');
            this.showMainApp();
        } else {
            Toast.show('error', 'Error', result.message);
        }
    }

    handleLogout() {
        SessionManager.end();
        Toast.show('success', 'Sesión cerrada', 'Hasta pronto');
        setTimeout(() => location.reload(), 1000);
    }

    handleGlobalSearch(query) {
        if (query.length > 0) {
            const results = NotesManager.search(this.currentUser.id, query);
            this.renderNotes(results, true);
        }
    }

    loadDashboard() {
        const notes = NotesManager.getByUser(this.currentUser.id);
        
        // Total de notas
        document.getElementById('totalNotesCount').textContent = notes.length;

        // Notas de la semana
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const weekNotes = notes.filter(n => new Date(n.createdAt).getTime() > weekAgo);
        document.getElementById('thisWeekNotes').textContent = weekNotes.length;

        // Racha (días consecutivos)
        document.getElementById('currentStreak').textContent = this.calculateStreak(notes);

        // Emoción más frecuente
        const emotionCounts = {};
        notes.forEach(n => {
            emotionCounts[n.emotion] = (emotionCounts[n.emotion] || 0) + 1;
        });
        const mostFrequent = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0];
        document.getElementById('mostFrequentEmotion').textContent = 
            mostFrequent ? CONFIG.emotions[mostFrequent[0]].emoji : '-';

        // Notas recientes
        const recentNotes = notes.slice(0, 6);
        this.renderRecentNotes(recentNotes);

        // Resumen de emociones
        this.renderEmotionsSummary(notes);
    }

    calculateStreak(notes) {
        if (notes.length === 0) return 0;

        const dates = [...new Set(notes.map(n => 
            new Date(n.createdAt).toDateString()
        ))].sort((a, b) => new Date(b) - new Date(a));

        let streak = 0;
        let currentDate = new Date();

        for (let i = 0; i < dates.length; i++) {
            const noteDate = new Date(dates[i]);
            const diffDays = Math.floor((currentDate - noteDate) / (1000 * 60 * 60 * 24));

            if (diffDays <= 1 || (i === 0 && diffDays === 0)) {
                streak++;
                currentDate = noteDate;
            } else {
                break;
            }
        }

        return streak;
    }

    renderRecentNotes(notes) {
        const container = document.getElementById('recentNotesGrid');
        if (!container) return;

        if (notes.length === 0) {
            container.innerHTML = '<p class="empty-text">No hay notas recientes</p>';
            return;
        }

        container.innerHTML = notes.map(note => `
            <div class="note-card-mini" onclick="ui.openNoteModal('${note.id}')">
                <div class="mini-emotion">${CONFIG.emotions[note.emotion].emoji}</div>
                <div class="mini-content">
                    <h4>${note.title}</h4>
                    <p>${note.description.substring(0, 80)}...</p>
                    <span class="mini-date">${this.formatDate(note.createdAt)}</span>
                </div>
            </div>
        `).join('');
    }

    renderEmotionsSummary(notes) {
        const container = document.getElementById('emotionsSummaryGrid');
        if (!container) return;

        const counts = {};
        notes.forEach(n => {
            counts[n.emotion] = (counts[n.emotion] || 0) + 1;
        });

        container.innerHTML = Object.entries(CONFIG.emotions).map(([key, emotion]) => `
            <div class="emotion-summary-item ${key}">
                <span class="emotion-emoji">${emotion.emoji}</span>
                <span class="emotion-name">${emotion.name}</span>
                <span class="emotion-count">${counts[key] || 0}</span>
            </div>
        `).join('');
    }

    loadNotes() {
        this.filteredNotes = NotesManager.getByUser(this.currentUser.id);
        this.renderNotes(this.filteredNotes);
    }

    applyNoteFilters() {
        let notes = NotesManager.getByUser(this.currentUser.id);
        const emotion = document.getElementById('emotionFilter').value;
        const date = document.getElementById('dateFilter').value;

        if (emotion) {
            notes = notes.filter(n => n.emotion === emotion);
        }

        if (date) {
            notes = notes.filter(n => 
                new Date(n.createdAt).toDateString() === new Date(date).toDateString()
            );
        }

        this.filteredNotes = notes;
        this.renderNotes(this.filteredNotes);
    }

    resetNoteFilters() {
        document.getElementById('emotionFilter').value = '';
        document.getElementById('dateFilter').value = '';
        this.loadNotes();
    }

    renderNotes(notes, isSearch = false) {
        const container = document.getElementById('notesGrid');
        const emptyState = document.getElementById('emptyNotesState');

        if (!container) return;

        if (notes.length === 0) {
            container.classList.add('hidden');
            emptyState.classList.remove('hidden');
            return;
        }

        container.classList.remove('hidden');
        emptyState.classList.add('hidden');

        container.innerHTML = notes.map(note => this.createNoteCard(note)).join('');

        // Agregar eventos a las tarjetas
        container.querySelectorAll('.note-card').forEach(card => {
            const noteId = card.dataset.id;

            card.querySelector('.note-actions-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                card.querySelector('.note-actions-menu').classList.toggle('show');
            });

            card.querySelector('.btn-edit')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openNoteModal(noteId);
            });

            card.querySelector('.btn-delete')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showConfirm('Eliminar nota', '¿Eliminar esta nota?', () => {
                    NotesManager.delete(this.currentUser.id, noteId);
                    Toast.show('success', 'Eliminada', 'Nota eliminada correctamente');
                    this.loadNotes();
                });
            });
        });

        // Cerrar menús al hacer clic fuera
        document.addEventListener('click', () => {
            container.querySelectorAll('.note-actions-menu').forEach(menu => {
                menu.classList.remove('show');
            });
        });
    }

    createNoteCard(note) {
        const emotion = CONFIG.emotions[note.emotion];
        const date = new Date(note.createdAt);

        return `
            <div class="note-card" data-id="${note.id}">
                <div class="note-card-header ${note.emotion}">
                    <div class="note-emotion-badge">
                        <span class="emoji">${emotion.emoji}</span>
                        <span>${emotion.name}</span>
                    </div>
                    <div class="note-actions-dropdown">
                        <button class="note-actions-btn">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <div class="note-actions-menu">
                            <button class="btn-edit"><i class="fas fa-edit"></i> Editar</button>
                            <button class="btn-delete"><i class="fas fa-trash"></i> Eliminar</button>
                        </div>
                    </div>
                </div>
                <div class="note-card-body">
                    <h3 class="note-title">${note.title}</h3>
                    <p class="note-description">${note.description}</p>
                </div>
                <div class="note-card-footer">
                    <span class="note-date"><i class="far fa-calendar"></i> ${this.formatDate(note.createdAt)}</span>
                    <span class="note-time"><i class="far fa-clock"></i> ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            </div>
        `;
    }

    openNoteModal(noteId = null) {
        this.editingNoteId = noteId;
        const modal = document.getElementById('noteModal');
        const title = document.getElementById('noteModalTitle');
        const form = document.getElementById('noteForm');

        if (noteId) {
            title.innerHTML = '<i class="fas fa-edit"></i> Editar Nota';
            const note = NotesManager.getByUser(this.currentUser.id).find(n => n.id === noteId);
            if (note) {
                document.getElementById('noteId').value = note.id;
                document.getElementById('noteTitle').value = note.title;
                document.getElementById('noteDescription').value = note.description;
                document.querySelector(`input[name="emotion"][value="${note.emotion}"]`).checked = true;
                document.querySelectorAll('.emotion-option').forEach(opt => {
                    opt.classList.toggle('selected', opt.dataset.emotion === note.emotion);
                });
            }
        } else {
            title.innerHTML = '<i class="fas fa-plus"></i> Nueva Nota';
            form.reset();
            document.getElementById('noteId').value = '';
            document.querySelector('input[name="emotion"][value="felicidad"]').checked = true;
            document.querySelectorAll('.emotion-option').forEach(opt => {
                opt.classList.toggle('selected', opt.dataset.emotion === 'felicidad');
            });
        }

        modal.classList.remove('hidden');
    }

    closeNoteModal() {
        document.getElementById('noteModal').classList.add('hidden');
        this.editingNoteId = null;
    }

    saveNote() {
        const title = document.getElementById('noteTitle').value.trim();
        const description = document.getElementById('noteDescription').value.trim();
        const emotion = document.querySelector('input[name="emotion"]:checked').value;
        const noteId = document.getElementById('noteId').value;

        if (!title || !description) {
            Toast.show('error', 'Campos requeridos', 'Completa el título y la descripción');
            return;
        }

        if (noteId) {
            NotesManager.update(this.currentUser.id, noteId, { title, description, emotion });
            Toast.show('success', 'Actualizada', 'Nota actualizada correctamente');
        } else {
            NotesManager.create(this.currentUser.id, { title, description, emotion });
            Toast.show('success', 'Creada', 'Nota creada correctamente');
        }

        this.closeNoteModal();
        this.loadNotes();
        this.loadDashboard();
    }

    showConfirm(title, message, callback) {
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        document.getElementById('confirmModal').classList.remove('hidden');
        this.confirmCallback = callback;

        document.getElementById('confirmOkBtn').onclick = () => {
            document.getElementById('confirmModal').classList.add('hidden');
            if (this.confirmCallback) this.confirmCallback();
        };
    }

    loadStatistics() {
        const notes = NotesManager.getByUser(this.currentUser.id);
        this.renderEmotionsChart(notes);
        this.renderActivityChart(notes);
        this.renderEmotionDetails(notes);
        this.renderMonthSummary(notes);
    }

    renderEmotionsChart(notes) {
        const ctx = document.getElementById('emotionsChart');
        if (!ctx) return;

        const counts = {};
        notes.forEach(n => {
            counts[n.emotion] = (counts[n.emotion] || 0) + 1;
        });

        const labels = Object.keys(counts).map(k => CONFIG.emotions[k].emoji + ' ' + CONFIG.emotions[k].name);
        const data = Object.values(counts);
        const colors = Object.keys(counts).map(k => CONFIG.emotions[k].color);

        if (this.emotionsChart) this.emotionsChart.destroy();

        this.emotionsChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend:
                                            position: 'bottom'
                }
            }
        });
    }

    renderActivityChart(notes) {
        const ctx = document.getElementById('activityChart');
        if (!ctx) return;

        // Agrupar por mes
        const months = {};
        const last6Months = [];

        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const key = d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
            last6Months.push(key);
            months[key] = 0;
        }

        notes.forEach(note => {
            const date = new Date(note.createdAt);
            const key = date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
            if (months.hasOwnProperty(key)) {
                months[key]++;
            }
        });

        if (this.activityChart) this.activityChart.destroy();

        this.activityChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: last6Months,
                datasets: [{
                    label: 'Notas',
                    data: last6Months.map(m => months[m]),
                    borderColor: '#ff6b9d',
                    backgroundColor: 'rgba(255, 107, 157, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    renderEmotionDetails(notes) {
        const container = document.getElementById('emotionDetailsList');
        if (!container) return;

        const counts = {};
        notes.forEach(n => {
            counts[n.emotion] = (counts[n.emotion] || 0) + 1;
        });

        const total = notes.length || 1;

        container.innerHTML = Object.entries(CONFIG.emotions).map(([key, emotion]) => `
            <div class="emotion-detail-item">
                <div class="emotion-detail-left">
                    <span class="emoji">${emotion.emoji}</span>
                    <span class="name">${emotion.name}</span>
                </div>
                <div class="emotion-detail-right">
                    <span class="count">${counts[key] || 0}</span>
                    <span class="percentage">${Math.round(((counts[key] || 0) / total) * 100)}%</span>
                </div>
            </div>
        `).join('');
    }

    renderMonthSummary(notes) {
        const container = document.getElementById('monthSummary');
        if (!container) return;

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthNotes = notes.filter(n => new Date(n.createdAt) >= monthStart);

        const uniqueDays = [...new Set(monthNotes.map(n => 
            new Date(n.createdAt).toDateString()
        ))].length;

        const emotionCounts = {};
        monthNotes.forEach(n => {
            emotionCounts[n.emotion] = (emotionCounts[n.emotion] || 0) + 1;
        });

        const topEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0];

        container.innerHTML = `
            <div class="summary-item">
                <span class="value">${monthNotes.length}</span>
                <span class="label">Notas este mes</span>
            </div>
            <div class="summary-item">
                <span class="value">${uniqueDays}</span>
                <span class="label">Días activos</span>
            </div>
            <div class="summary-item">
                <span class="value">${topEmotion ? CONFIG.emotions[topEmotion[0]].emoji : '-'}</span>
                <span class="label">Emoción del mes</span>
            </div>
            <div class="summary-item">
                <span class="value">${Object.keys(emotionCounts).length}</span>
                <span class="label">Emociones distintas</span>
            </div>
        `;
    }

    loadSettings() {
        const user = UserManager.getById(this.currentUser.id) || this.currentUser;

        document.getElementById('settingsName').value = user.name || '';
        document.getElementById('settingsEmail').value = user.email || '';
        document.getElementById('settingsBio').value = user.bio || '';

        // Avatar
        const initials = (user.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        document.getElementById('settingsAvatarInitial').textContent = initials;
        if (user.avatar) {
            document.getElementById('settingsAvatarImg').src = user.avatar;
            document.getElementById('settingsAvatarImg').style.display = 'block';
            document.getElementById('settingsAvatarInitial').style.display = 'none';
        }

        // Theme actual
        const settings = StorageManager.get(CONFIG.storageKeys.settings) || CONFIG.appSettings;
        document.querySelectorAll('.theme-option').forEach(opt => {
            opt.classList.toggle('selected', opt.dataset.theme === settings.theme);
        });

        document.querySelectorAll('.color-option').forEach(opt => {
            opt.classList.toggle('selected', opt.dataset.color === settings.accentColor);
        });
    }

    saveProfile() {
        const name = document.getElementById('settingsName').value.trim();
        const bio = document.getElementById('settingsBio').value.trim();

        if (!name) {
            Toast.show('error', 'Error', 'El nombre es requerido');
            return;
        }

        UserManager.update(this.currentUser.id, { name, bio });
        this.currentUser = UserManager.getById(this.currentUser.id);
        SessionManager.start(this.currentUser);
        this.updateUserUI();

        Toast.show('success', 'Guardado', 'Perfil actualizado');
    }

    changePassword() {
        const current = document.getElementById('currentPassword').value;
        const newPass = document.getElementById('newPassword').value;
        const confirm = document.getElementById('confirmNewPassword').value;

        const user = UserManager.getById(this.currentUser.id);

        if (current !== user.password) {
            Toast.show('error', 'Error', 'Contraseña actual incorrecta');
            return;
        }

        if (newPass.length < 6) {
            Toast.show('warning', 'Error', 'Mínimo 6 caracteres');
            return;
        }

        if (newPass !== confirm) {
            Toast.show('error', 'Error', 'Las contraseñas no coinciden');
            return;
        }

        UserManager.update(this.currentUser.id, { password: newPass });
        this.currentUser = UserManager.getById(this.currentUser.id);
        SessionManager.start(this.currentUser);

        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmNewPassword').value = '';

        Toast.show('success', 'Cambiada', 'Contraseña actualizada');
    }

    handleAvatarChange(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 500000) {
            Toast.show('error', 'Archivo muy grande', 'Máximo 500KB');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const avatar = event.target.result;
            UserManager.update(this.currentUser.id, { avatar });
            this.currentUser = UserManager.getById(this.currentUser.id);
            SessionManager.start(this.currentUser);
            this.updateUserUI();

            document.getElementById('settingsAvatarImg').src = avatar;
            document.getElementById('settingsAvatarImg').style.display = 'block';
            document.getElementById('settingsAvatarInitial').style.display = 'none';

            Toast.show('success', 'Actualizada', 'Foto de perfil cambiada');
        };
        reader.readAsDataURL(file);
    }

    setTheme(theme) {
        const settings = StorageManager.get(CONFIG.storageKeys.settings) || CONFIG.appSettings;
        settings.theme = theme;
        StorageManager.set(CONFIG.storageKeys.settings, settings);
        this.applyTheme();
    }

    toggleTheme() {
        const settings = StorageManager.get(CONFIG.storageKeys.settings) || CONFIG.appSettings;
        const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }

    applyTheme() {
        const settings = StorageManager.get(CONFIG.storageKeys.settings) || CONFIG.appSettings;
        document.documentElement.setAttribute('data-theme', settings.theme);

        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            icon.className = settings.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    setAccentColor(color) {
        const settings = StorageManager.get(CONFIG.storageKeys.settings) || CONFIG.appSettings;
        settings.accentColor = color;
        StorageManager.set(CONFIG.storageKeys.settings, settings);
        document.documentElement.setAttribute('data-accent', color);
    }

    loadAdmin() {
        const users = UserManager.getAll();
        const allNotes = NotesManager.getAllGlobal();

        document.getElementById('totalUsersCount').textContent = users.length;
        document.getElementById('regularUsersCount').textContent = users.filter(u => u.role === 'usuario').length;
        document.getElementById('adminUsersCount').textContent = users.filter(u => u.role === 'admin').length;
        document.getElementById('globalNotesCount').textContent = allNotes.length;

        this.renderUsersTable(users);
        this.renderGlobalChart(allNotes);
        this.renderTopUsers(users);
    }

    renderUsersTable(users) {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        tbody.innerHTML = users.map(user => {
            const notes = NotesManager.getByUser(user.id);
            const initials = (user.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            const isAdmin = this.currentUser.id === user.id;

            return `
                <tr>
                    <td>
                        <div class="user-cell">
                            <div class="user-cell-avatar">
                                ${user.avatar ? `<img src="${user.avatar}" alt="">` : `<span>${initials}</span>`}
                            </div>
                            <div class="user-cell-info">
                                <span class="user-cell-name">${user.name}</span>
                                <span class="user-cell-email">${user.email}</span>
                            </div>
                        </div>
                    </td>
                    <td>${user.email}</td>
                    <td><span class="role-badge ${user.role}">${user.role}</span></td>
                    <td>${notes.length}</td>
                    <td>${this.formatDate(user.createdAt)}</td>
                    <td class="actions-cell">
                        ${!isAdmin ? `
                            <button class="btn-delete" onclick="ui.deleteUser('${user.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : '<span style="font-size:12px;color:var(--text-light)">Tú</span>'}
                    </td>
                </tr>
            `;
        }).join('');
    }

    filterUsers(query) {
        const users = UserManager.getAll();
        const filtered = users.filter(u =>
            u.name.toLowerCase().includes(query.toLowerCase()) ||
            u.email.toLowerCase().includes(query.toLowerCase())
        );
        this.renderUsersTable(filtered);
    }

    deleteUser(userId) {
        this.showConfirm('Eliminar usuario', '¿Eliminar este usuario y todas sus notas?', () => {
            UserManager.delete(userId);
            Toast.show('success', 'Eliminado', 'Usuario eliminado');
            this.loadAdmin();
        });
    }

    renderGlobalChart(notes) {
        const ctx = document.getElementById('globalEmotionsChart');
        if (!ctx) return;

        const counts = {};
        notes.forEach(n => {
            counts[n.emotion] = (counts[n.emotion] || 0) + 1;
        });

        const labels = Object.keys(counts).map(k => CONFIG.emotions[k].emoji);
        const data = Object.values(counts);
        const colors = Object.keys(counts).map(k => CONFIG.emotions[k].color);

        if (this.globalChart) this.globalChart.destroy();

        this.globalChart = new Chart(ctx, {
            type: 'polarArea',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors.map(c => c + '80')
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    renderTopUsers(users) {
        const container = document.getElementById('topUsersList');
        if (!container) return;

        const usersWithNotes = users.map(u => ({
            ...u,
            notesCount: NotesManager.getByUser(u.id).length
        })).sort((a, b) => b.notesCount - a.notesCount).slice(0, 5);

        container.innerHTML = usersWithNotes.map((user, i) => {
            const initials = (user.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            return `
                <div class="top-user-item">
                    <div class="top-user-rank">${i + 1}</div>
                    <div class="user-cell-avatar" style="width:35px;height:35px;">
                        ${user.avatar ? `<img src="${user.avatar}" alt="">` : `<span>${initials}</span>`}
                    </div>
                    <div class="top-user-info">
                        <span class="top-user-name">${user.name}</span>
                        <span class="top-user-notes">${user.notesCount} notas</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    }
}

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
class Toast {
    static show(type, title, message) {
        const container = document.getElementById('toastContainer');
        const icons = {
            success: 'fa-check',
            error: 'fa-times',
            warning: 'fa-exclamation'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-icon"><i class="fas ${icons[type]}"></i></div>
            <div class="toast-content">
                <span class="toast-title">${title}</span>
                <span class="toast-message">${message}</span>
            </div>
            <button class="toast-close"><i class="fas fa-times"></i></button>
        `;

        container.appendChild(toast);

        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 400);
        });

        setTimeout(() => {
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    }
}

// ==========================================
// PARTÍCULAS ANIMADAS
// ==========================================
function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;

    const colors = ['#ff6b9d', '#a29bfe', '#74b9ff', '#55efc4', '#ffeaa7'];

    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.cssText = `
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            width: ${Math.random() * 15 + 5}px;
            height: ${Math.random() * 15 + 5}px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            animation-delay: ${Math.random() * 10}s;
            animation-duration: ${Math.random() * 10 + 15}s;
        `;
        container.appendChild(particle);
    }
}

// ==========================================
// INICIALIZACIÓN
// ==========================================
let ui;

document.addEventListener('DOMContentLoaded', () => {
    createParticles();
    ui = new UIController();
    ui.init();
});
