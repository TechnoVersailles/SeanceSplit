// Application principale pour la gestion des chronomètres de séances pédagogiques
class TimeManagementApp {
    constructor() {
        // Initialisation des données
        this.workshops = JSON.parse(localStorage.getItem('workshops')) || [];
        this.sessions = JSON.parse(localStorage.getItem('sessions')) || [];
        this.timers = JSON.parse(localStorage.getItem('timers')) || [];
        this.timeSlots = JSON.parse(localStorage.getItem('timeSlots')) || [];
        
        // États pour le chronomètre en cours
        this.currentTimerIndex = 0;
        this.totalTime = 0;
        this.currentTime = 0;
        this.timerInterval = null;
        this.clockInterval = null;
        this.isRunning = false;

        // Modes d'affichage du bloc titre
        this.displayModes = ['mode-border-red', 'mode-flash', 'mode-evolutive', 'mode-contrast'];
        this.currentModeIndex = 0; // 0 = Flash par défaut
        
        // Gestion de l'affichage groupé des chronomètres
        this.expandedSessions = new Set();
        this.timers.forEach(t => {
            if (t.sessionId) this.expandedSessions.add(Number(t.sessionId));
        });

        // Gestion de l'affichage groupé des créneaux
        this.expandedEstablishments = new Set();
        this.timeSlots.forEach(s => {
            if (s.establishment) this.expandedEstablishments.add(s.establishment);
        });

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

        // Gestion de la grille
        document.getElementById('btnAddSlot').addEventListener('click', () => {
            this.addTimeSlot();
        });

        // Générateur de chronomètres
        document.getElementById('btnGenerate').addEventListener('click', () => {
            this.generateTimers();
        });

        // Gestion des données (Import/Export)
        document.getElementById('btnExport').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('btnImport').addEventListener('click', () => {
            this.importData();
        });

        document.getElementById('btnDemo').addEventListener('click', () => {
            this.loadDemoData();
        });

        document.getElementById('btnReset').addEventListener('click', () => {
            this.resetData();
        });
        
        // Visualisation de séance
        document.getElementById('btnStartSession').addEventListener('click', () => {
            this.startSession();
        });
        
        document.getElementById('btnExtend').addEventListener('click', () => {
            this.extendToNextTimer();
        });

        document.getElementById('btnToggleMode').addEventListener('click', () => {
            this.toggleDisplayMode();
        });

        // Gestion visibilité select établissement
        document.getElementById('visuAlignGrid').addEventListener('change', (e) => {
            document.getElementById('visuEstablishmentSelect').style.display = e.target.checked ? 'inline-block' : 'none';
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
        const sections = ['ateliersSection', 'seancesSection', 'chronosSection', 'grilleSection', 'dataSection', 'visualisationSection'];
        const buttons = ['btnAteliers', 'btnSeances', 'btnChronos', 'btnGrille', 'btnData', 'btnVisualisation'];
        
        document.getElementById(sections[sectionIndex]).classList.add('active');
        document.getElementById(buttons[sectionIndex]).classList.add('active');
        
        // Mettre à jour les listes si nécessaire
        this.updateLists();
    }
    
    updateLists() {
        this.updateWorkshopList();
        this.updateSessionList();
        this.updateTimerList();
        this.updateTimeSlotList();
        this.updateSessionSelect();
        this.updateWorkshopSelect();
        this.updateEstablishmentSelect();
    }
    
    // Gestion des ateliers
    addWorkshop() {
        const nom = document.getElementById('atelierNom').value.trim();
        const fileInput = document.getElementById('atelierImage');
        const description = document.getElementById('atelierDescription').value.trim();
        
        if (!nom) {
            alert('Veuillez entrer un nom pour l\'atelier');
            return;
        }
        
        const saveWorkshop = (imageData) => {
            const workshop = {
                id: Date.now(),
                nom,
                image: imageData || '',
                description
            };
            
            this.workshops.push(workshop);
            this.saveToLocalStorage();
            this.updateWorkshopList();
            
            // Réinitialiser le formulaire
            document.getElementById('atelierNom').value = '';
            document.getElementById('atelierImage').value = '';
            document.getElementById('atelierDescription').value = '';
        };
        
        if (fileInput.files && fileInput.files[0]) {
            // Compression automatique de l'image
            this.resizeImage(fileInput.files[0], 800, 600, (resizedImage) => {
                saveWorkshop(resizedImage);
            });
        } else {
            saveWorkshop('');
        }
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
    
    updateWorkshop(id, field, value) {
        const workshop = this.workshops.find(w => w.id === id);
        if (workshop) {
            workshop[field] = value;
            // Si on change le nom, mettre à jour les séances associées (denormalisation)
            if (field === 'nom') {
                this.sessions.forEach(s => {
                    if (s.atelierId == id) s.atelierNom = value;
                });
                this.updateSessionList();
            }
            this.saveToLocalStorage();
            this.updateWorkshopSelect();
        }
    }

    updateWorkshopImage(id, fileInput) {
        if (fileInput.files && fileInput.files[0]) {
            this.resizeImage(fileInput.files[0], 800, 600, (resizedImage) => {
                this.updateWorkshop(id, 'image', resizedImage);
                this.updateWorkshopList();
            });
        }
    }

    // Utilitaire pour redimensionner et compresser les images
    resizeImage(file, maxWidth, maxHeight, callback) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }
                
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Compression JPEG à 70%
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                callback(dataUrl);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    updateWorkshopList() {
        const container = document.getElementById('ateliersList');
        container.innerHTML = '';
        
        this.workshops.forEach(workshop => {
            const imgPreview = workshop.image ? `<img src="${workshop.image}" style="max-height: 50px; max-width: 100px; display: block; margin-bottom: 5px; border-radius: 4px;">` : '';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><input type="text" value="${String(workshop.nom).replace(/"/g, '&quot;')}" onchange="app.updateWorkshop(${workshop.id}, 'nom', this.value)"></td>
                <td>
                    ${imgPreview}
                    <input type="file" accept="image/*" onchange="app.updateWorkshopImage(${workshop.id}, this)">
                </td>
                <td><input type="text" value="${String(workshop.description).replace(/"/g, '&quot;')}" onchange="app.updateWorkshop(${workshop.id}, 'description', this.value)"></td>
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
    
    updateSession(id, field, value) {
        const session = this.sessions.find(s => s.id === id);
        if (session) {
            session[field] = value;
            if (field === 'atelierId') {
                session.atelierNom = this.getWorkshopName(value);
            }
            // Si on change le nom de la séance, mettre à jour les chronos associés
            if (field === 'nom') {
                this.timers.forEach(t => {
                    if (t.sessionId == id) t.sessionNom = value;
                });
                this.updateTimerList();
            }
            this.saveToLocalStorage();
            this.updateSessionSelect();
        }
    }

    updateSessionList() {
        const container = document.getElementById('seancesList');
        container.innerHTML = '';
        
        this.sessions.forEach(session => {
            const workshopOptions = this.workshops.map(w => 
                `<option value="${w.id}" ${w.id == session.atelierId ? 'selected' : ''}>${String(w.nom).replace(/"/g, '&quot;')}</option>`
            ).join('');

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><input type="text" value="${String(session.nom).replace(/"/g, '&quot;')}" onchange="app.updateSession(${session.id}, 'nom', this.value)"></td>
                <td>
                    <select onchange="app.updateSession(${session.id}, 'atelierId', this.value)">
                        ${workshopOptions}
                    </select>
                </td>
                <td><input type="text" value="${String(session.description).replace(/"/g, '&quot;')}" onchange="app.updateSession(${session.id}, 'description', this.value)"></td>
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
        this.expandedSessions.add(Number(sessionId));
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
    
    updateTimer(id, field, value) {
        const timer = this.timers.find(t => t.id === id);
        if (timer) {
            const oldSessionId = timer.sessionId;
            if (field === 'duree') value = parseInt(value);
            timer[field] = value;
            if (field === 'sessionId') {
                timer.sessionNom = this.getSessionName(value);
                if (oldSessionId != value) {
                    this.saveToLocalStorage();
                    this.updateTimerList();
                    return;
                }
            }
            this.saveToLocalStorage();
        }
    }

    updateTimerList() {
        const container = document.getElementById('chronosList');
        container.innerHTML = '';
        
        // Groupement des chronomètres par séance
        const timersBySession = {};
        this.timers.forEach(timer => {
            const sId = timer.sessionId;
            if (!timersBySession[sId]) {
                timersBySession[sId] = [];
            }
            timersBySession[sId].push(timer);
        });

        // Affichage par groupe de séance
        this.sessions.forEach(session => {
            const sessionTimers = timersBySession[session.id];
            if (sessionTimers && sessionTimers.length > 0) {
                this.renderSessionGroup(container, session, sessionTimers);
            }
        });
    }

    renderSessionGroup(container, session, timers) {
        const isExpanded = this.expandedSessions.has(session.id);
        const icon = isExpanded ? 'fa-chevron-down' : 'fa-chevron-right';
        
        const headerRow = document.createElement('tr');
        headerRow.className = 'group-header';
        headerRow.onclick = () => this.toggleSessionGroup(session.id);
        headerRow.innerHTML = `
            <td colspan="5">
                <i class="fas ${icon}" style="margin-right: 10px; width: 15px;"></i>
                <strong>${String(session.nom).replace(/"/g, '&quot;')}</strong> 
                <span style="font-weight: normal; font-size: 0.9em; margin-left: 10px;">(${timers.length} chronomètres)</span>
            </td>
        `;
        container.appendChild(headerRow);

        if (isExpanded) {
            timers.forEach(timer => {
                const sessionOptions = this.sessions.map(s => 
                    `<option value="${s.id}" ${s.id == timer.sessionId ? 'selected' : ''}>${String(s.nom).replace(/"/g, '&quot;')}</option>`
                ).join('');

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        <select onchange="app.updateTimer(${timer.id}, 'sessionId', this.value)">
                            ${sessionOptions}
                        </select>
                    </td>
                    <td><input type="text" value="${String(timer.titre).replace(/"/g, '&quot;')}" onchange="app.updateTimer(${timer.id}, 'titre', this.value)"></td>
                    <td><input type="number" value="${timer.duree}" min="1" onchange="app.updateTimer(${timer.id}, 'duree', this.value)"></td>
                    <td><input type="text" value="${String(timer.travail).replace(/"/g, '&quot;')}" onchange="app.updateTimer(${timer.id}, 'travail', this.value)"></td>
                    <td>
                        <button class="btn-delete" onclick="app.deleteTimer(${timer.id})">Supprimer</button>
                    </td>
                `;
                container.appendChild(row);
            });
        }
    }

    toggleSessionGroup(sessionId) {
        if (this.expandedSessions.has(sessionId)) {
            this.expandedSessions.delete(sessionId);
        } else {
            this.expandedSessions.add(sessionId);
        }
        this.updateTimerList();
    }
    
    getSessionName(sessionId) {
        const session = this.sessions.find(s => s.id == sessionId);
        return session ? session.nom : 'Séance inconnue';
    }
    
    // Générateur de chronomètres
    generateTimers() {
        const sessionId = document.getElementById('chronoSeance').value;
        const totalSeconds = parseInt(document.getElementById('genDuration').value);
        const parts = parseInt(document.getElementById('genParts').value);
        
        if (!sessionId) {
            alert('Veuillez d\'abord sélectionner une séance dans la liste déroulante ci-dessus.');
            return;
        }
        
        if (!parts || parts < 1) {
            alert('Veuillez entrer un nombre de parties valide.');
            return;
        }
        
        const durationPerPart = Math.floor(totalSeconds / parts);
        const sessionName = this.getSessionName(sessionId);
        
        for (let i = 1; i <= parts; i++) {
            const timer = {
                id: Date.now() + i, // Ensure unique IDs
                sessionId,
                titre: `Partie ${i}/${parts}`,
                duree: durationPerPart,
                travail: `Activité ${i}`,
                sessionNom: sessionName
            };
            this.timers.push(timer);
        }
        
        this.expandedSessions.add(Number(sessionId));
        this.saveToLocalStorage();
        this.updateTimerList();
        alert(`${parts} chronomètres de ${this.formatTime(durationPerPart)} ont été ajoutés.`);
    }

    // Gestion de la Grille Horaire
    addTimeSlot() {
        const establishment = document.getElementById('slotEstablishment').value.trim();
        const nom = document.getElementById('slotNom').value.trim();
        const debut = document.getElementById('slotDebut').value;
        const fin = document.getElementById('slotFin').value;

        if (!nom || !debut || !fin) {
            alert('Veuillez remplir tous les champs du créneau.');
            return;
        }

        if (debut >= fin) {
            alert('L\'heure de début doit être avant l\'heure de fin.');
            return;
        }

        const slot = {
            id: Date.now(),
            establishment: establishment || 'Défaut',
            nom,
            debut,
            fin
        };

        this.timeSlots.push(slot);
        // Trier par heure de début
        this.timeSlots.sort((a, b) => a.debut.localeCompare(b.debut));
        
        this.expandedEstablishments.add(slot.establishment);
        this.saveToLocalStorage();
        this.updateTimeSlotList();

        // Reset form
        // On ne reset pas l'établissement pour faciliter la saisie multiple
        document.getElementById('slotNom').value = '';
        document.getElementById('slotDebut').value = '';
        document.getElementById('slotFin').value = '';
    }

    deleteTimeSlot(id) {
        if (confirm('Supprimer ce créneau horaire ?')) {
            this.timeSlots = this.timeSlots.filter(s => s.id !== id);
            this.saveToLocalStorage();
            this.updateTimeSlotList();
        }
    }

    updateTimeSlot(id, field, value) {
        const slot = this.timeSlots.find(s => s.id === id);
        if (slot) {
            slot[field] = value;
            if (field === 'debut') {
                this.timeSlots.sort((a, b) => a.debut.localeCompare(b.debut));
                this.updateTimeSlotList();
            }
            if (field === 'establishment') {
                this.updateEstablishmentSelect();
                this.updateTimeSlotList();
            }
            this.saveToLocalStorage();
        }
    }

    updateTimeSlotList() {
        const container = document.getElementById('grilleList');
        container.innerHTML = '';

        // Groupement des créneaux par établissement
        const slotsByEst = {};
        this.timeSlots.forEach(slot => {
            const est = slot.establishment || 'Défaut';
            if (!slotsByEst[est]) {
                slotsByEst[est] = [];
            }
            slotsByEst[est].push(slot);
        });

        // Affichage par groupe d'établissement
        const establishments = Object.keys(slotsByEst).sort();
        establishments.forEach(est => {
            this.renderEstablishmentGroup(container, est, slotsByEst[est]);
        });
    }

    renderEstablishmentGroup(container, establishment, slots) {
        const isExpanded = this.expandedEstablishments.has(establishment);
        const icon = isExpanded ? 'fa-chevron-down' : 'fa-chevron-right';
        
        const headerRow = document.createElement('tr');
        headerRow.className = 'group-header';
        headerRow.onclick = () => this.toggleEstablishmentGroup(establishment);
        headerRow.innerHTML = `
            <td colspan="4">
                <i class="fas ${icon}" style="margin-right: 10px; width: 15px;"></i>
                <strong>${String(establishment).replace(/"/g, '&quot;')}</strong> 
                <span style="font-weight: normal; font-size: 0.9em; margin-left: 10px;">(${slots.length} créneaux)</span>
            </td>
        `;
        container.appendChild(headerRow);

        if (isExpanded) {
            slots.forEach(slot => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><input type="text" value="${String(slot.establishment || '').replace(/"/g, '&quot;')}" onchange="app.updateTimeSlot(${slot.id}, 'establishment', this.value)" placeholder="Établissement"></td>
                    <td><input type="text" value="${String(slot.nom).replace(/"/g, '&quot;')}" onchange="app.updateTimeSlot(${slot.id}, 'nom', this.value)"></td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 5px;">
                            <input type="time" value="${slot.debut}" onchange="app.updateTimeSlot(${slot.id}, 'debut', this.value)">
                            <span>-</span>
                            <input type="time" value="${slot.fin}" onchange="app.updateTimeSlot(${slot.id}, 'fin', this.value)">
                        </div>
                    </td>
                    <td>
                        <button class="btn-delete" onclick="app.deleteTimeSlot(${slot.id})">Supprimer</button>
                    </td>
                `;
                container.appendChild(row);
            });
        }
    }

    toggleEstablishmentGroup(establishment) {
        if (this.expandedEstablishments.has(establishment)) {
            this.expandedEstablishments.delete(establishment);
        } else {
            this.expandedEstablishments.add(establishment);
        }
        this.updateTimeSlotList();
    }

    updateEstablishmentSelect() {
        const establishments = [...new Set(this.timeSlots.map(s => s.establishment || 'Défaut'))].sort();
        
        // Update Datalist pour l'autocomplétion
        const datalist = document.getElementById('establishmentList');
        datalist.innerHTML = establishments.map(e => `<option value="${e}">`).join('');

        // Update Select Visualisation
        const select = document.getElementById('visuEstablishmentSelect');
        const currentVal = select.value;
        select.innerHTML = '<option value="">-- Établissement --</option>';
        establishments.forEach(est => {
            const opt = document.createElement('option');
            opt.value = est;
            opt.textContent = est;
            select.appendChild(opt);
        });
        if (currentVal && establishments.includes(currentVal)) select.value = currentVal;
        else if (establishments.length > 0) select.value = establishments[0];

        // Sync visibility
        select.style.display = document.getElementById('visuAlignGrid').checked ? 'inline-block' : 'none';
    }

    // Gestion Import/Export
    exportData() {
        const data = {
            workshops: this.workshops,
            sessions: this.sessions,
            timers: this.timers,
            timeSlots: this.timeSlots
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "seances_data_" + new Date().toISOString().slice(0,10) + ".json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    importData() {
        const fileInput = document.getElementById('fileImport');
        const file = fileInput.files[0];
        if (!file) {
            alert('Veuillez sélectionner un fichier JSON.');
            return;
        }
        
        if (!confirm('Attention : L\'importation va écraser toutes les données actuelles. Voulez-vous continuer ?')) {
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.workshops = data.workshops || [];
                this.sessions = data.sessions || [];
                this.timers = data.timers || [];
                this.timeSlots = data.timeSlots || [];
                
                this.saveToLocalStorage();
                this.updateLists();
                alert('Données importées avec succès !');
                fileInput.value = '';
            } catch (error) {
                console.error(error);
                alert('Erreur lors de la lecture du fichier. Vérifiez le format JSON.');
            }
        };
        reader.readAsText(file);
    }

    // Fonctionnalités de Démo et Reset
    resetData() {
        if (confirm('ATTENTION : Vous êtes sur le point d\'effacer TOUTES les données (ateliers, séances, chronomètres, grille). Cette action est irréversible.\n\nVoulez-vous continuer ?')) {
            this.workshops = [];
            this.sessions = [];
            this.timers = [];
            this.timeSlots = [];
            this.expandedSessions.clear();
            this.expandedEstablishments.clear();
            this.saveToLocalStorage();
            this.updateLists();
            
            // Réinitialiser l'affichage si une séance était en cours
            this.resetSession();
            document.getElementById('sessionDisplay').classList.add('hidden');
            
            alert('Application réinitialisée avec succès. Vous repartez d\'une page blanche.');
        }
    }

    loadDemoData() {
        if (this.workshops.length > 0 || this.sessions.length > 0) {
            if (!confirm('Des données existent déjà. Voulez-vous ajouter les données de démonstration à la suite ?')) {
                return;
            }
        }

        const now = Date.now();
        
        // Création de données synthétiques
        // Ateliers
        const w1 = { id: now, nom: "Mathématiques", description: "Calcul, Géométrie et Grandeurs", image: "" };
        const w2 = { id: now + 1, nom: "Français", description: "Lecture, Écriture et Vocabulaire", image: "" };
        const w3 = { id: now + 2, nom: "Histoire-Géographie", description: "Découverte du monde et du temps", image: "" };
        const w4 = { id: now + 3, nom: "Sciences", description: "Expériences et découvertes", image: "" };
        const w5 = { id: now + 4, nom: "EPS", description: "Activités physiques et sportives", image: "" };
        
        // Séances
        const s1 = { id: now + 10, nom: "Calcul Mental", atelierId: w1.id, atelierNom: w1.nom, description: "Rituel du matin" };
        const s2 = { id: now + 11, nom: "Lecture Silencieuse", atelierId: w2.id, atelierNom: w2.nom, description: "Temps calme après la récréation" };
        const s3 = { id: now + 12, nom: "La Révolution Française", atelierId: w3.id, atelierNom: w3.nom, description: "Introduction aux événements de 1789" };
        const s4 = { id: now + 13, nom: "Le Volcan", atelierId: w4.id, atelierNom: w4.nom, description: "Expérience éruption effusive" };
        const s5 = { id: now + 14, nom: "Basket-ball", atelierId: w5.id, atelierNom: w5.nom, description: "Dribbles et passes" };
        
        // Chronomètres
        // S1 Maths
        const t1 = { id: now + 100, sessionId: s1.id, sessionNom: s1.nom, titre: "Préparation", duree: 60, travail: "Sortir l'ardoise et le feutre" };
        const t2 = { id: now + 101, sessionId: s1.id, sessionNom: s1.nom, titre: "Série Rapide", duree: 180, travail: "5 calculs au tableau" };
        const t3 = { id: now + 102, sessionId: s1.id, sessionNom: s1.nom, titre: "Correction", duree: 120, travail: "Correction collective et explications" };
        
        // S2 Français
        const t4 = { id: now + 103, sessionId: s2.id, sessionNom: s2.nom, titre: "Installation", duree: 120, travail: "Choisir un livre et s'installer" };
        const t5 = { id: now + 104, sessionId: s2.id, sessionNom: s2.nom, titre: "Lecture", duree: 900, travail: "Lecture individuelle en silence" };

        // S3 Histoire
        const t6 = { id: now + 105, sessionId: s3.id, sessionNom: s3.nom, titre: "Rappel", duree: 300, travail: "Quizz sur la leçon précédente (Louis XVI)" };
        const t7 = { id: now + 106, sessionId: s3.id, sessionNom: s3.nom, titre: "Vidéo", duree: 600, travail: "Visionnage : La prise de la Bastille" };
        const t8 = { id: now + 107, sessionId: s3.id, sessionNom: s3.nom, titre: "Groupe", duree: 900, travail: "Répondre au questionnaire par deux" };
        const t9 = { id: now + 108, sessionId: s3.id, sessionNom: s3.nom, titre: "Bilan", duree: 300, travail: "Copie de la trace écrite" };

        // S4 Sciences
        const t10 = { id: now + 109, sessionId: s4.id, sessionNom: s4.nom, titre: "Hypothèses", duree: 300, travail: "Comment faire une éruption ?" };
        const t11 = { id: now + 110, sessionId: s4.id, sessionNom: s4.nom, titre: "Expérience", duree: 1200, travail: "Mélange vinaigre et bicarbonate" };
        const t12 = { id: now + 111, sessionId: s4.id, sessionNom: s4.nom, titre: "Schéma", duree: 600, travail: "Dessiner l'expérience sur le cahier" };

        // S5 EPS
        const t13 = { id: now + 112, sessionId: s5.id, sessionNom: s5.nom, titre: "Échauffement", duree: 600, travail: "Trotiner et articulations" };
        const t14 = { id: now + 113, sessionId: s5.id, sessionNom: s5.nom, titre: "Atelier Dribble", duree: 900, travail: "Slalom entre les plots" };
        const t15 = { id: now + 114, sessionId: s5.id, sessionNom: s5.nom, titre: "Match", duree: 1200, travail: "5 contre 5" };
        const t16 = { id: now + 115, sessionId: s5.id, sessionNom: s5.nom, titre: "Retour au calme", duree: 300, travail: "Étirements et hydratation" };

        // Grille Horaire
        const g1 = { id: now + 200, establishment: "École Rosa Bonheur", nom: "M1 - Accueil", debut: "08:30", fin: "09:30" };
        const g2 = { id: now + 201, establishment: "École Rosa Bonheur", nom: "M2", debut: "09:30", fin: "10:30" };
        const g3 = { id: now + 202, establishment: "École Rosa Bonheur", nom: "Récréation Matin", debut: "10:30", fin: "10:45" };
        const g4 = { id: now + 203, establishment: "École Rosa Bonheur", nom: "M3", debut: "10:45", fin: "11:45" };
        const g5 = { id: now + 204, establishment: "École Rosa Bonheur", nom: "Pause Méridienne", debut: "11:45", fin: "13:30" };
        const g6 = { id: now + 205, establishment: "École Rosa Bonheur", nom: "S1 - Après-midi", debut: "13:30", fin: "14:30" };
        const g7 = { id: now + 206, establishment: "École Rosa Bonheur", nom: "S2", debut: "14:30", fin: "15:30" };
        const g8 = { id: now + 207, establishment: "École Rosa Bonheur", nom: "Récréation Après-midi", debut: "15:30", fin: "15:45" };
        const g9 = { id: now + 208, establishment: "École Rosa Bonheur", nom: "S3 - Fin de journée", debut: "15:45", fin: "16:30" };
        
        // Ajout d'une grille pour un autre établissement (Exemple Prof sur 2 écoles)
        const g10 = { id: now + 209, establishment: "Collège Jean Moulin", nom: "M1", debut: "08:00", fin: "08:55" };
        const g11 = { id: now + 210, establishment: "Collège Jean Moulin", nom: "M2", debut: "09:00", fin: "09:55" };
        const g12 = { id: now + 211, establishment: "Collège Jean Moulin", nom: "M3", debut: "10:10", fin: "11:05" };

        this.workshops.push(w1, w2, w3, w4, w5);
        this.sessions.push(s1, s2, s3, s4, s5);
        this.timers.push(t1, t2, t3, t4, t5, t6, t7, t8, t9, t10, t11, t12, t13, t14, t15, t16);
        this.timeSlots.push(g1, g2, g3, g4, g5, g6, g7, g8, g9, g10, g11, g12);
        
        // Expand all demo sessions
        this.sessions.forEach(s => this.expandedSessions.add(s.id));

        // Expand all demo establishments
        this.timeSlots.forEach(s => {
            if (s.establishment) this.expandedEstablishments.add(s.establishment);
        });
        
        // Tri de la grille
        this.timeSlots.sort((a, b) => a.debut.localeCompare(b.debut));
        
        this.saveToLocalStorage();
        this.updateLists();
        alert('Données de démonstration complètes chargées (Ateliers, Séances, Chronos, Grille) !');
    }

    // Fonctionnalités de visualisation de séance
    startSession() {
        const sessionId = document.getElementById('visuSeanceSelect').value;
        
        if (!sessionId) {
            alert('Veuillez sélectionner une séance');
            return;
        }

        // Mise à jour du bloc titre de l'atelier
        const session = this.sessions.find(s => s.id == sessionId);
        if (session) {
            document.getElementById('workshopTitle').textContent = session.atelierNom;
            
            const workshop = this.workshops.find(w => w.id == session.atelierId);
            const workshopBlock = document.getElementById('workshopTitleBlock');
            if (workshop && workshop.image) {
                workshopBlock.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url('${workshop.image}')`;
            } else {
                workshopBlock.style.backgroundImage = 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)';
            }
        }
        
        // Récupérer les chronomètres de la séance
        // IMPORTANT: On clone les objets pour ne pas modifier la configuration originale lors du redimensionnement
        const originalTimers = this.timers.filter(timer => timer.sessionId == sessionId);
        this.sessionTimers = JSON.parse(JSON.stringify(originalTimers));
        
        if (this.sessionTimers.length === 0) {
            alert('Cette séance ne contient aucun chronomètre');
            return;
        }

        // Logique d'alignement sur la grille
        const alignGrid = document.getElementById('visuAlignGrid').checked;
        if (alignGrid) {
            const selectedEst = document.getElementById('visuEstablishmentSelect').value;
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            
            // Trouver le créneau correspondant (celui qui finit après maintenant)
            // On cherche le créneau le plus proche qui contient l'heure actuelle ou qui va commencer
            const relevantSlots = this.timeSlots.filter(s => (s.establishment || 'Défaut') === selectedEst);
            const matchingSlot = relevantSlots.find(slot => {
                const [hEnd, mEnd] = slot.fin.split(':').map(Number);
                const endMinutes = hEnd * 60 + mEnd;
                return endMinutes > currentMinutes;
            });

            if (matchingSlot) {
                const [hEnd, mEnd] = matchingSlot.fin.split(':').map(Number);
                const targetDate = new Date();
                targetDate.setHours(hEnd, mEnd, 0, 0);
                
                // Calculer le temps disponible en secondes
                const availableSeconds = Math.floor((targetDate.getTime() - now.getTime()) / 1000);
                
                if (availableSeconds > 60) { // S'il reste au moins 1 minute
                    const totalOriginalDuration = this.sessionTimers.reduce((acc, t) => acc + t.duree, 0);
                    const ratio = availableSeconds / totalOriginalDuration;
                    
                    // Appliquer le ratio à tous les chronomètres
                    let newTotal = 0;
                    this.sessionTimers.forEach((timer, index) => {
                        // Pour le dernier, on ajuste pour éviter les erreurs d'arrondi
                        if (index === this.sessionTimers.length - 1) {
                            timer.duree = availableSeconds - newTotal;
                        } else {
                            timer.duree = Math.floor(timer.duree * ratio);
                            newTotal += timer.duree;
                        }
                    });
                    alert(`Séance alignée sur la fin du créneau "${matchingSlot.nom}" (${matchingSlot.fin}). Durée ajustée à ${this.formatTime(availableSeconds)}.`);
                } else {
                    alert("Le créneau sélectionné est déjà terminé ou trop proche de la fin.");
                }
            } else {
                alert("Aucun créneau horaire trouvé pour l'heure actuelle.");
            }
        }
        
        // Afficher la section de visualisation
        document.getElementById('sessionDisplay').classList.remove('hidden');
        
        // Démarrer l'horloge locale
        this.startClock();
        
        // Initialiser le premier chronomètre
        this.currentTimerIndex = 0;
        this.setupCurrentTimer();
        
        // Afficher la timeline
        this.renderProgressBar();
        this.renderTimeline();

        // Démarrer automatiquement le chronomètre
        this.toggleTimer();
    }
    
    startClock() {
        if (this.clockInterval) clearInterval(this.clockInterval);
        this.updateClock();
        this.clockInterval = setInterval(() => this.updateClock(), 1000);
    }

    updateClock() {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const timeString = `${hours}:${minutes}`;
        const localTimeEl = document.getElementById('localTime');
        if (localTimeEl) localTimeEl.textContent = timeString;
    }

    setupCurrentTimer() {
        if (this.currentTimerIndex >= this.sessionTimers.length) {
            this.endSession();
            return;
        }
        
        const timer = this.sessionTimers[this.currentTimerIndex];
        const titleElement = document.getElementById('currentTimerTitle');
        titleElement.textContent = timer.titre;
        titleElement.classList.remove('title-animate');
        document.getElementById('currentWork').textContent = timer.travail;

        // Animation d'apparition des instructions pour attirer l'attention des élèves
        const titleBlock = document.getElementById('timerTitleBlock');
        titleBlock.classList.remove('instruction-appear');
        void titleBlock.offsetWidth; // Force le redessin (reflow) pour relancer l'animation
        titleBlock.classList.add('instruction-appear');
        
        // Retirer la classe d'apparition après l'animation pour laisser place à l'animation continue (breathing)
        setTimeout(() => {
            titleBlock.classList.remove('instruction-appear');
        }, 800);
        
        this.totalTime = timer.duree;
        this.currentTime = this.totalTime;
        this.updateTimerDisplay();
        
        // Mettre à jour la timeline
        this.renderProgressBar();
        this.updateTimeline();
    }
    
    toggleTimer() {
        if (this.isRunning) {
            // Pause
            clearInterval(this.timerInterval);
            this.isRunning = false;
        } else {
            // Démarrer
            if (this.currentTime > 0) {
                this.timerInterval = setInterval(() => {
                    this.tick();
                }, 1000);
                this.isRunning = true;
            }
        }
    }
    
    tick() {
        this.currentTime--;
        this.updateTimerDisplay();
        this.updateProgressCursor();
        
        if (this.currentTime <= 0) {
            this.timerFinished();
        }
    }
    
    timerFinished() {
        clearInterval(this.timerInterval);
        this.isRunning = false;
        
        const autoPlay = document.getElementById('autoPlay').checked;
        
        // Passer au chronomètre suivant
        setTimeout(() => {
            this.nextTimer(autoPlay);
        }, 1000);
    }

    extendToNextTimer() {
        // Arrêter le timer actuel pour éviter les conflits
        clearInterval(this.timerInterval);
        
        if (this.currentTimerIndex < this.sessionTimers.length - 1) {
            // Si on est en avance (il reste du temps), on l'ajoute au chrono suivant
            if (this.currentTime > 0) {
                this.sessionTimers[this.currentTimerIndex + 1].duree += this.currentTime;
            }

            // Passer au suivant
            this.currentTimerIndex++;
            this.setupCurrentTimer();
            
            // Forcer le démarrage immédiat
            this.timerInterval = setInterval(() => {
                this.tick();
            }, 1000);
            this.isRunning = true;
        } else {
            this.endSession();
        }
    }
    
    toggleDisplayMode() {
        const titleBlock = document.getElementById('timerTitleBlock');
        // Retirer la classe actuelle
        titleBlock.classList.remove(this.displayModes[this.currentModeIndex]);
        
        // Passer au mode suivant
        this.currentModeIndex = (this.currentModeIndex + 1) % this.displayModes.length;
        
        // Ajouter la nouvelle classe
        titleBlock.classList.add(this.displayModes[this.currentModeIndex]);
    }

    nextTimer(autoStart = false) {
        if (this.currentTimerIndex < this.sessionTimers.length - 1) {
            this.currentTimerIndex++;
            this.setupCurrentTimer();
            if (autoStart) {
                this.toggleTimer();
            }
        } else {
            this.endSession();
        }
    }
    
    resetSession() {
        clearInterval(this.timerInterval);
        this.isRunning = false;
        
        // Réinitialiser à la première étape
        this.currentTimerIndex = 0;
        this.setupCurrentTimer();
    }
    
    endSession() {
        clearInterval(this.timerInterval);
        this.isRunning = false;
        
        const titleElement = document.getElementById('currentTimerTitle');
        titleElement.textContent = "SÉANCE TERMINÉE !";
        titleElement.classList.add('title-animate');
        document.getElementById('currentWork').textContent = "Félicitations, la séance est complète.";
    }
    
    updateTimerDisplay() {
        const minutes = Math.floor(this.currentTime / 60).toString().padStart(2, '0');
        const seconds = (this.currentTime % 60).toString().padStart(2, '0');
        
        document.getElementById('timerMinutes').textContent = minutes;
        document.getElementById('timerSeconds').textContent = seconds;

        // Mettre à jour la couleur du chronomètre (Gradient Bleu -> Rouge)
        this.updateTimerGradient();
    }
    
    renderProgressBar() {
        const container = document.getElementById('progressBar');
        container.innerHTML = '';
        
        const totalDuration = this.sessionTimers.reduce((acc, t) => acc + t.duree, 0);
        
        // Calcul du temps de départ estimé de la séance
        const now = new Date();
        let elapsedTotal = 0;
        for(let i=0; i<this.currentTimerIndex; i++) {
            elapsedTotal += this.sessionTimers[i].duree;
        }
        elapsedTotal += (this.totalTime - this.currentTime);
        const sessionStartTime = new Date(now.getTime() - elapsedTotal * 1000);
        
        let accumulatedDuration = 0;
        
        this.sessionTimers.forEach((timer, index) => {
            const width = (timer.duree / totalDuration) * 100;
            const segment = document.createElement('div');
            segment.className = 'progress-segment';
            if (index < this.currentTimerIndex) segment.classList.add('completed');
            if (index === this.currentTimerIndex) segment.classList.add('active');
            segment.style.width = `${width}%`;
            segment.title = `${timer.titre} (${this.formatTime(timer.duree)})`;
            
            container.appendChild(segment);
            
            // Ajout du nom du chrono (Positionnement absolu sur le conteneur global)
            const centerPercent = ((accumulatedDuration + (timer.duree / 2)) / totalDuration) * 100;
            const nameLabel = document.createElement('span');
            nameLabel.className = 'segment-label-name';
            nameLabel.textContent = timer.titre;
            
            // Styles inline pour positionnement précis
            nameLabel.style.position = 'absolute';
            nameLabel.style.top = '50%';
            nameLabel.style.left = `${centerPercent}%`;
            nameLabel.style.transform = 'translate(-50%, -50%)';
            nameLabel.style.zIndex = '5';
            
            // Contraste du texte selon l'état du segment
            if (index < this.currentTimerIndex) {
                nameLabel.style.color = 'rgba(255, 255, 255, 0.95)';
            } else {
                nameLabel.style.color = '#495057';
            }
            
            container.appendChild(nameLabel);
            accumulatedDuration += timer.duree;
        });

        // Ajout des étiquettes de temps sur la barre globale (Positionnement absolu précis)
        accumulatedDuration = 0;
        // 1. Heure de début (0%)
        this.createTimeLabel(container, 0, sessionStartTime);
        
        // 2. Heures intermédiaires et fin
        this.sessionTimers.forEach(timer => {
            accumulatedDuration += timer.duree;
            const percentage = (accumulatedDuration / totalDuration) * 100;
            const timeAtPoint = new Date(sessionStartTime.getTime() + accumulatedDuration * 1000);
            this.createTimeLabel(container, percentage, timeAtPoint);
        });

        // Ajout du curseur de progression
        const cursor = document.createElement('div');
        cursor.id = 'progressCursor';
        cursor.className = 'progress-cursor';
        container.appendChild(cursor);
        
        this.updateProgressCursor();
    }

    createTimeLabel(container, leftPercent, date) {
        const label = document.createElement('span');
        label.className = 'segment-label-time';
        label.textContent = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        label.style.position = 'absolute';
        label.style.bottom = '-30px';
        label.style.left = `${leftPercent}%`;
        label.style.transform = 'translateX(-50%)'; // Toujours centré sur le point précis
        container.appendChild(label);
    }

    updateProgressCursor() {
        const cursor = document.getElementById('progressCursor');
        if (!cursor || !this.sessionTimers.length) return;
        
        const totalDuration = this.sessionTimers.reduce((acc, t) => acc + t.duree, 0);
        let elapsed = 0;
        
        // Temps des chronomètres terminés
        for(let i = 0; i < this.currentTimerIndex; i++) {
            elapsed += this.sessionTimers[i].duree;
        }
        
        // Temps écoulé dans le chronomètre actuel
        if (this.currentTimerIndex < this.sessionTimers.length) {
            elapsed += (this.totalTime - this.currentTime);
        }
        
        const percentage = (elapsed / totalDuration) * 100;
        cursor.style.left = `${percentage}%`;
    }

    updateTimerGradient() {
        const chronoContainer = document.getElementById('chronoTimeGroup');
        const globalContainer = document.getElementById('globalTimeGroup');
        if (!chronoContainer || !globalContainer || this.totalTime === 0) return;

        // 1. Gradient du Chronomètre Courant (inchangé)
        const ratio = this.currentTime / this.totalTime;
        const progressPct = (1 - ratio) * 100;
        
        // Dégradé Bleu/Violet (Début)
        // Start: #6a11cb (106, 17, 203) -> End: #2575fc (37, 117, 252)
        const startBlue = [106, 17, 203];
        const endBlue = [37, 117, 252];
        
        // Dégradé Rouge/Orange (Fin - Danger)
        // Start: #cb2d3e (203, 45, 62) -> End: #ef473a (239, 71, 58)
        const startRed = [203, 45, 62];
        const endRed = [239, 71, 58];
        
        // Interpolation linéaire
        const interpolate = (start, end, r) => Math.round(end + (start - end) * r);
        
        const c1 = startBlue.map((c, i) => interpolate(c, startRed[i], ratio));
        
        // Volet horizontal : Couleur évolutive à gauche, Bleu fixe à droite
        const colorString = `rgb(${c1[0]}, ${c1[1]}, ${c1[2]})`;
        const emptyColor = `rgb(37, 117, 252)`; // Bleu clair fixe
        
        chronoContainer.style.background = `linear-gradient(90deg, ${colorString} ${progressPct}%, ${emptyColor} ${progressPct}%)`;

        // 2. Gradient de l'Heure Globale (Basé sur la séance entière)
        const totalDuration = this.sessionTimers.reduce((acc, t) => acc + t.duree, 0);
        let elapsedTotal = 0;
        for(let i=0; i<this.currentTimerIndex; i++) {
            elapsedTotal += this.sessionTimers[i].duree;
        }
        elapsedTotal += (this.totalTime - this.currentTime);
        
        // Ratio inversé pour la séance (0.0 = début, 1.0 = fin) -> on veut que ça devienne rouge à la fin
        // Le ratio précédent était: 1.0 (début/plein) -> 0.0 (fin/vide).
        // Ici elapsedTotal va de 0 à totalDuration.
        // Donc remainingSession = totalDuration - elapsedTotal.
        const remainingSession = Math.max(0, totalDuration - elapsedTotal);
        const sessionRatio = totalDuration > 0 ? remainingSession / totalDuration : 0;
        const sessionProgressPct = (1 - sessionRatio) * 100;

        const g1 = startBlue.map((c, i) => interpolate(c, startRed[i], sessionRatio));
        const globalColorString = `rgb(${g1[0]}, ${g1[1]}, ${g1[2]})`;

        globalContainer.style.background = `linear-gradient(90deg, ${globalColorString} ${sessionProgressPct}%, ${emptyColor} ${sessionProgressPct}%)`;

        // 3. Évolution du bloc Titre/Consigne (Bordure et Fond)
        const titleBlock = document.getElementById('timerTitleBlock');
        // On applique l'évolution des couleurs uniquement si on est en mode 'evolutive' (ou si on veut surcharger le style inline)
        if (titleBlock && titleBlock.classList.contains('mode-evolutive')) {
             // Bordure : Bleu (#0d6efd) -> Rouge (#dc3545)
             const startBorder = [13, 110, 253];
             const endBorder = [220, 53, 69];
             
             const borderColor = startBorder.map((c, i) => interpolate(c, endBorder[i], ratio));
             titleBlock.style.borderLeftColor = `rgb(${borderColor[0]}, ${borderColor[1]}, ${borderColor[2]})`;
             
             // Fond : Blanc -> Rouge très pâle (pour garder la lisibilité du texte)
             // Blanc: 255, 255, 255
             // Rouge pâle: 255, 235, 235
             const startBg = [255, 255, 255];
             const endBg = [255, 235, 235];
             
             const bgColor = startBg.map((c, i) => interpolate(c, endBg[i], ratio));
             titleBlock.style.backgroundColor = `rgb(${bgColor[0]}, ${bgColor[1]}, ${bgColor[2]})`;
        }
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
        localStorage.setItem('timeSlots', JSON.stringify(this.timeSlots));
    }
}

// Initialiser l'application quand la page est chargée
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TimeManagementApp();
});