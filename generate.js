const fs = require('fs');
const path = require('path');

function processCharacters(dir) {
    const results = [];
    const elements = fs.readdirSync(dir);

    elements.forEach(elemen => {
        const elemenPath = path.join(dir, elemen);
        if (fs.statSync(elemenPath).isDirectory()) {
            const tiers = fs.readdirSync(elemenPath);
            tiers.forEach(tier => {
                const tierPath = path.join(elemenPath, tier);
                if (fs.statSync(tierPath).isDirectory()) {
                    const bintang = tier === 'Bintang5' ? 5 : 4;
                    const files = fs.readdirSync(tierPath);
                    
                    files.forEach(file => {
                        if (/\.(png|jpg|webp)$/i.test(file)) {
                            const rawName = file.replace(/\.(png|jpg|webp)$/i, '').replace(/-/g, ' ');
                            const filePath = `assets/karakter/${elemen}/${tier}/${file}`.replace(/\\/g, '/');
                            
                            results.push({
                                id: file.replace(/\.(png|jpg|webp)$/i, '').toLowerCase(),
                                nama: rawName,
                                elemen: elemen,
                                bintang: bintang,
                                path: filePath
                            });
                        }
                    });
                }
            });
        }
    });
    return results;
}

function processBosses(dir) {
    const results = [];
    if (!fs.existsSync(dir)) return results;
    
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        if (/\.(png|jpg|webp)$/i.test(file)) {
            const rawName = file.replace(/\.(png|jpg|webp)$/i, '').replace(/-/g, ' ');
            const filePath = `assets/boss/${file}`.replace(/\\/g, '/');
            results.push({
                id: file.replace(/\.(png|jpg|webp)$/i, '').toLowerCase(),
                nama: rawName,
                path: filePath
            });
        }
    });
    return results;
}

const karakterData = processCharacters('assets/karakter');
const bossData = processBosses('assets/boss');

const dataGabungan = {
    karakterDB: karakterData,
    bossDB: bossData
};

const konten = JSON.stringify(dataGabungan, null, 4);

fs.writeFileSync('database.json', konten);

console.log("✅ Database JSON terstruktur berhasil diperbarui!");