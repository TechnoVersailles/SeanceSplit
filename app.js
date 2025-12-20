// Application principale pour la gestion des chronomètres de séances pédagogiques
class TimeManagementApp {
    constructor() {
        // Initialisation des données
        this.workshops = JSON.parse(localStorage.getItem('workshops')) || [];
        this.sessions = JSON.parse(localStorage.getItem('sessions')) || [];
        this.timers = JSON.parse(localStorage.getItem('timers')) || [];
        
        // États pour le chronomètre en cours
        this.currentTimerIndex = 0;
        this.totalTime = 0;
        this.currentTime = 0;
        this.timerInterval = null;
        this.isRunning = false;
        
        // Initialisation de l'interface
        this.initUI();
        this.updateLists();
    }
    
    initUI() {
        // Navigation entre les sections
        document.querySelectorAll('.nav-btn').forEach((btn, index) => {
            btn.addEventListener('click', () => {
                this.showSection(index);
            });
        });
        
        // Gestion des ateliers
        document.getElementById('btnAddAtelier').addEventListener('click', () => {
            this.addWorkshop();
        });
        
        // Gestion des séances
        document.getElementById('btnAddSeance').addEventListener('click', () => {
            this.addSession();
        });
        
        // Gestion des chronomètres
        document.getElementById('btnAddChrono').addEventListener('click', () => {
            this.addTimer();
        });
        
        // Visualisation de séance
        document.getElementById('btnStartSession').addEventListener('click', () => {
            this.startSession();
        });
        
        document.getElementById('btnStartPause').addEventListener('click', () => {
            this.toggleTimer();
        });
        
        document.getElementById('btnNext').addEventListener('click', () => {
            this.nextTimer();
        });
        
        document.getElementById('btnReset').addEventListener('click', () => {
            this.resetSession();
        });
    }
    
    showSection(sectionIndex) {
        // Masquer toutes les sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Mettre à jour les boutons de navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Afficher la section demandée
        const sections = ['ateliersSection', 'seancesSection', 'chronosSection', 'visualisationSection'];
        const buttons = ['btnAteliers', 'btnSeances', 'btnChronos', 'btnVisualisation'];
        
        document.getElementById(sections[sectionIndex]).classList.add('active');
        document.getElementById(buttons[sectionIndex]).classList.add('active');
        
        // Mettre à jour les listes si nécessaire
        this.updateLists();
    }
    
    updateLists() {
        this.updateWorkshopList();
        this.updateSessionList();
        this.updateTimerList();
        this.updateSessionSelect();
        this.updateWorkshopSelect();
    }
    
    // Gestion des ateliers
    addWorkshop() {
        const nom = document.getElementById('atelierNom').value.trim();
        const description = document.getElementById('atelierDescription').value.trim();
        
        if (!nom) {
            alert('Veuillez entrer un nom pour l\'atelier');
            return;
        }
        
        const workshop = {
            id: Date.now(),
            nom,
            description
        };
        
        this.workshops.push(workshop);
        this.saveToLocalStorage();
        this.updateWorkshopList();
        
        // Réinitialiser le formulaire
        document.getElementById('atelierNom').value = '';
        document.getElementById('atelierDescription').value = '';
    }
    
    deleteWorkshop(id) {
        if (confirm('Êtes-vous sûr de vouloir supprimer cet atelier ?')) {
            // Supprimer aussi les séances associées à cet atelier
            this.sessions = this.sessions.filter(session => session.atelierId !== id);
            // Et les chronomètres associés aux séances supprimées
            const sessionIds = this.sessions.map(s => s.id);
            this.timers = this.timers.filter(timer => sessionIds.includes(timer.sessionId));
            
            this.workshops = this.workshops.filter(w => w.id !== id);
            this.saveToLocalStorage();
            this.updateLists();
        }
    }
    
    updateWorkshopList() {
        const container = document.getElementById('ateliersList');
        container.innerHTML = '';
        
        this.workshops.forEach(workshop => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${workshop.nom}</td>
                <td>${workshop.description}</td>
                <td>
                    <button class="btn-delete" onclick="app.deleteWorkshop(${workshop.id})">Supprimer</button>
                </td>
            `;
            container.appendChild(row);
        });
        
        this.updateWorkshopSelect();
    }
    
    updateWorkshopSelect() {
        const select = document.getElementById('seanceAtelier');
        select.innerHTML = '<option value="">Sélectionner un atelier</option>';
        
        this.workshops.forEach(workshop => {
            const option = document.createElement('option');
            option.value = workshop.id;
            option.textContent = workshop.nom;
            select.appendChild(option);
        });
    }
    
    // Gestion des séances
    addSession() {
        const nom = document.getElementById('seanceNom').value.trim();
        const atelierId = document.getElementById('seanceAtelier').value;
        const description = document.getElementById('seanceDescription').value.trim();
        
        if (!nom) {
            alert('Veuillez entrer un nom pour la séance');
            return;
        }
        
        if (!atelierId) {
            alert('Veuillez sélectionner un atelier');
            return;
        }
        
        const session = {
            id: Date.now(),
            nom,
            atelierId,
            description,
            atelierNom: this.getWorkshopName(atelierId)
        };
        
        this.sessions.push(session);
        this.saveToLocalStorage();
        this.updateSessionList();
        
        // Réinitialiser le formulaire
        document.getElementById('seanceNom').value = '';
        document.getElementById('seanceAtelier').value = '';
        document.getElementById('seanceDescription').value = '';
    }
    
    deleteSession(id) {
        if (confirm('Êtes-vous sûr de vouloir supprimer cette séance ?')) {
            // Supprimer aussi les chronomètres associés à cette séance
            this.timers = this.timers.filter(timer => timer.sessionId !== id);
            
            this.sessions = this.sessions.filter(s => s.id !== id);
            this.saveToLocalStorage();
            this.updateLists();
        }
    }
    
    updateSessionList() {
        const container = document.getElementById('seancesList');
        container.innerHTML = '';
        
        this.sessions.forEach(session => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${session.nom}</td>
                <td>${session.atelierNom}</td>
                <td>${session.description}</td>
                <td>
                    <button class="btn-delete" onclick="app.deleteSession(${session.id})">Supprimer</button>
                </td>
            `;
            container.appendChild(row);
        });
        
        this.updateSessionSelect();
    }
    
    updateSessionSelect() {
        const select = document.getElementById('chronoSeance');
        select.innerHTML = '<option value="">Sélectionner une séance</option>';
        
        this.sessions.forEach(session => {
            const option = document.createElement('option');
            option.value = session.id;
            option.textContent = `${session.nom} (${session.atelierNom})`;
            select.appendChild(option);
        });
        
        // Mettre à jour la liste pour la visualisation
        const visuSelect = document.getElementById('visuSeanceSelect');
        visuSelect.innerHTML = '<option value="">Choisissez une séance</option>';
        
        this.sessions.forEach(session => {
            const option = document.createElement('option');
            option.value = session.id;
            option.textContent = `${session.nom} (${session.atelierNom})`;
            visuSelect.appendChild(option);
        });
    }
    
    getWorkshopName(atelierId) {
        const workshop = this.workshops.find(w => w.id == atelierId);
        return workshop ? workshop.nom : 'Atelier inconnu';
    }
    
    // Gestion des chronomètres
    addTimer() {
        const sessionId = document.getElementById('chronoSeance').value;
        const titre = document.getElementById('chronoTitre').value.trim();
        const duree = parseInt(document.getElementById('chronoDuree').value);
        const travail = document.getElementById('chronoTravail').value.trim();
        
        if (!sessionId) {
            alert('Veuillez sélectionner une séance');
            return;
        }
        
        if (!titre) {
            alert('Veuillez entrer un titre pour le chronomètre');
            return;
        }
        
        if (!duree || duree <= 0) {
            alert('Veuillez entrer une durée valide (en secondes)');
            return;
        }
        
        const timer = {
            id: Date.now(),
            sessionId,
            titre,
            duree,
            travail,
            sessionNom: this.getSessionName(sessionId)
        };
        
        this.timers.push(timer);
        this.saveToLocalStorage();
        this.updateTimerList();
        
        // Réinitialiser le formulaire
        document.getElementById('chronoSeance').value = '';
        document.getElementById('chronoTitre').value = '';
        document.getElementById('chronoDuree').value = '';
        document.getElementById('chronoTravail').value = '';
    }
    
    deleteTimer(id) {
        if (confirm('Êtes-vous sûr de vouloir supprimer ce chronomètre ?')) {
            this.timers = this.timers.filter(t => t.id !== id);
            this.saveToLocalStorage();
            this.updateTimerList();
        }
    }
    
    updateTimerList() {
        const container = document.getElementById('chronosList');
        container.innerHTML = '';
        
        this.timers.forEach(timer => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${timer.sessionNom}</td>
                <td>${timer.titre}</td>
                <td>${this.formatTime(timer.duree)}</td>
                <td>${timer.travail}</td>
                <td>
                    <button class="btn-delete" onclick="app.deleteTimer(${timer.id})">Supprimer</button>
                </td>
            `;
            container.appendChild(row);
        });
    }
    
    getSessionName(sessionId) {
        const session = this.sessions.find(s => s.id == sessionId);
        return session ? session.nom : 'Séance inconnue';
    }
    
    // Fonctionnalités de visualisation de séance
    startSession() {
        const sessionId = document.getElementById('visuSeanceSelect').value;
        
        if (!sessionId) {
            alert('Veuillez sélectionner une séance');
            return;
        }
        
        // Récupérer les chronomètres de la séance
        this.sessionTimers = this.timers.filter(timer => timer.sessionId == sessionId);
        
        if (this.sessionTimers.length === 0) {
            alert('Cette séance ne contient aucun chronomètre');
            return;
        }
        
        // Afficher la section de visualisation
        document.getElementById('sessionDisplay').classList.remove('hidden');
        
        // Initialiser le premier chronomètre
        this.currentTimerIndex = 0;
        this.setupCurrentTimer();
        
        // Afficher la timeline
        this.renderTimeline();
    }
    
    setupCurrentTimer() {
        if (this.currentTimerIndex >= this.sessionTimers.length) {
            this.endSession();
            return;
        }
        
        const timer = this.sessionTimers[this.currentTimerIndex];
        document.getElementById('currentTimerTitle').textContent = timer.titre;
        document.getElementById('currentWork').textContent = timer.travail;
        
        this.totalTime = timer.duree;
        this.currentTime = this.totalTime;
        this.updateTimerDisplay();
        
        // Mettre à jour la timeline
        this.updateTimeline();
    }
    
    toggleTimer() {
        if (this.isRunning) {
            // Pause
            clearInterval(this.timerInterval);
            this.isRunning = false;
            document.getElementById('btnStartPause').textContent = 'Reprendre';
        } else {
            // Démarrer
            if (this.currentTime > 0) {
                this.timerInterval = setInterval(() => {
                    this.tick();
                }, 1000);
                this.isRunning = true;
                document.getElementById('btnStartPause').textContent = 'Pause';
            }
        }
    }
    
    tick() {
        this.currentTime--;
        this.updateTimerDisplay();
        
        if (this.currentTime <= 0) {
            this.timerFinished();
        }
    }
    
    timerFinished() {
        clearInterval(this.timerInterval);
        this.isRunning = false;
        document.getElementById('btnStartPause').textContent = 'Démarrer';
        
        // Passer au chronomètre suivant
        setTimeout(() => {
            this.nextTimer();
        }, 1000);
    }
    
    nextTimer() {
        if (this.currentTimerIndex < this.sessionTimers.length - 1) {
            this.currentTimerIndex++;
            this.setupCurrentTimer();
        } else {
            this.endSession();
        }
    }
    
    resetSession() {
        clearInterval(this.timerInterval);
        this.isRunning = false;
        document.getElementById('btnStartPause').textContent = 'Démarrer';
        
        // Réinitialiser à la première étape
        this.currentTimerIndex = 0;
        this.setupCurrentTimer();
    }
    
    endSession() {
        clearInterval(this.timerInterval);
        this.isRunning = false;
        document.getElementById('btnStartPause').textContent = 'Démarrer';
        
        alert('Séance terminée !');
    }
    
    updateTimerDisplay() {
        const minutes = Math.floor(this.currentTime / 60).toString().padStart(2, '0');
        const seconds = (this.currentTime % 60).toString().padStart(2, '0');
        
        document.getElementById('timerMinutes').textContent = minutes;
        document.getElementById('timerSeconds').textContent = seconds;
    }
    
    renderTimeline() {
        const container = document.getElementById('timelineContainer');
        container.innerHTML = '';
        
        this.sessionTimers.forEach((timer, index) => {
            const item = document.createElement('div');
            item.className = `timeline-item ${index === this.currentTimerIndex ? 'active' : index < this.currentTimerIndex ? 'completed' : ''}`;
            item.innerHTML = `
                <div>${timer.titre}</div>
                <div class="time-info">${this.formatTime(timer.duree)} • ${timer.travail.substring(0, 50)}${timer.travail.length > 50 ? '...' : ''}</div>
            `;
            container.appendChild(item);
        });
    }
    
    updateTimeline() {
        this.renderTimeline();
    }
    
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    saveToLocalStorage() {
        localStorage.setItem('workshops', JSON.stringify(this.workshops));
        localStorage.setItem('sessions', JSON.stringify(this.sessions));
        localStorage.setItem('timers', JSON.stringify(this.timers));
    }
}

// Initialiser l'application quand la page est chargée
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TimeManagementApp();
});