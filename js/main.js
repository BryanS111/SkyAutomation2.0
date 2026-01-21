// --- CONFIGURACIÓN DE CLOUDINARY ---
const CLOUDINARY_CLOUD_NAME = "duu9icy6k"; 
const CLOUDINARY_PRESET = "sky_preset";

/* =========================================
   1. IMPORTACIONES DE FIREBASE
========================================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* =========================================
   2. CONFIGURACIÓN FIREBASE
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
let idToDelete = null; // Para confirmar borrado producto
let currentSearchTerm = ''; 
let catIdToDelete = null; // Para confirmar borrado categoría

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
    
    // Lógica de filtrado
    const filtered = products.filter(p => {
        // 1. Chequeamos Categoría
        const matchesCategory = currentCategoryFilter === 'all' || p.category === currentCategoryFilter;
        
        // 2. Chequeamos Texto (Buscador)
        const term = currentSearchTerm.toLowerCase();
        const matchesSearch = p.name.toLowerCase().includes(term) || 
                              (p.description && p.description.toLowerCase().includes(term)) ||
                              (p.category && p.category.toLowerCase().includes(term));
        
        return matchesCategory && matchesSearch;
    });
        
    if (filtered.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding: 40px; width: 100%;">
            <p style="color: #666; font-size: 1.2rem;">No se encontraron productos.</p>
        </div>`;
        return;
    }

    // Renderizado
    container.innerHTML = filtered.map(p => `
        <div class="product-card fade-in" style="position: relative;">
            ${currentUser ? `
            <button onclick="window.openEditModal('${p.firestoreId}')" 
                style="position:absolute; top:10px; right:10px; z-index:10; cursor:pointer; background: white; border: none; border-radius: 50%; width: 35px; height: 35px; display:flex; align-items:center; justify-content:center; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
                <img src="assets/edit.svg" style="width: 20px; height: 20px;">
            </button>` : ''}

            <div class="product-img-wrapper">
                <img src="${p.image}" class="product-img" onerror="this.src='https://dummyimage.com/300x220/ccc/000&text=Sin+Imagen'">
            </div>
            <div class="product-info">
                <span class="product-category">${p.category}</span>
                <h3 class="product-title">${p.name}</h3>
                <div class="product-footer" style="display: flex; align-items: center; justify-content: space-between; margin-top: auto; padding-top: 10px;">
                     <button class="desc-link" onclick="window.openDescModal('${p.firestoreId}')">Descripción</button>
                    <button class="add-btn" onclick="window.addToCart('${p.firestoreId}')" style="font-size: 0.8rem; padding: 8px 15px;">
                        <i class="fas fa-cart-plus"></i> Cotizar
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// --- UI Funciones Globales ---

window.openDeleteList = (filterText = '') => {
    const container = document.getElementById('delete-list-container');
    const term = filterText.toLowerCase();
    
    const list = products.filter(p => 
        p.name.toLowerCase().includes(term) ||
        (p.description && p.description.toLowerCase().includes(term))
    );

    if (list.length === 0) {
        container.innerHTML = "<p style='text-align:center; padding:20px;'>No hay coincidencias.</p>";
    } else {
        container.innerHTML = list.map(p => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid #eee;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${p.image}" style="width:40px; height:40px; object-fit:cover; border-radius:4px;">
                    <span style="font-size:0.9rem; font-weight:500;">${p.name}</span>
                </div>
                <button onclick="window.askDeleteConfirmation('${p.firestoreId}')" 
                        style="background:#ffdddd; color:#d9534f; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-weight:bold;">
                    Borrar
                </button>
            </div>
        `).join('');
    }
    
    const modal = document.getElementById('delete-list-modal');
    if (modal.style.display !== 'flex') {
        closeModal('dashboard-modal');
        openModal('delete-list-modal');
    }
};

window.openEditModal = (id) => {
    const p = products.find(x => x.firestoreId === id);
    if(!p) return;

    document.getElementById('edit-id').value = id;
    document.getElementById('edit-name').value = p.name;
    document.getElementById('edit-category').value = p.category;
    document.getElementById('edit-desc').value = p.description || '';
    
    // --- LÓGICA DE IMAGEN EN EDICIÓN ---
    // Mostramos la imagen actual
    const preview = document.getElementById('edit-preview-img');
    const fileInput = document.getElementById('edit-image-file');
    
    if(preview) {
        preview.src = p.image || ''; 
        preview.style.display = 'inline-block';
    }
    // Limpiamos el input de archivo por si tenía algo seleccionado antes
    if(fileInput) fileInput.value = ""; 
    
    // Configurar botón de eliminar
    document.getElementById('btn-delete-product').onclick = () => window.askDeleteConfirmation(id);
    openModal('edit-modal');
};

window.openDescModal = (id) => {
    const p = products.find(x => x.firestoreId === id);
    if(!p) return;

    document.getElementById('desc-title').innerText = p.name;
    document.getElementById('desc-text').innerText = p.description ? p.description : "Sin descripción técnica disponible.";
    
    openModal('desc-modal');
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
        showToast(`Agregado a cotización: ${p.name}`, "success");
    }
};

window.removeFromCart = (i) => { cart.splice(i, 1); updateCartUI(); };

function updateCartUI() {
    document.getElementById('cart-count').innerText = cart.length;
    const container = document.getElementById('cart-items');
    
    if(cart.length === 0) {
        container.innerHTML = "<p>Tu lista de cotización está vacía.</p>";
        document.getElementById('cart-total').innerText = "Vacio";
        document.getElementById('whatsapp-btn').classList.add('disabled');
    } else {
        container.innerHTML = cart.map((p, i) => {
            return `<div style="display:flex; justify-content:space-between; margin-bottom:10px; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 5px;">
                <div style="font-size: 0.9rem;">
                    <strong>${p.name}</strong><br>
                    <small style="color:#666;">${p.category}</small>
                </div>
                <span onclick="window.removeFromCart(${i})" style="color:red; cursor:pointer; font-weight:bold; padding: 0 10px;">x</span>
            </div>`;
        }).join('');
        
        document.getElementById('cart-total').innerText = "Por Cotizar";
        
        let msg = "Hola Sky Automation, me gustaría solicitar una cotización formal por los siguientes equipos:%0A%0A";
        cart.forEach(p => { msg += `- ${p.name} (Cat: ${p.category})%0A`; });
        msg += `%0A¿Podrían brindarme precios y disponibilidad?`;

        document.getElementById('whatsapp-btn').href = `https://wa.me/${whatsappNumber}?text=${msg}`;
        document.getElementById('whatsapp-btn').classList.remove('disabled');
    }
}

// --- NUEVA: Abrir lista de eliminar Categorías ---
window.openDeleteCategoryList = () => {
    const container = document.getElementById('delete-category-container');
    
    if (categories.length === 0) {
        container.innerHTML = "<p style='text-align:center;'>No hay categorías creadas.</p>";
    } else {
        container.innerHTML = categories.map(c => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid #eee;">
                <span style="font-weight:500;">${c.name}</span>
                <button onclick="window.deleteCategoryConfirm('${c.firestoreId}', '${c.name}')" 
                        style="background: white; border: 1px solid #dc3545; color:#dc3545; padding:5px 10px; border-radius:4px; cursor:pointer; transition:0.3s;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    }
    closeModal('dashboard-modal');
    openModal('delete-category-modal');
};

window.deleteCategoryConfirm = (id, name) => {
    catIdToDelete = id;
    document.getElementById('cat-delete-name').innerText = `"${name}"`;
    openModal('cat-confirmation-modal');
};


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

    // Scroll Suave
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

    // Agregar Categoría
    const catForm = document.getElementById('category-form');
    if(catForm) {
        catForm.addEventListener('submit', (e) => {
            e.preventDefault();
            addCategoryToDB(document.getElementById('cat-name').value);
            e.target.reset();
        });
    }

    // --- AGREGAR PRODUCTO (CON CLOUDINARY) ---
    const prodForm = document.getElementById('product-form');
    if(prodForm) {
        prodForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btnSubmit = prodForm.querySelector('button[type="submit"]');
            const originalText = btnSubmit.innerText;
            btnSubmit.innerText = "Subiendo imagen...";
            btnSubmit.disabled = true;

            try {
                const name = document.getElementById('prod-name').value;
                const category = document.getElementById('prod-category').value;
                const desc = document.getElementById('prod-desc').value;
                const fileInput = document.getElementById('prod-image-file');
                const file = fileInput.files[0];

                if (!category) throw new Error("Selecciona una categoría.");
                if (!file) throw new Error("Debes seleccionar una imagen.");

                // 1. Subir a Cloudinary
                const imageUrl = await uploadToCloudinary(file);

                // 2. Guardar en Firestore
                await addProductToDB({
                    id: Date.now(),
                    name: name,
                    category: category,
                    description: desc,
                    image: imageUrl
                });

                e.target.reset();
                showToast("Producto agregado con éxito", "success");
            } catch (error) {
                console.error(error);
                showToast(error.message || "Error al subir", "error");
            } finally {
                btnSubmit.innerText = originalText;
                btnSubmit.disabled = false;
            }
        });
    }

    // --- EDITAR PRODUCTO (CON CLOUDINARY) ---
    const editForm = document.getElementById('edit-form');
    if(editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const btnSubmit = editForm.querySelector('button[type="submit"]');
            const originalText = btnSubmit.innerText;
            btnSubmit.innerText = "Guardando...";
            btnSubmit.disabled = true;

            try {
                const id = document.getElementById('edit-id').value;
                const fileInput = document.getElementById('edit-image-file');
                const file = fileInput.files[0];

                // Imagen por defecto (la actual)
                let imageUrl = document.getElementById('edit-preview-img').src;

                // Si hay archivo nuevo, subirlo
                if (file) {
                    btnSubmit.innerText = "Subiendo nueva imagen...";
                    imageUrl = await uploadToCloudinary(file);
                }

                await updateProductInDB(id, {
                    name: document.getElementById('edit-name').value,
                    category: document.getElementById('edit-category').value,
                    description: document.getElementById('edit-desc').value,
                    image: imageUrl
                });
                
                showToast("Producto editado correctamente", "success");
                closeModal('edit-modal');
                
            } catch (error) {
                showToast("Error: " + error.message, "error");
            } finally {
                btnSubmit.innerText = originalText;
                btnSubmit.disabled = false;
            }
        });
    }

    // Confirmar Borrar Producto
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

    // Confirmar Borrar Categoría
    const btnConfirmCatDel = document.getElementById('btn-confirm-cat-delete');
    if(btnConfirmCatDel) {
        btnConfirmCatDel.addEventListener('click', async () => {
            if (catIdToDelete) {
                try {
                    await deleteDoc(doc(db, "categories", catIdToDelete));
                    showToast("Categoría eliminada", "success");
                    closeModal('cat-confirmation-modal');
                    catIdToDelete = null;
                } catch (e) {
                    console.error(e);
                    showToast("Error al eliminar: " + e.message, "error");
                }
            }
        });
    }

    // Cerrar Modales (X)
    const closeLogin = document.getElementById('close-login');
    if(closeLogin) closeLogin.addEventListener('click', () => closeModal('login-modal'));
    
    const closeAdmin = document.getElementById('close-admin');
    if(closeAdmin) closeAdmin.addEventListener('click', () => closeModal('admin-modal'));
    
    const closeEdit = document.getElementById('close-edit');
    if(closeEdit) closeEdit.addEventListener('click', () => closeModal('edit-modal'));

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

    // Buscador Público
    const searchInput = document.getElementById('public-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearchTerm = e.target.value;
            renderProducts();
        });
    }

    // Buscador Borrar (Admin)
    const deleteSearch = document.getElementById('search-delete-product');
    if (deleteSearch) {
        deleteSearch.addEventListener('input', (e) => {
            window.openDeleteList(e.target.value);
        });
    }
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
   10. FUNCIONES AUXILIARES (Cloudinary y Carrusel)
========================================= */

// SUBIR A CLOUDINARY
async function uploadToCloudinary(file) {
    if (!file) return null;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_PRESET); 

    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Error al subir imagen a Cloudinary');

        const data = await response.json();
        return data.secure_url; 
    } catch (error) {
        console.error("Error subiendo imagen:", error);
        throw error; 
    }
}

// CARRUSEL
function initProjectsCarousel(){
    const panel = document.querySelector('.project-panel');
    if(!panel) return;

    const imgEl = panel.querySelector('.project-image img');
    const titleEl = panel.querySelector('.project-title');
    const descEl = panel.querySelector('.project-desc');
    const projectCard = panel.querySelector('.project-card'); 

    const btnPrev = panel.querySelector('.project-nav.prev');
    const btnNext = panel.querySelector('.project-nav.next');
    const thumbs = Array.from(document.querySelectorAll('.project-thumbs .thumb'));
    
    if(!imgEl || !titleEl || !descEl || thumbs.length === 0) return;

    const projects = thumbs.map(t => ({
        img: t.dataset.img,
        title: t.dataset.title || titleEl.textContent,
        desc: t.dataset.desc || descEl.textContent
    }));

    let current = 0;

    function show(i){
        projectCard.classList.add('changing');
        setTimeout(() => {
            const p = projects[i];
            titleEl.textContent = p.title;
            descEl.textContent = p.desc;
            imgEl.src = p.img;
            thumbs.forEach((t, idx) => t.classList.toggle('active', idx === i));
            projectCard.classList.remove('changing');
        }, 400);
    }

    const goNext = () => { current = (current + 1) % projects.length; show(current); };
    const goPrev = () => { current = (current - 1 + projects.length) % projects.length; show(current); };

    if(btnPrev) btnPrev.addEventListener('click', goPrev);
    if(btnNext) btnNext.addEventListener('click', goNext);

    thumbs.forEach((t, idx) => {
        t.addEventListener('click', (e) => { 
            e.stopPropagation(); 
            if(current !== idx) { 
                current = idx; 
                show(current); 
            }
        });
    });

    // Teclado
    document.addEventListener('keydown', (e) => {
        const rect = panel.getBoundingClientRect();
        if(rect.top < window.innerHeight && rect.bottom > 0) {
            if(e.key === 'ArrowLeft') goPrev();
            if(e.key === 'ArrowRight') goNext();
        }
    });

    // Swipe móvil
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