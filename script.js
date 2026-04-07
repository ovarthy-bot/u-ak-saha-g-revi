// Firestore referansları index.html'de tanımlandı: db
const form = document.getElementById('isEkleFormu');
const listesi = document.getElementById('isPlaniListesi');
const isIdInput = document.getElementById('isId');
const formButton = document.getElementById('formButton');

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
    listesi.innerHTML = ''; // Listeyi temizle

    if (planlar.length === 0) {
        listesi.innerHTML = '<p>Henüz kayıtlı bir iş planı bulunmamaktadır.</p>';
        return;
    }

    planlar.forEach(plan => {
        const div = document.createElement('div');
        div.className = 'is-plani-kart';
        div.innerHTML = `
            <h3>${plan.isTanimi} (${plan.ucakModeli})</h3>
            <p><strong>Kimyasallar:</strong> ${Array.isArray(plan.gerekliKimyasallar) ? plan.gerekliKimyasallar.join(', ') : plan.gerekliKimyasallar}</p>
            <p><strong>Toollar:</strong> ${Array.isArray(plan.gerekliToollar) ? plan.gerekliToollar.join(', ') : plan.gerekliToollar}</p>
            <p><strong>Notlar:</strong> ${plan.ozelNotlar}</p>
            <button onclick="duzenleIsPlan(this)" data-id="${plan.id}">Düzenle</button>
            <button onclick="silIsPlan('${plan.id}')">Sil</button>
        `;
        listesi.appendChild(div);
    });
};

// Form gönderimi (CREATE - EKLEME / UPDATE - GÜNCELLEME)
form.addEventListener('submit', (e) => {
    e.preventDefault();

    const isData = {
        isTanimi: form.isTanimi.value,
        ucakModeli: form.ucakModeli.value,
        // Virgülle ayrılmış stringleri diziye çevir
        gerekliKimyasallar: form.gerekliKimyasallar.value.split(',').map(s => s.trim()),
        gerekliToollar: form.gerekliToollar.value.split(',').map(s => s.trim()),
        ozelNotlar: form.ozelNotlar.value
    };

    const isId = isIdInput.value;

    if (isId) {
        // GÜNCELLEME işlemi
        db.collection('isplanlari').doc(isId).update(isData)
            .then(() => {
                alert('İş planı başarıyla güncellendi!');
                form.reset();
                isIdInput.value = ''; // ID'yi sıfırla
                formButton.textContent = 'İş Planı Ekle'; // Buton metnini sıfırla
            })
            .catch(error => console.error('Güncelleme hatası: ', error));
    } else {
        // EKLEME işlemi
        db.collection('isplanlari').add(isData)
            .then(() => {
                alert('İş planı başarıyla eklendi!');
                form.reset();
            })
            .catch(error => console.error('Ekleme hatası: ', error));
    }
});

// İş Planını silme fonksiyonu (DELETE - SİLME)
const silIsPlan = (id) => {
    if (confirm('Bu iş planını silmek istediğinizden emin misiniz?')) {
        db.collection('isplanlari').doc(id).delete()
            .then(() => {
                alert('İş planı başarıyla silindi.');
            })
            .catch(error => console.error('Silme hatası: ', error));
    }
};

// İş Planını düzenleme moduna getiren fonksiyon
const duzenleIsPlan = (element) => {
    const id = element.getAttribute('data-id');

    db.collection('isplanlari').doc(id).get()
        .then(doc => {
            if (doc.exists) {
                const plan = doc.data();
                // Form alanlarını doldur
                isIdInput.value = id;
                form.isTanimi.value = plan.isTanimi;
                form.ucakModeli.value = plan.ucakModeli;
                
                // Dizi olan alanları tekrar virgülle ayrılmış stringe çevir
                form.gerekliKimyasallar.value = Array.isArray(plan.gerekliKimyasallar) ? plan.gerekliKimyasallar.join(', ') : plan.gerekliKimyasallar;
                form.gerekliToollar.value = Array.isArray(plan.gerekliToollar) ? plan.gerekliToollar.join(', ') : plan.gerekliToollar;
                
                form.ozelNotlar.value = plan.ozelNotlar;
                formButton.textContent = 'İş Planını Güncelle'; // Buton metnini değiştir
                
                // Kullanıcıyı formun başına kaydır
                window.scrollTo(0, 0); 

            } else {
                console.log("Belge bulunamadı!");
            }
        })
        .catch(error => console.error('Belge getirme hatası: ', error));
};
