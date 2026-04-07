// Firestore ve Storage referanslari index.html'de tanimlandi: db, storage
const form = document.getElementById('isEkleFormu');
const listesi = document.getElementById('isPlaniListesi');
const isIdInput = document.getElementById('isId');
const formButton = document.getElementById('formButton');
const resimInput = document.getElementById('resimler');
const resimOnizleme = document.getElementById('resimOnizleme');

// Yeni secilen dosyalar ve mevcut URL'ler
let yeniDosyalar = [];
let mevcutResimURLleri = [];

// ========== RESIM ONIZLEME ==========

resimInput.addEventListener('change', function (e) {
    var files = Array.from(e.target.files);
    var toplam = yeniDosyalar.length + mevcutResimURLleri.length + files.length;

    if (toplam > 3) {
        alert('En fazla 3 resim ekleyebilirsiniz!');
        resimInput.value = '';
        return;
    }

    for (var i = 0; i < files.length; i++) {
        if (yeniDosyalar.length + mevcutResimURLleri.length >= 3) break;
        yeniDosyalar.push(files[i]);
    }

    resimInput.value = '';
    renderOnizleme();
});

function renderOnizleme() {
    resimOnizleme.innerHTML = '';

    // Mevcut (Firebase Storage'daki) resimler
    for (var i = 0; i < mevcutResimURLleri.length; i++) {
        (function (index) {
            var item = document.createElement('div');
            item.className = 'onizleme-item';

            var img = document.createElement('img');
            img.src = mevcutResimURLleri[index];
            img.alt = 'Resim ' + (index + 1);
            item.appendChild(img);

            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'sil-btn';
            btn.textContent = 'X';
            btn.addEventListener('click', function () {
                mevcutResimSil(index);
            });
            item.appendChild(btn);

            resimOnizleme.appendChild(item);
        })(i);
    }

    // Yeni secilmis dosyalar
    for (var j = 0; j < yeniDosyalar.length; j++) {
        (function (index) {
            var item = document.createElement('div');
            item.className = 'onizleme-item';

            var img = document.createElement('img');
            img.alt = 'Yeni Resim ' + (index + 1);
            var reader = new FileReader();
            reader.onload = function (ev) {
                img.src = ev.target.result;
            };
            reader.readAsDataURL(yeniDosyalar[index]);
            item.appendChild(img);

            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'sil-btn';
            btn.textContent = 'X';
            btn.addEventListener('click', function () {
                yeniDosyaSil(index);
            });
            item.appendChild(btn);

            resimOnizleme.appendChild(item);
        })(j);
    }
}

function yeniDosyaSil(index) {
    yeniDosyalar.splice(index, 1);
    renderOnizleme();
}

function mevcutResimSil(index) {
    var url = mevcutResimURLleri[index];
    try {
        var ref = storage.refFromURL(url);
        ref.delete().then(function () {
            console.log('Resim Storage\'dan silindi.');
        }).catch(function (err) {
            console.error('Storage silme hatasi:', err);
        });
    } catch (err) {
        console.error('refFromURL hatasi:', err);
    }
    mevcutResimURLleri.splice(index, 1);
    renderOnizleme();
}

// ========== FIREBASE STORAGE YUKLEME ==========

function resimleriYukle(dosyalar, docId) {
    var promises = [];
    for (var i = 0; i < dosyalar.length; i++) {
        (function (file) {
            var ref = storage.ref('isplanlari/' + docId + '/' + Date.now() + '_' + file.name);
            var promise = ref.put(file).then(function (snapshot) {
                return snapshot.ref.getDownloadURL();
            });
            promises.push(promise);
        })(dosyalar[i]);
    }
    return Promise.all(promises);
}

function tumResimleriSil(resimURLleri) {
    if (!resimURLleri || resimURLleri.length === 0) return Promise.resolve();
    var promises = [];
    for (var i = 0; i < resimURLleri.length; i++) {
        (function (url) {
            try {
                var ref = storage.refFromURL(url);
                promises.push(ref.delete().catch(function (err) {
                    console.error('Resim silme hatasi:', err);
                }));
            } catch (err) {
                console.error('refFromURL hatasi:', err);
            }
        })(resimURLleri[i]);
    }
    return Promise.all(promises);
}

// ========== FORMU SIFIRLA ==========

function formuSifirla() {
    form.reset();
    isIdInput.value = '';
    formButton.textContent = 'İş Planı Ekle';
    formButton.disabled = false;
    yeniDosyalar = [];
    mevcutResimURLleri = [];
    renderOnizleme();
}

// ========== FIRESTORE DINLEME ==========

db.collection('isplanlari').onSnapshot(function (snapshot) {
    var isplanlari = [];
    snapshot.forEach(function (doc) {
        isplanlari.push(Object.assign({}, doc.data(), { id: doc.id }));
    });
    renderIsPlanlari(isplanlari);
}, function (error) {
    console.error('Firestore dinleme hatasi:', error);
    listesi.innerHTML = '<p style="color:red;">Veri yuklenirken hata olustu. Sayfayi yenileyin.</p>';
});

// ========== IS PLANLARINI LISTELE ==========

function renderIsPlanlari(planlar) {
    listesi.innerHTML = '';

    if (planlar.length === 0) {
        listesi.innerHTML = '<p>Henüz kayıtlı bir iş planı bulunmamaktadır.</p>';
        return;
    }

    for (var i = 0; i < planlar.length; i++) {
        (function (plan) {
            var div = document.createElement('div');
            div.className = 'is-plani-kart';

            var kimyasallarText = '';
            if (Array.isArray(plan.gerekliKimyasallar)) {
                kimyasallarText = plan.gerekliKimyasallar.filter(function (s) { return s; }).join(', ');
            } else if (plan.gerekliKimyasallar) {
                kimyasallarText = plan.gerekliKimyasallar;
            }

            var toollarText = '';
            if (Array.isArray(plan.gerekliToollar)) {
                toollarText = plan.gerekliToollar.filter(function (s) { return s; }).join(', ');
            } else if (plan.gerekliToollar) {
                toollarText = plan.gerekliToollar;
            }

            var html = '<h3>' + plan.isTanimi + ' (' + plan.ucakModeli + ')</h3>';

            if (kimyasallarText) {
                html += '<p><strong>Kimyasallar:</strong> ' + kimyasallarText + '</p>';
            }
            if (toollarText) {
                html += '<p><strong>Toollar:</strong> ' + toollarText + '</p>';
            }
            if (plan.ozelNotlar) {
                html += '<p><strong>Notlar:</strong> ' + plan.ozelNotlar + '</p>';
            }

            // Resimler
            if (plan.resimler && plan.resimler.length > 0) {
                html += '<div class="kart-resimler">';
                for (var r = 0; r < plan.resimler.length; r++) {
                    html += '<img src="' + plan.resimler[r] + '" alt="Resim">';
                }
                html += '</div>';
            }

            div.innerHTML = html;

            // Duzenleme butonu
            var duzenleBtn = document.createElement('button');
            duzenleBtn.textContent = 'Düzenle';
            duzenleBtn.addEventListener('click', function () {
                duzenleIsPlan(plan.id);
            });
            div.appendChild(duzenleBtn);

            // Silme butonu
            var silBtn = document.createElement('button');
            silBtn.textContent = 'Sil';
            silBtn.addEventListener('click', function () {
                silIsPlan(plan.id);
            });
            div.appendChild(silBtn);

            // Resim tiklama (buyuk ac)
            var resimler = div.querySelectorAll('.kart-resimler img');
            for (var k = 0; k < resimler.length; k++) {
                resimler[k].addEventListener('click', function () {
                    window.open(this.src);
                });
                resimler[k].style.cursor = 'pointer';
            }

            listesi.appendChild(div);
        })(planlar[i]);
    }
}

// ========== FORM GONDERIMI (EKLE / GUNCELLE) ==========

form.addEventListener('submit', function (e) {
    e.preventDefault();
    formButton.disabled = true;
    formButton.textContent = 'Kaydediliyor...';

    var isData = {
        isTanimi: form.isTanimi.value,
        ucakModeli: form.ucakModeli.value,
        gerekliKimyasallar: form.gerekliKimyasallar.value
            ? form.gerekliKimyasallar.value.split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s; })
            : [],
        gerekliToollar: form.gerekliToollar.value
            ? form.gerekliToollar.value.split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s; })
            : [],
        ozelNotlar: form.ozelNotlar.value
    };

    var isId = isIdInput.value;

    if (isId) {
        // GUNCELLEME
        var yuklePromise;
        if (yeniDosyalar.length > 0) {
            yuklePromise = resimleriYukle(yeniDosyalar, isId);
        } else {
            yuklePromise = Promise.resolve([]);
        }

        yuklePromise.then(function (yeniURLler) {
            isData.resimler = mevcutResimURLleri.concat(yeniURLler);
            return db.collection('isplanlari').doc(isId).update(isData);
        }).then(function () {
            alert('İş planı başarıyla güncellendi!');
            formuSifirla();
        }).catch(function (error) {
            console.error('Guncelleme hatasi:', error);
            alert('Hata olustu: ' + error.message);
            formButton.disabled = false;
            formButton.textContent = 'İş Planını Güncelle';
        });

    } else {
        // EKLEME
        isData.resimler = [];
        db.collection('isplanlari').add(isData).then(function (docRef) {
            if (yeniDosyalar.length > 0) {
                return resimleriYukle(yeniDosyalar, docRef.id).then(function (urls) {
                    return docRef.update({ resimler: urls });
                });
            }
        }).then(function () {
            alert('İş planı başarıyla eklendi!');
            formuSifirla();
        }).catch(function (error) {
            console.error('Ekleme hatasi:', error);
            alert('Hata olustu: ' + error.message);
            formButton.disabled = false;
            formButton.textContent = 'İş Planı Ekle';
        });
    }
});

// ========== IS PLANI SIL ==========

function silIsPlan(id) {
    if (!confirm('Bu iş planını silmek istediğinizden emin misiniz?')) return;

    db.collection('isplanlari').doc(id).get().then(function (doc) {
        if (doc.exists) {
            var plan = doc.data();
            return tumResimleriSil(plan.resimler);
        }
    }).then(function () {
        return db.collection('isplanlari').doc(id).delete();
    }).then(function () {
        alert('İş planı başarıyla silindi.');
    }).catch(function (error) {
        console.error('Silme hatasi:', error);
    });
}

// ========== IS PLANI DUZENLE ==========

function duzenleIsPlan(id) {
    db.collection('isplanlari').doc(id).get().then(function (doc) {
        if (doc.exists) {
            var plan = doc.data();
            isIdInput.value = id;
            form.isTanimi.value = plan.isTanimi || '';
            form.ucakModeli.value = plan.ucakModeli || '';
            form.gerekliKimyasallar.value = Array.isArray(plan.gerekliKimyasallar) ? plan.gerekliKimyasallar.join(', ') : (plan.gerekliKimyasallar || '');
            form.gerekliToollar.value = Array.isArray(plan.gerekliToollar) ? plan.gerekliToollar.join(', ') : (plan.gerekliToollar || '');
            form.ozelNotlar.value = plan.ozelNotlar || '';

            mevcutResimURLleri = (plan.resimler && Array.isArray(plan.resimler)) ? plan.resimler.slice() : [];
            yeniDosyalar = [];
            renderOnizleme();

            formButton.textContent = 'İş Planını Güncelle';
            formButton.disabled = false;
            window.scrollTo(0, 0);
        } else {
            console.log('Belge bulunamadi!');
        }
    }).catch(function (error) {
        console.error('Belge getirme hatasi:', error);
    });
}
