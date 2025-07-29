# Configuración de Strapi para Perfil Personal

## 🔍 **Cómo Ver los Datos Guardados**

### **📱 Sistema Principal (Más Común)**
Si te logueaste con el sistema principal, los datos se guardan en **localStorage**:

1. **Abre herramientas de desarrollador**: `F12`
2. Pestaña **Application** > **Local Storage** > tu dominio
3. Busca la clave `userProfile` 
4. 📄 Ahí están tus datos en formato JSON

### **🏢 Sistema Strapi**
Si usas autenticación Strapi, sigue estos pasos:

## 🚀 **Configuración Completa de Strapi**

### **Paso 1: Acceder al Panel**
- URL: `http://localhost:1337/admin`
- Usa tu usuario administrador de Strapi

### **Paso 2: Crear la Colección**

1. Ve a **Content-Types Builder** 
2. **Create new collection type**
3. Nombre: `usuarios-personales` (exactamente así)
4. Añadir estos campos:

```
📋 CAMPOS CONFIGURADOS (según tu Strapi):
├── user (Relation)
│   ├── Tipo: Relation (oneWay)
│   ├── Relación: usuarios-personales → User  
│   └── Target: User (from: users-permissions)
├── email (Email)
│   ├── Tipo: Email
│   └── Requerido: Sí
├── nombre (Text)
│   ├── Tipo: Text
│   └── Requerido: No
├── apellido (Text)
│   ├── Tipo: Text
│   └── Requerido: No
├── pais (Text)
│   ├── Tipo: Text
│   └── Requerido: No
├── direccion (Text)
│   ├── Tipo: Text
│   └── Requerido: No
├── ciudad (Text)
│   ├── Tipo: Text
│   └── Requerido: No
├── codigo_postal (Number)
│   ├── Tipo: Number
│   └── Requerido: No
├── telefono (Number)
│   ├── Tipo: Number
│   └── Requerido: No
├── fecha_nacimiento (Date)
│   ├── Tipo: Date
│   └── Requerido: No
├── equipo_favorito (Text)
│   ├── Tipo: Text
│   └── Requerido: No
├── jugador_favorito (Text)
│   ├── Tipo: Text
│   └── Requerido: No
└── avatar (Multiple Media)
    ├── Tipo: Multiple Media
    └── Requerido: No
```

## 🔄 **Mapeo de Campos**

| Campo HTML Form | Campo Strapi | Tipo Strapi |
|-----------------|--------------|-------------|
| `firstName` | `nombre` | Text |
| `lastName` | `apellido` | Text |
| `country` | `pais` | Text |
| `address` | `direccion` | Text |
| `city` | `ciudad` | Text |
| `postalCode` | `codigo_postal` | Number |
| `phone` | `telefono` | Number |
| `birthDate` | `fecha_nacimiento` | Date |
| `email` | `email` | Email |

**Campos adicionales disponibles en Strapi:**
- `equipo_favorito` (Text)
- `jugador_favorito` (Text) 
- `avatar` (Multiple Media)

### **Paso 3: Configurar Permisos**

1. **Settings** > **Users & Permissions Plugin** > **Roles**
2. **Authenticated** role:
   - `usuarios-personales`: ✅ find, ✅ findOne, ✅ create, ✅ update

### **Paso 4: Ver los Datos**

Una vez configurado:

1. **Content Manager** > **usuarios-personales**
2. 📊 Aquí verás todos los perfiles guardados
3. Haz clic en cualquier entrada para ver los detalles

## 🛠️ **Verificación Rápida**

### **Para saber qué sistema usas:**
1. Abre la consola del navegador (`F12` > Console)
2. Ejecuta: `localStorage.getItem("jwt")`
3. **Si hay valor**: Usas sistema principal → datos en localStorage
4. **Si es null**: Usas sistema Strapi → datos en base de datos

### **Ver datos del sistema principal:**
```javascript
// En la consola del navegador:
console.log(JSON.parse(localStorage.getItem('userProfile')));
```

## 📡 **Endpoints de la API**

Si necesitas acceder directamente a los datos vía API:

```bash
# Obtener todos los perfiles
GET http://localhost:1337/api/usuarios-personales

# Obtener perfil de un usuario específico  
GET http://localhost:1337/api/usuarios-personales?filters[user][id][$eq]=USER_ID

# Headers requeridos:
Authorization: Bearer YOUR_JWT_TOKEN
```

## 🚨 **Troubleshooting Común**

### **Error 404 - Collection not found**
- ✅ Verifica el nombre: `usuarios-personales`
- ✅ Asegúrate de que la colección esté publicada
- ✅ Reinicia Strapi: `npm run develop`

### **Error 403 - Forbidden**
- ✅ Revisa permisos en Settings > Users & Permissions
- ✅ Authenticated role debe tener permisos para la colección

### **No veo datos**
- ✅ Verifica que te hayas logueado con Strapi (no sistema principal)
- ✅ Revisa logs en consola del navegador
- ✅ Confirma que se guardaron datos sin errores

## 💡 **Tips Útiles**

1. **Para desarrollo**: Usa el sistema principal (más simple)
2. **Para producción**: Configura Strapi completo
3. **Migración**: Puedes exportar datos de localStorage e importar a Strapi
4. **Backup**: Los datos de localStorage se pierden al limpiar navegador

## ✅ **Verificación Final**

Para confirmar que todo funciona:

1. 🔐 Loguearte en la aplicación
2. 📝 Editar y guardar perfil
3. 📊 Ver datos en Strapi Admin o localStorage
4. 🔄 Recargar página y verificar que datos persisten

¿Necesitas ayuda con algún paso específico? 