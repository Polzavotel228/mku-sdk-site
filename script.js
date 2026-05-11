// ========== FIREBASE КОНФИГ ==========
// ⚠️ ВСТАВЬ СВОИ ДАННЫЕ ИЗ FIREBASE CONSOLE ⚠️
const firebaseConfig = {
  apiKey: "AIzaSyBSgoXNIsFV-sKMwhRWZm-95MBGpr5rf44",
  authDomain: "mku-sdk-site.firebaseapp.com",
  projectId: "mku-sdk-site",
  storageBucket: "mku-sdk-site.firebasestorage.app",
  messagingSenderId: "841827388230",
  appId: "1:841827388230:web:a534f600744ee98c5ab347"
};

// Импорт Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// Инициализация
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

console.log("✅ Firebase подключен!");

// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let currentPage = 'home';

// ========== ФУНКЦИИ ЗАГРУЗКИ ДАННЫХ ==========
async function loadFromFirebase(collectionName) {
    try {
        const querySnapshot = await getDocs(collection(db, collectionName));
        const items = [];
        querySnapshot.forEach((doc) => {
            items.push({ id: doc.id, ...doc.data() });
        });
        console.log(`✅ Загружено ${items.length} записей из ${collectionName}`);
        return items;
    } catch (error) {
        console.error(`❌ Ошибка загрузки ${collectionName}:`, error);
        return [];
    }
}

async function loadApplications() {
    return await loadFromFirebase('applications');
}

// ========== ОТПРАВКА ЗАЯВКИ ==========
window.submitApplication = async function() {
    const name = document.getElementById('app_name')?.value;
    const phone = document.getElementById('app_phone')?.value;
    const collective = document.getElementById('app_collective')?.value;
    const comment = document.getElementById('app_comment')?.value;

    if (!name || !phone) {
        alert('❌ Заполните имя и телефон');
        return;
    }

    try {
        await addDoc(collection(db, 'applications'), {
            name: name,
            phone: phone,
            collective: collective || '',
            comment: comment || '',
            status: 'new',
            createdAt: new Date().toISOString()
        });
        alert('✅ Заявка отправлена! Мы свяжемся с вами.');
        const form = document.getElementById('applicationForm');
        if (form) form.reset();
        if (currentPage === 'admin') {
            location.reload();
        }
    } catch (error) {
        console.error('❌ Ошибка отправки:', error);
        alert('❌ Ошибка отправки. Смотри консоль (F12)');
    }
};

// ========== ОБНОВЛЕНИЕ СТАТУСА ЗАЯВКИ ==========
window.updateApplicationStatus = async function(id, newStatus) {
    try {
        await updateDoc(doc(db, 'applications', id), { status: newStatus });
        alert('✅ Статус обновлён');
        if (currentPage === 'admin') {
            const contentDiv = document.getElementById('admin-content-target');
            if (contentDiv) contentDiv.innerHTML = await renderAdminContent();
        }
    } catch (error) {
        console.error('❌ Ошибка обновления:', error);
        alert('❌ Ошибка обновления');
    }
};

// ========== УДАЛЕНИЕ ЗАПИСИ ==========
window.deleteDocument = async function(collectionName, id) {
    if (!confirm('Удалить эту запись?')) return;
    try {
        await deleteDoc(doc(db, collectionName, id));
        alert('✅ Запись удалена');
        if (currentPage === 'admin') {
            const contentDiv = document.getElementById('admin-content-target');
            if (contentDiv) contentDiv.innerHTML = await renderAdminContent();
        } else {
            location.reload();
        }
    } catch (error) {
        console.error('❌ Ошибка удаления:', error);
        alert('❌ Ошибка удаления');
    }
};

// ========== МОДАЛЬНЫЕ ОКНА ==========
window.openModal = function(item, type) {
    let content = '';
    if (type === 'collective') {
        content = `
            <h2 style="margin-bottom:16px;">${item.name || ''}</h2>
            <p><strong>👤 Руководитель:</strong> ${item.leaderName || item.leader || '—'}</p>
            <p><strong>🎂 Возраст:</strong> ${item.ageGroup || '—'}</p>
            <p><strong>🕐 Расписание:</strong> ${item.schedule || '—'}</p>
            <p><strong>📖 Описание:</strong> ${item.description || 'Подробности у администратора.'}</p>
        `;
    } else if (type === 'event') {
        content = `
            <h2 style="margin-bottom:16px;">${item.title || ''}</h2>
            <p><strong>📅 Дата:</strong> ${item.date || '—'}</p>
            <p><strong>📍 Место:</strong> ${item.location || '—'}</p>
            <p><strong>💰 Стоимость:</strong> ${item.price || 'Бесплатно'}</p>
            <p><strong>📖 Описание:</strong> ${item.description || '—'}</p>
        `;
    } else if (type === 'news') {
        content = `
            <h2 style="margin-bottom:16px;">${item.title || ''}</h2>
            <p><strong>📅 ${item.date || '—'}</strong></p>
            <p>${item.content || item.preview || '—'}</p>
        `;
    }
    const modalBody = document.getElementById('modalBody');
    if (modalBody) modalBody.innerHTML = content;
    const modal = document.getElementById('modal');
    if (modal) modal.classList.add('active');
};

window.closeModal = function() {
    const modal = document.getElementById('modal');
    if (modal) modal.classList.remove('active');
};

window.closeEditModal = function() {
    const modal = document.getElementById('editModal');
    if (modal) modal.classList.remove('active');
};

// ========== КАРТА ==========
function initMap() {
    if (typeof ymaps === 'undefined') {
        console.log('⚠️ Яндекс.Карты не загружены');
        return;
    }
    ymaps.ready(() => {
        const mapElement = document.getElementById('map');
        if (!mapElement) return;
        try {
            const map = new ymaps.Map('map', {
                center: [54.5138, 36.2612],
                zoom: 13,
                controls: ['zoomControl', 'fullscreenControl']
            });
            const placemark = new ymaps.Placemark([54.5138, 36.2612], {
                balloonContent: 'МКУ «СДК», ул. Ленина, 1, Калуга'
            });
            map.geoObjects.add(placemark);
            console.log('✅ Карта загружена');
        } catch(e) {
            console.error('❌ Ошибка карты:', e);
        }
    });
}

// ========== РЕНДЕР СТРАНИЦ ==========
async function renderHome() {
    const events = await loadFromFirebase('events');
    const collectives = await loadFromFirebase('collectives');
    const news = await loadFromFirebase('news');
    
    const afisha = events.filter(e => e.type === 'afisha').slice(0, 3);
    const topCollectives = collectives.slice(0, 3);
    const topNews = news.slice(0, 2);
    
    return `
        <div class="hero">
            <h1>Добро пожаловать в мир творчества!</h1>
            <p>МКУ «Сельские дома культуры» — центр культурной жизни вашего села</p>
            <div class="hero-buttons">
                <button class="btn-primary" onclick="navigate('events')">Смотреть афишу</button>
                <button class="btn-outline" onclick="navigate('collectives')">Записаться в кружок</button>
            </div>
        </div>
        
        <div class="section">
            <div class="section-header">
                <h2 class="section-title">Ближайшие мероприятия</h2>
                <button class="section-link" onclick="navigate('events')">Все →</button>
            </div>
            <div class="cards-grid">
                ${afisha.map(e => `
                    <div class="card" onclick='openModal(${JSON.stringify(e).replace(/'/g, "&#39;")}, "event")'>
                        <div class="card-img"><i class="fas fa-calendar-alt"></i></div>
                        <div class="card-content">
                            <h3 class="card-title">${e.title || 'Без названия'}</h3>
                            <div class="card-meta">📅 ${e.date || '—'} | 📍 ${e.location || '—'}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
            ${afisha.length === 0 ? '<div class="empty-state">Нет мероприятий. Добавьте их в Firebase → коллекция events</div>' : ''}
        </div>
        
        <div class="section">
            <div class="section-header">
                <h2 class="section-title">Наши кружки</h2>
                <button class="section-link" onclick="navigate('collectives')">Все →</button>
            </div>
            <div class="cards-grid">
                ${topCollectives.map(c => `
                    <div class="card" onclick='openModal(${JSON.stringify(c).replace(/'/g, "&#39;")}, "collective")'>
                        <div class="card-img"><i class="fas fa-music"></i></div>
                        <div class="card-content">
                            <h3 class="card-title">${c.name || 'Без названия'}</h3>
                            <div class="card-meta">🎂 ${c.ageGroup || '—'} | 🕐 ${c.schedule || '—'}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
            ${topCollectives.length === 0 ? '<div class="empty-state">Нет кружков. Добавьте их в Firebase → коллекция collectives</div>' : ''}
        </div>
        
        <div class="section">
            <div class="section-header">
                <h2 class="section-title">Новости</h2>
                <button class="section-link" onclick="navigate('news')">Все →</button>
            </div>
            <div class="cards-grid">
                ${topNews.map(n => `
                    <div class="card" onclick='openModal(${JSON.stringify(n).replace(/'/g, "&#39;")}, "news")'>
                        <div class="card-img"><i class="fas fa-newspaper"></i></div>
                        <div class="card-content">
                            <h3 class="card-title">${n.title || 'Без заголовка'}</h3>
                            <p class="card-text">${(n.preview || n.content || '').slice(0, 100)}...</p>
                            <div class="card-meta">📅 ${n.date || '—'}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
            ${topNews.length === 0 ? '<div class="empty-state">Нет новостей. Добавьте их в Firebase → коллекция news</div>' : ''}
        </div>
    `;
}

async function renderBranches() {
    const branches = await loadFromFirebase('branches');
    if (branches.length === 0) {
        return `<div class="empty-state">🏢 Филиалы не добавлены. Добавьте их в Firebase Console → коллекция branches</div>`;
    }
    return `
        <div class="section">
            <h1 class="section-title">Наши филиалы</h1>
            <div class="cards-grid">
                ${branches.map(b => `
                    <div class="card">
                        <div class="card-img"><i class="fas fa-building"></i></div>
                        <div class="card-content">
                            <h3 class="card-title">${b.name || 'Без названия'}</h3>
                            <p>📍 ${b.address || '—'}</p>
                            <p>📞 ${b.phone || '—'}</p>
                            <div class="card-meta">🕐 ${b.schedule || '—'}</div>
                            ${b.description ? `<p class="card-text" style="margin-top:12px;">${b.description}</p>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

async function renderEvents() {
    const events = await loadFromFirebase('events');
    const afisha = events.filter(e => e.type === 'afisha');
    const archive = events.filter(e => e.type === 'archive');
    
    return `
        <div class="section">
            <h1 class="section-title">Афиша мероприятий</h1>
            <div class="cards-grid">
                ${afisha.map(e => `
                    <div class="card" onclick='openModal(${JSON.stringify(e).replace(/'/g, "&#39;")}, "event")'>
                        <div class="card-img"><i class="fas fa-ticket-alt"></i></div>
                        <div class="card-content">
                            <h3 class="card-title">${e.title || 'Без названия'}</h3>
                            <div class="card-meta">📅 ${e.date || '—'} | 📍 ${e.location || '—'} | 💰 ${e.price || 'Бесплатно'}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
            ${afisha.length === 0 ? '<div class="empty-state">Нет мероприятий в афише</div>' : ''}
            ${archive.length ? `
                <h2 class="section-title" style="margin-top:48px;">Архив мероприятий</h2>
                <div class="cards-grid">
                    ${archive.map(e => `
                        <div class="card">
                            <div class="card-img"><i class="fas fa-photo-video"></i></div>
                            <div class="card-content">
                                <h3 class="card-title">${e.title || 'Без названия'}</h3>
                                <div class="card-meta">📅 ${e.date || '—'}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

async function renderCollectives() {
    const collectives = await loadFromFirebase('collectives');
    
    return `
        <div class="section">
            <h1 class="section-title">Творческие коллективы</h1>
            <div class="cards-grid">
                ${collectives.map(c => `
                    <div class="card" onclick='openModal(${JSON.stringify(c).replace(/'/g, "&#39;")}, "collective")'>
                        <div class="card-img"><i class="fas fa-users"></i></div>
                        <div class="card-content">
                            <h3 class="card-title">${c.name || 'Без названия'}</h3>
                            <div class="card-meta">👤 ${c.leaderName || c.leader || '—'} | 🎂 ${c.ageGroup || '—'}</div>
                            <div class="card-meta">🕐 ${c.schedule || '—'}</div>
                            <button class="btn-primary" style="margin-top:12px; width:100%;" onclick="event.stopPropagation();document.getElementById('applicationForm')?.scrollIntoView({behavior:'smooth'})">Записаться</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            ${collectives.length === 0 ? '<div class="empty-state">Нет кружков. Добавьте их в Firebase → коллекция collectives</div>' : ''}
            
            <div class="form-container" style="margin-top:48px" id="applicationForm">
                <h2 style="margin-bottom:24px;">📝 Запись в кружок</h2>
                <div class="form-group">
                    <label>Ваше имя *</label>
                    <input type="text" id="app_name" placeholder="Иванов Иван">
                </div>
                <div class="form-group">
                    <label>Телефон *</label>
                    <input type="tel" id="app_phone" placeholder="+7-XXX-XXX-XX-XX">
                </div>
                <div class="form-group">
                    <label>Выберите кружок</label>
                    <select id="app_collective">
                        <option value="">-- Выберите --</option>
                        ${collectives.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Комментарий</label>
                    <textarea id="app_comment" rows="3" placeholder="Возраст ребёнка, удобное время..."></textarea>
                </div>
                <button class="btn-primary" onclick="submitApplication()">Отправить заявку</button>
            </div>
        </div>
    `;
}

async function renderNews() {
    const news = await loadFromFirebase('news');
    
    return `
        <div class="section">
            <h1 class="section-title">Новости</h1>
            <div class="cards-grid">
                ${news.map(n => `
                    <div class="card" onclick='openModal(${JSON.stringify(n).replace(/'/g, "&#39;")}, "news")'>
                        <div class="card-img"><i class="fas fa-bullhorn"></i></div>
                        <div class="card-content">
                            <h3 class="card-title">${n.title || 'Без заголовка'}</h3>
                            <p class="card-text">${(n.preview || n.content || '').slice(0, 100)}...</p>
                            <div class="card-meta">📅 ${n.date || '—'}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
            ${news.length === 0 ? '<div class="empty-state">Нет новостей. Добавьте их в Firebase → коллекция news</div>' : ''}
        </div>
    `;
}

async function renderContacts() {
    setTimeout(() => { try { initMap(); } catch(e) { console.error('Карта не загрузилась'); } }, 200);
    return `
        <div class="section">
            <h1 class="section-title">Контакты</h1>
            <div class="contacts-grid">
                <div class="contacts-card">
                    <h3>📋 Реквизиты</h3>
                    <p><i class="fas fa-map-marker-alt"></i> г. Калуга, ул. Ленина, 1</p>
                    <p><i class="fas fa-phone"></i> <a href="tel:+74842123456">+7 (4842) 12-34-56</a></p>
                    <p><i class="fas fa-envelope"></i> <a href="mailto:info@sdk.ru">info@sdk.ru</a></p>
                    <p><i class="fas fa-building"></i> ИНН: 4029001234</p>
                    <p><i class="fas fa-building"></i> КПП: 402901001</p>
                    <p><i class="fas fa-building"></i> ОГРН: 1234567890123</p>
                </div>
                <div class="contacts-card">
                    <h3>🕐 Режим работы</h3>
                    <div class="schedule-item"><span>Понедельник - Пятница:</span><span>08:00 - 17:00</span></div>
                    <div class="schedule-item"><span>Обеденный перерыв:</span><span>13:00 - 14:00</span></div>
                    <div class="schedule-item"><span>Суббота - Воскресенье:</span><span>выходной</span></div>
                </div>
                <div class="contacts-card">
                    <h3>📍 Мы на карте</h3>
                    <div class="map-container" id="map" style="height:250px; border-radius:16px;"></div>
                </div>
            </div>
        </div>
    `;
}

async function renderAdminContent() {
    const applications = await loadFromFirebase('applications');
    const collectives = await loadFromFirebase('collectives');
    const events = await loadFromFirebase('events');
    const news = await loadFromFirebase('news');
    const branches = await loadFromFirebase('branches');
    
    return `
        <div class="form-container">
            <div class="admin-tabs" id="admin-tabs-container">
                <button class="admin-tab-btn active" data-admin-tab="applications">📋 Заявки (${applications.length})</button>
                <button class="admin-tab-btn" data-admin-tab="collectives">🎭 Коллективы (${collectives.length})</button>
                <button class="admin-tab-btn" data-admin-tab="events">🎪 Мероприятия (${events.length})</button>
                <button class="admin-tab-btn" data-admin-tab="news">📰 Новости (${news.length})</button>
                <button class="admin-tab-btn" data-admin-tab="branches">🏢 Филиалы (${branches.length})</button>
            </div>
            
            <div id="admin-applications">
                <h3>Поступившие заявки</h3>
                ${applications.length === 0 ? '<div class="empty-state">Нет заявок</div>' : `
                    <table class="admin-table">
                        <thead><tr><th>Дата</th><th>Имя</th><th>Телефон</th><th>Кружок</th><th>Статус</th><th>Действия</th></tr></thead>
                        <tbody>
                            ${applications.map(a => `
                                <tr>
                                    <td>${new Date(a.createdAt).toLocaleDateString()}</td>
                                    <td>${a.name || '-'}</td>
                                    <td>${a.phone || '-'}</td>
                                    <td>${a.collective || '-'}</td>
                                    <td>${a.status === 'new' ? '🟡 Новый' : '✅ Обработан'}</td>
                                    <td>
                                        ${a.status === 'new' ? `<button class="btn-success" style="padding:4px 12px; margin-right:8px;" onclick="updateApplicationStatus('${a.id}', 'completed')">✅</button>` : ''}
                                        <button class="btn-danger" style="padding:4px 12px;" onclick="deleteDocument('applications', '${a.id}')">🗑️</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `}
            </div>
            
            <div id="admin-collectives" style="display:none;">
                <h3>Творческие коллективы</h3>
                <div class="empty-state">⚠️ Редактирование через Firebase Console → коллекция collectives</div>
                <p style="margin-top:16px;">Поля: name, leaderName, ageGroup, schedule, description</p>
            </div>
            
            <div id="admin-events" style="display:none;">
                <h3>Мероприятия</h3>
                <div class="empty-state">⚠️ Редактирование через Firebase Console → коллекция events</div>
                <p style="margin-top:16px;">Поля: title, date, location, price, type (afisha/archive), description</p>
            </div>
            
            <div id="admin-news" style="display:none;">
                <h3>Новости</h3>
                <div class="empty-state">⚠️ Редактирование через Firebase Console → коллекция news</div>
                <p style="margin-top:16px;">Поля: title, date, preview, content</p>
            </div>
            
            <div id="admin-branches" style="display:none;">
                <h3>Филиалы</h3>
                <div class="empty-state">⚠️ Редактирование через Firebase Console → коллекция branches</div>
                <p style="margin-top:16px;">Поля: name, address, phone, schedule, description</p>
            </div>
        </div>
    `;
}

async function renderAdmin() {
    const html = await renderAdminContent();
    setTimeout(() => {
        const container = document.getElementById('admin-tabs-container');
        if (!container) return;
        const btns = container.querySelectorAll('.admin-tab-btn');
        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.getAttribute('data-admin-tab');
                btns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById('admin-applications').style.display = tab === 'applications' ? 'block' : 'none';
                document.getElementById('admin-collectives').style.display = tab === 'collectives' ? 'block' : 'none';
                document.getElementById('admin-events').style.display = tab === 'events' ? 'block' : 'none';
                document.getElementById('admin-news').style.display = tab === 'news' ? 'block' : 'none';
                document.getElementById('admin-branches').style.display = tab === 'branches' ? 'block' : 'none';
            });
        });
    }, 50);
    return `<div id="admin-content-target">${html}</div>`;
}

// ========== НАВИГАЦИЯ ==========
window.navigate = async function(page) {
    currentPage = page;
    const contentDiv = document.getElementById('page-content');
    if (!contentDiv) return;
    
    contentDiv.innerHTML = '<div class="loading">⏳ Загрузка...</div>';
    
    let html = '';
    try {
        switch(page) {
            case 'home': html = await renderHome(); break;
            case 'branches': html = await renderBranches(); break;
            case 'events': html = await renderEvents(); break;
            case 'collectives': html = await renderCollectives(); break;
            case 'news': html = await renderNews(); break;
            case 'contacts': html = await renderContacts(); break;
            case 'admin': html = await renderAdmin(); break;
            default: html = await renderHome();
        }
        contentDiv.innerHTML = html;
        
        // Обновляем активную ссылку
        document.querySelectorAll('.nav a').forEach(link => {
            if (link.getAttribute('data-page') === page) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
        
        // Обновляем URL
        history.pushState({ page }, '', `#${page}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Закрываем мобильное меню
        if (window.innerWidth <= 640) {
            const nav = document.getElementById('nav');
            if (nav) nav.classList.remove('open');
        }
    } catch (error) {
        console.error('❌ Ошибка навигации:', error);
        contentDiv.innerHTML = '<div class="empty-state">❌ Ошибка загрузки страницы. Смотри консоль (F12)</div>';
    }
};

// ========== ИНИЦИАЛИЗАЦИЯ ==========
// Обработчики навигации
document.querySelectorAll('.nav a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.getAttribute('data-page');
        if (page) window.navigate(page);
    });
});

// Логотип
const logo = document.getElementById('logo');
if (logo) {
    logo.addEventListener('click', () => window.navigate('home'));
}

// Адрес в подвале
const footerAddress = document.getElementById('footerAddress');
if (footerAddress) {
    footerAddress.addEventListener('click', (e) => {
        e.preventDefault();
        window.open('https://yandex.ru/profile/182055776484?lang=ru&no-distribution=1&view-state=mini&source=wizbiz_new_map_single', '_blank');
    });
}

// Ссылка на ВК — ПОСТАВЬ СВОЮ
const vkLink = document.getElementById('vkLink');
if (vkLink) {
    vkLink.setAttribute('href', 'https://vk.com/club216195518');
}

// Мобильное меню
const mobileBtn = document.getElementById('mobileMenuBtn');
if (mobileBtn) {
    mobileBtn.addEventListener('click', () => {
        const nav = document.getElementById('nav');
        if (nav) nav.classList.toggle('open');
    });
}

// Обработка кнопки "Назад" в браузере
window.addEventListener('popstate', (e) => {
    const hash = window.location.hash.slice(1);
    window.navigate(hash || 'home');
});

// Запуск
const hash = window.location.hash.slice(1);
window.navigate(hash || 'home');

console.log('✅ Сайт запущен, ожидаем данные из Firebase...');