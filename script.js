// Firestore ve Storage referansları index.html'de tanımlandı: db, storage
const form = document.getElementById('isEkleFormu');
const listesi = document.getElementById('isPlaniListesi');
const isIdInput = document.getElementById('isId');
const formButton = document.getElementById('formButton');
const resimInput = document.getElementById('resimler');
const resimOnizleme = document.getElementById('resimOnizleme');

// Seçilen yeni dosyaları ve mevcut URL'leri tutan diziler
let yeniDosyalar = [];       // File nesneleri (henüz yüklenmemiş)
let mevcutResimURLleri = [];  // Firebase Storage'daki mevcut URL'ler (düzenleme modunda)

// Resim seçildiğinde önizleme göster (max 3)
resimInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    const toplamSayisi = yeniDosyalar.length + mevcutResimURLleri.length + files.length;

    if (toplamSayisi > 3) {
        alert('En fazla 3 resim ekleyebilirsiniz!');
        resimInput.value = '';
        return;
    }

    files.forEach(file => {
        if (yeniDosyalar.length + mevcutResimURLleri.length >= 3) return;
        yeniDosyalar.push(file);
    });

    resimInput.value = '';
    renderOnizleme();
});

// Önizleme alanını güncelle
const renderOnizleme = () => {
    resimOnizleme.innerHTML = '';

    // Mevcut (zaten yüklenmiş) resimler
    mevcutResimURLleri.forEach((url, index) => {
        const item = document.createElement('div');
        item.className = 'onizleme-item';
        item.innerHTML = `
            <img src="${url}" alt="Resim ${index + 1}">
            <button type="button" class="sil-btn" onclick="mevcutResimSil(${index})">X</button>
        `;
        resimOnizleme.appendChild(item);
    });

    // Yeni seçilmiş dosyalar
    yeniDosyalar.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'onizleme-item';
        const img = document.createElement('img');
        img.alt = 'Yeni Resim ' + (index + 1);
        const reader = new FileReader();
        reader.onload = (ev) => { img.src = ev.target.result; };
        reader.readAsDataURL(file);
        item.appendChild(img);

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'sil-btn';
        btn.textContent = 'X';
        btn.onclick = () => yeniDosyaSil(index);
        item.appendChild(btn);

        resimOnizleme.appendChild(item);
    });
};

// Yeni dosya sil (henüz yüklenmemiş)
const yeniDosyaSil = (index) => {
    yeniDosyalar.splice(index, 1);
    renderOnizleme();
};

// Mevcut resmi sil (Firebase Storage'dan da silinecek)
const mevcutResimSil = (index) => {
    const url = mevcutResimURLleri[index];
    // Storage'dan sil
    const ref = storage.refFromURL(url);
    ref.delete().then(() => {
        console.log('Resim Storage\'dan silindi.');
    }).catch(err => {
        console.error('Storage silme hatası:', err);
    });
    mevcutResimURLleri.splice(index, 1);
    renderOnizleme();
};

// Dosyaları Firebase Storage'a yükle, URL dizisi döndür
const resimleriYukle = async (dosyalar, docId) => {
    const urls = [];
    for (let i = 0; i < dosyalar.length; i++) {
        const file = dosyalar[i];
        const ref = storage.ref('isplanlari/' + docId + '/' + Date.now() + '_' + file.name);
        const snapshot = await ref.put(file);
        const url = await snapshot.ref.getDownloadURL();
        urls.push(url);
    }
    return urls;
};

// Bir iş planının tüm resimlerini Storage'dan sil
const tumResimleriSil = async (resimURLleri) => {
    if (!resimURLleri || resimURLleri.length === 0) return;
    for (const url of resimURLleri) {
        try {
            const ref = storage.refFromURL(url);
            await ref.delete();
        } catch (err) {
            console.error('Resim silme hatası:', err);
        }
    }
};

// Firestore'daki değişiklikleri dinle (READ - OKUMA)
db.collection('isplanlari').onSnapshot((snapshot) => {
    let isplanlari = [];
    snapshot.forEach((doc) => {
        isplanlari.push({ ...doc.data(), id: doc.id });
    });
    renderIsPlanlari(isplanlari);
});

// İş Planlarını HTML'e döken fonksiyon
const renderIsPlanlari = (planlar) => {
    listesi.innerHTML = '';

    if (planlar.length === 0) {
        listesi.innerHTML = '<p>Henüz kayıtlı bir iş planı bulunmamaktadır.</p>';
        return;
    }

    planlar.forEach(plan => {
        const div = document.createElement('div');
        div.className = 'is-plani-kart';

        const kimyasallarText = Array.isArray(plan.gerekliKimyasallar) ? plan.gerekliKimyasallar.filter(s => s).join(', ') : (plan.gerekliKimyasallar || '');
        const toollarText = Array.isArray(plan.gerekliToollar) ? plan.gerekliToollar.filter(s => s).join(', ') : (plan.gerekliToollar || '');

        let resimlerHTML = '';
        if (plan.resimler && plan.resimler.length > 0) {
            resimlerHTML = '<div class="kart-resimler">';
            plan.resimler.forEach(src => {
                resimlerHTML += `<img src="${src}" alt="Resim" onclick="window.open(this.src)">`;
            });
            resimlerHTML += '</div>';
        }

        div.innerHTML = `
            <h3>${plan.isTanimi} (${plan.ucakModeli})</h3>
            ${kimyasallarText ? `<p><strong>Kimyasallar:</strong> ${kimyasallarText}</p>` : ''}
            ${toollarText ? `<p><strong>Toollar:</strong> ${toollarText}</p>` : ''}
            ${plan.ozelNotlar ? `<p><strong>Notlar:</strong> ${plan.ozelNotlar}</p>` : ''}
            ${resimlerHTML}
            <button onclick="duzenleIsPlan(this)" data-id="${plan.id}">Düzenle</button>
            <button onclick="silIsPlan('${plan.id}')">Sil</button>
        `;
        listesi.appendChild(div);
    });
};

// Form gönderimi (CREATE - EKLEME / UPDATE - GÜNCELLEME)
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formButton.disabled = true;
    formButton.textContent = 'Kaydediliyor...';

    const isData = {
        isTanimi: form.isTanimi.value,
        ucakModeli: form.ucakModeli.value,
        gerekliKimyasallar: form.gerekliKimyasallar.value ? form.gerekliKimyasallar.value.split(',').map(s => s.trim()).filter(s => s) : [],
        gerekliToollar: form.gerekliToollar.value ? form.gerekliToollar.value.split(',').map(s => s.trim()).filter(s => s) : [],
        ozelNotlar: form.ozelNotlar.value
    };

    const isId = isIdInput.value;

    try {
        if (isId) {
            // GÜNCELLEME
            let yeniURLler = [];
            if (yeniDosyalar.length > 0) {
                yeniURLler = await resimleriYukle(yeniDosyalar, isId);
            }
            isData.resimler = [...mevcutResimURLleri, ...yeniURLler];

            await db.collection('isplanlari').doc(isId).update(isData);
            alert('İş planı başarıyla güncellendi!');
        } else {
            // EKLEME
            const docRef = await db.collection('isplanlari').add(isData);
            if (yeniDosyalar.length > 0) {
                const urls = await resimleriYukle(yeniDosyalar, docRef.id);
                await docRef.update({ resimler: urls });
            } else {
                await docRef.update({ resimler: [] });
            }
            alert('İş planı başarıyla eklendi!');
        }

        form.reset();
        isIdInput.value = '';
        formButton.textContent = 'İş Planı Ekle';
        yeniDosyalar = [];
        mevcutResimURLleri = [];
        renderOnizleme();
    } catch (error) {
        console.error('Kaydetme hatası:', error);
        alert('Hata oluştu: ' + error.message);
    } finally {
        formButton.disabled = false;
        if (!isIdInput.value) {
            formButton.textContent = 'İş Planı Ekle';
        }
    }
});

// İş Planını silme (resimler dahil Firebase Storage'dan silinir)
const silIsPlan = async (id) => {
    if (!confirm('Bu iş planını silmek istediğinizden emin misiniz?')) return;

    try {
        // Önce dökümanı al, resim URL'lerini bul
        const doc = await db.collection('isplanlari').doc(id).get();
        if (doc.exists) {
            const plan = doc.data();
            await tumResimleriSil(plan.resimler);
        }
        await db.collection('isplanlari').doc(id).delete();
        alert('İş planı başarıyla silindi.');
    } catch (error) {
        console.error('Silme hatası:', error);
    }
};

// İş Planını düzenleme moduna getiren fonksiyon
const duzenleIsPlan = (element) => {
    const id = element.getAttribute('data-id');

    db.collection('isplanlari').doc(id).get()
        .then(doc => {
            if (doc.exists) {
                const plan = doc.data();
                isIdInput.value = id;
                form.isTanimi.value = plan.isTanimi;
                form.ucakModeli.value = plan.ucakModeli;
                form.gerekliKimyasallar.value = Array.isArray(plan.gerekliKimyasallar) ? plan.gerekliKimyasallar.join(', ') : (plan.gerekliKimyasallar || '');
                form.gerekliToollar.value = Array.isArray(plan.gerekliToollar) ? plan.gerekliToollar.join(', ') : (plan.gerekliToollar || '');
                form.ozelNotlar.value = plan.ozelNotlar || '';

                // Mevcut resimleri yükle
                mevcutResimURLleri = plan.resimler ? [...plan.resimler] : [];
                yeniDosyalar = [];
                renderOnizleme();

                formButton.textContent = 'İş Planını Güncelle';
                window.scrollTo(0, 0);
            } else {
                console.log("Belge bulunamadı!");
            }
        })
        .catch(error => console.error('Belge getirme hatası: ', error));
};
