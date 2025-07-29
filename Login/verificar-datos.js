// 🔍 SCRIPT DE VERIFICACIÓN DE DATOS DEL PERFIL
// Ejecuta este script en la consola del navegador para ver tus datos

console.log('🚀 VERIFICACIÓN DE DATOS DEL PERFIL');
console.log('=====================================');

// Verificar sistema de autenticación
const mainToken = localStorage.getItem("jwt");
const mainUser = localStorage.getItem("user");
const strapiToken = localStorage.getItem("jwt_token");
const profileData = localStorage.getItem("userProfile");

console.log('\n📡 TOKENS DE AUTENTICACIÓN:');
console.log('- Token principal (jwt):', mainToken ? '✅ Presente' : '❌ No encontrado');
console.log('- Usuario principal (user):', mainUser ? '✅ Presente' : '❌ No encontrado');
console.log('- Token Strapi (jwt_token):', strapiToken ? '✅ Presente' : '❌ No encontrado');

console.log('\n🎯 SISTEMA ACTIVO:');
if (mainToken && mainUser) {
    console.log('✅ SISTEMA PRINCIPAL - Datos en localStorage');
    
    const user = JSON.parse(mainUser);
    console.log('👤 Usuario actual:', user.username || user.email?.split('@')[0] || 'Sin nombre');
    
    if (profileData) {
        console.log('\n📄 DATOS DEL PERFIL GUARDADOS:');
        const profile = JSON.parse(profileData);
        console.table(profile);
        
        console.log('\n📊 RESUMEN DEL PERFIL:');
        console.log('- Nombre:', profile.firstName || 'No especificado');
        console.log('- Apellido:', profile.lastName || 'No especificado');
        console.log('- País:', profile.country || 'No especificado');
        console.log('- Ciudad:', profile.city || 'No especificado');
        console.log('- Teléfono:', profile.phone || 'No especificado');
        console.log('- Fecha nacimiento:', profile.birthDate || 'No especificado');
        console.log('- Última actualización:', profile.lastUpdated || 'No disponible');
        
    } else {
        console.log('⚠️ No hay datos del perfil guardados aún');
        console.log('💡 Tip: Ve a tu perfil, edita algunos campos y guarda para crear datos');
    }
    
} else if (strapiToken) {
    console.log('✅ SISTEMA STRAPI - Datos en base de datos');
    console.log('📡 Para ver los datos, accede a: http://localhost:1337/admin');
    console.log('📋 Sección: Content Manager > usuarios-personales');
    
} else {
    console.log('❌ NO HAY SESIÓN ACTIVA');
    console.log('💡 Tip: Inicia sesión primero');
}

console.log('\n🛠️ COMANDOS ÚTILES:');
console.log('- Ver datos del perfil: JSON.parse(localStorage.getItem("userProfile"))');
console.log('- Ver usuario actual: JSON.parse(localStorage.getItem("user"))');
console.log('- Limpiar datos del perfil: localStorage.removeItem("userProfile")');
console.log('- Limpiar sesión: localStorage.clear()');

console.log('\n📋 ESTADO DE CAMPOS DEL FORMULARIO:');
// Verificar campos del formulario si estamos en la página del perfil
const form = document.getElementById('profileForm');
if (form) {
    const fields = [
        { id: 'firstName', label: 'Nombre', strapi: 'nombre' },
        { id: 'lastName', label: 'Apellido', strapi: 'apellido' },
        { id: 'country', label: 'País', strapi: 'pais' },
        { id: 'city', label: 'Ciudad', strapi: 'ciudad' },
        { id: 'address', label: 'Dirección', strapi: 'direccion' },
        { id: 'postalCode', label: 'Código Postal', strapi: 'codigo_postal' },
        { id: 'phone', label: 'Teléfono', strapi: 'telefono' },
        { id: 'birthDate', label: 'Fecha Nacimiento', strapi: 'fecha_nacimiento' },
        { id: 'email', label: 'Email', strapi: 'email' }
    ];
    
    fields.forEach(field => {
        const formField = document.getElementById(field.id);
        if (formField) {
            console.log(`- ${field.label} (HTML: ${field.id} | Strapi: ${field.strapi}):`, formField.value || 'Vacío');
        }
    });
} else {
    console.log('⚠️ Formulario no encontrado (no estás en la página del perfil)');
}

console.log('\n🗃️ MAPEO DE CAMPOS:');
console.log('📄 HTML Form → 🏢 Strapi:');
console.log('- firstName → nombre');
console.log('- lastName → apellido'); 
console.log('- country → pais');
console.log('- address → direccion');
console.log('- city → ciudad');
console.log('- postalCode → codigo_postal (Number)');
console.log('- phone → telefono (Number)');
console.log('- birthDate → fecha_nacimiento (Date)');
console.log('- email → email');

console.log('\n✅ Verificación completada!');
console.log('=====================================');

// Función helper para exportar datos
window.exportarDatos = function() {
    if (profileData) {
        const data = JSON.parse(profileData);
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mi-perfil-' + new Date().toISOString().split('T')[0] + '.json';
        a.click();
        console.log('📥 Datos exportados como JSON');
    } else {
        console.log('❌ No hay datos para exportar');
    }
};

console.log('\n💾 Para exportar tus datos como archivo JSON:');
console.log('   ejecuta: exportarDatos()'); 