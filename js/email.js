/* --- CONFIGURACIÓN DE EMAILJS --- */

// 1. REEMPLAZA ESTAS 3 VARIABLES CON TUS DATOS REALES
// (Mantenlas entre comillas " ")
const PUBLIC_KEY = "vi69N1wbK-k5D6Khl";   // Ej: "user_aBc123..."
const SERVICE_ID = "service_6ru6bqh";   // Ej: "service_z3x9..."
const TEMPLATE_ID = "template_v5f35js"; // Ej: "template_a1b..."
/* --- FUNCIÓN PARA MOSTRAR NOTIFICACIONES (TOAST) --- */
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    
    // Crear el elemento
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Icono según el tipo
    const icon = type === 'success' ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-exclamation-circle"></i>';
    
    toast.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
            ${icon}
            <span>${message}</span>
        </div>
    `;

    // Agregar al contenedor
    container.appendChild(toast);

    // Eliminar automáticamente después de 4 segundos
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.5s ease forwards';
        // Esperar a que termine la animación para remover del DOM
        setTimeout(() => {
            toast.remove();
        }, 500);
    }, 4000);
}

/* --- INICIALIZACIÓN --- */
(function() {
    if (typeof emailjs === "undefined") {
        console.error("ERROR CRÍTICO: La librería EmailJS no se ha cargado.");
        return;
    }
    emailjs.init(PUBLIC_KEY);
})();

/* --- MANEJO DEL FORMULARIO --- */
const btn = document.getElementById('button-send');

document.getElementById('contact-form')
  .addEventListener('submit', function(event) {
    event.preventDefault();

    // Feedback visual en el botón
    const originalText = btn.value;
    btn.value = 'ENVIANDO...';
    btn.style.opacity = '0.7';
    btn.disabled = true;

    // Enviar formulario
    emailjs.sendForm(SERVICE_ID, TEMPLATE_ID, this)
      .then(() => {
        // --- ÉXITO ---
        showToast("Mensaje enviado exitosamente.", "success");
        
        // Limpiar formulario
        document.getElementById('contact-form').reset();
        
        // Restaurar botón
        btn.value = 'MENSAJE ENVIADO';
        setTimeout(() => {
            btn.value = originalText;
            btn.disabled = false;
            btn.style.opacity = '1';
        }, 3000);

      }, (err) => {
        // --- ERROR ---
        console.error("Error al enviar:", err);
        showToast("Error al enviar el mensaje. Intente nuevamente.", "error");
        
        // Restaurar botón
        btn.value = originalText;
        btn.disabled = false;
        btn.style.opacity = '1';
      });
});