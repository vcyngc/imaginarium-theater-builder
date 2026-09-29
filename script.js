let karakterDB = [];
let bossDB = [];
const elemenList = ['Pyro', 'Hydro', 'Anemo', 'Electro', 'Dendro', 'Cryo', 'Geo'];

let elemenTerpilih = JSON.parse(localStorage.getItem('savedElemen')) || [];
let susunan = JSON.parse(localStorage.getItem('savedRoster')) || { pembuka: [], undangan: [], cadangan: [] };
let susunanBoss = JSON.parse(localStorage.getItem('savedBoss')) || {};
let susunanStage = JSON.parse(localStorage.getItem('savedStage')) || {};

for (let key in susunanBoss) { if (typeof susunanBoss[key] === 'string') susunanBoss[key] = [susunanBoss[key]]; }
for (let i = 0; i < 12; i++) { if (!susunanStage[i]) susunanStage[i] = { inti: [], opsional: [] }; }

let targetModal = "", targetStageIndex = null, tempSelection = [], currentModalDB = [], currentElementFilter = 'All';
let editingContext = { type: null, stageIndex: null, oldPath: null };

function getPath(item) { return typeof item === 'string' ? item : item.path; }
function getElemen(item) { return typeof item === 'object' && item.elemen ? item.elemen : getPath(item).split('/')[2] || ''; }
function getBintang(item) { return typeof item === 'object' && item.bintang ? item.bintang : (getPath(item).includes('/Bintang5/') ? 5 : 4); }
function isTraveler(item) { return getPath(item).includes('TravelerBoy') || getPath(item).includes('TravelerGirl'); }
function getNamaDariPath(item) { return typeof item === 'object' && item.nama ? item.nama : getPath(item).split('/').pop().replace(/\.(png|jpg|webp)$/i, '').replace(/-/g, ' '); }

function simpanDataOtomatis() {
    localStorage.setItem('savedElemen', JSON.stringify(elemenTerpilih));
    localStorage.setItem('savedRoster', JSON.stringify(susunan));
    localStorage.setItem('savedBoss', JSON.stringify(susunanBoss));
    localStorage.setItem('savedStage', JSON.stringify(susunanStage));
}

function tampilkanPeringatan(pesan) {
    Swal.fire({ title: 'Attention!', text: pesan, icon: 'warning', background: '#11151F', color: '#fff', confirmButtonColor: '#7C3AED' });
}

function hitungTotalPemakaian(path) {
    let count = 0;
    for (let i = 0; i < 12; i++) { if (susunanStage[i].inti.includes(path) || susunanStage[i].opsional.includes(path)) count++; }
    return count;
}

function cariActBoss(bossPath) {
    let acts = [];
    for (let i = 0; i < 12; i++) { if (susunanBoss[i] && susunanBoss[i].includes(bossPath)) acts.push(stages[i].nama); }
    return acts.join(', ');
}

function renderSlotBox(targetId, arrayPaths, kategori) {
    const container = document.getElementById(targetId); if (!container) return;
    arrayPaths = arrayPaths.filter(Boolean); susunan[kategori] = arrayPaths; 
    const fragment = document.createDocumentFragment();
    
    arrayPaths.forEach((path) => {
        let wrapper = document.createElement('div'); wrapper.style.position = 'relative';
        let img = document.createElement('img'); img.src = path; img.className = 'char-img'; img.title = getNamaDariPath(path); img.tabIndex = 0;
        img.onerror = function() { this.src = 'assets/placeholder-silhouette.png'; };
        let fn = () => { editingContext = { type: kategori, stageIndex: null, oldPath: path }; bukaGaleri(kategori); };
        img.onclick = fn; img.onkeydown = (e) => { if (e.key === 'Enter') fn(); };
        wrapper.appendChild(img); fragment.appendChild(wrapper);
    });

    let sisa = kategori === 'pembuka' ? 6 - arrayPaths.length : (kategori === 'undangan' ? (arrayPaths.length < 4 && (arrayPaths.length + susunan.cadangan.length) < 26 ? 1 : 0) : 0);
    if (kategori === 'cadangan') {
        let minCad = Math.max(0, 22 - susunan.undangan.length);
        if (arrayPaths.length < minCad) sisa = minCad - arrayPaths.length; else if ((susunan.undangan.length + arrayPaths.length) < 26) sisa = 1; 
    }
    for (let i = 0; i < sisa; i++) {
        let emptyDiv = document.createElement('div'); emptyDiv.className = 'empty-slot'; emptyDiv.innerHTML = '+'; emptyDiv.tabIndex = 0;
        let fn = () => { editingContext = { type: kategori, stageIndex: null, oldPath: null }; bukaGaleri(kategori); };
        emptyDiv.onclick = fn; emptyDiv.onkeydown = (e) => { if (e.key === 'Enter') fn(); };
        fragment.appendChild(emptyDiv);
    }
    container.innerHTML = ""; container.appendChild(fragment);
}

function updateTampilanRoster() {
    renderSlotBox('slot-pembuka', susunan.pembuka, 'pembuka'); document.getElementById('count-pembuka').innerText = susunan.pembuka.length;
    renderSlotBox('slot-undangan', susunan.undangan, 'undangan'); document.getElementById('count-undangan').innerText = susunan.undangan.length;
    renderSlotBox('slot-cadangan', susunan.cadangan, 'cadangan'); document.getElementById('count-total-cadangan').innerText = susunan.undangan.length + susunan.cadangan.length;
    simpanDataOtomatis();
}

function sinkronisasiKarakterStage() {
    let rosterValidPath = [...susunan.pembuka, ...susunan.undangan, ...susunan.cadangan];
    for (let i = 0; i < 12; i++) {
        susunanStage[i].inti = susunanStage[i].inti.filter(path => rosterValidPath.includes(path));
        susunanStage[i].opsional = susunanStage[i].opsional.filter(path => rosterValidPath.includes(path));
    }
    updateTampilanStage();
}

const elementContainer = document.getElementById('element-container');
elemenList.forEach(elemen => {
    let btn = document.createElement('button'); btn.className = 'btn-element'; btn.title = elemen;
    let img = document.createElement('img'); img.src = `assets/element/${elemen}.png`; img.onerror = function() { this.style.display = 'none'; };
    btn.appendChild(img);
    if (elemenTerpilih.includes(elemen)) btn.classList.add('active');
    
    btn.onclick = () => {
        if (elemenTerpilih.includes(elemen)) {
            if ([...susunan.pembuka, ...susunan.undangan, ...susunan.cadangan].filter(p => getElemen(p) === elemen).length === 0) {
                elemenTerpilih = elemenTerpilih.filter(e => e !== elemen); btn.classList.remove('active'); simpanDataOtomatis();
            } else {
                Swal.fire({ title: 'Remove Element?', text: `Removing ${elemen} will clear associated characters!`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#EF4444', background: '#11151F', color: '#fff' })
                .then((r) => {
                    if (r.isConfirmed) {
                        elemenTerpilih = elemenTerpilih.filter(e => e !== elemen); btn.classList.remove('active');
                        susunan.pembuka = susunan.pembuka.filter(p => getElemen(p) !== elemen); susunan.cadangan = susunan.cadangan.filter(p => getElemen(p) !== elemen);
                        updateTampilanRoster(); sinkronisasiKarakterStage(); simpanDataOtomatis();
                    }
                });
            }
        } else {
            if (elemenTerpilih.length < 3) { elemenTerpilih.push(elemen); btn.classList.add('active'); simpanDataOtomatis(); } 
            else { tampilkanPeringatan("Maximum 3 Elements allowed!"); }
        }
    };
    elementContainer.appendChild(btn);
});

const modalElem = document.getElementById('modal-galeri');
window.handleOutsideClick = function(event) { if (event.target === modalElem) tutupGaleri(); }

window.bukaGaleri = function(target, stageIndex = null) {
    targetModal = target; targetStageIndex = stageIndex;
    if (!editingContext.type || editingContext.stageIndex !== stageIndex) editingContext = { type: target, stageIndex: stageIndex, oldPath: null };
    
    if (target !== 'boss' && target !== 'inti' && target !== 'opsional') {
        if (elemenTerpilih.length < 3) { tampilkanPeringatan("Select 3 Elements first!"); return; }
        if ((target === 'undangan' || target === 'cadangan') && susunan.pembuka.length < 6) { tampilkanPeringatan("Fill Opening Characters first!"); return; }
    }
    
    document.getElementById('search-input').value = ""; let db = []; const filterContainer = document.getElementById('modal-filter-container');
    if (target === 'boss') {
        db = bossDB.filter(item => !getPath(item).includes('Defense-Monolith'));
        tempSelection = susunanBoss[stageIndex] ? [...susunanBoss[stageIndex]] : []; if (editingContext.oldPath) tempSelection = tempSelection.filter(p => p !== editingContext.oldPath);
        document.getElementById('modal-title').innerText = `Select Boss`; filterContainer.classList.add('hidden'); filterContainer.innerHTML = "";
    } else {
        filterContainer.classList.remove('hidden');
        if (target === 'inti' || target === 'opsional') {
            db = [...susunan.pembuka, ...susunan.undangan, ...susunan.cadangan]; if (db.length === 0) { tampilkanPeringatan("Main Roster empty!"); return; }
            tempSelection = [...susunanStage[stageIndex][target]]; if (editingContext.oldPath) tempSelection = tempSelection.filter(p => p !== editingContext.oldPath);
            db = db.filter(item => (hitungTotalPemakaian(getPath(item)) < 2 || tempSelection.includes(getPath(item))));
            document.getElementById('modal-title').innerText = `Select Character (${target === 'inti' ? 'Main Party' : 'Optional Party'})`;
        } else {
            db = target === 'undangan' ? karakterDB : karakterDB.filter(item => elemenTerpilih.includes(getElemen(item)));
            tempSelection = [...susunan[target]]; if (editingContext.oldPath) tempSelection = tempSelection.filter(p => p !== editingContext.oldPath);
            let rAktif = [...susunan.pembuka, ...susunan.undangan, ...susunan.cadangan];
            if (target === 'pembuka' || target === 'undangan') db = db.filter(item => !isTraveler(item));
            db = db.filter(item => !rAktif.includes(getPath(item)) || tempSelection.includes(getPath(item)));
            document.getElementById('modal-title').innerText = `Select Character (${target.toUpperCase()})`;
        }
        db.sort((a, b) => {
            if (target === 'inti' || target === 'opsional') { if (susunan.pembuka.includes(getPath(a)) !== susunan.pembuka.includes(getPath(b))) return susunan.pembuka.includes(getPath(b)) - susunan.pembuka.includes(getPath(a)); }
            if (getBintang(a) !== getBintang(b)) return getBintang(b) - getBintang(a); return getNamaDariPath(a).localeCompare(getNamaDariPath(b));
        });
        let html = `<button class="btn-filter active" onclick="applyFilter('All', this)">All</button>`;
        let elems = (target === 'inti' || target === 'opsional') ? elemenTerpilih : (target === 'undangan' ? elemenList : elemenTerpilih);
        if ((target === 'inti' || target === 'opsional') && susunan.undangan.length > 0) html += `<button class="btn-filter" onclick="applyFilter('Special Guest', this)">Special Guest</button>`;
        elems.forEach(el => html += `<button class="btn-filter" onclick="applyFilter('${el}', this)">${el}</button>`);
        filterContainer.innerHTML = html;
    }
    currentModalDB = db; currentElementFilter = 'All';
    modalElem.classList.remove('hidden'); setTimeout(() => modalElem.classList.add('active'), 10);
    jalankanPencarianDanFilter(); updateModalState();
}

window.applyFilter = function(elTujuan, btn) { document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active')); btn.classList.add('active'); currentElementFilter = elTujuan; jalankanPencarianDanFilter(); }
window.cariKarakter = jalankanPencarianDanFilter;

function jalankanPencarianDanFilter() {
    let kw = document.getElementById('search-input').value.toLowerCase(); let hasil = currentModalDB;
    if (currentElementFilter !== 'All') hasil = currentElementFilter === 'Special Guest' ? hasil.filter(item => susunan.undangan.includes(getPath(item))) : hasil.filter(item => getElemen(item) === currentElementFilter || getPath(item).includes(`/${currentElementFilter}/`));
    if (kw) hasil = hasil.filter(item => getNamaDariPath(item).toLowerCase().includes(kw));
    renderIsiGaleri(hasil);
}

function renderIsiGaleri(dataListPaths) {
    const gallery = document.getElementById('gallery-container'); gallery.innerHTML = "";
    if (dataListPaths.length === 0) { gallery.innerHTML = "<p style='color: #94A3B8; grid-column: 1 / -1; text-align: center;'>No characters found.</p>"; return; }
    const fragment = document.createDocumentFragment(); let hP = false, hO = false;
    dataListPaths.forEach(item => {
        let path = getPath(item);
        if (targetModal === 'inti' || targetModal === 'opsional') {
            let isP = susunan.pembuka.includes(path);
            if (isP && !hP) { let h = document.createElement('div'); h.className = 'gallery-separator'; h.innerText = 'Opening Characters'; fragment.appendChild(h); hP = true; } 
            else if (!isP && !hO) { let h = document.createElement('div'); h.className = 'gallery-separator'; h.innerText = 'Other Characters'; fragment.appendChild(h); hO = true; }
        }
        let w = document.createElement('div'); w.className = 'gallery-item-wrapper'; w.tabIndex = 0; if (tempSelection.includes(path)) w.classList.add('selected');
        let img = document.createElement('img'); img.src = path; img.className = 'char-img'; img.loading = 'lazy';
        if (targetModal === 'boss') { img.style.backgroundColor = '#450a0a'; }
        if ((targetModal === 'inti' || targetModal === 'opsional') && hitungTotalPemakaian(path) > 0 && editingContext.oldPath !== path) {
            img.classList.add('char-used-vigor'); let b = document.createElement('span'); b.className = 'badge-indicator'; b.innerText = hitungTotalPemakaian(path); w.appendChild(b);
        }
        if (targetModal === 'boss' && cariActBoss(path) && editingContext.oldPath !== path) {
            let b = document.createElement('span'); b.className = 'badge-boss'; b.innerText = cariActBoss(path).replace(/Act /g, "A").replace(/Lunar /g, "L"); w.appendChild(b);
        }
        let fn = () => togglePilihanGaleri(path, w); w.onclick = fn; w.onkeydown = (e) => { if (e.key === 'Enter') fn(); };
        w.appendChild(img); fragment.appendChild(w);
    });
    gallery.appendChild(fragment);
}

function togglePilihanGaleri(path, w) {
    const idx = tempSelection.indexOf(path);
    if (idx > -1) { tempSelection.splice(idx, 1); w.classList.remove('selected'); }
    else {
        let t = tempSelection.length + 1;
        if (targetModal === 'boss') {
            let m = (targetStageIndex === 10 || targetStageIndex === 11) ? 4 : 1;
            if (t > m) { if(m===1){ document.querySelectorAll('.gallery-item-wrapper').forEach(el=>el.classList.remove('selected')); tempSelection=[path]; w.classList.add('selected'); } else tampilkanPeringatan(`Max ${m} Bosses!`); return; }
        } else if (targetModal === 'inti' || targetModal === 'opsional') { if (t > 4) { tampilkanPeringatan("Max 4 Characters!"); return; } }
        else {
            if (isTraveler(path)) { let eIdx = tempSelection.findIndex(p => isTraveler(p)); if (eIdx > -1) { let old = document.querySelector(`.gallery-item-wrapper[data-path="${tempSelection[eIdx]}"]`); if (old) old.classList.remove('selected'); tempSelection.splice(eIdx, 1); } }
            if (targetModal === 'pembuka') { if (t > 6) { tampilkanPeringatan("Max 6!"); return; } if (tempSelection.filter(p => getElemen(p) === getElemen(path)).length >= 2) { tampilkanPeringatan(`Max 2 for Element ${getElemen(path)}!`); return; } }
            if (targetModal === 'undangan' && (t > 4 || t > 26 - susunan.cadangan.length)) { tampilkanPeringatan("Full!"); return; }
            if (targetModal === 'cadangan' && t > 26 - susunan.undangan.length) { tampilkanPeringatan("Full!"); return; }
        }
        tempSelection.push(path); w.classList.add('selected');
    }
    updateModalState();
}

function updateModalState() { 
    let t = tempSelection.length, btn = document.getElementById('btn-submit-modal'), valid = false;
    if (targetModal === 'pembuka') { valid = t === 6; btn.innerText = valid ? "Select (6/6)" : `Select (${t}/6)`; }
    else if (targetModal === 'undangan' || targetModal === 'inti' || targetModal === 'opsional') { valid = t <= 4; btn.innerText = `Select (${t}/4)`; }
    else if (targetModal === 'cadangan') { let tot = susunan.undangan.length + t; valid = tot >= 22 && tot <= 26; btn.innerText = valid ? `Select (${tot}/26)` : (tot < 22 ? `Need ${22 - tot} more` : "Max reached"); }
    else if (targetModal === 'boss') { let m = (targetStageIndex === 10 || targetStageIndex === 11) ? 4 : 1; valid = t > 0 && t <= m; btn.innerText = valid ? "Save" : "Select Boss"; }
    btn.disabled = !valid;
}

window.resetPilihanModal = function() { tempSelection = []; document.querySelectorAll('.gallery-item-wrapper').forEach(el => el.classList.remove('selected')); updateModalState(); }
window.konfirmasiPilihan = function() {
    if (targetModal === 'boss') { susunanBoss[targetStageIndex] = [...tempSelection]; updateTampilanBoss(); }
    else if (targetModal === 'inti' || targetModal === 'opsional') { susunanStage[targetStageIndex][targetModal] = [...tempSelection]; updateTampilanStage(); }
    else { susunan[targetModal] = [...tempSelection]; updateTampilanRoster(); sinkronisasiKarakterStage(); }
    tutupGaleri();
}
window.tutupGaleri = function() { modalElem.classList.remove('active'); setTimeout(() => modalElem.classList.add('hidden'), 300); }
window.resetSemuaData = function() { Swal.fire({ title: 'Reset All Data?', icon: 'error', showCancelButton: true, confirmButtonColor: '#EF4444', background: '#11151F', color: '#fff' }).then((r) => { if (r.isConfirmed) { localStorage.clear(); location.reload(); } }); }

const stages = [{ nama: "Act 1", type: "normal" }, { nama: "Act 2", type: "normal" }, { nama: "Act 3", type: "boss" }, { nama: "Act 4", type: "monolith" }, { nama: "Act 5", type: "normal" }, { nama: "Act 6", type: "boss" }, { nama: "Act 7", type: "normal" }, { nama: "Act 8", type: "boss" }, { nama: "Act 9", type: "normal" }, { nama: "Act 10", type: "boss" }, { nama: "Lunar 1", type: "boss" }, { nama: "Lunar 2", type: "boss" }];
function initStages() {
    const container = document.getElementById('stages-container'); const fragment = document.createDocumentFragment();
    stages.forEach((stage, index) => {
        let div = document.createElement('div'); div.className = 'stage-item';
        let specialHTML = stage.type === "monolith" ? `<div class="stage-sec"><h4 class="stage-sub-title blue-text">Target Defense</h4><div id="monolith-slot-${index}" class="slot-list"></div></div>` : stage.type === "boss" ? `<div class="stage-sec"><h4 class="stage-sub-title red-text">Boss Target</h4><div id="boss-slot-${index}" class="slot-list"></div></div>` : `<div class="stage-sec stage-sec-spacer"><h4 class="stage-sub-title">&nbsp;</h4><div class="slot-list"><div class="empty-slot-placeholder"></div></div></div>`;
        div.innerHTML = `<div class="stage-card-header"><span class="stage-title">${stage.nama}</span><span class="stage-badge-type ${stage.type}">${stage.type.toUpperCase()}</span></div><div class="stage-card-body">${specialHTML}<div class="team-group"><h4 class="stage-sub-title">Main Party</h4><div id="stage-${index}-inti" class="slot-list"></div></div><div class="team-group"><h4 class="stage-sub-title">Optional Party</h4><div id="stage-${index}-opsional" class="slot-list"></div></div></div>`;
        fragment.appendChild(div);
    });
    container.innerHTML = ""; container.appendChild(fragment);
    updateTampilanBoss(); updateTampilanMonolith(); updateTampilanStage(); updateTampilanRoster(); 
}

function updateTampilanMonolith() { let c = document.getElementById('monolith-slot-3'); if (c) c.innerHTML = `<div style="position:relative"><img src="assets/ui/Defense-Monolith.png" class="char-img" onerror="this.src='assets/boss/Defense-Monolith.png'"></div>`; }

function renderSlotStage(stageIndex, kategori) {
    let container = document.getElementById(`stage-${stageIndex}-${kategori}`); if (!container) return;
    susunanStage[stageIndex][kategori] = susunanStage[stageIndex][kategori].filter(Boolean); let arr = susunanStage[stageIndex][kategori];
    const fragment = document.createDocumentFragment();
    arr.forEach((path) => {
        let w = document.createElement('div'); w.style.position = 'relative'; w.style.width = '100%'; w.style.aspectRatio = '1 / 1';
        let img = document.createElement('img'); img.src = path; img.className = 'char-img'; img.tabIndex = 0; img.onerror = function() { this.src = 'assets/placeholder-silhouette.png'; };
        if (hitungTotalPemakaian(path) > 0) { let badge = document.createElement('span'); badge.className = 'badge-indicator'; badge.innerText = hitungTotalPemakaian(path); w.appendChild(badge); }
        let fn = () => { editingContext = { type: kategori, stageIndex, oldPath: path }; bukaGaleri(kategori, stageIndex); }; img.onclick = fn; img.onkeydown = (e) => { if(e.key === 'Enter') fn(); };
        w.appendChild(img); fragment.appendChild(w);
    });
    for (let i = 0; i < 4 - arr.length; i++) {
        let empty = document.createElement('div'); empty.className = 'empty-slot'; empty.innerHTML = '+'; empty.tabIndex = 0;
        let fn = () => { editingContext = { type: kategori, stageIndex, oldPath: null }; bukaGaleri(kategori, stageIndex); }; empty.onclick = fn; empty.onkeydown = (e) => { if(e.key === 'Enter') fn(); };
        fragment.appendChild(empty);
    }
    container.innerHTML = ""; container.appendChild(fragment);
}

function updateTampilanStage() { for (let i = 0; i < 12; i++) { renderSlotStage(i, 'inti'); renderSlotStage(i, 'opsional'); } simpanDataOtomatis(); }

function updateTampilanBoss() {
    stages.forEach((stage, index) => {
        if (stage.type === 'boss') {
            let container = document.getElementById(`boss-slot-${index}`); if (!container) return;
            let bossList = susunanBoss[index] || []; const fragment = document.createDocumentFragment();
            bossList.forEach((path) => {
                let w = document.createElement('div'); w.style.position = 'relative'; w.style.width = '100%'; w.style.aspectRatio = '1 / 1';
                let img = document.createElement('img'); img.src = path; img.className = 'char-img'; img.tabIndex = 0;
                if (cariActBoss(path)) { let badge = document.createElement('span'); badge.className = 'badge-boss'; badge.innerText = stages[index].nama.replace("Act ", "A").replace("Lunar ", "L"); w.appendChild(badge); }
                let fn = () => bukaGaleri('boss', index); img.onclick = fn; img.onkeydown = (e) => { if(e.key === 'Enter') fn(); };
                w.appendChild(img); fragment.appendChild(w);
            });
            for (let i = 0; i < ((index === 10 || index === 11) ? 4 : 1) - bossList.length; i++) {
                let empty = document.createElement('div'); empty.className = 'empty-slot'; empty.innerHTML = '+'; empty.tabIndex = 0; empty.style.borderColor = 'rgba(239, 68, 68, 0.5)'; empty.style.color = '#ef4444'; empty.style.background = 'rgba(239, 68, 68, 0.05)';
                let fn = () => bukaGaleri('boss', index); empty.onclick = fn; empty.onkeydown = (e) => { if(e.key === 'Enter') fn(); };
                fragment.appendChild(empty);
            }
            container.innerHTML = ""; container.appendChild(fragment);
        }
    });
    simpanDataOtomatis();
}

window.addEventListener('scroll', function() { let btn = document.getElementById('btn-scroll-top'); if (btn) { if (window.scrollY > 300) btn.classList.add('show'); else btn.classList.remove('show'); } });
window.scrollToTop = function() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

async function initApp() {
    try {
        const res = await fetch('database.json'); if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json(); karakterDB = data.karakterDB; bossDB = data.bossDB; initStages();
    } catch (error) { console.error("Gagal:", error); tampilkanPeringatan("Fail JSON gagal dimuat. Sila buka melalui Live Server."); }
}
initApp();