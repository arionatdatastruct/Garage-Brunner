// CONFIG
const CONFIG = {
    SEARCH_URL: 'https://automation.datastruct.ch/webhook-test/kunde-suchen',
    SUBMIT_URL: 'https://automation.datastruct.ch/webhook-test/rapport-erstellen',
    HISTORIE_URL: 'https://automation.datastruct.ch/webhook-test/fahrzeug-historie',
    API_KEY: 'sXH9z7qb31*Q^r79UF7c%zFCx*yr9KpTKs6BDert1qRRR1TvvfnVBq8Vg1nb%#Hp'
};

// Foto-Komprimierung Einstellungen
const IMAGE_CONFIG = {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.7
};

// Sicherheits-Check Labels
const SAFETY_LABELS = {
    'check_bremsen_vorne': 'Bremsen vorne',
    'check_bremsen_hinten': 'Bremsen hinten',
    'check_beleuchtung': 'Beleuchtung',
    'check_fluessigkeiten': 'Flüssigkeitsstände',
    'check_unterboden': 'Unterboden/Auspuff'
};

document.addEventListener('DOMContentLoaded', function() {
    const heute = new Date();
    document.getElementById('currentDate').textContent = heute.toLocaleDateString('de-CH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('datum').value = heute.toISOString().split('T')[0];
    setupAutocomplete();
    setupCategoryButtons();
    setupAmpelButtons();
});

// --- AMPEL BUTTONS SETUP ---
function setupAmpelButtons() {
    document.querySelectorAll('.ampel-group').forEach(group => {
        const inputName = group.dataset.name;
        const hiddenInput = document.getElementById(inputName);

        group.querySelectorAll('.ampel-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                // Entferne active von allen Buttons in dieser Gruppe
                group.querySelectorAll('.ampel-btn').forEach(b => b.classList.remove('active'));
                // Aktiviere geklickten Button
                this.classList.add('active');
                // Setze hidden Input
                hiddenInput.value = this.dataset.value;
            });
        });
    });
}

// --- VORSCHAU ---
function openPreview() {
    const form = document.getElementById('arbeitsForm');
    if (!form.checkValidity()) { form.reportValidity(); return; }

    const kategorien = document.getElementById('kategorien').value;
    if (!kategorien) {
        const err = document.getElementById('errorMessage');
        err.textContent = 'Bitte wähle eine Kategorie aus.';
        err.classList.add('visible');
        return;
    }

    // Text füllen
    document.getElementById('prev_datum').textContent = document.getElementById('currentDate').textContent;
    document.getElementById('prev_carid').textContent = document.getElementById('car_id').value || 'Neuer Kunde';
    document.getElementById('prev_kunde').textContent = document.getElementById('kunde_name').value || 'Unbekannt';
    document.getElementById('prev_schild').textContent = document.getElementById('nummernschild').value;
    document.getElementById('prev_auto').textContent = `${document.getElementById('marke').value} ${document.getElementById('modell').value}`;
    document.getElementById('prev_km').textContent = document.getElementById('kmstand').value;
    document.getElementById('prev_zeit').textContent = document.getElementById('arbeitszeit').value + ' Stunden';

    // Mechaniker anzeigen
    const mechaniker = document.getElementById('mechaniker').value;
    const mechWrap = document.getElementById('prev_mechaniker_wrap');
    if (mechaniker) {
        document.getElementById('prev_mechaniker').textContent = mechaniker;
        mechWrap.style.display = 'inline';
    } else {
        mechWrap.style.display = 'none';
    }

    document.getElementById('prev_notiz').innerText = document.getElementById('notizen').value || '-';

    // Kategorien anzeigen (auch wenn nur Material ausgewählt wurde)
    showCategorySection('box_service', kategorien.includes('service'), 'serviceNotiz', 'prev_service', 'mat_service', 'prev_service_material');
    showCategorySection('box_reparatur', kategorien.includes('reparatur'), 'schadenBeschreibung', 'prev_reparatur', 'mat_reparatur', 'prev_reparatur_material');

    // Reifen Material separat
    showMaterialPreview('mat_reifen', 'prev_reifen_material');

    // Reifen speziell
    const reifenBox = document.getElementById('box_reifen');
    if(kategorien.includes('reifen')) {
        reifenBox.style.display = 'block';
        const zustand = document.querySelector('input[name="reifenZustand"]:checked');
        document.getElementById('prev_reifen_zustand').textContent = zustand ? document.querySelector(`input[value="${zustand.value}"]`).nextElementSibling.textContent.trim() : '-';
        document.getElementById('prev_reifen_notiz').innerText = document.getElementById('reifenNotiz').value;
    } else {
        reifenBox.style.display = 'none';
    }

    // FOTOS (mit Komprimierung)
    const fotoInput = document.getElementById('fotos');
    const fotoBox = document.getElementById('box_fotos');
    const container = document.getElementById('prev_fotos_container');
    container.innerHTML = '';

    if(fotoInput.files && fotoInput.files.length > 0) {
        fotoBox.style.display = 'block';
        // Komprimierte Vorschau anzeigen
        processAndDisplayPhotos(fotoInput.files, container);
    } else {
        fotoBox.style.display = 'none';
    }

    // Sicherheits-Check Vorschau
    showSafetyPreview();

    // Termine Vorschau
    showTerminePreview();

    document.getElementById('previewOverlay').classList.add('visible');
    document.getElementById('errorMessage').classList.remove('visible');
}

// Zeigt Kategorie-Sektion auch wenn nur Material (ohne Text) ausgewählt wurde
function showCategorySection(boxId, isVisible, inputId, outputId, materialName, materialOutputId) {
    const box = document.getElementById(boxId);
    const textVal = document.getElementById(inputId).value;
    const hasCheckedMaterial = document.querySelectorAll(`input[name="${materialName}"]:checked`).length > 0;

    // Zeige Box wenn Kategorie aktiv UND (Text vorhanden ODER Material ausgewählt)
    if (isVisible && (textVal || hasCheckedMaterial)) {
        box.style.display = 'block';
        document.getElementById(outputId).innerText = textVal || '(Nur Material)';
        showMaterialPreview(materialName, materialOutputId);
    } else {
        box.style.display = 'none';
        document.getElementById(materialOutputId).innerHTML = '';
    }
}

// Material-Vorschau anzeigen
function showMaterialPreview(checkboxName, outputId) {
    const checked = document.querySelectorAll(`input[name="${checkboxName}"]:checked`);
    const output = document.getElementById(outputId);

    if (checked.length === 0) {
        output.innerHTML = '';
        return;
    }

    const items = Array.from(checked).map(cb => {
        if (cb.value === 'Motoröl') {
            const liter = document.getElementById('motoroelLiter').value;
            return liter ? `Motoröl (${liter}L)` : 'Motoröl';
        }
        return cb.value;
    });

    output.innerHTML = `<div class="preview-material-label">Material:</div>${items.join(', ')}`;
}

// Sicherheits-Check Vorschau
function showSafetyPreview() {
    const container = document.getElementById('prev_sicherheit');
    let html = '';
    let hasAnyCheck = false;

    Object.keys(SAFETY_LABELS).forEach(key => {
        const value = document.getElementById(key).value;
        const label = SAFETY_LABELS[key];
        const dotClass = value || 'none';
        const warning = value === 'rot' ? '<span class="preview-safety-warning">⚠ ACHTUNG</span>' : '';

        if (value) hasAnyCheck = true;

        html += `
            <div class="preview-safety-item">
                <div class="preview-safety-dot ${dotClass}"></div>
                <span class="preview-safety-text">${label}</span>
                ${warning}
            </div>
        `;
    });

    container.innerHTML = html;

    // Box ausblenden wenn nichts ausgewählt
    const box = document.getElementById('box_sicherheit');
    box.style.display = hasAnyCheck ? 'block' : 'none';
}

// Termine Vorschau
function showTerminePreview() {
    const serviceDatum = document.getElementById('naechster_service_datum').value;
    const serviceKm = document.getElementById('naechster_service_km').value;
    const mfkDatum = document.getElementById('mfk_datum').value;

    const box = document.getElementById('box_termine');
    const output = document.getElementById('prev_termine');

    const parts = [];

    if (serviceDatum) {
        const formatted = new Date(serviceDatum).toLocaleDateString('de-CH');
        parts.push(`<strong>Nächster Service:</strong> ${formatted}`);
    }
    if (serviceKm) {
        parts.push(`<strong>Service bei:</strong> ${serviceKm} km`);
    }
    if (mfkDatum) {
        const formatted = new Date(mfkDatum).toLocaleDateString('de-CH');
        parts.push(`<strong>MFK fällig:</strong> ${formatted}`);
    }

    if (parts.length > 0) {
        box.style.display = 'block';
        output.innerHTML = parts.join('<br>');
    } else {
        box.style.display = 'none';
    }
}

// Alle Materialien sammeln für JSON
function getMaterialListe() {
    const allMaterial = [];

    // Service Material
    document.querySelectorAll('input[name="mat_service"]:checked').forEach(cb => {
        if (cb.value === 'Motoröl') {
            const liter = document.getElementById('motoroelLiter').value;
            allMaterial.push(liter ? `Motoröl (${liter}L)` : 'Motoröl');
        } else {
            allMaterial.push(cb.value);
        }
    });

    // Reparatur Material
    document.querySelectorAll('input[name="mat_reparatur"]:checked').forEach(cb => {
        allMaterial.push(cb.value);
    });

    // Reifen Material
    document.querySelectorAll('input[name="mat_reifen"]:checked').forEach(cb => {
        allMaterial.push(cb.value);
    });

    return allMaterial.join(', ');
}

// Sicherheits-Check für JSON sammeln
function getSafetyCheckData() {
    const result = {};
    Object.keys(SAFETY_LABELS).forEach(key => {
        result[key] = document.getElementById(key).value || '';
    });
    return result;
}

function closePreview() { document.getElementById('previewOverlay').classList.remove('visible'); }

// --- FOTO KOMPRIMIERUNG ---
let compressedPhotos = []; // Speichert komprimierte Fotos für Upload

async function processAndDisplayPhotos(files, container) {
    compressedPhotos = []; // Reset

    for (const file of Array.from(files)) {
        try {
            const compressed = await compressImage(file);
            compressedPhotos.push(compressed);

            // Vorschau-Bild erstellen
            const img = document.createElement('img');
            img.src = compressed.dataUrl;
            img.className = 'preview-img';
            img.title = `${file.name} (${formatFileSize(compressed.size)})`;
            container.appendChild(img);
        } catch (error) {
            console.error('Fehler beim Komprimieren:', error);
            // Fallback: Original-Bild anzeigen
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.className = 'preview-img';
            container.appendChild(img);
        }
    }

    // Zeige Komprimierungs-Info
    if (compressedPhotos.length > 0) {
        const totalSize = compressedPhotos.reduce((sum, p) => sum + p.size, 0);
        const info = document.createElement('div');
        info.className = 'foto-info';
        info.innerHTML = `📷 ${compressedPhotos.length} Foto(s) · ${formatFileSize(totalSize)} komprimiert`;
        container.appendChild(info);
    }
}

function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                // Berechne neue Dimensionen
                let { width, height } = img;
                const maxW = IMAGE_CONFIG.maxWidth;
                const maxH = IMAGE_CONFIG.maxHeight;

                if (width > maxW || height > maxH) {
                    const ratio = Math.min(maxW / width, maxH / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                // Canvas erstellen und zeichnen
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Als JPEG komprimieren
                const dataUrl = canvas.toDataURL('image/jpeg', IMAGE_CONFIG.quality);

                // Grösse berechnen (Base64 zu Bytes)
                const base64Length = dataUrl.split(',')[1].length;
                const size = Math.round((base64Length * 3) / 4);

                resolve({
                    dataUrl: dataUrl,
                    size: size,
                    width: width,
                    height: height,
                    originalName: file.name
                });
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// --- DATEN SENDEN ---
async function sendData() {
    const btn = document.getElementById('finalSubmitBtn');
    const form = document.getElementById('arbeitsForm');

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Sende...';

    // Daten sammeln
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    const reifenZustand = document.querySelector('input[name="reifenZustand"]:checked');
    if (reifenZustand) data.reifenZustand = reifenZustand.value;
    data.timestamp = new Date().toISOString();

    // Material-Liste hinzufügen
    data.material_liste = getMaterialListe();

    // Sicherheits-Check hinzufügen
    const safetyData = getSafetyCheckData();
    Object.assign(data, safetyData);

    // Senden
    try {
        const response = await fetch(CONFIG.SUBMIT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': CONFIG.API_KEY
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('Fehler');

        closePreview();
        form.style.display = 'none';
        document.getElementById('successMessage').classList.add('visible');
    } catch (error) {
        alert('Fehler beim Senden. Bitte Internet prüfen.');
        btn.disabled = false;
        btn.innerHTML = '✓ Daten an Büro senden';
    }
}

function resetForm() {
    location.reload();
}

// --- AUTOCOMPLETE LOGIK ---
let searchTimeout = null;
function setupAutocomplete() {
    const input = document.getElementById('nummernschild');
    const results = document.getElementById('autocompleteResults');
    input.addEventListener('input', function() {
        const query = this.value.toUpperCase().trim();
        if (searchTimeout) clearTimeout(searchTimeout);
        if (query.length < 2) { results.style.display = 'none'; return; }
        results.innerHTML = '<div class="autocomplete-item">Suche...</div>';
        results.style.display = 'block';
        searchTimeout = setTimeout(async () => {
            try {
                const res = await fetch(`${CONFIG.SEARCH_URL}?query=${encodeURIComponent(query)}`, {
                    headers: { 'x-api-key': CONFIG.API_KEY }
                });
                const data = await res.json();
                if (data.results && data.results.length > 0) {
                    results.innerHTML = data.results.map(k => `
                        <div class="autocomplete-item" onclick='selectKunde(${JSON.stringify(k)})'>
                            <div class="plate">${k.nummernschild}</div>
                            <div class="name">${k.vorname} ${k.nachname}</div>
                        </div>`).join('');
                } else { results.innerHTML = '<div class="autocomplete-item">Nichts gefunden</div>'; }
            } catch (e) { results.style.display = 'none'; }
        }, 300);
    });
    document.addEventListener('click', e => { if (!e.target.closest('.autocomplete-wrapper')) results.style.display = 'none'; });
}

window.selectKunde = function(kunde) {
    document.getElementById('nummernschild').value = kunde.nummernschild;
    document.getElementById('car_id').value = kunde.car_id;
    document.getElementById('marke').value = kunde.marke;
    document.getElementById('modell').value = kunde.modell;
    document.getElementById('jahrgang').value = kunde.jahrgang;
    document.getElementById('kunde_name').value = `${kunde.vorname} ${kunde.nachname}`;
    document.getElementById('kunde_adresse').value = kunde.adresse;
    document.getElementById('kunde_telefon').value = kunde.telefon;
    document.getElementById('kunde_email').value = kunde.email;

    document.getElementById('customerInfo').classList.add('visible');
    document.getElementById('customerDetails').innerHTML = `
        <strong>${kunde.vorname} ${kunde.nachname}</strong><br>
        ${kunde.adresse}<br>
        ${kunde.telefon ? `📞 ${kunde.telefon}` : ''}
        ${kunde.email ? `<br>✉️ ${kunde.email}` : ''}
    `;
    document.getElementById('autocompleteResults').style.display = 'none';

    // Fahrzeug-Historie laden
    if (kunde.car_id) {
        loadFahrzeugHistorie(kunde.car_id);
    }
};

// --- FAHRZEUG HISTORIE ---
async function loadFahrzeugHistorie(carId) {
    const box = document.getElementById('historieBox');
    const loading = document.getElementById('historieLoading');
    const list = document.getElementById('historieList');
    const empty = document.getElementById('historieEmpty');

    // Box anzeigen, Loading-State
    box.classList.add('visible');
    box.classList.remove('collapsed');
    loading.classList.add('visible');
    list.innerHTML = '';
    empty.classList.remove('visible');

    try {
        const response = await fetch(`${CONFIG.HISTORIE_URL}?car_id=${encodeURIComponent(carId)}`, {
            headers: { 'x-api-key': CONFIG.API_KEY }
        });
        const data = await response.json();

        loading.classList.remove('visible');

        if (data.historie && data.historie.length > 0) {
            list.innerHTML = data.historie.map(item => {
                const datum = new Date(item.datum).toLocaleDateString('de-CH');
                const kategorien = (item.kategorien || item.kategorie || '').split(',');
                const kategorieBadges = kategorien.map(k =>
                    `<span class="historie-item-kategorie ${k.trim()}">${k.trim()}</span>`
                ).join(' ');

                return `
                    <div class="historie-item">
                        <div class="historie-item-header">
                            <span class="historie-item-date">${datum}</span>
                            <span class="historie-item-km">${item.kmstand || item.km || '?'} km</span>
                        </div>
                        ${kategorieBadges}
                        ${item.material_liste ? `<div class="historie-item-material">${item.material_liste}</div>` : ''}
                    </div>
                `;
            }).join('');
        } else {
            empty.classList.add('visible');
        }
    } catch (error) {
        console.error('Historie laden fehlgeschlagen:', error);
        loading.classList.remove('visible');
        empty.textContent = 'Historie konnte nicht geladen werden.';
        empty.classList.add('visible');
    }
}

window.toggleHistorie = function() {
    const box = document.getElementById('historieBox');
    box.classList.toggle('collapsed');
}

function setupCategoryButtons() {
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            this.classList.toggle('active');
            updateCategories();
        });
    });
}

function updateCategories() {
    const cats = Array.from(document.querySelectorAll('.category-btn.active')).map(b => b.dataset.category);
    document.getElementById('kategorien').value = cats.join(',');
    ['service','reparatur','reifen'].forEach(c => {
        const sec = document.getElementById(c + 'Section');
        if(sec) sec.style.display = cats.includes(c) ? 'block' : 'none';
    });
}

// --- SCHNELLAUSWAHL PRESETS ---
const PRESETS = {
    oelwechsel: {
        material: ['Ölfilter', 'Motoröl'],
        beschreibung: 'Ölwechsel durchgeführt',
        arbeitszeit: '0.5'
    },
    kleinerService: {
        material: ['Ölfilter', 'Motoröl', 'Luftfilter'],
        beschreibung: 'Kleiner Service: Ölwechsel, Luftfilter, Sichtkontrolle',
        arbeitszeit: '1'
    },
    grosserService: {
        material: ['Ölfilter', 'Motoröl', 'Luftfilter', 'Innenraumfilter', 'Zündkerzen', 'Bremsflüssigkeit'],
        beschreibung: 'Grosser Service: Ölwechsel, alle Filter, Zündkerzen, Bremsflüssigkeit, Sichtkontrolle',
        arbeitszeit: '2.5'
    }
};

window.applyPreset = function(presetName, event) {
    const preset = PRESETS[presetName];
    if (!preset) return;

    // Service-Kategorie aktivieren falls noch nicht aktiv
    const serviceBtn = document.querySelector('.category-btn[data-category="service"]');
    if (!serviceBtn.classList.contains('active')) {
        serviceBtn.classList.add('active');
        updateCategories();
    }

    // Material Checkboxen setzen
    document.querySelectorAll('input[name="mat_service"]').forEach(cb => {
        cb.checked = preset.material.includes(cb.value);
    });

    // Beschreibung setzen (nur wenn leer)
    const textarea = document.getElementById('serviceNotiz');
    if (!textarea.value) {
        textarea.value = preset.beschreibung;
    }

    // Arbeitszeit setzen (nur wenn leer)
    const arbeitszeit = document.getElementById('arbeitszeit');
    if (!arbeitszeit.value) {
        arbeitszeit.value = preset.arbeitszeit;
    }

    // Visuelles Feedback - Button bleibt kurz grün
    const btn = event.target;
    btn.classList.add('preset-applied');
    setTimeout(() => {
        btn.classList.remove('preset-applied');
    }, 800);
}
