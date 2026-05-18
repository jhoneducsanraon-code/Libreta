/**
 * ==========================================
 * DIARIO EMOCIONAL INTELIGENTE
 * ==========================================
 * Aplicación web completa para gestionar
 * entradas emocionales personales
 * ==========================================
 */

// ==========================================
// CONFIGURACIÓN GLOBAL
// ==========================================
const CONFIG = {
    // Emociones predefinidas con sus estilos
    emotions: {
        felicidad: {
            emoji: '😊',
            name: 'Felicidad',
            color: '#f39c12',
            bgGradient: 'linear-gradient(135deg, rgba(255, 234, 167, 0.5), rgba(253, 203, 110, 0.5))'
        },
        tristeza: {
            emoji: '😢',
            name: 'Tristeza',
            color: '#0984e3',
            bgGradient: 'linear-gradient(135deg, rgba(116, 185, 255, 0.5), rgba(9, 132, 227, 0.5))'
        },
        miedo: {
            emoji: '😨',
            name: 'Miedo',
            color: '#6c5ce7',
            bgGradient: 'linear-gradient(135deg, rgba(162, 155, 254, 0.5), rgba(108, 92, 231, 0.5))'
        },
        angustia: {
            emoji: '😰',
            name: 'Angustia',
            color: '#e84393',
            bgGradient: 'linear-gradient(135deg, rgba(253, 121, 168, 0.5), rgba(232, 67, 147, 0.5))'
        },
        calma: {
            emoji: '😌',
            name: 'Calma',
            color: '#00b894',
            bgGradient: 'linear-gradient(135deg, rgba(85, 239, 196, 0.5), rgba(0, 184, 148, 0.5))'
        },
        ansiedad: {
            emoji: '😟',
            name: 'Ansiedad',
            color: '#ff6b6b',
            bgGradient: 'linear-gradient(135deg, rgba(255, 118, 117, 0.5), rgba(255, 107, 107, 0.5))'
        }
    },
    
    // Claves de LocalStorage
    storageKeys: {
        users: 'diario_users',
        currentUser: 'diario_currentUser',
        notes: 'diario_notes_',
        settings: 'diario_settings'
    },
    
    // Configuración de la App
    appSettings: {
        theme: 'light',
        accentColor: 'rose',
        animationsEnabled: true
    }
};

// ==========================================
// MANEJADOR DE STORAGE
// ==========================================
class StorageManager {
    /**
     * Obtiene datos del almacenamiento local
     */
    static get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error al obtener datos:', error);
            return null;
        }
    }
    
    /**
     * Guarda datos en el almacenamiento local
     */
    static set(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error al guardar datos:', error);
            return false;
        }
    }
    
    /**
     * Elimina datos del almacenamiento local
     */
    static remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error al eliminar datos:', error);
            return false;
        }
    }
}

// ==========================================
// MANEJADOR DE USUARIOS
// ==========================================
class UserManager {
    /**
     * Obtiene todos los usuarios registrados
     */
    static getAll() {
        return StorageManager.get(CONFIG.storageKeys.users) || [];
    }
    
    /**
     * Guarda la lista de usuarios
     */
    static saveAll(users) {
        return StorageManager.set(CONFIG.storageKeys.users, users);
    }
    
    /**
     * Registra un nuevo usuario
     */
    static register(userData) {
        const users = this.getAll();
        
        // Verificar si el email ya existe
        if (users.find(u => u.email === userData.email)) {
            return { success: false, message: 'Este correo ya está registrado' };
        }
        
        // Crear nuevo usuario
        const newUser = {
            id: this.generateId(),
            name: userData.name,
            email: userData.email,
            password: userData.password, // En producción debería estar hasheado
            role: userData.role || 'usuario',
            avatar: null,
            bio: '',
            createdAt: new Date().toISOString(),
            lastLogin: null
        };
        
        users.push(newUser);
        this.saveAll(users);
        
        return { success: true, user: newUser };
    }
    
    /**
     * Autentica un usuario
     */
    static login(email, password) {
        const users = this.getAll();
        const user = users.find(u => u.email === email && u.password === password);
        
        if (!user) {
            return { success: false, message: 'Credenciales incorrectas' };
        }
        
        // Actualizar último inicio de sesión
        user.lastLogin = new Date().toISOString();
        this.saveAll(users);
        
        return { success: true, user };
    }
    
    /**
     * Obtiene un usuario por ID
     */
    static getById(id) {
        const users = this.getAll();
        return users.find(u => u.id === id);
    }
    
    /**
     * Actualiza un usuario
     */
    static update(id, updates) {
        const users = this.getAll();
        const userIndex = users.findIndex(u => u.id === id);
        
        if (userIndex === -1) {
            return { success: false, message: 'Usuario no encontrado' };
        }
        
        users[userIndex] = { ...users[userIndex], ...updates };
        this.saveAll(users);
        
        return { success: true, user: users[userIndex] };
    }
    
    /**
     * Elimina un usuario
     */
    static delete(id) {
        let users = this.getAll();
        users = users.filter(u => u.id !== id);
        this.saveAll(users);
        
        // También eliminar las notas del usuario
        StorageManager.remove(CONFIG.storageKeys.notes + id);
        
        return true;
    }
    
    /**
     * Genera un ID único
     */
    static generateId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}

// ==========================================
// MANEJADOR DE NOTAS
// ==========================================
class NotesManager {
    /**
     * Obtiene las notas de un usuario
     */
    static getByUser(userId) {
        return StorageManager.get(CONFIG.storageKeys.notes + userId) || [];
    }
    
    /**
     * Guarda las notas de un usuario
     */
    static saveForUser(userId, notes) {
        return StorageManager.set(CONFIG.storageKeys.notes + userId, notes);
    }
    
    /**
     * Crea una nueva nota
     */
    static create(userId, noteData) {
        const notes = this.getByUser(userId);
        
        const newNote = {
            id: this.generateId(),
            title: noteData.title,
            description: noteData.description,
            emotion: noteData.emotion,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        notes.unshift(newNote); // Agregar al inicio
        this.saveForUser(userId, notes);
        
        return { success: true, note: newNote };
    }
    
    /**
     * Actualiza una nota existente
     */
    static update(userId, noteId, updates) {
        const notes = this.getByUser(userId);
        const noteIndex = notes.findIndex(n => n.id === noteId);
        
        if (noteIndex === -1) {
            return { success: false, message: 'Nota no encontrada' };
        }
        
        notes[noteIndex] = {
            ...notes[noteIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        this.saveForUser(userId, notes);
        
        return { success: true, note: notes[noteIndex] };
    }
    
    /**
     * Elimina una nota
     */
    static delete(userId, noteId) {
        let notes = this.getByUser(userId);
        notes = notes.filter(n => n.id !== noteId);
        this.saveForUser(userId, notes);
        
        return true;
    }
    
    /**
     * Busca notas por título o descripción
     */
    static search(userId, query) {
        const notes = this.getByUser(userId);
        const lowerQuery = query.toLowerCase();
        
        return notes.filter(note =>
            note.title.toLowerCase().includes(lowerQuery) ||
            note.description.toLowerCase().includes(lowerQuery)
        );
    }
    
    /**
     * Filtra notas por emoción
     */
    static filterByEmotion(userId, emotion) {
        const notes = this.getByUser(userId);
        return notes.filter(note => note.emotion === emotion);
    }
    
    /**
     * Filtra notas por fecha
     */
    static filterByDate(userId, date) {
        const notes = this.getByUser(userId);
        return notes.filter(note => {
            const noteDate = new Date(note.createdAt).toDateString();
            const targetDate = new Date(date).toDateString();
            return noteDate === targetDate;
        });
    }
    
    /**
     * Obtiene todas las notas de todos los usuarios (para admin)
     */
    static getAllGlobal() {
        const users = UserManager.getAll();
        let allNotes = [];
        
        users.forEach(user => {
            const userNotes = this.getByUser(user.id);
            userNotes.forEach(note => {
                allNotes.push({
                    ...note,
                    userId: user.id,
                    userName: user.name,
                    userEmail: user.email
                });
            });
        });
        
        return allNotes;
    }
    
    /**
     * Genera un ID único para notas
     */
    static generateId() {
        return 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * Exporta las notas de un usuario
     */
    static export(userId) {
        const notes = this.getByUser(userId);
        const blob = new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `diario_emocional_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }
    
    /**
     * Importa notas para un usuario
     */
    static import(userId, file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const importedNotes = JSON.parse(e.target.result);
                    
                    if (!Array.isArray(importedNotes)) {
                        reject(new Error('Formato de archivo inválido'));
                        return;
                    }
                    
                    const currentNotes = this.getByUser(userId);
                    const existingIds = currentNotes.map(n => n.id);
                    
                    // Filtrar notas que no existan ya
                    const newNotes = importedNotes.filter(n => !existingIds.includes(n.id));
                    const mergedNotes = [...currentNotes, ...newNotes];
                    
                    this.saveForUser(userId, mergedNotes);
                    resolve({ count: newNotes.length });
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Error al leer el archivo'));
            reader.readAsText(file);
        });
    }
}

// ==========================================
// MANEJADOR DE SESIÓN
// ==========================================
class SessionManager {
    /**
     * Inicia sesión
     */
    static start(user, remember = false) {
        const sessionUser = { ...user };
        delete sessionUser.password; // No almacenar contraseña
        
        StorageManager.set(CONFIG.storageKeys.currentUser, sessionUser);
        
        if (remember) {
            localStorage.setItem('diario_remember', 'true');
        }
    }
    
    /**
     * Obtiene el usuario actual
     */
    static getCurrent() {
        return StorageManager.get(CONFIG.storageKeys.currentUser);
    }
    
    /**
     * Cierra sesión
     */
    static end() {
        StorageManager.remove(CONFIG.storageKeys.currentUser);
        localStorage.removeItem('diario_remember');
    }
    
    /***/
