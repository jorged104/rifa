# 🎲 Rifa Digital CHN

Sistema de rifa en tiempo real con ruleta animada y visualización en vivo mediante Socket.IO.

## 🚀 Características

- ✅ Ruleta animada de 10 segundos
- 📱 Código QR para compartir visualización en vivo
- 🔴 Transmisión en tiempo real con Socket.IO
- 📊 Contador de espectadores en vivo
- 📄 Carga masiva desde CSV
- 💾 Persistencia con localStorage
- 🎨 Diseño minimalista estilo Notion

## 📋 Requisitos

- Node.js 16 o superior
- npm o yarn

## 🔧 Instalación Local

1. **Instalar dependencias:**
```bash
npm install
```

2. **Iniciar el servidor:**
```bash
npm start
```

3. **Abrir en el navegador:**
```
http://localhost:3000
```

## 📱 Uso

### Modo Administrador (Control)
1. Abre la aplicación en el navegador principal
2. Agrega participantes manualmente o carga un CSV
3. Haz clic en "Mostrar QR para compartir"
4. Comparte el QR o link con los espectadores

### Modo Visualización (Espectadores)
1. Escanea el QR o abre el link compartido
2. Verás la rifa en tiempo real sin controles
3. La ruleta girará sincronizada con el admin

### Formato CSV
```csv
no;nombre;gerencia
1;Juan Pérez;Gerencia de Tecnología
2;María González;Gerencia de Operación de Soporte
```

## 🌐 Despliegue en Producción

### Opción 1: Render.com (RECOMENDADO - Gratis con Limitaciones)

1. **Crear cuenta en Render.com**
2. **Crear nuevo Web Service**
3. **Conectar tu repositorio de GitHub**
4. **Configuración:**
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Plan: `Free`

5. **Variables de entorno:**
   - No requiere variables adicionales para inicio

6. **Deploy automático:**
   - Render detectará cambios en tu repo y redesplegará

**Importante:** El plan gratuito de Render duerme después de 15 minutos de inactividad.

### Opción 2: Railway.app (Gratis con Créditos)

1. **Crear cuenta en Railway.app**
2. **New Project → Deploy from GitHub**
3. **Seleccionar repositorio**
4. Railway detectará Node.js automáticamente
5. Obtendrás una URL pública

**Ventajas:** No se duerme como Render, $5 de crédito mensual gratis.

### Opción 3: Fly.io (Gratis)

1. **Instalar Fly CLI:**
```bash
curl -L https://fly.io/install.sh | sh
```

2. **Login:**
```bash
fly auth login
```

3. **Crear archivo fly.toml:**
```toml
app = "rifa-chn"

[build]
  builder = "heroku/buildpacks:20"

[[services]]
  internal_port = 3000
  protocol = "tcp"

  [[services.ports]]
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443
```

4. **Deploy:**
```bash
fly launch
fly deploy
```

### Opción 4: Heroku (Requiere Tarjeta)

1. **Instalar Heroku CLI**
2. **Login:**
```bash
heroku login
```

3. **Crear app:**
```bash
heroku create rifa-chn
```

4. **Deploy:**
```bash
git push heroku main
```

### Opción 5: Vercel (Solo Frontend - Sin Socket.IO)

⚠️ **Nota:** Vercel no soporta WebSockets nativamente. Para usar con Vercel necesitas:
- Desplegar el servidor Socket.IO en Railway/Render
- Actualizar la URL del servidor en `rifa.js` línea 18

## 🔑 Configuración Post-Despliegue

Después de desplegar, **debes actualizar** la URL del servidor en `rifa.js`:

```javascript
// Línea ~18 en rifa.js
const SOCKET_SERVER = 'https://tu-app.render.com'; // Cambiar esta URL
```

## 📦 Estructura de Archivos

```
├── rifa.html              # Interfaz principal
├── rifa.js                # Lógica del cliente
├── server.js              # Servidor Socket.IO
├── package.json           # Dependencias
├── ejemplo_participantes.csv  # Ejemplo de CSV
└── README.md              # Este archivo
```

## 🎯 Flujo de Trabajo

1. **Administrador** abre la app y agrega participantes
2. **Administrador** genera QR y lo muestra en pantalla grande
3. **Espectadores** escanean el QR desde sus teléfonos
4. **Administrador** inicia el sorteo
5. **Todos** ven la ruleta girar en sincronía
6. **Ganador** se muestra simultáneamente en todas las pantallas

## 🐛 Troubleshooting

### "⚪ Modo local (sin servidor)"
- Verifica que el servidor esté corriendo
- Revisa la URL del servidor en `rifa.js`
- Comprueba el firewall/puerto 3000

### "🔴 Desconectado"
- El servidor se reinició
- Problemas de red
- Verifica logs del servidor con `npm start`

### La ruleta no se ve bien
- Limpia caché del navegador
- Actualiza la página
- Verifica que uses un navegador moderno (Chrome, Firefox, Safari)

## 🎨 Personalización

### Cambiar colores de la ruleta
Edita el array `colors` en `rifa.js` línea ~280:
```javascript
const colors = [
    '#3b82f6', '#ef4444', // Agrega tus colores hex
];
```

### Cambiar tiempo de animación
Edita en `rifa.html` línea ~110:
```css
animation: spin-wheel 10s cubic-bezier(...); /* Cambiar 10s */
```

Y en `rifa.js` línea ~310:
```javascript
setTimeout(() => {
    selectFinalWinner(winner);
}, 10000); // Cambiar 10000 (10 segundos)
```

## 📞 Soporte

Desarrollado por Jorge - Gerencia de Operación de Soporte, CHN

## 📄 Licencia

MIT License - Uso interno CHN
