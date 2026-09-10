# Panel DistriElectro — versión Supabase + GitHub Pages

Esta es una **segunda versión, en paralelo** de tu catálogo y cotizador — usa Supabase como base de datos (en vez de MySQL/baehost) y se aloja gratis en GitHub Pages (en vez de tu hosting). La versión de baehost sigue funcionando exactamente igual que antes; esta es para que las compares y elijas la que te resulte más práctica, o uses las dos.

La lógica de precios, la carga de listas y los controles de seguridad son los mismos que en la versión de baehost — lo único que cambia es "dónde vive" la base de datos y el sitio.

## Qué es cada cosa

| Carpeta / archivo | Para quién | Qué hace |
|---|---|---|
| `index.html` | Clientes | Catálogo y cotizador — lo que ven al entrar al sitio |
| `admin/` | Solo Mariano | Panel: cargar listas, configurar proveedores, ver productos |
| `supabase-config.js` | Uso interno | Datos de conexión a Supabase (la "anon key" es segura de exponer — el acceso real lo controla la base de datos, no esta clave) |

No hay ningún archivo PHP ni base de datos que instalar a mano: todo corre en el navegador y habla directamente con Supabase.

---

## 1. Crear el repositorio en GitHub

1. Entrá a [github.com/new](https://github.com/new) y creá un repositorio nuevo (puede ser público — no hay ninguna contraseña ni dato sensible en estos archivos, la seguridad real la hace la base de datos).
2. Subí **todo el contenido** de esta carpeta tal cual (manteniendo la carpeta `admin/`) — arrastrando los archivos en la web de GitHub ("Add file → Upload files") o con git si te resulta más cómodo.

## 2. Activar GitHub Pages

1. En el repositorio, entrá a **Settings → Pages**.
2. En "Source" elegí **Deploy from a branch**, rama `main`, carpeta `/ (root)`.
3. Guardá. GitHub te va a dar una dirección tipo `https://tu-usuario.github.io/tu-repositorio/` — en unos minutos el sitio queda publicado ahí.

Esa dirección (la del catálogo, sin `/admin/`) es la que le vas a dar a tus clientes.

## 3. Crear tu usuario de acceso al panel

A diferencia de la versión de baehost (que tenía un `setup_admin.php` de un solo uso), en Supabase el login lo administrás desde el panel de Supabase:

1. Entrá a tu proyecto en [supabase.com](https://supabase.com/dashboard) → **Authentication → Users → Add user → Create new user**.
2. Completá tu email y una contraseña. **Importante:** tildá la opción **"Auto Confirm User"** (o "Email confirmed") si aparece — si no, Supabase te va a pedir confirmar el email antes de poder ingresar, y como no configuramos envío de emails, quedarías trabado.
3. El email con el que crees este usuario ya está autorizado para entrar al panel: `marianoporreca@gmail.com` (así quedó cargado en la base). **Si preferís usar otro email**, contame y lo actualizamos en la tabla `admin_emails` — o hacelo vos mismo desde Supabase: **Table Editor → admin_emails** → editá o agregá la fila con el email que quieras usar.
4. Entrá a `admin/login.html` dentro de tu sitio publicado (ej: `https://tu-usuario.github.io/tu-repositorio/admin/login.html`) con ese email y contraseña.

### Agregar otro administrador más adelante

Si en el futuro necesitás que otra persona tenga acceso al panel: creale su usuario en **Authentication → Users** (con "Auto Confirm User" tildado) y agregá su email en **Table Editor → admin_emails**. Sin ese segundo paso, aunque tenga usuario y contraseña válidos, no va a poder ver ni cargar nada — el panel y el catálogo nunca muestran los descuentos ni la utilidad, y las tablas de precios están bloqueadas para cualquiera que no esté en esa lista.

## 4. Configurar los proveedores y cargar listas

Es exactamente el mismo flujo que en la versión de baehost:

1. Entrá a `admin/proveedores.html` y completá la configuración de cada proveedor (moneda, tipo de cambio, descuentos, utilidades) — la de Coresa Group ya viene precargada con tu fórmula actual (48% + 4% pronto pago, x1.20/-5% unidad, x1.10/-3% por bulto, dólar a $1.500).
2. Para cargar una lista: `admin/upload.html` → elegí el proveedor y subí el Excel → elegí las hojas (con marca y rubro) y, si la planilla trae los códigos de barras en una hoja aparte (como "Code barra SAP" en la lista de Coresa Group), elegila para que el EAN se complete solo → mapeá las columnas → confirmá los estados de stock → revisá la vista previa → confirmá la importación.

   **Ojo con "caja master" vs "unidad de venta"**, igual que en la versión de baehost: si la planilla tiene las dos columnas, mapeá **"unidad de venta"** al campo de precio por bulto — es la cantidad que realmente se vende como paquete cerrado.

   A diferencia de la versión de baehost, acá el Excel se procesa **enteramente en tu navegador** (no se sube a ningún servidor intermedio) — solo los productos ya procesados se guardan en Supabase al confirmar. Para listas muy grandes (la de Coresa Group, ~13 MB) puede tardar unos segundos en leer el archivo; es normal.

3. En `admin/productos.html` podés buscar, eliminar productos puntuales o vaciar todo lo de un proveedor.

## 5. El catálogo para tus clientes

Queda publicado en la dirección de GitHub Pages del paso 2 (la raíz, sin `/admin/`). Se actualiza solo cada vez que cargás o modificás algo desde el panel — no hace falta volver a subir nada a GitHub.

---

## Notas de seguridad (por qué está diseñado así)

- **Los descuentos y márgenes nunca se exponen.** El catálogo público y la "anon key" de `supabase-config.js` solo tienen acceso a una vista (`productos_publico`) que devuelve los precios ya calculados — nunca la configuración interna de cada proveedor. Aunque alguien mire el código del sitio o la Network tab del navegador, no puede ver tus descuentos.
- **Solo los emails de `admin_emails` pueden entrar al panel o tocar la base**, sin importar si alguien tiene o no la contraseña de otro usuario de Supabase — esto lo garantiza la base de datos misma (Row Level Security), no el panel.
- Al revisar los "Security Advisors" de tu proyecto en Supabase vas a ver 3 avisos — **son esperados y no requieren acción**:
  - *Security Definer View* en `productos_publico`: es intencional, es justamente lo que permite mostrar precios calculados sin exponer las tablas de origen.
  - *Public/Signed-in can execute `is_admin()`*: también intencional — esa función solo devuelve `true`/`false` (si el que pregunta es admin o no), nunca datos; el panel la usa para decidir si te deja entrar, pero la protección real sigue estando en las políticas de cada tabla.

---

### Resumen rápido

| Cosa | Versión baehost (PHP) | Versión Supabase (esta) |
|---|---|---|
| Base de datos | MySQL en tu hosting | Supabase (Postgres) |
| Sitio | `lista.distrielectro.com.ar` | GitHub Pages |
| Login del panel | Usuario propio (`setup_admin.php`) | Usuario de Supabase Auth |
| Lectura del Excel | En el servidor (PHP) | En tu navegador (JavaScript) |
| Fórmula de precios y flujo de carga | Idéntico | Idéntico |
