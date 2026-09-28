// --- 1. INISIALISASI DATA & AUTO-SAVE ---
const elemenList = ['Pyro', 'Hydro', 'Anemo', 'Electro', 'Dendro', 'Cryo', 'Geo'];

let elemenTerpilih = JSON.parse(localStorage.getItem('savedElemen')) || [];
let susunan = JSON.parse(localStorage.getItem('savedRoster')) || { pembuka: [], undangan: [], cadangan: [] };
let susunanBoss = JSON.parse(localStorage.getItem('savedBoss')) || {};
let susunanStage = JSON.parse(localStorage.getItem('savedStage')) || {};

for (let key in susunanBoss) {
    if (typeof susunanBoss[key] === 'string') {
        susunanBoss[key] = [susunanBoss[key]];
    }
}

for (let i = 0; i < 12; i++) {
    if (!susunanStage[i]) susunanStage[i] = { inti: [], opsional: [] };
}

let targetModal = ""; 
let targetStageIndex = null; 
let tempSelection = [];

let currentModalDB = [];
let currentElementFilter = 'Semua';

let editingContext = {
    type: null, 
    stageIndex: null,
    oldPath: null
};

function getPath(item) {
    return typeof item === 'string' ? item : item.path;
}

function getElemen(item) {
    if (typeof item === 'object' && item.elemen) return item.elemen;
    let p = getPath(item);
    return p.split('/')[2] || '';
}

function getBintang(item) {
    if (typeof item === 'object' && item.bintang) return item.bintang;
    let p = getPath(item);
    return p.includes('/Bintang5/') ? 5 : 4;
}

function isTraveler(item) {
    let p = getPath(item);
    return p.includes('TravelerBoy') || p.includes('TravelerGirl');
}

function getNamaDariPath(item) {
    if (typeof item === 'object' && item.nama) return item.nama;
    let p = getPath(item);
    let filename = p.split('/').pop().replace(/\.(png|jpg|webp)$/i, '');
    return filename.replace(/-/g, ' ');
}

function simpanDataOtomatis() {
    localStorage.setItem('savedElemen', JSON.stringify(elemenTerpilih));
    localStorage.setItem('savedRoster', JSON.stringify(susunan));
    localStorage.setItem('savedBoss', JSON.stringify(susunanBoss));
    localStorage.setItem('savedStage', JSON.stringify(susunanStage));
}

function tampilkanPeringatan(pesan) {
    Swal.fire({ title: 'Perhatian!', text: pesan, icon: 'warning', background: '#11151F', color: '#fff', confirmButtonColor: '#7C3AED' });
}

function hitungTotalPemakaian(path) {
    let count = 0;
    for (let i = 0; i < 12; i++) {
        if (susunanStage[i].inti.includes(path)) count++;
        if (susunanStage[i].opsional.includes(path)) count++;
    }
    return count;
}

function cariActBoss(bossPath) {
    let acts = [];
    for (let i = 0; i < 12; i++) {
        if (susunanBoss[i] && susunanBoss[i].includes(bossPath)) {
            acts.push(stages[i].nama);
        }
    }
    return acts.join(', ');
}

// --- 2. LOGIKA ELEMEN ---
const elementContainer = document.getElementById('element-container');
elemenList.forEach(elemen => {
    let btn = document.createElement('button');
    btn.className = 'btn-element';
    btn.setAttribute('data-elemen', elemen);
    btn.title = elemen;
    
    let img = document.createElement('img');
    img.src = `assets/element/${elemen}.png`;
    img.onerror = function() { this.style.display = 'none'; };
    btn.appendChild(img);

    if (elemenTerpilih.includes(elemen)) btn.classList.add('active');
    
    btn.onclick = () => {
        if (elemenTerpilih.includes(elemen)) {
            Swal.fire({
                title: 'Hapus Elemen?',
                text: `Menghapus elemen ${elemen} akan ikut menghapus karakter dari elemen ini yang sudah terpilih di Roster atau Stage!`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#EF4444',
                cancelButtonColor: '#334155',
                confirmButtonText: 'Ya, Hapus',
                cancelButtonText: 'Batal',
                background: '#11151F',
                color: '#fff'
            }).then((result) => {
                if (result.isConfirmed) {
                    elemenTerpilih = elemenTerpilih.filter(e => e !== elemen);
                    btn.classList.remove('active');
                    
                    let filterHapusElemen = (path) => {
                        return getElemen(path) !== elemen;
                    };

                    susunan.pembuka = susunan.pembuka.filter(filterHapusElemen);
                    susunan.cadangan = susunan.cadangan.filter(filterHapusElemen);
                    
                    updateTampilanRoster();
                    sinkronisasiKarakterStage();
                    simpanDataOtomatis();
                }
            });
        } else {
            if (elemenTerpilih.length < 3) {
                elemenTerpilih.push(elemen);
                btn.classList.add('active');
                simpanDataOtomatis();
            } else { 
                tampilkanPeringatan("Maksimal hanya 3 Elemen!"); 
            }
        }
    };
    elementContainer.appendChild(btn);
});

// --- 3. LOGIKA RENDER ROSTER ---
function renderSlotBox(targetId, arrayPaths, kategori) {
    const container = document.getElementById(targetId);
    if (!container) return;
    container.innerHTML = "";
    
    arrayPaths = arrayPaths.filter(Boolean);
    susunan[kategori] = arrayPaths; 
    
    arrayPaths.forEach((path) => {
        let wrapper = document.createElement('div');
        wrapper.style.position = 'relative';

        let img = document.createElement('img');
        img.src = path; 
        img.className = 'char-img'; 
        img.title = getNamaDariPath(path);
        img.onerror = function() { this.src = 'assets/placeholder-silhouette.png'; };
        
        wrapper.onclick = () => {
            editingContext = { type: kategori, stageIndex: null, oldPath: path };
            bukaGaleri(kategori);
        };

        wrapper.appendChild(img);
        container.appendChild(wrapper);
    });

    let sisa = 0;
    if (kategori === 'pembuka') sisa = 6 - arrayPaths.length;
    else if (kategori === 'undangan') {
        let totalGabungan = arrayPaths.length + susunan.cadangan.length;
        sisa = (arrayPaths.length < 4 && totalGabungan < 26) ? 1 : 0;
    } 
    else if (kategori === 'cadangan') {
        let totalSekarang = susunan.undangan.length + arrayPaths.length;
        let minCad = Math.max(0, 22 - susunan.undangan.length);
        if (arrayPaths.length < minCad) sisa = minCad - arrayPaths.length;
        else if (totalSekarang >= 22 && totalSekarang < 26) sisa = 1; 
    }

    for (let i = 0; i < sisa; i++) {
        let emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty-slot'; emptyDiv.innerHTML = '+';
        emptyDiv.onclick = () => {
            editingContext = { type: kategori, stageIndex: null, oldPath: null };
            bukaGaleri(kategori);
        }; 
        container.appendChild(emptyDiv);
    }
}

function updateTampilanRoster() {
    renderSlotBox('slot-pembuka', susunan.pembuka, 'pembuka');
    document.getElementById('count-pembuka').innerText = susunan.pembuka.length;
    renderSlotBox('slot-undangan', susunan.undangan, 'undangan');
    document.getElementById('count-undangan').innerText = susunan.undangan.length;
    renderSlotBox('slot-cadangan', susunan.cadangan, 'cadangan');
    document.getElementById('count-total-cadangan').innerText = susunan.undangan.length + susunan.cadangan.length;
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

// --- 4. LOGIKA GALERI & PANEL SAMPING ---
window.handleOutsideClick = function(event) {
    let modal = document.getElementById('modal-galeri');
    if (event.target === modal) {
        tutupGaleri();
    }
}

window.bukaGaleri = function(target, stageIndex = null) {
    targetModal = target;
    targetStageIndex = stageIndex;
    
    if (!editingContext.type || editingContext.stageIndex !== stageIndex) {
        editingContext = { type: target, stageIndex: stageIndex, oldPath: null };
    }

    if (targetModal !== 'boss' && targetModal !== 'inti' && targetModal !== 'opsional') {
        if (elemenTerpilih.length < 3) {
            tampilkanPeringatan("Anda wajib memilih 3 Elemen terlebih dahulu sebelum menyusun karakter!"); return; 
        }
        if ((targetModal === 'undangan' || targetModal === 'cadangan') && susunan.pembuka.length < 6) {
            tampilkanPeringatan("Lengkapi 6 Karakter Pembuka terlebih dahulu!"); return;
        }
    }
    
    document.getElementById('search-input').value = ""; 
    let db = [];
    const filterContainer = document.getElementById('modal-filter-container');

    if (targetModal === 'boss') {
        db = bossDB;
        tempSelection = susunanBoss[stageIndex] ? [...susunanBoss[stageIndex]] : [];
        if (editingContext.oldPath) {
            tempSelection = tempSelection.filter(p => p !== editingContext.oldPath);
        }
        let teksBos = (stageIndex === 10 || stageIndex === 11) ? "(Maks 4 Boss)" : "";
        document.getElementById('modal-title').innerText = `Pilih Boss / Monster ${teksBos}`;
        
        filterContainer.classList.add('hidden');
        filterContainer.innerHTML = "";
        document.getElementById('search-input').placeholder = "Cari nama boss / monster...";
    } 
    else {
        filterContainer.classList.remove('hidden');
        document.getElementById('search-input').placeholder = "Cari nama karakter...";
        
        if (targetModal === 'inti' || targetModal === 'opsional') {
            db = [...susunan.pembuka, ...susunan.undangan, ...susunan.cadangan];
            if (db.length === 0) { tampilkanPeringatan("Roster Utama masih kosong!"); return; }
            tempSelection = [...susunanStage[stageIndex][targetModal]];
            
            if (editingContext.oldPath) {
                tempSelection = tempSelection.filter(p => p !== editingContext.oldPath);
            }

            // PERBAIKAN LOGIKA: Karakter tetap dapat dipilih kembali meskipun Main Party sudah 4/4 lengkap
            // Karakter hanya difilter jika pemakaian Vigor sudah mencapai/melebihi 2 kali di luar pilihan saat ini.
            db = db.filter(item => {
                let p = getPath(item);
                let count = hitungTotalPemakaian(p);
                let sedangDipilihSaatIni = tempSelection.includes(p);
                
                if (count >= 2 && !sedangDipilihSaatIni) return false;
                return true;
            });

            document.getElementById('modal-title').innerText = `Pilih Karakter ${targetModal.toUpperCase()} (Stage ${stages[stageIndex].nama})`;
        } else {
            if (targetModal === 'pembuka' || targetModal === 'cadangan') {
                db = karakterDB.filter(item => elemenTerpilih.includes(getElemen(item)));
            } else if (targetModal === 'undangan') {
                db = karakterDB; 
            }
            tempSelection = [...susunan[targetModal]]; 
            if (editingContext.oldPath) {
                tempSelection = tempSelection.filter(p => p !== editingContext.oldPath);
            }

            let rosterAktif = [...susunan.pembuka, ...susunan.undangan, ...susunan.cadangan];

            if (targetModal === 'pembuka' || targetModal === 'undangan') {
                db = db.filter(item => !isTraveler(item));
            }
            db = db.filter(item => {
                let p = getPath(item);
                return !rosterAktif.includes(p) || tempSelection.includes(p);
            });
            let sisaTotal = 26 - (susunan.undangan.length + susunan.cadangan.length) + tempSelection.length;
            document.getElementById('modal-title').innerText = `Pilih Karakter ${targetModal.toUpperCase()} (${sisaTotal})`;
        }
        
        // Sorting Bintang 5 di atas, Bintang 4 di bawah
        db.sort((a, b) => {
            let bA = getBintang(a);
            let bB = getBintang(b);
            if (bA !== bB) return bB - bA; 
            return getNamaDariPath(a).localeCompare(getNamaDariPath(b));
        });

        let html = `<button class="btn-filter active" onclick="applyFilter('Semua', this)">Semua</button>`;
        if (targetModal === 'inti' || targetModal === 'opsional') {
            if (susunan.undangan.length > 0) {
                html += `<button class="btn-filter" onclick="applyFilter('Undangan', this)">Undangan</button>`;
            }
            elemenTerpilih.forEach(el => {
                html += `<button class="btn-filter" onclick="applyFilter('${el}', this)">${el}</button>`;
            });
        } else {
            let elementsToShow = (targetModal === 'undangan') ? elemenList : elemenTerpilih;
            elementsToShow.forEach(el => {
                html += `<button class="btn-filter" onclick="applyFilter('${el}', this)">${el}</button>`;
            });
        }
        filterContainer.innerHTML = html;
    }

    currentModalDB = db; 
    currentElementFilter = 'Semua';
    
    document.getElementById('modal-galeri').classList.remove('hidden');

    requestAnimationFrame(() => {
        setTimeout(() => {
            jalankanPencarianDanFilter(); 
            updateModalState();
        }, 40);
    });
}

window.applyFilter = function(elemenTujuan, btnElement) {
    document.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');
    currentElementFilter = elemenTujuan;
    jalankanPencarianDanFilter();
}

window.cariKarakter = function() {
    jalankanPencarianDanFilter();
}

function jalankanPencarianDanFilter() {
    let kataKunci = document.getElementById('search-input').value.toLowerCase();
    let hasil = currentModalDB;

    if (currentElementFilter !== 'Semua') {
        if (currentElementFilter === 'Undangan') {
            hasil = hasil.filter(item => susunan.undangan.includes(getPath(item)));
        } else {
            hasil = hasil.filter(item => getElemen(item) === currentElementFilter || getPath(item).includes(`/${currentElementFilter}/`));
        }
    }

    if (kataKunci !== "") {
        hasil = hasil.filter(item => getNamaDariPath(item).toLowerCase().includes(kataKunci));
    }

    renderIsiGaleri(hasil);
}

function renderIsiGaleri(dataListPaths) {
    const gallery = document.getElementById('gallery-container');
    gallery.innerHTML = "";
    if (dataListPaths.length === 0) {
        gallery.innerHTML = "<p style='color: #94A3B8; width: 100%; text-align: center; margin-top: 20px;'>Tidak ada karakter ditemukan.</p>"; return;
    }

    dataListPaths.forEach(item => {
        let path = getPath(item);
        let wrapper = document.createElement('div');
        wrapper.className = 'gallery-item-wrapper';
        wrapper.title = getNamaDariPath(item);
        wrapper.setAttribute('data-path', path);
        
        if (tempSelection.includes(path)) wrapper.classList.add('selected');
        
        let img = document.createElement('img');
        img.src = path; 
        img.className = 'char-img';
        img.loading = 'lazy';
        img.style.backgroundColor = targetModal === 'boss' ? '#450a0a' : 'transparent';
        if (targetModal === 'boss') img.style.borderColor = '#ef4444';
        
        img.onerror = function() {
            this.src = 'assets/placeholder-silhouette.png';
        };
        
        // Indikator Vigor Karakter
        if (targetModal === 'inti' || targetModal === 'opsional') {
            let pemakaian = hitungTotalPemakaian(path);
            let adaDiContextEdit = (editingContext.oldPath === path);
            
            if (pemakaian > 0 && !adaDiContextEdit) {
                img.classList.add('char-used-vigor');
                let badge = document.createElement('span');
                badge.className = 'badge-indicator';
                badge.innerText = pemakaian;
                wrapper.appendChild(badge);
            }
        }

        // Indikator Act Boss
        if (targetModal === 'boss') {
            let actsAsal = cariActBoss(path);
            let adaDiContextEdit = (editingContext.oldPath === path);
            
            if (actsAsal && !adaDiContextEdit) {
                let badge = document.createElement('span');
                badge.className = 'badge-boss';
                badge.innerText = actsAsal.replace(/Act /g, "A").replace(/Lunar /g, "L");
                wrapper.appendChild(badge);
            }
        }

        wrapper.onclick = () => togglePilihanGaleri(path, wrapper);
        wrapper.appendChild(img); 
        gallery.appendChild(wrapper);
    });
}

function togglePilihanGaleri(path, wrapperElement) {
    const index = tempSelection.indexOf(path);
    if (targetModal === 'boss') {
        if (index > -1) { 
            tempSelection.splice(index, 1); 
            wrapperElement.classList.remove('selected'); 
        } 
        else {
            let maxBoss = (targetStageIndex === 10 || targetStageIndex === 11) ? 4 : 1; 
            if (tempSelection.length >= maxBoss) {
                if (maxBoss === 1) {
                    document.querySelectorAll('.gallery-item-wrapper').forEach(el => el.classList.remove('selected')); 
                    tempSelection = [path]; 
                    wrapperElement.classList.add('selected');
                } else {
                    tampilkanPeringatan(`Maksimal ${maxBoss} Boss untuk Act ini!`);
                }
            } else {
                tempSelection.push(path); 
                wrapperElement.classList.add('selected');
            }
        }
    } 
    else if (targetModal === 'inti' || targetModal === 'opsional') {
        if (index > -1) { 
            tempSelection.splice(index, 1); 
            wrapperElement.classList.remove('selected'); 
        } 
        else {
            if (tempSelection.length >= 4) { tampilkanPeringatan(`Maksimal 4 Karakter!`); return; }
            tempSelection.push(path); 
            wrapperElement.classList.add('selected');
        }
    }
    else {
        if (index > -1) { 
            tempSelection.splice(index, 1); 
            wrapperElement.classList.remove('selected'); 
        } 
        else {
            if (isTraveler(path)) {
                let existingIndex = tempSelection.findIndex(p => isTraveler(p));
                if (existingIndex > -1) {
                    let oldPath = tempSelection[existingIndex];
                    tempSelection.splice(existingIndex, 1);
                    let oldWrapper = document.querySelector(`.gallery-item-wrapper[data-path="${oldPath}"]`);
                    if (oldWrapper) oldWrapper.classList.remove('selected');
                }
            }

            let total = tempSelection.length + 1;
            if (targetModal === 'pembuka' && total > 6) { tampilkanPeringatan("Maksimal 6!"); return; }
            if (targetModal === 'undangan') {
                if (total > 4) { tampilkanPeringatan("Maksimal 4!"); return; }
                if (total > (26 - susunan.cadangan.length)) { tampilkanPeringatan("Kuota Penuh!"); return; }
            }
            if (targetModal === 'cadangan' && total > (26 - susunan.undangan.length)) { tampilkanPeringatan("Kuota Penuh!"); return; }
            
            tempSelection.push(path); 
            wrapperElement.classList.add('selected');
        }
    }
    updateModalState();
}

function checkSyaratMasuk() {
    let btn = document.getElementById('btn-submit-modal');
    let t = tempSelection.length;
    let valid = false;
    
    if (targetModal === 'pembuka') { valid = (t === 6); btn.innerText = valid ? "Pilih (6/6)" : `Pilih (${t}/6)`; } 
    else if (targetModal === 'undangan') { valid = (t <= 4); btn.innerText = `Pilih (${t}/4)`; } 
    else if (targetModal === 'cadangan') {
        let total = susunan.undangan.length + t;
        if (total >= 22 && total <= 26) { valid = true; btn.innerText = `Pilih (${total}/26)`; } 
        else if (total < 22) { btn.innerText = `Kurang ${22 - total} (Min 22)`; } 
        else btn.innerText = `Maks 26 tercapai`;
    }
    else if (targetModal === 'boss') { 
        let maxBoss = (targetStageIndex === 10 || targetStageIndex === 11) ? 4 : 1;
        valid = (t > 0 && t <= maxBoss); 
        btn.innerText = valid ? "Simpan Boss" : "Pilih Boss"; 
    }
    else if (targetModal === 'inti' || targetModal === 'opsional') { valid = (t <= 4); btn.innerText = `Pilih (${t}/4)`; }
    
    btn.disabled = !valid;
}

function updateModalState() { document.getElementById('modal-counter').innerText = `${tempSelection.length} dipilih`; checkSyaratMasuk(); }

window.resetPilihanModal = function() {
    tempSelection = []; 
    document.querySelectorAll('.gallery-item-wrapper').forEach(el => el.classList.remove('selected')); 
    updateModalState(); 
}

window.konfirmasiPilihan = function() {
    if (targetModal === 'boss') { 
        susunanBoss[targetStageIndex] = [...tempSelection]; 
        updateTampilanBoss(); 
    } 
    else if (targetModal === 'inti' || targetModal === 'opsional') { 
        susunanStage[targetStageIndex][targetModal] = [...tempSelection]; 
        updateTampilanStage(); 
    } 
    else { 
        susunan[targetModal] = [...tempSelection]; 
        updateTampilanRoster(); 
        sinkronisasiKarakterStage(); 
    }
    
    editingContext = { type: null, stageIndex: null, oldPath: null };
    tutupGaleri();
}

window.tutupGaleri = function() { 
    editingContext = { type: null, stageIndex: null, oldPath: null };
    document.getElementById('modal-galeri').classList.add('hidden'); 
}

window.resetSemuaData = function() {
    Swal.fire({
        title: 'Reset Semua?', text: "Seluruh karakter, elemen, dan boss akan dihapus!", icon: 'error', showCancelButton: true, confirmButtonColor: '#EF4444', cancelButtonColor: '#334155', confirmButtonText: 'Ya, Hapus!', background: '#11151F', color: '#fff'
    }).then((result) => { if (result.isConfirmed) { localStorage.clear(); location.reload(); } });
}

// --- 5. LOGIKA STAGE (MATRIKS GRID 12 STAGE SEJAJAR) ---
const stages = [
    { nama: "Act 1", type: "normal" }, { nama: "Act 2", type: "normal" },
    { nama: "Act 3", type: "boss" }, { nama: "Act 4", type: "monolith" },
    { nama: "Act 5", type: "normal" }, { nama: "Act 6", type: "boss" },
    { nama: "Act 7", type: "normal" }, { nama: "Act 8", type: "boss" }, 
    { nama: "Act 9", type: "normal" }, { nama: "Act 10", type: "boss" },
    { nama: "Lunar 1", type: "boss" }, { nama: "Lunar 2", type: "boss" }
];

const stagesContainer = document.getElementById('stages-container');

function initStages() {
    stagesContainer.innerHTML = "";
    stages.forEach((stage, index) => {
        let stageDiv = document.createElement('div');
        stageDiv.className = 'stage-item';

        let specialHTML = "";
        if (stage.type === "monolith") {
            specialHTML = `
                <div class="stage-sec">
                    <h4 class="stage-sub-title blue-text">Target Defense</h4>
                    <div id="monolith-slot-${index}" class="slot-list"></div>
                </div>`;
        } else if (stage.type === "boss") {
            let labelTitle = (index === 10 || index === 11) ? "Boss Target (Maks 4)" : "Boss Target";
            specialHTML = `
                <div class="stage-sec">
                    <h4 class="stage-sub-title red-text">${labelTitle}</h4>
                    <div id="boss-slot-${index}" class="slot-list"></div>
                </div>`;
        } else {
            specialHTML = `
                <div class="stage-sec stage-sec-spacer">
                    <h4 class="stage-sub-title">&nbsp;</h4>
                    <div class="slot-list">
                        <div class="empty-slot-placeholder"></div>
                    </div>
                </div>`;
        }

        stageDiv.innerHTML = `
            <div class="stage-card-header">
                <span class="stage-title">${stage.nama}</span>
                <span class="stage-badge-type ${stage.type}">${stage.type.toUpperCase()}</span>
            </div>
            <div class="stage-card-body">
                ${specialHTML}
                <div class="team-group">
                    <h4 class="stage-sub-title">Main Party</h4>
                    <div id="stage-${index}-inti" class="slot-list"></div>
                </div>
                <div class="team-group">
                    <h4 class="stage-sub-title">Optional Party</h4>
                    <div id="stage-${index}-opsional" class="slot-list"></div>
                </div>
            </div>
        `;
        stagesContainer.appendChild(stageDiv);
    });

    updateTampilanBoss(); 
    updateTampilanMonolith(); 
    updateTampilanStage();
    updateTampilanRoster(); 
}

function updateTampilanMonolith() {
    let container = document.getElementById('monolith-slot-3'); 
    if (!container) return;
    container.innerHTML = "";

    let wrapper = document.createElement('div');
    wrapper.style.position = 'relative';

    let img = document.createElement('img');
    img.src = "assets/ui/Defense-Monolith.png"; 
    img.className = 'char-img'; 
    img.title = "Defense Monolith";
    img.style.borderColor = '#38BDF8'; 
    img.onerror = function() { this.src = 'assets/placeholder-silhouette.png'; };
    
    wrapper.appendChild(img);
    container.appendChild(wrapper);
}

function updateTampilanStage() {
    for (let i = 0; i < 12; i++) {
        renderSlotStage(i, 'inti');
        renderSlotStage(i, 'opsional');
    }
    simpanDataOtomatis();
}

function renderSlotStage(stageIndex, kategori) {
    let container = document.getElementById(`stage-${stageIndex}-${kategori}`);
    if (!container) return;
    container.innerHTML = "";
    
    susunanStage[stageIndex][kategori] = susunanStage[stageIndex][kategori].filter(Boolean);
    let arrayPaths = susunanStage[stageIndex][kategori];
    
    arrayPaths.forEach((path) => {
        let wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.style.width = '100%';
        wrapper.style.aspectRatio = '1 / 1';
        wrapper.style.display = 'block';

        let img = document.createElement('img');
        img.src = path; 
        img.className = 'char-img'; 
        img.title = getNamaDariPath(path);
        img.style.width = '100%';
        img.style.height = '100%';
        img.onerror = function() { this.src = 'assets/placeholder-silhouette.png'; };
        
        let pemakaian = hitungTotalPemakaian(path);
        if (pemakaian > 0) {
            let badge = document.createElement('span');
            badge.className = 'badge-indicator';
            badge.innerText = pemakaian;
            wrapper.appendChild(badge);
        }

        wrapper.onclick = () => {
            editingContext = { type: kategori, stageIndex: stageIndex, oldPath: path };
            bukaGaleri(kategori, stageIndex);
        }; 

        wrapper.appendChild(img);
        container.appendChild(wrapper);
    });

    let sisa = 4 - arrayPaths.length;
    for (let i = 0; i < sisa; i++) {
        let emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty-slot'; emptyDiv.innerHTML = '+';
        emptyDiv.onclick = () => {
            editingContext = { type: kategori, stageIndex: stageIndex, oldPath: null };
            bukaGaleri(kategori, stageIndex);
        }; 
        container.appendChild(emptyDiv);
    }
}

function updateTampilanBoss() {
    stages.forEach((stage, index) => {
        if (stage.type === 'boss') {
            let container = document.getElementById(`boss-slot-${index}`);
            if (!container) return;
            container.innerHTML = "";
            
            let bossList = susunanBoss[index] || [];
            
            bossList.forEach((path) => {
                let wrapper = document.createElement('div');
                wrapper.style.position = 'relative';
                wrapper.style.width = '100%';
                wrapper.style.aspectRatio = '1 / 1';
                wrapper.style.display = 'block';

                let img = document.createElement('img');
                img.src = path; 
                img.className = 'char-img'; 
                img.title = getNamaDariPath(path); 
                img.style.borderColor = '#ef4444'; 
                img.style.width = '100%';
                img.style.height = '100%';
                img.onerror = function() { this.src = 'assets/placeholder-silhouette.png'; };
                
                let actsAsal = cariActBoss(path);
                if (actsAsal) {
                    let badge = document.createElement('span');
                    badge.className = 'badge-boss';
                    badge.innerText = stages[index].nama.replace("Act ", "A").replace("Lunar ", "L");
                    wrapper.appendChild(badge);
                }

                wrapper.onclick = () => {
                    bukaGaleri('boss', index);
                };

                wrapper.appendChild(img);
                container.appendChild(wrapper);
            });

            let maxBoss = (index === 10 || index === 11) ? 4 : 1;
            let sisa = maxBoss - bossList.length;

            for (let i = 0; i < sisa; i++) {
                let emptyDiv = document.createElement('div');
                emptyDiv.className = 'empty-slot'; emptyDiv.innerHTML = '+'; emptyDiv.style.borderColor = 'rgba(239, 68, 68, 0.5)'; emptyDiv.style.color = '#ef4444'; emptyDiv.style.background = 'rgba(239, 68, 68, 0.05)';
                emptyDiv.onclick = () => bukaGaleri('boss', index);
                container.appendChild(emptyDiv);
            }
        }
    });
    simpanDataOtomatis();
}

initStages();

// --- 6. LOGIKA TOMBOL SCROLL TO TOP ---
window.addEventListener('scroll', function() {
    let scrollTopBtn = document.getElementById('btn-scroll-top');
    if (!scrollTopBtn) return;
    
    if (window.scrollY > 300) {
        scrollTopBtn.classList.add('show');
    } else {
        scrollTopBtn.classList.remove('show');
    }
});

window.scrollToTop = function() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// --- FITUR EKSPOR GAMBAR STRATEGI ---
window.eksporGambarStrategi = function() {
    if (typeof html2canvas === 'undefined') {
        tampilkanPeringatan("Pustaka html2canvas belum dimuat!");
        return;
    }

    Swal.fire({
        title: 'Menerbitkan Gambar...',
        text: 'Mohon tunggu sebentar, gambar strategi Anda sedang dibuat.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    const targetElement = document.querySelector('.main-container');

    html2canvas(targetElement, {
        backgroundColor: '#080511',
        scale: 2,
        useCORS: true
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Imaginarium-Theater-Strategy-${new Date().toISOString().slice(0,10)}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        Swal.fire({
            title: 'Berhasil!',
            text: 'Gambar strategi berhasil diunduh.',
            icon: 'success',
            background: '#11151F', color: '#fff', confirmButtonColor: '#7C3AED'
        });
    }).catch(err => {
        console.error(err);
        Swal.fire({
            title: 'Gagal!',
            text: 'Gagal membuat gambar strategi.',
            icon: 'error',
            background: '#11151F', color: '#fff'
        });
    });
};