// Firestore referansi index.html'de tanimlandi: db
var form = document.getElementById('isEkleFormu');
var listesi = document.getElementById('isPlaniListesi');
var isIdInput = document.getElementById('isId');
var formButton = document.getElementById('formButton');
var resimInput = document.getElementById('resimler');
var resimOnizleme = document.getElementById('resimOnizleme');

// base64 resimleri tutan dizi (hem yeni hem mevcut)
var resimlerBase64 = [];

// ========== RESIM SIKISTIRMA ==========

function resmiSikistir(file, maxGenislik, kalite) {
    return new Promise(function (resolve) {
        var reader = new FileReader();
        reader.onload = function (e) {
            var img = new Image();
            img.onload = function () {
                var canvas = document.createElement('canvas');
                var oran = Math.min(maxGenislik / img.width, 1);
                canvas.width = img.width * oran;
                canvas.height = img.height * oran;
                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                var base64 = canvas.toDataURL('image/jpeg', kalite);
                resolve(base64);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// ========== RESIM SECME VE ONIZLEME ==========

resimInput.addEventListener('change', function (e) {
    var files = Array.from(e.target.files);

    if (resimlerBase64.length + files.length > 3) {
        alert('En fazla 3 resim ekleyebilirsiniz!');
        resimInput.value = '';
        return;
    }

    var promises = [];
    for (var i = 0; i < files.length; i++) {
        if (resimlerBase64.length + promises.length >= 3) break;
        promises.push(resmiSikistir(files[i], 800, 0.6));
    }

    Promise.all(promises).then(function (sonuclar) {
        for (var j = 0; j < sonuclar.length; j++) {
            resimlerBase64.push(sonuclar[j]);
        }
        renderOnizleme();
    });

    resimInput.value = '';
});

function renderOnizleme() {
    resimOnizleme.innerHTML = '';

    for (var i = 0; i < resimlerBase64.length; i++) {
        (function (index) {
            var item = document.createElement('div');
            item.className = 'onizleme-item';

            var img = document.createElement('img');
            img.src = resimlerBase64[index];
            img.alt = 'Resim ' + (index + 1);
            item.appendChild(img);

            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'sil-btn';
            btn.textContent = 'X';
            btn.addEventListener('click', function () {
                resimlerBase64.splice(index, 1);
                renderOnizleme();
            });
            item.appendChild(btn);

            resimOnizleme.appendChild(item);
        })(i);
    }
}

// ========== FORMU SIFIRLA ==========

function formuSifirla() {
    form.reset();
    isIdInput.value = '';
    formButton.textContent = 'İş Planı Ekle';
    formButton.disabled = false;
    resimlerBase64 = [];
    renderOnizleme();
}

// ========== FIRESTORE DINLEME ==========

db.collection('isplanlari').onSnapshot(function (snapshot) {
    var isplanlari = [];
    snapshot.forEach(function (doc) {
        var data = doc.data();
        data.id = doc.id;
        isplanlari.push(data);
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
            var kartResimler = div.querySelectorAll('.kart-resimler img');
            for (var k = 0; k < kartResimler.length; k++) {
                kartResimler[k].style.cursor = 'pointer';
                kartResimler[k].addEventListener('click', function () {
                    window.open(this.src);
                });
            }

            listesi.appendChild(div);
        })(planlar[i]);
    }
}

// ========== FORM GONDERIMI ==========

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
        ozelNotlar: form.ozelNotlar.value,
        resimler: resimlerBase64.slice()
    };

    var isId = isIdInput.value;

    if (isId) {
        // GUNCELLEME
        db.collection('isplanlari').doc(isId).update(isData)
            .then(function () {
                alert('İş planı başarıyla güncellendi!');
                formuSifirla();
            })
            .catch(function (error) {
                console.error('Guncelleme hatasi:', error);
                alert('Hata: ' + error.message);
                formButton.disabled = false;
                formButton.textContent = 'İş Planını Güncelle';
            });
    } else {
        // EKLEME
        db.collection('isplanlari').add(isData)
            .then(function () {
                alert('İş planı başarıyla eklendi!');
                formuSifirla();
            })
            .catch(function (error) {
                console.error('Ekleme hatasi:', error);
                alert('Hata: ' + error.message);
                formButton.disabled = false;
                formButton.textContent = 'İş Planı Ekle';
            });
    }
});

// ========== SIL ==========

function silIsPlan(id) {
    if (!confirm('Bu iş planını silmek istediğinizden emin misiniz?')) return;

    db.collection('isplanlari').doc(id).delete()
        .then(function () {
            alert('İş planı başarıyla silindi.');
        })
        .catch(function (error) {
            console.error('Silme hatasi:', error);
        });
}

// ========== DUZENLE ==========

function duzenleIsPlan(id) {
    db.collection('isplanlari').doc(id).get()
        .then(function (doc) {
            if (doc.exists) {
                var plan = doc.data();
                isIdInput.value = id;
                form.isTanimi.value = plan.isTanimi || '';
                form.ucakModeli.value = plan.ucakModeli || '';
                form.gerekliKimyasallar.value = Array.isArray(plan.gerekliKimyasallar)
                    ? plan.gerekliKimyasallar.join(', ')
                    : (plan.gerekliKimyasallar || '');
                form.gerekliToollar.value = Array.isArray(plan.gerekliToollar)
                    ? plan.gerekliToollar.join(', ')
                    : (plan.gerekliToollar || '');
                form.ozelNotlar.value = plan.ozelNotlar || '';

                resimlerBase64 = (plan.resimler && Array.isArray(plan.resimler)) ? plan.resimler.slice() : [];
                renderOnizleme();

                formButton.textContent = 'İş Planını Güncelle';
                formButton.disabled = false;
                window.scrollTo(0, 0);
            }
        })
        .catch(function (error) {
            console.error('Belge getirme hatasi:', error);
        });
}
