// ===== SISTEMA DE AUTENTICACIÓN GLOBAL =====
// Este archivo maneja la autenticación en todas las páginas de la web

// Variables globales
let currentUser = null;
let currentSession = null;
let isUserLoggedIn = false;

// ===== FUNCIONES DE UI =====

// Función para obtener nombre para mostrar
function getDisplayName(user) {
    return user.user_metadata?.full_name || 
           user.email?.split('@')[0] || 
           'Usuario';
}

// Función para actualizar UI cuando usuario está logueado
function setLoggedInUI(user) {
    console.log('🎨 [AUTH GLOBAL] Configurando UI para usuario logueado:', user.email);
    
    const loginBtn = document.getElementById("login-btn");
    const loginBtnText = document.getElementById("login-btn-text");
    const userDropdown = document.getElementById("user-dropdown");
    const dropdownUsername = document.getElementById("dropdown-username");
    const logoutBtn = document.getElementById("logout-btn");
    
    const nombre = getDisplayName(user);

    // Actualizar botón de login para mostrar nombre de usuario en naranja
    if (loginBtnText) {
        loginBtnText.innerHTML = `<span class="user-name" style="color: #FF8500; font-weight: 600;">${nombre}</span>`;
    }
    if (dropdownUsername) {
        dropdownUsername.innerHTML = nombre;
    }

    // Configurar funcionalidad del dropdown
    if (loginBtn) {
        loginBtn.removeAttribute('href');
        loginBtn.style.cursor = "pointer";
        
        // Remover event listeners anteriores
        const newLoginBtn = loginBtn.cloneNode(true);
        loginBtn.parentNode.replaceChild(newLoginBtn, loginBtn);
        
        // Agregar nuevo event listener
        newLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const dropdown = document.getElementById("user-dropdown");
            if (dropdown) {
                dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
            }
        });
    }

    // Configurar logout con Supabase
    if (logoutBtn) {
        // Remover event listeners anteriores
        const newLogoutBtn = logoutBtn.cloneNode(true);
        logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
        
        newLogoutBtn.addEventListener("click", async () => {
            const confirmar = confirm("¿De verdad quieres cerrar sesión?");
            if (!confirmar) return;

            try {
                console.log('🔓 [AUTH GLOBAL] Cerrando sesión con Supabase...');
                await window.supabaseAuth.signOut();
                console.log('✅ [AUTH GLOBAL] Sesión cerrada exitosamente');
                location.reload();
            } catch (error) {
                console.error('❌ [AUTH GLOBAL] Error cerrando sesión:', error);
                alert('Error cerrando sesión. Inténtalo de nuevo.');
            }
        });
    }

    // Cerrar dropdown al hacer clic fuera
    document.addEventListener("click", function (e) {
        const loginContainer = document.querySelector(".login-container");
        const dropdown = document.getElementById("user-dropdown");
        if (loginContainer && dropdown && !loginContainer.contains(e.target)) {
            dropdown.style.display = "none";
        }
    });

    // Actualizar elementos específicos de index.html si existen
    updateIndexSpecificElements(user, nombre);
}

// Función para actualizar elementos específicos de index.html
function updateIndexSpecificElements(user, nombre) {
    const welcomeMessage = document.getElementById("welcome-message");
    const welcomeSubtitle = document.getElementById("welcome-subtitle");
    const heroTitle = document.getElementById("hero-title");
    const heroSubtitle = document.getElementById("hero-subtitle");

    if (welcomeMessage) {
        const saludo = `🏀 Bienvenido de nuevo, <span class="user-name">${nombre}</span>!`;
        welcomeMessage.innerHTML = saludo;
        welcomeMessage.style.display = "";
    }
    if (welcomeSubtitle) {
        welcomeSubtitle.innerText = "Explora tus equipos, estadísticas y novedades de la FEB.";
        welcomeSubtitle.style.display = "";
    }
    if (heroTitle) heroTitle.style.display = "none";
    if (heroSubtitle) heroSubtitle.style.display = "none";
}

// Función para actualizar UI cuando usuario NO está logueado
function setLoggedOutUI() {
    console.log('🎨 [AUTH GLOBAL] Configurando UI para usuario no logueado');

    const loginBtn = document.getElementById("login-btn");
    const loginBtnText = document.getElementById("login-btn-text");
    const userDropdown = document.getElementById("user-dropdown");
    
    // Restaurar botón de login normal
    if (loginBtnText) {
        loginBtnText.innerText = "Login";
        loginBtnText.style.color = ""; // Restaurar color normal
    }
    if (loginBtn) {
        loginBtn.href = "Login/login.html";
        loginBtn.style.cursor = "pointer";
    }
    if (userDropdown) {
        userDropdown.style.display = "none";
    }

    // Actualizar elementos específicos de index.html si existen
    updateIndexSpecificElementsLoggedOut();
}

// Función para actualizar elementos específicos de index.html cuando no hay usuario
function updateIndexSpecificElementsLoggedOut() {
    const welcomeMessage = document.getElementById("welcome-message");
    const welcomeSubtitle = document.getElementById("welcome-subtitle");
    const heroTitle = document.getElementById("hero-title");
    const heroSubtitle = document.getElementById("hero-subtitle");

    if (welcomeMessage) welcomeMessage.style.display = "none";
    if (welcomeSubtitle) welcomeSubtitle.style.display = "none";
    if (heroTitle) heroTitle.style.display = "";
    if (heroSubtitle) heroSubtitle.style.display = "";
}

// ===== FUNCIÓN PRINCIPAL DE AUTENTICACIÓN =====

// Función principal para inicializar autenticación
async function initializeGlobalAuth() {
    console.log('🚀 [AUTH GLOBAL] Inicializando autenticación global...');

    if (!window.supabaseAuth) {
        console.error('🚨 [AUTH GLOBAL] supabaseAuth no está disponible');
        setLoggedOutUI();
        return;
    }

    try {
        // Obtener sesión actual
        currentSession = await window.supabaseAuth.getCurrentSession();
        currentUser = currentSession?.user || null;
        isUserLoggedIn = !!currentUser;

        if (currentUser) {
            // Usuario autenticado
            console.log('✅ [AUTH GLOBAL] Usuario autenticado detectado:', currentUser.email);
            setLoggedInUI(currentUser);
        } else {
            // Usuario no autenticado
            console.log('📝 [AUTH GLOBAL] No hay usuario autenticado');
            setLoggedOutUI();
        }
    } catch (error) {
        console.error('❌ [AUTH GLOBAL] Error inicializando auth:', error);
        setLoggedOutUI();
    }

    // Escuchar cambios en el estado de autenticación
    if (window.supabaseAuth.onAuthStateChange) {
        window.supabaseAuth.onAuthStateChange((event, session) => {
            console.log('🔔 [AUTH GLOBAL] Cambio de estado de auth:', event);
            
            if (event === 'SIGNED_IN' && session?.user) {
                currentUser = session.user;
                currentSession = session;
                isUserLoggedIn = true;
                setLoggedInUI(currentUser);
            } else if (event === 'SIGNED_OUT') {
                currentUser = null;
                currentSession = null;
                isUserLoggedIn = false;
                setLoggedOutUI();
            }
        });
    }
}

// ===== AUTO-INICIALIZACIÓN =====

// Función para inicializar cuando el DOM y Supabase estén listos
function startGlobalAuth() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('📄 [AUTH GLOBAL] DOM cargado, esperando Supabase...');
            setTimeout(() => {
                initializeGlobalAuth();
            }, 200);
        });
    } else {
        // DOM ya está listo
        console.log('📄 [AUTH GLOBAL] DOM ya listo, esperando Supabase...');
        setTimeout(() => {
            initializeGlobalAuth();
        }, 200);
    }
}

// ===== FUNCIONES PÚBLICAS =====

// Funciones disponibles globalmente
window.globalAuth = {
    getCurrentUser: () => currentUser,
    getCurrentSession: () => currentSession,
    isLoggedIn: () => isUserLoggedIn,
    refresh: initializeGlobalAuth
};

// Inicializar automáticamente
startGlobalAuth();

console.log('📦 [AUTH GLOBAL] Sistema de autenticación global cargado');