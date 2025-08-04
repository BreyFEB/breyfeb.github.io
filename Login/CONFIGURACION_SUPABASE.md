# 🚀 Configuración de Supabase para el Sistema de Autenticación

Esta guía te ayudará a configurar Supabase para tu aplicación web de baloncesto.

## 📋 **Requisitos Previos**

- Cuenta en [Supabase](https://supabase.com)
- Conocimientos básicos de SQL (opcional, se proporcionan los scripts)

---

## 🏗️ **Paso 1: Crear Proyecto en Supabase**

1. **Ir a Supabase**
   - Visita [supabase.com](https://supabase.com)
   - Inicia sesión o crea una cuenta

2. **Crear Nuevo Proyecto**
   - Clic en "New Project"
   - Elige tu organización
   - Nombre del proyecto: `breyfeb-basketball` (o el que prefieras)
   - Contraseña de base de datos: **¡IMPORTANTE! Guarda esta contraseña**
   - Región: Elige la más cercana a tus usuarios
   - Clic en "Create new project"

3. **Esperar Inicialización**
   - El proyecto tardará 1-2 minutos en estar listo
   - Verás un dashboard cuando esté completado

---

## ⚙️ **Paso 2: Configurar Variables en el Código**

1. **Obtener Credenciales**
   - En el dashboard de Supabase, ve a **Settings** → **API**
   - Copia estos valores:
     - **Project URL** (ejemplo: `https://abcdefg.supabase.co`)
     - **anon public key** (clave larga que empieza con `eyJ...`)

2. **Actualizar supabase-config.js**
   ```javascript
   // Reemplaza estas líneas en Login/supabase-config.js:
   const SUPABASE_URL = 'https://tu-proyecto-ref.supabase.co';
   const SUPABASE_ANON_KEY = 'tu-clave-anonima-aqui';
   ```

---

## 🗄️ **Paso 3: Crear Tabla de Perfiles**

1. **Ir al Editor SQL**
   - En Supabase, ve a **SQL Editor**
   - Crea una nueva query

2. **Ejecutar Script de Creación**
   ```sql
   -- Crear tabla de perfiles de usuario
   CREATE TABLE public.user_profiles (
       id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
       user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
       first_name VARCHAR(100),
       last_name VARCHAR(100),
       country VARCHAR(100),
       city VARCHAR(100),
       address TEXT,
       postal_code VARCHAR(20),
       phone VARCHAR(20),
       birth_date DATE,
       email VARCHAR(255),
       created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
       updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
   );

   -- Crear índice para mejorar rendimiento
   CREATE INDEX idx_user_profiles_user_id ON public.user_profiles(user_id);

   -- Habilitar RLS (Row Level Security)
   ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

   -- Crear políticas de seguridad
   CREATE POLICY "Los usuarios pueden ver sus propios perfiles" 
   ON public.user_profiles FOR SELECT 
   USING (auth.uid() = user_id);

   CREATE POLICY "Los usuarios pueden insertar sus propios perfiles" 
   ON public.user_profiles FOR INSERT 
   WITH CHECK (auth.uid() = user_id);

   CREATE POLICY "Los usuarios pueden actualizar sus propios perfiles" 
   ON public.user_profiles FOR UPDATE 
   USING (auth.uid() = user_id);

   CREATE POLICY "Los usuarios pueden eliminar sus propios perfiles" 
   ON public.user_profiles FOR DELETE 
   USING (auth.uid() = user_id);

   -- Función para actualizar 'updated_at' automáticamente
   CREATE OR REPLACE FUNCTION update_updated_at_column()
   RETURNS TRIGGER AS $$
   BEGIN
       NEW.updated_at = TIMEZONE('utc'::text, NOW());
       RETURN NEW;
   END;
   $$ language 'plpgsql';

   -- Trigger para actualizar 'updated_at'
   CREATE TRIGGER update_user_profiles_updated_at 
   BEFORE UPDATE ON public.user_profiles 
   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
   ```

3. **Ejecutar el Script**
   - Pega todo el código anterior
   - Clic en "Run" (o Ctrl+Enter)
   - Deberías ver "Success. No rows returned" si todo sale bien

---

## 🔒 **Paso 4: Configurar Autenticación**

1. **Configurar Políticas de Email**
   - Ve a **Authentication** → **Settings**
   - **Enable email confirmations**: 
     - ✅ **ON** para producción (usuarios deben confirmar email)
     - ❌ **OFF** para desarrollo (confirmación automática)

2. **Configurar URL de Confirmación** (Opcional para producción)
   - **Site URL**: `https://tu-dominio.com` 
   - **Redirect URLs**: Agregar URLs permitidas para redirección

3. **Configurar Plantillas de Email** (Opcional)
   - Ve a **Authentication** → **Email Templates**
   - Personaliza las plantillas de confirmación y recuperación

---

## 🧪 **Paso 5: Probar la Configuración**

1. **Verificar Conexión**
   - Abre tu aplicación web
   - Ve a `Login/registro.html`
   - Abre la consola del navegador (F12)
   - Deberías ver: `✅ Supabase configurado correctamente`

2. **Probar Registro**
   - Llena el formulario de registro
   - Usa un email real si tienes confirmación habilitada
   - Verifica en Supabase → **Authentication** → **Users** que el usuario aparezca

3. **Probar Login**
   - Intenta iniciar sesión con el usuario creado
   - Verifica en la consola que no haya errores

---

## 📊 **Estructura de Datos Creada**

### Tabla: `user_profiles`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | ID único del perfil (auto-generado) |
| `user_id` | UUID | Referencia al usuario en auth.users |
| `first_name` | VARCHAR(100) | Nombre del usuario |
| `last_name` | VARCHAR(100) | Apellido del usuario |
| `country` | VARCHAR(100) | País |
| `city` | VARCHAR(100) | Ciudad |
| `address` | TEXT | Dirección completa |
| `postal_code` | VARCHAR(20) | Código postal |
| `phone` | VARCHAR(20) | Teléfono |
| `birth_date` | DATE | Fecha de nacimiento |
| `email` | VARCHAR(255) | Email (copiado de auth) |
| `created_at` | TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | Fecha de última actualización |

---

## 🔧 **Configuración Avanzada (Opcional)**

### **Habilitar Realtime** (Para futuras funcionalidades)
```sql
-- Habilitar realtime en la tabla de perfiles
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_profiles;
```

### **Crear Tabla de Equipos Favoritos** (Futura funcionalidad)
```sql
CREATE TABLE public.favorite_teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id VARCHAR(50) NOT NULL,
    team_name VARCHAR(200) NOT NULL,
    competition VARCHAR(100) NOT NULL,
    team_logo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(user_id, team_id, competition)
);

-- RLS para equipos favoritos
ALTER TABLE public.favorite_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios pueden gestionar sus equipos favoritos" 
ON public.favorite_teams FOR ALL 
USING (auth.uid() = user_id);
```

---

## ❗ **Problemas Comunes y Soluciones**

### **Error: "Invalid API URL or key"**
- ✅ Verifica que SUPABASE_URL y SUPABASE_ANON_KEY estén correctos
- ✅ Asegúrate de no tener espacios extra al copiar las claves
- ✅ Verifica que el proyecto esté completamente inicializado

### **Error: "Row Level Security"**
- ✅ Asegúrate de haber ejecutado todas las políticas de seguridad
- ✅ Verifica que el usuario esté autenticado antes de acceder a datos

### **Error: "Email not confirmed"**
- ✅ Si tienes confirmación habilitada, revisa tu email
- ✅ Para desarrollo, desactiva la confirmación en Authentication Settings

### **No aparecen los datos del perfil**
- ✅ Verifica en Supabase → **Table Editor** → `user_profiles` que los datos estén guardados
- ✅ Revisa la consola del navegador para errores de JavaScript

---

## 🚀 **¡Listo para Usar!**

Una vez completados estos pasos, tu aplicación estará completamente integrada con Supabase:

- ✅ **Registro de usuarios** con confirmación por email
- ✅ **Login seguro** con manejo de sesiones
- ✅ **Perfiles de usuario** guardados en base de datos
- ✅ **Logout** con limpieza de sesión
- ✅ **Seguridad RLS** que protege los datos de cada usuario

## 📞 **Soporte**

Si tienes problemas:
1. Revisa la consola del navegador para errores
2. Verifica los logs en Supabase → **Logs**
3. Consulta la [documentación oficial de Supabase](https://supabase.com/docs)

---

**¡Disfruta tu aplicación con Supabase! 🏀** 