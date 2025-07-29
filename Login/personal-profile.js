// === AUTENTICACIÓN CON STRAPI ===
const API_URL = "http://localhost:1337/api"; // Cambiar si usas dominio distinto
const tokenKey = "jwt_token";

// Variables globales
let currentUser = null;
let isUserLoggedIn = false;
let authSystem = "local"; // Declarar la variable global correctamente

// Función para inicializar autenticación
async function initializeAuth() {
    const token = localStorage.getItem("jwt"); // sistema local
    const user = JSON.parse(localStorage.getItem("user"));

    const loginBtn = document.getElementById("login-btn");
    const loginBtnText = document.getElementById("login-btn-text");
    const userDropdown = document.getElementById("user-dropdown");
    const dropdownUsername = document.getElementById("dropdown-username");
    const logoutBtn = document.getElementById("logout-btn");

    // SISTEMA LOCAL
    if (token && user) {
        const nombre = user.username || user.email.split('@')[0];
        currentUser = user;
        isUserLoggedIn = true;
        authSystem = "local";

        if (loginBtnText) loginBtnText.innerHTML = `<span class="user-name">${nombre}</span>`;
        if (dropdownUsername) dropdownUsername.innerHTML = nombre;

        if (loginBtn) {
            loginBtn.removeAttribute('href');
            loginBtn.style.cursor = "pointer";
            loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                userDropdown.style.display = userDropdown.style.display === "block" ? "none" : "block";
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener("click", () => {
                const confirmar = confirm("¿De verdad quieres cerrar sesión?");
                if (!confirmar) return;
                localStorage.removeItem("jwt");
                localStorage.removeItem("user");
                window.location.href = "../index.html";
            });
        }

        document.addEventListener("click", function (e) {
            const loginContainer = document.querySelector(".login-container");
            if (loginContainer && !loginContainer.contains(e.target)) {
                userDropdown.style.display = "none";
            }
        });

        console.log("✅ Usuario autenticado (sistema local):", currentUser);
        return;
    }

    // SISTEMA STRAPI
    const jwt = localStorage.getItem(tokenKey);
    if (!jwt) {
        if (loginBtnText) loginBtnText.textContent = "Login";
        if (loginBtn) {
            loginBtn.href = "login.html";
            loginBtn.style.cursor = "pointer";
        }
        return;
    }

    try {
        const res = await fetch(`${API_URL}/users/me`, {
            headers: {
                Authorization: `Bearer ${jwt}`,
            },
        });

        if (!res.ok) throw new Error("Token inválido");

        const data = await res.json();
        currentUser = data;
        isUserLoggedIn = true;
        authSystem = "strapi";

        const nombre = data.username || data.email || "Usuario";
        if (loginBtnText) loginBtnText.innerHTML = `<span class="user-name">${nombre}</span>`;
        if (dropdownUsername) dropdownUsername.innerHTML = nombre;

        if (loginBtn) {
            loginBtn.removeAttribute("href");
            loginBtn.style.cursor = "pointer";
            loginBtn.addEventListener("click", function (e) {
                e.preventDefault();
                userDropdown.style.display = userDropdown.style.display === "block" ? "none" : "block";
            });
        }

        document.addEventListener("click", function (e) {
            const loginContainer = document.querySelector(".login-container");
            if (loginContainer && !loginContainer.contains(e.target)) {
                userDropdown.style.display = "none";
            }
        });

        if (logoutBtn) {
            logoutBtn.addEventListener("click", () => {
                const confirmar = confirm("¿De verdad quieres cerrar sesión?");
                if (!confirmar) return;
                localStorage.removeItem(tokenKey);
                window.location.href = "../index.html";
            });
        }

        console.log("✅ Usuario autenticado (Strapi):", currentUser);
    } catch (error) {
        console.error("❌ Error de autenticación:", error);
        localStorage.removeItem(tokenKey);
        if (loginBtnText) loginBtnText.textContent = "Login";
        if (loginBtn) {
            loginBtn.href = "login.html";
            loginBtn.style.cursor = "pointer";
        }
    }
}

// Función para cargar datos del perfil guardados
async function loadSavedProfileData() {
    console.log('📥 Cargando datos del perfil guardados...');
    
    // Verificar qué sistema de autenticación usar
    const mainToken = localStorage.getItem("jwt");
    const mainUser = JSON.parse(localStorage.getItem("user") || "null");
    const strapiToken = localStorage.getItem(tokenKey);
    
    if (mainToken && mainUser) {
        // Sistema principal - cargar de localStorage
        const savedProfile = localStorage.getItem('userProfile');
        if (savedProfile) {
            try {
                const profileData = JSON.parse(savedProfile);
                console.log('✅ Datos del perfil encontrados en localStorage:', profileData);
                
                // Mapeo de campos localStorage -> HTML form
                const fieldMapping = {
                    'firstName': 'firstName',
                    'lastName': 'lastName', 
                    'country': 'country',
                    'address': 'address',
                    'city': 'city',
                    'postalCode': 'postalCode',
                    'phone': 'phone',
                    'birthDate': 'birthDate'
                };
                
                // Rellenar el formulario con los datos guardados
                Object.keys(fieldMapping).forEach(localStorageKey => {
                    const formFieldName = fieldMapping[localStorageKey];
                    const input = document.querySelector(`[name="${formFieldName}"]`);
                    if (input && profileData[localStorageKey]) {
                        input.value = profileData[localStorageKey];
                    }
                });
                
                console.log('✅ Formulario rellenado con datos guardados');
            } catch (error) {
                console.error('❌ Error parseando datos del perfil:', error);
            }
        }
    } else if (strapiToken && currentUser?.id) {
        // Sistema Strapi - cargar de la API
        try {
            const collection = "usuario";
            const query = `filters[user][id][$eq]=${currentUser.id}&populate=*`;
            
            const response = await fetch(`${API_URL}/${collection}?${query}`, {
                headers: {
                    Authorization: `Bearer ${strapiToken}`
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                const profileData = result?.data?.[0]?.attributes;
                
                if (profileData) {
                    console.log('✅ Datos del perfil encontrados en Strapi:', profileData);
                    
                    // Mapeo de campos Strapi -> HTML form  
                    const strapiFieldMapping = {
                        'nombre': 'firstName',
                        'apellido': 'lastName',
                        'pais': 'country', 
                        'direccion': 'address',
                        'ciudad': 'city',
                        'codigo_postal': 'postalCode',
                        'telefono': 'phone',
                        'fecha_nacimiento': 'birthDate',
                        'email': 'email'
                    };
                    
                    // Rellenar el formulario con los datos de Strapi
                    Object.keys(strapiFieldMapping).forEach(strapiField => {
                        const formFieldName = strapiFieldMapping[strapiField];
                        const input = document.querySelector(`[name="${formFieldName}"]`);
                        if (input && profileData[strapiField]) {
                            // Formatear fecha si es necesario
                            if (strapiField === 'fecha_nacimiento' && profileData[strapiField]) {
                                const date = new Date(profileData[strapiField]);
                                input.value = date.toISOString().split('T')[0];
                            } else {
                                input.value = profileData[strapiField];
                            }
                        }
                    });
                    
                    console.log('✅ Formulario rellenado con datos de Strapi');
                }
            }
        } catch (error) {
            console.error('❌ Error cargando datos del perfil desde Strapi:', error);
        }
    }
}

// Función para configurar event listeners
function setupEventListeners() {
    // Menu hamburguesa
    const menuToggle = document.getElementById('menuToggle');
    const mainNav = document.querySelector('.main-nav');

    if (menuToggle && mainNav) {
        menuToggle.addEventListener('click', function() {
            mainNav.classList.toggle('active');
            menuToggle.classList.toggle('active');
            
            // Crear overlay si no existe
            let overlay = document.querySelector('.overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'overlay';
                document.body.appendChild(overlay);
            }
            overlay.classList.toggle('active');
        });

        // Cerrar menú al hacer clic en el overlay
        document.addEventListener('click', function(event) {
            const overlay = document.querySelector('.overlay');
            if (overlay && overlay.classList.contains('active') && event.target === overlay) {
                mainNav.classList.remove('active');
                menuToggle.classList.remove('active');
                overlay.classList.remove('active');
            }
        });
    }

    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            console.log('🔄 Cambiando a pestaña:', tabName);
            
            // Remove active class from all buttons
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            button.classList.add('active');
            
            // Hide all tab contents
            document.querySelectorAll('.tab-content').forEach(content => {
                content.style.display = 'none';
            });
            
            // Show selected tab content
            const targetContent = document.getElementById(tabName + '-content');
            if (targetContent) {
                targetContent.style.display = 'block';
                
                // Inicializar pestaña de equipos cuando se active
                if (tabName === 'equipos') {
                    console.log('🏀 Pestaña equipos activada, inicializando...');
                    setTimeout(() => {
                        initializeTeamsTab();
                    }, 50);
                }
            }
        });
    });

    // Edit functionality
    const editButton = document.getElementById('editButton');
    const formActions = document.getElementById('formActions');
    const readonlyInputs = document.querySelectorAll('#profileForm input[readonly]');
    const disabledSelects = document.querySelectorAll('#profileForm select[disabled]');
    const cancelButton = document.getElementById('cancelButton');
    const profileForm = document.getElementById('profileForm');
    const successMessage = document.getElementById('successMessage');

    let originalValues = {};

    if (editButton) {
        editButton.addEventListener('click', () => {
            // Save original values
            const allInputs = document.querySelectorAll('#profileForm input, #profileForm select');
            allInputs.forEach(input => {
                originalValues[input.name] = input.value;
            });

            // Enable editing
            readonlyInputs.forEach(input => {
                if (input.id !== 'email') { // Keep email readonly
                    input.removeAttribute('readonly');
                }
            });
            
            disabledSelects.forEach(select => {
                select.removeAttribute('disabled');
            });

            // Show form actions
            if (formActions) formActions.style.display = 'flex';
            editButton.style.display = 'none';
        });
    }

    if (cancelButton) {
        cancelButton.addEventListener('click', () => {
            // Restore original values
            Object.keys(originalValues).forEach(name => {
                const input = document.querySelector(`[name="${name}"]`);
                if (input) {
                    input.value = originalValues[name];
                }
            });

            // Disable editing
            readonlyInputs.forEach(input => {
                input.setAttribute('readonly', '');
            });
            
            disabledSelects.forEach(select => {
                select.setAttribute('disabled', '');
            });

            // Hide form actions
            if (formActions) formActions.style.display = 'none';
            if (editButton) editButton.style.display = 'flex';
            if (successMessage) successMessage.style.display = 'none';
        });
    }

    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            console.log('📝 Intentando guardar cambios...');
            console.log('🔑 Sistema de autenticación actual:', authSystem);
            console.log('👤 Usuario actual:', currentUser);
            
            // Verificar autenticación
            if (!isUserLoggedIn || !currentUser) {
                alert("Usuario no autenticado. Por favor, inicia sesión nuevamente.");
                window.location.href = "login.html";
                return;
            }
            
            // Determinar qué sistema de autenticación usar
            let authToken = null;
            let userId = null;
            let useMainSystem = false;
            
            if (authSystem === "strapi") {
                console.log("🔐 Usando sistema de autenticación Strapi");
                authToken = localStorage.getItem(tokenKey);
                userId = currentUser.id;
                useMainSystem = false;
            } else if (authSystem === "local") {
                console.log("🔐 Usando sistema de autenticación principal");
                authToken = localStorage.getItem("jwt");
                userId = currentUser.email;
                useMainSystem = true;
            } else {
                alert("Error de sistema de autenticación. Por favor, inicia sesión nuevamente.");
                window.location.href = "login.html";
                return;
            }
            
            // Mostrar estado de carga
            profileForm.classList.add("loading");
            if (successMessage) successMessage.style.display = "none";
            
            try {
                // Recopilar datos del formulario
                const formData = new FormData(profileForm);
                const data = Object.fromEntries(formData.entries());
                console.log('📝 Datos a guardar:', data);
                console.log('🔑 Sistema de auth:', useMainSystem ? 'Principal' : 'Strapi');
                
                if (useMainSystem) {
                    // Para el sistema principal, guardamos en localStorage por ahora
                    console.log('💾 Guardando datos en localStorage...');
                    
                    const profileData = {
                        ...data,
                        userId: userId,
                        lastUpdated: new Date().toISOString()
                    };
                    
                    localStorage.setItem('userProfile', JSON.stringify(profileData));
                    
                    // Simular un pequeño delay para mostrar el estado de carga
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    console.log("✅ Datos guardados en localStorage:", profileData);
                    
                    // Mostrar éxito y restablecer interfaz
                    profileForm.classList.remove("loading");
                    readonlyInputs.forEach(input => input.setAttribute("readonly", ""));
                    disabledSelects.forEach(select => select.setAttribute("disabled", ""));
                    if (formActions) formActions.style.display = "none";
                    if (editButton) editButton.style.display = "flex";
                    
                    if (successMessage) {
                        successMessage.style.display = "block";
                        setTimeout(() => {
                            if (successMessage) successMessage.style.display = "none";
                        }, 5000);
                    }
                    
                    alert("✅ Perfil actualizado correctamente");
                    
                } else {
                    // Sistema Strapi original
                    const collection = "usuario";
                    
                    // Paso 1: Verificar si ya existe un registro para este usuario
                    const query = `filters[user][id][$eq]=${userId}`;
                    console.log('🔍 Buscando registro existente en Strapi...');
                    
                    const searchRes = await fetch(`${API_URL}/${collection}?${query}`, {
                        headers: {
                            Authorization: `Bearer ${authToken}`
                        }
                    });
                    
                    if (!searchRes.ok) {
                        throw new Error(`Error al buscar datos existentes: ${searchRes.status}`);
                    }
                    
                    const searchJson = await searchRes.json();
                    const existingEntry = searchJson?.data?.[0];
                    
                    // Paso 2: Mapear campos del formulario a nombres de Strapi
                    const formToStrapiMapping = {
                        'firstName': 'nombre',
                        'lastName': 'apellido', 
                        'country': 'pais',
                        'address': 'direccion',
                        'city': 'ciudad',
                        'postalCode': 'codigo_postal',
                        'phone': 'telefono',
                        'birthDate': 'fecha_nacimiento',
                        'email': 'email'
                    };
                    
                    // Convertir datos del formulario a nombres de Strapi
                    const strapiData = {};
                    Object.keys(data).forEach(formField => {
                        const strapiField = formToStrapiMapping[formField];
                        if (strapiField && data[formField]) {
                            // Convertir a número si es necesario
                            if (strapiField === 'codigo_postal' || strapiField === 'telefono') {
                                const numValue = parseInt(data[formField]);
                                if (!isNaN(numValue)) {
                                    strapiData[strapiField] = numValue;
                                }
                            } else {
                                strapiData[strapiField] = data[formField];
                            }
                        }
                    });
                    
                    // Paso 3: Preparar datos para enviar
                    const body = {
                        data: {
                            ...strapiData,
                            user: userId // Relación con el usuario de Strapi
                        }
                    };
                    
                    console.log('💾 Preparando para guardar en Strapi:', {
                        method: existingEntry ? 'UPDATE' : 'CREATE',
                        existingId: existingEntry?.id,
                        body
                    });
                    
                    // Paso 3: Crear o actualizar
                    const method = existingEntry ? "PUT" : "POST";
                    const endpoint = existingEntry 
                        ? `${API_URL}/${collection}/${existingEntry.id}`
                        : `${API_URL}/${collection}`;
                    
                    const saveRes = await fetch(endpoint, {
                        method,
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${authToken}`
                        },
                        body: JSON.stringify(body)
                    });
                    
                    if (!saveRes.ok) {
                        const errorData = await saveRes.json().catch(() => ({}));
                        console.error('❌ Error del servidor:', errorData);
                        throw new Error(`Error del servidor: ${saveRes.status} ${saveRes.statusText}`);
                    }
                    
                    const result = await saveRes.json();
                    console.log("✅ Datos guardados correctamente en Strapi:", result);
                    
                    // Mostrar éxito y restablecer interfaz
                    profileForm.classList.remove("loading");
                    readonlyInputs.forEach(input => input.setAttribute("readonly", ""));
                    disabledSelects.forEach(select => select.setAttribute("disabled", ""));
                    if (formActions) formActions.style.display = "none";
                    if (editButton) editButton.style.display = "flex";
                    
                    if (successMessage) {
                        successMessage.style.display = "block";
                        setTimeout(() => {
                            if (successMessage) successMessage.style.display = "none";
                        }, 5000);
                    }
                    
                    alert("✅ Perfil actualizado correctamente");
                }
                
            } catch (error) {
                console.error("❌ Error guardando datos:", error);
                profileForm.classList.remove("loading");
                
                // Mostrar error específico al usuario
                let errorMessage = "Error guardando los datos. ";
                if (error.message.includes('404')) {
                    errorMessage += "La colección 'usuarios-personales' no existe en Strapi.";
                } else if (error.message.includes('403')) {
                    errorMessage += "No tienes permisos para guardar estos datos.";
                } else if (error.message.includes('401')) {
                    errorMessage += "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.";
                } else {
                    errorMessage += error.message;
                }
                
                alert(errorMessage);
                
                // Si es error de autenticación, redirigir al login
                if (error.message.includes('401') || error.message.includes('403')) {
                    localStorage.removeItem(tokenKey);
                    window.location.href = "login.html";
                }
            }
        });
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Inicializando aplicación...');
    
    await initializeAuth();
    await loadSavedProfileData();
    
    // Initialize the page with the profile tab active
    const perfilContent = document.getElementById('perfil-content');
    if (perfilContent) {
        perfilContent.style.display = 'block';
    }
    
    setupEventListeners();
});

// ===== FUNCIONALIDAD DE EQUIPOS FAVORITOS (SIMPLIFICADA) =====
let allTeams = [];
let favoriteTeams = JSON.parse(localStorage.getItem('favoriteTeams') || '[]');

function initializeTeamsTab() {
    console.log('🏀 Inicializando pestaña de equipos...');
    // Funcionalidad básica de equipos aquí
}

// Hacer las funciones globales para onclick en HTML
window.toggleFavoriteTeam = function(teamId, competition, teamName, teamLogo) {
    console.log('Toggle favorite team:', teamId, competition);
};

window.removeFavoriteTeam = function(teamId, competition) {
    console.log('Remove favorite team:', teamId, competition);
};

window.selectTeamFromDropdown = function(teamName, competition) {
    console.log('Select team from dropdown:', teamName, competition);
};