/* =========================================
   1. IMPORTACIONES DE FIREBASE
========================================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* =========================================
   2. CONFIGURACIÓN
========================================= */
const firebaseConfig = {
  apiKey: "AIzaSyAqLbIw1m3mVQyHxq2qmhuIe6xrhegvV30",
  authDomain: "skyautomation-fafce.firebaseapp.com",
  projectId: "skyautomation-fafce",
  storageBucket: "skyautomation-fafce.firebasestorage.app",
  messagingSenderId: "978389398370",
  appId: "1:978389398370:web:1214fea487c6fd618b723b"
};

// Inicializar
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/* =========================================
   3. VARIABLES GLOBALES
========================================= */
const whatsappNumber = "50370404773"; 
let products = []; 
let categories = []; 
let cart = [];
let currentCategoryFilter = 'all';
let currentUser = null; 
let idToDelete = null; // Para confirmar borrado

/* =========================================
   4. INICIALIZACIÓN
========================================= */
document.addEventListener('DOMContentLoaded', () => {
    subscribeToData(); 
    monitorAuthState();
    initEventListeners();
    initScrollAnimations();
    
    // --- ANIMACIÓN HERO ---
    const heroContent = document.querySelector('.hero-content');
    if (heroContent) {
        heroContent.classList.add('active-hero');
    }

    // Inicializar carrusel de proyectos
    try { initProjectsCarousel(); } catch(e){ console.error("Error carrusel:", e); }
});

/* =========================================
   5. LÓGICA DE FIREBASE (DATABASE)
========================================= */

function subscribeToData() {
    // 1. Productos
    const qProd = query(collection(db, "products"), orderBy("id", "desc"));
    onSnapshot(qProd, (snapshot) => {
        products = [];
        snapshot.forEach((doc) => {
            products.push({ firestoreId: doc.id, ...doc.data() });
        });
        renderProducts();
    });

    // 2. Categorías
    const qCat = query(collection(db, "categories"), orderBy("name", "asc"));
    onSnapshot(qCat, (snapshot) => {
        categories = [];
        snapshot.forEach((doc) => {
            categories.push({ firestoreId: doc.id, ...doc.data() });
        });
        updateCategoryDropdowns(); 
    });
}

// --- CRUD PRODUCTOS ---
async function addProductToDB(newProduct) {
    try {
        await addDoc(collection(db, "products"), newProduct);
        closeModal('admin-modal');
        showToast("Producto guardado exitosamente.", "success");
    } catch (e) {
        showToast("Ocurrió un error: " + e.message, "error");
    }
}

async function updateProductInDB(firestoreId, updatedData) {
    try {
        await updateDoc(doc(db, "products", firestoreId), updatedData);
        closeModal('edit-modal');
        showToast("Producto actualizado correctamente.", "success");
    } catch (e) {
        showToast("Ocurrió un error: " + e.message, "error");
    }
}

async function deleteProductFromDB(firestoreId) {
    try {
        await deleteDoc(doc(db, "products", firestoreId));
        
        // Si estábamos en la lista de borrar, refrescarla
        if(document.getElementById('delete-list-modal').style.display === 'flex'){
             openDeleteList(); 
        } else {
             closeModal('edit-modal'); 
        }
        showToast("Producto eliminado correctamente.", "success");
    } catch (e) {
        showToast("Error al eliminar: " + e.message, "error");
    }
}

// --- CRUD CATEGORÍAS ---
async function addCategoryToDB(catName) {
    try {
        await addDoc(collection(db, "categories"), { name: catName });
        closeModal('category-modal');
        showToast("Categoría creada con éxito.", "success");
    } catch (e) {
        showToast("Ocurrió un error: " + e.message, "error");
    }
}

/* =========================================
   6. LÓGICA DE AUTH (Login/Logout)
========================================= */
function monitorAuthState() {
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        renderProducts(); // Refrescar para mostrar/ocultar lápices
    });
}

function loginAdmin(email, password) {
    signInWithEmailAndPassword(auth, email, password)
        .then(() => {
            closeModal('login-modal');
            openModal('dashboard-modal'); 
            showToast("¡Bienvenido de nuevo, Admin!", "success");
        })
        .catch((error) => {
            console.error("Error de login:", error.code);
            if (error.code === 'auth/invalid-credential' || 
                error.code === 'auth/user-not-found' || 
                error.code === 'auth/wrong-password') {
                showToast("⚠️ Credenciales no autorizadas", "error");
            } else if (error.code === 'auth/too-many-requests') {
                showToast("⏳ Demasiados intentos. Espera un momento.", "error");
            } else {
                showToast("Error de acceso: " + error.message, "error");
            }
        });
}

function logoutAdmin() {
    signOut(auth).then(() => {
        closeModal('dashboard-modal');
        closeModal('admin-modal');
        showToast("Has cerrado sesión.", "info");
    });
}

/* =========================================
   7. RENDERIZADO (UI)
========================================= */

function updateCategoryDropdowns() {
    // 1. Selects de Modales
    const optionsHTML = `<option value="">Seleccione...</option>` + 
        categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    
    if(document.getElementById('prod-category')) document.getElementById('prod-category').innerHTML = optionsHTML;
    if(document.getElementById('edit-category')) document.getElementById('edit-category').innerHTML = optionsHTML;

    // 2. Select Principal (Catálogo)
    const mainSelect = document.getElementById('mobile-category-select');
    if(mainSelect) {
        let mobileHtml = `<option value="all">Ver Todo el Catálogo</option>`;
        categories.forEach(cat => {
            mobileHtml += `<option value="${cat.name}"> ${cat.name}</option>`;
        });
        mainSelect.innerHTML = mobileHtml;

        mainSelect.onchange = (e) => {
            currentCategoryFilter = e.target.value;
            renderProducts();
            showToast(`Filtrando por: ${currentCategoryFilter === 'all' ? 'Todo' : currentCategoryFilter}`, 'info');
        };
    }
}

function renderProducts() {
    const container = document.getElementById('products-container');
    const filtered = currentCategoryFilter === 'all' ? products : products.filter(p => p.category === currentCategoryFilter);
        
    if (filtered.length === 0) {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px;"><p>No hay productos aquí.</p></div>`;
        return;
    }

    container.innerHTML = filtered.map(p => `
        <div class="product-card fade-in" style="position: relative;">
            ${currentUser ? `
            <button 
                onclick="window.openEditModal('${p.firestoreId}')" 
                style="position:absolute; top:10px; right:10px; z-index:10; cursor:pointer; background: white; border: none; border-radius: 50%; width: 35px; height: 35px; display:flex; align-items:center; justify-content:center; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
                <img src="assets/edit.svg" style="width: 20px; height: 20px;">
            </button>
            ` : ''}

            <div class="product-img-wrapper">
                <img src="${p.image}" class="product-img" onerror="this.onerror=null;this.src='https://dummyimage.com/300x220/ccc/000&text=Sin+Imagen'">
            </div>
            <div class="product-info">
                <span class="product-category">${p.category}</span>
                <h3 class="product-title">${p.name}</h3>
                <div class="product-footer">
                    <div class="product-price">$${p.price.toFixed(2)}</div>
                    <button class="add-btn" onclick="window.addToCart('${p.firestoreId}')"><i class="fas fa-cart-plus"></i> Agregar</button>
                </div>
            </div>
        </div>
    `).join('');
}

// --- UI Funciones Globales ---

window.openDeleteList = () => {
    const container = document.getElementById('delete-list-container');
    if(products.length === 0) {
        container.innerHTML = "<p>No hay productos para borrar.</p>";
    } else {
        container.innerHTML = products.map(p => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid #eee;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${p.image}" style="width:40px; height:40px; object-fit:cover; border-radius:4px;">
                    <span>${p.name}</span>
                </div>
                <button onclick="window.askDeleteConfirmation('${p.firestoreId}')" style="background:var(--danger); color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Borrar</button>
            </div>
        `).join('');
    }
    closeModal('dashboard-modal'); 
    openModal('delete-list-modal'); 
};

window.openEditModal = (id) => {
    const p = products.find(x => x.firestoreId === id);
    if(!p) return;

    document.getElementById('edit-id').value = id;
    document.getElementById('edit-name').value = p.name;
    document.getElementById('edit-category').value = p.category;
    document.getElementById('edit-price').value = p.price;
    document.getElementById('edit-image').value = p.image;
    
    document.getElementById('btn-delete-product').onclick = () => window.askDeleteConfirmation(id);
    openModal('edit-modal');
};

window.askDeleteConfirmation = (id) => {
    idToDelete = id;
    openModal('confirmation-modal');
};

window.closeModal = (id) => document.getElementById(id).style.display = 'none';
window.openModal = (id) => document.getElementById(id).style.display = 'flex';

window.toggleCart = () => {
    const m = document.getElementById('cart-modal');
    m.style.display = m.style.display === 'flex' ? 'none' : 'flex';
};

window.addToCart = (id) => {
    const p = products.find(x => x.firestoreId === id);
    if(p) {
        cart.push(p);
        updateCartUI();

        // Animación carrito
        const cartFloat = document.getElementById('cart-float');
        if(cartFloat){
            cartFloat.classList.remove('cart-spin');
            void cartFloat.offsetWidth; // Trigger reflow
            cartFloat.classList.add('cart-spin');
            setTimeout(() => cartFloat.classList.remove('cart-spin'), 700);
        }
        showToast(`Agregado: ${p.name}`, "success");
    }
};

window.removeFromCart = (i) => { cart.splice(i, 1); updateCartUI(); };

function updateCartUI() {
    document.getElementById('cart-count').innerText = cart.length;
    const container = document.getElementById('cart-items');
    
    if(cart.length === 0) {
        container.innerHTML = "<p>Carrito vacío.</p>";
        document.getElementById('cart-total').innerText = "$0.00";
        document.getElementById('whatsapp-btn').classList.add('disabled');
    } else {
        let total = 0;
        container.innerHTML = cart.map((p, i) => {
            total += p.price;
            return `<div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <span>${p.name}</span>
                <span>$${p.price.toFixed(2)} <b onclick="window.removeFromCart(${i})" style="color:red; cursor:pointer; margin-left:10px;">x</b></span>
            </div>`;
        }).join('');
        document.getElementById('cart-total').innerText = "$" + total.toFixed(2);
        
        // WhatsApp Link
        let msg = "Hola Sky Automation, estoy interesado en el siguiente pedido:%0A%0A";
        cart.forEach(p => { msg += `* ${p.name} - $${p.price.toFixed(2)}%0A`; });
        msg += `%0ATOTAL A PAGAR: $${total.toFixed(2)}%0A%0A`;
        msg += "Quedo atento para coordinar el pago y la entrega.";

        document.getElementById('whatsapp-btn').href = `https://wa.me/${whatsappNumber}?text=${msg}`;
        document.getElementById('whatsapp-btn').classList.remove('disabled');
    }
}

/* =========================================
   8. LISTENERS GENERALES
========================================= */
function initEventListeners() {
    // Menú móvil
    const menuToggle = document.getElementById('mobile-menu');
    if(menuToggle) {
        menuToggle.addEventListener('click', () => {
            document.getElementById('nav-list').classList.toggle('active');
        });
    }

    // Scroll Suave en Navegación
    document.querySelectorAll('a.nav-link[href^="#"]').forEach(a => {
        a.addEventListener('click', (e) => {
            const href = a.getAttribute('href');
            if(href && href.startsWith('#')) {
                const target = document.querySelector(href);
                if(target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                document.getElementById('nav-list').classList.remove('active');
            }
        });
    });

    // Login/Dashboard Botón
    const btnIDP = document.getElementById('btn-login-idp');
    if(btnIDP) {
        btnIDP.addEventListener('click', () => {
            if(currentUser) openModal('dashboard-modal');
            else openModal('login-modal');
        });
    }

    // Logout
    const dashLogout = document.getElementById('dashboard-logout');
    if(dashLogout) dashLogout.addEventListener('click', logoutAdmin);
    const adminLogout = document.getElementById('admin-logout');
    if(adminLogout) adminLogout.addEventListener('click', logoutAdmin);

    // Login Submit
    const loginForm = document.getElementById('login-form');
    if(loginForm) {
        loginForm.addEventListener('click', (e) => e.stopPropagation());
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('username').value;
            const pass = document.getElementById('password').value;
            loginAdmin(email, pass);
        });
    }

    // Formularios CRUD
    const catForm = document.getElementById('category-form');
    if(catForm) {
        catForm.addEventListener('submit', (e) => {
            e.preventDefault();
            addCategoryToDB(document.getElementById('cat-name').value);
            e.target.reset();
        });
    }

    const prodForm = document.getElementById('product-form');
    if(prodForm) {
        prodForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const cat = document.getElementById('prod-category').value;
            if(!cat) { showToast("¡Selecciona una categoría primero!", "error"); return; }

            addProductToDB({
                id: Date.now(),
                name: document.getElementById('prod-name').value,
                category: cat,
                price: parseFloat(document.getElementById('prod-price').value),
                image: document.getElementById('prod-image').value
            });
            e.target.reset();
        });
    }
    
    const editForm = document.getElementById('edit-form');
    if(editForm) {
        editForm.addEventListener('submit', (e) => {
            e.preventDefault();
            updateProductInDB(document.getElementById('edit-id').value, {
                name: document.getElementById('edit-name').value,
                category: document.getElementById('edit-category').value,
                price: parseFloat(document.getElementById('edit-price').value),
                image: document.getElementById('edit-image').value
            });
        });
    }

    // Confirmación Borrar
    const btnConfirmDel = document.getElementById('btn-confirm-delete');
    if(btnConfirmDel) {
        btnConfirmDel.addEventListener('click', () => {
            if (idToDelete) {
                deleteProductFromDB(idToDelete);
                closeModal('confirmation-modal');
                idToDelete = null;
            }
        });
    }

    // Cerrar Modales (X)
    document.getElementById('close-login').addEventListener('click', () => closeModal('login-modal'));
    document.getElementById('close-admin').addEventListener('click', () => closeModal('admin-modal'));
    document.getElementById('close-edit').addEventListener('click', () => closeModal('edit-modal'));

    // Toggle Password
    const toggleBtn = document.getElementById('toggle-password');
    if(toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            const input = document.getElementById('password');
            input.type = input.type === 'password' ? 'text' : 'password';
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }

    // Cerrar al click fuera
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            e.target.style.display = 'none';
        }
    });
}

function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('show');
                observer.unobserve(entry.target); 
            }
        });
    }, { threshold: 0.2 });

    document.querySelectorAll('.hidden').forEach((el) => observer.observe(el));
}

/* =========================================
   9. NOTIFICACIONES (TOASTS)
========================================= */
window.showToast = (message, type = 'info') => {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.classList.add('toast', type);
    
    let icon = 'fa-info-circle';
    if(type === 'success') icon = 'fa-check-circle';
    if(type === 'error') icon = 'fa-exclamation-circle';

    toast.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hiding'); 
        setTimeout(() => { if (toast.parentElement) toast.remove(); }, 500); 
    }, 2000); 
};

/* =========================================
   10. CARRUSEL DE PROYECTOS (CON ANIMACIÓN)
========================================= */
function initProjectsCarousel(){
    const panel = document.querySelector('.project-panel');
    if(!panel) return;

    // Elementos a actualizar
    const imgEl = panel.querySelector('.project-image img');
    const titleEl = panel.querySelector('.project-title');
    const descEl = panel.querySelector('.project-desc');
    const projectCard = panel.querySelector('.project-card'); // Contenedor para la animación

    // Navegación
    const btnPrev = panel.querySelector('.project-nav.prev');
    const btnNext = panel.querySelector('.project-nav.next');
    const thumbs = Array.from(document.querySelectorAll('.project-thumbs .thumb'));
    
    if(!imgEl || !titleEl || !descEl || thumbs.length === 0) return;

    // Datos del DOM
    const projects = thumbs.map(t => ({
        img: t.dataset.img,
        title: t.dataset.title || titleEl.textContent,
        desc: t.dataset.desc || descEl.textContent
    }));

    let current = 0;

    // --- FUNCIÓN SHOW MEJORADA (Con Animación) ---
    function show(i){
        // 1. Iniciar animación de salida (fade-out)
        projectCard.classList.add('changing');

        // 2. Esperar 400ms para cambiar el contenido
        setTimeout(() => {
            const p = projects[i];
            
            // Cambio de contenido
            titleEl.textContent = p.title;
            descEl.textContent = p.desc;
            imgEl.src = p.img;
            
            // Actualizar bolitas
            thumbs.forEach((t, idx) => t.classList.toggle('active', idx === i));

            // 3. Quitar clase (inicia fade-in)
            projectCard.classList.remove('changing');
        }, 400);
    }

    // Funciones de navegación
    const goNext = () => { current = (current + 1) % projects.length; show(current); };
    const goPrev = () => { current = (current - 1 + projects.length) % projects.length; show(current); };

    // Listeners Botones (Flechas)
    if(btnPrev) btnPrev.addEventListener('click', goPrev);
    if(btnNext) btnNext.addEventListener('click', goNext);

    // Listeners Thumbnails (Bolitas)
    thumbs.forEach((t, idx) => {
        t.addEventListener('click', (e) => { 
            e.stopPropagation(); 
            if(current !== idx) { // Solo animar si es diferente
                current = idx; 
                show(current); 
            }
        });
    });

    // Teclado
    document.addEventListener('keydown', (e) => {
        const rect = panel.getBoundingClientRect();
        // Solo si es visible en pantalla
        if(rect.top < window.innerHeight && rect.bottom > 0) {
            if(e.key === 'ArrowLeft') goPrev();
            if(e.key === 'ArrowRight') goNext();
        }
    });

    // Swipe para Móviles
    let touchStartX = null;
    const threshold = 50;

    panel.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].clientX;
    }, { passive: true });

    panel.addEventListener('touchend', (e) => {
        if(touchStartX === null) return;
        const touchEndX = e.changedTouches[0].clientX;
        const dx = touchEndX - touchStartX;

        if(Math.abs(dx) > threshold) {
            if(dx < 0) goNext(); 
            else goPrev();
        }
        touchStartX = null;
    }, { passive: true });
}