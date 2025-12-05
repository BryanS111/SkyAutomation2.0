/* =========================================
   1. IMPORTACIONES DE FIREBASE
========================================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* =========================================
   2. CONFIGURACIÓN (TUS CREDENCIALES)
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

/* =========================================
   4. INICIALIZACIÓN
========================================= */
document.addEventListener('DOMContentLoaded', () => {
    subscribeToData(); 
    monitorAuthState();
    initEventListeners();
    initScrollAnimations();
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
    // if(!confirm("¿Borrar permanentemente?")) return;  <-- ¡BORRA O COMENTA ESTA LÍNEA!
    
    try {
        await deleteDoc(doc(db, "products", firestoreId));
        
        // Si estábamos en la lista de borrar, refrescarla
        if(document.getElementById('delete-list-modal').style.display === 'flex'){
             openDeleteList(); 
        } else {
             closeModal('edit-modal'); // Si veníamos del modal de edición
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
        // YA NO CAMBIAMOS EL TEXTO DEL BOTÓN, SIEMPRE DICE "IDP"
    });
}

function loginAdmin(email, password) {
    signInWithEmailAndPassword(auth, email, password)
        .then(() => {
            closeModal('login-modal');
            openModal('dashboard-modal'); 
            showToast("¡Bienvenido de nuevo, Admin!", "success"); // Un toque extra de cortesía
        })
        .catch((error) => {
            console.error("Error de login:", error.code); // Para que veas el código real en consola si lo necesitas
            
            // Filtramos los errores comunes de credenciales
            if (error.code === 'auth/invalid-credential' || 
                error.code === 'auth/user-not-found' || 
                error.code === 'auth/wrong-password') {
                
                showToast("⚠️ Credenciales no autorizadas", "error");
            
            } else if (error.code === 'auth/too-many-requests') {
                showToast("⏳ Demasiados intentos. Espera un momento.", "error");
            } else {
                // Cualquier otro error raro
                showToast("Error de acceso: " + error.message, "error");
            }
        });
}

function logoutAdmin() {
    signOut(auth).then(() => {
        closeModal('dashboard-modal');
        closeModal('admin-modal');
        showToast("Has cerrado sesión.", "info");
        f
    });
}

/* =========================================
   7. RENDERIZADO (UI)
========================================= */

/* EN js/main.js - Reemplaza la función updateCategoryDropdowns */

function updateCategoryDropdowns() {
    // 1. Llenar los SELECTS DE LOS MODALES (Admin/Editar)
    const optionsHTML = `<option value="">Seleccione...</option>` + 
        categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    
    if(document.getElementById('prod-category')) document.getElementById('prod-category').innerHTML = optionsHTML;
    if(document.getElementById('edit-category')) document.getElementById('edit-category').innerHTML = optionsHTML;

    // 2. Llenar el SELECT PRINCIPAL (El del Catálogo)
    // Nota: Usamos el mismo ID que tenías para no romper nada
    const mainSelect = document.getElementById('mobile-category-select');
    
    if(mainSelect) {
        let mobileHtml = `<option value="all">Ver Todo el Catálogo</option>`;
        categories.forEach(cat => {
            mobileHtml += `<option value="${cat.name}"> ${cat.name}</option>`;
        });
        mainSelect.innerHTML = mobileHtml;

        // Escuchar cambios
        mainSelect.onchange = (e) => {
            currentCategoryFilter = e.target.value;
            renderProducts();
            showToast(`Filtrando por: ${currentCategoryFilter === 'all' ? 'Todo' : currentCategoryFilter}`, 'info');
        };
    }
}

window.selectCategory = (element, category) => {
    document.querySelectorAll('#category-list li').forEach(li => li.classList.remove('active'));
    element.classList.add('active');
    currentCategoryFilter = category;
    renderProducts();
}

function renderProducts() {
    const container = document.getElementById('products-container');
    const filtered = currentCategoryFilter === 'all' ? products : products.filter(p => p.category === currentCategoryFilter);
        
    if (filtered.length === 0) {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px;"><p>No hay productos aquí.</p></div>`;
        return;
    }

    container.innerHTML = filtered.map(p => `
        <div class="product-card fade-in">
            ${currentUser ? `<button onclick="openEditModal('${p.firestoreId}')" style="position:absolute; top:10px; right:10px; z-index:10; cursor:pointer;">✏️</button>` : ''}
            <div class="product-img-wrapper">
                <img src="${p.image}" class="product-img" onerror="this.onerror=null;this.src='https://dummyimage.com/300x220/ccc/000&text=Foto'">
            </div>
            <div class="product-info">
                <span class="product-category">${p.category}</span>
                <h3 class="product-title">${p.name}</h3>
                <div class="product-footer">
                    <div class="product-price">$${p.price.toFixed(2)}</div>
                    <button class="add-btn" onclick="addToCart('${p.firestoreId}')"><i class="fas fa-cart-plus"></i></button>
                </div>
            </div>
        </div>
    `).join('');
}

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
                <button onclick="askDeleteConfirmation('${p.firestoreId}')" style="background:var(--danger); color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Borrar</button>
            </div>
        `).join('');
    }
    closeModal('dashboard-modal'); 
    openModal('delete-list-modal'); 
};

/* =========================================
   8. LISTENERS
========================================= */
function initEventListeners() {
    // Menú móvil
    const menuToggle = document.getElementById('mobile-menu');
    if(menuToggle) {
        menuToggle.addEventListener('click', () => {
            document.getElementById('nav-list').classList.toggle('active');
        });
    }

    // BOTÓN IDP - Aquí está la lógica importante
    const btnIDP = document.getElementById('btn-login-idp');
    if(btnIDP) {
        btnIDP.addEventListener('click', () => {
            if(currentUser) {
                openModal('dashboard-modal'); // Si ya estás logueado -> Dashboard
            } else {
                openModal('login-modal'); // Si NO estás logueado -> Login
            }
        });
    }

    // Botones de Logout
    const dashLogout = document.getElementById('dashboard-logout');
    if(dashLogout) dashLogout.addEventListener('click', logoutAdmin);
    
    const adminLogout = document.getElementById('admin-logout');
    if(adminLogout) adminLogout.addEventListener('click', logoutAdmin);

    // Formulario Login
    const loginForm = document.getElementById('login-form');
    if(loginForm) {
        loginForm.addEventListener('click', (e) => {
            // Prevenir cierre si click adentro
            e.stopPropagation();
        });
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('username').value;
            const pass = document.getElementById('password').value;
            loginAdmin(email, pass);
        });
    }

    // Formulario Categoría
    const catForm = document.getElementById('category-form');
    if(catForm) {
        catForm.addEventListener('submit', (e) => {
            e.preventDefault();
            addCategoryToDB(document.getElementById('cat-name').value);
            e.target.reset();
        });
    }

    // Formulario Producto
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
    
    // Formulario Editar
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

    // Funciones globales para cerrar modales
    window.closeModal = (id) => document.getElementById(id).style.display = 'none';
    window.openModal = (id) => document.getElementById(id).style.display = 'flex';
    
    // Listeners de cierre (X)
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

    // Cerrar al dar click fuera
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            e.target.style.display = 'none';
        }
    });

    // Carrito
    window.toggleCart = () => {
        const m = document.getElementById('cart-modal');
        m.style.display = m.style.display === 'flex' ? 'none' : 'flex';
    };
    
    window.addToCart = (id) => {
        const p = products.find(x => x.firestoreId === id);
        if(p) { cart.push(p); updateCartUI(); }
    };
    
    window.removeFromCart = (i) => { cart.splice(i, 1); updateCartUI(); };
    
    window.openEditModal = (id) => {
        const p = products.find(x => x.firestoreId === id);
        if(!p) return;
        document.getElementById('edit-id').value = id;
        document.getElementById('edit-name').value = p.name;
        document.getElementById('edit-category').value = p.category;
        document.getElementById('edit-price').value = p.price;
        document.getElementById('edit-image').value = p.image;
        document.getElementById('btn-delete-product').onclick = () => askDeleteConfirmation(id);
    };
}

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
                <span>$${p.price.toFixed(2)} <b onclick="removeFromCart(${i})" style="color:red; cursor:pointer;">x</b></span>
            </div>`;
        }).join('');
        document.getElementById('cart-total').innerText = "$" + total.toFixed(2);
        
        // --- INICIO DEL CAMBIO DE FORMATO WHATSAPP ---
        let msg = "Hola Sky Automation, estoy interesado en el siguiente pedido:%0A%0A";

        // Recorremos el carrito agregando asteriscos y saltos de línea (%0A)
        cart.forEach(p => {
            msg += `* ${p.name} - $${p.price.toFixed(2)}%0A`;
        });

        // Agregamos el total en mayúsculas y el mensaje de cierre
        msg += `%0ATOTAL A PAGAR: $${total.toFixed(2)}%0A%0A`;
        msg += "Quedo atento para coordinar el pago y la entrega.";

        document.getElementById('whatsapp-btn').href = `https://wa.me/${whatsappNumber}?text=${msg}`;
        // --- FIN DEL CAMBIO ---

        document.getElementById('whatsapp-btn').classList.remove('disabled');
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
   9. SISTEMA DE NOTIFICACIONES (TOASTS) - VERSIÓN ROBUSTA
========================================= */
window.showToast = (message, type = 'info') => {
    const container = document.getElementById('toast-container');
    
    // Crear el elemento
    const toast = document.createElement('div');
    toast.classList.add('toast', type);
    
    // Icono según el tipo
    let icon = 'fa-info-circle';
    if(type === 'success') icon = 'fa-check-circle';
    if(type === 'error') icon = 'fa-exclamation-circle';

    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;

    // Agregar al DOM
    container.appendChild(toast);

    // LÓGICA DE ELIMINACIÓN SEGURA
    // 1. Esperar el tiempo de lectura (3 segundos = 3000ms)
    setTimeout(() => {
        // 2. Activar la animación de salida visual
        toast.classList.add('hiding'); 

        // 3. Esperar a que termine la animación de salida (500ms) y FORZAR la eliminación
        // Esto reemplaza al 'transitionend' que estaba fallando
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 500); // 500ms coincide con la duración visual de la transición

    }, 2000); 
};

// Agrega esto al final de tu archivo main.js, 
// junto con las otras funciones que expusimos (como window.openModal)

window.deleteProductFromDB = deleteProductFromDB;

let idToDelete = null; // Variable para recordar qué vamos a borrar
window.askDeleteConfirmation = (id) => {
    idToDelete = id; // Guardamos el ID
    openModal('confirmation-modal'); // Abrimos la ventanita bonita
};

// Listener para el botón "Sí, borrar" del nuevo modal
document.getElementById('btn-confirm-delete').addEventListener('click', () => {
    if (idToDelete) {
        deleteProductFromDB(idToDelete); // Llamamos a la función real
        closeModal('confirmation-modal'); // Cerramos el modal
        idToDelete = null; // Limpiamos la variable
    }
});