// ═══════════════════════════════════════════════════════════════
// admin-common.js — cliente Supabase, guard de sesión y utilidades
// compartidas por todas las páginas del panel de administración.
//
// IMPORTANTE sobre seguridad: el chequeo de is_admin() que hace
// requireAdmin() de abajo es solo para la UX (redirigir a alguien
// que no es admin fuera del panel). La protección real está en las
// políticas RLS de la base de datos — aunque alguien se saltee este
// chequeo, cualquier consulta a "productos" o "config_proveedor"
// devuelve cero filas si su email no está en admin_emails.
// ═══════════════════════════════════════════════════════════════

const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

/** Redirige a login.html si no hay sesión o el usuario no es admin. Devuelve la sesión si todo OK. */
async function requireAdmin() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    location.href = 'login.html';
    return null;
  }
  const { data: isAdmin, error } = await sb.rpc('is_admin');
  if (error || !isAdmin) {
    await sb.auth.signOut();
    location.href = 'login.html?error=noadmin';
    return null;
  }
  return session;
}

async function doLogout() {
  await sb.auth.signOut();
  location.href = 'login.html';
}

function h(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Formatea como $ 1.234,56 (mismo formato que number_format($n,2,',','.') en PHP). */
function money(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fechaCorta(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

function fechaHora(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yy} ${hh}:${mi}`;
}

/** Inserta el header (nav) y arma el layout .wrap alrededor de #app-content. */
function renderChrome(activePage, email) {
  const links = [
    ['index.html', 'Inicio'],
    ['proveedores.html', 'Proveedores'],
    ['upload.html', 'Cargar lista'],
    ['productos.html', 'Productos'],
  ];
  const linksHtml = links.map(([href, label]) =>
    `<a href="${href}" class="${activePage === href ? 'active' : ''}">${label}</a>`
  ).join('');

  document.body.insertAdjacentHTML('afterbegin', `
    <div class="nav">
      <div class="nav-inner">
        <div class="nav-logo">Distri<span>Electro</span> · Panel</div>
        <div class="nav-links">${linksHtml}</div>
        <div class="nav-user">${h(email)} · <a id="logoutLink">Salir</a></div>
      </div>
    </div>
    <div class="wrap" id="wrap"></div>
  `);
  document.getElementById('logoutLink').addEventListener('click', doLogout);
  const content = document.getElementById('app-content');
  document.getElementById('wrap').appendChild(content);
  content.hidden = false;
}

/**
 * Motor de cálculo de precios — réplica exacta de includes/pricing.php
 * (calcular_precios) de la versión PHP, para que los dos paneles den
 * siempre el mismo resultado con la misma configuración.
 */
function calcularPrecios(producto, config) {
  const precioLista = Number(producto.precio_lista) || 0;
  const moneda = config.moneda || 'ARS';
  const tipoCambio = moneda === 'USD' ? (Number(config.tipo_cambio) || 1) : 1.0;
  const listaArs = precioLista * tipoCambio;

  const descuentoPct = Number(config.descuento_pct) || 0;
  const prontoPagoPct = Number(config.pronto_pago_pct) || 0;
  const markupUnidadPct = Number(config.markup_unidad_transf_pct) || 0;
  const descEfectivoUnidadPct = Number(config.descuento_efectivo_unidad_pct) || 0;
  const markupBultoPct = Number(config.markup_bulto_transf_pct) || 0;
  const descEfectivoBultoPct = Number(config.descuento_efectivo_bulto_pct) || 0;

  const round2 = (n) => Math.round(n * 100) / 100;

  const costoUnidad = listaArs * (1 - descuentoPct / 100);
  const precioUnidadTransf = round2(costoUnidad * (1 + markupUnidadPct / 100));
  const precioUnidadEfec = round2(precioUnidadTransf * (1 - descEfectivoUnidadPct / 100));

  const cajaMasterRaw = producto.caja_master;
  const cajaMaster = cajaMasterRaw && Number(cajaMasterRaw) > 1 ? Math.trunc(Number(cajaMasterRaw)) : null;
  let precioBultoTransf = null, precioBultoEfec = null;
  if (cajaMaster !== null) {
    const costoBulto = listaArs * (1 - descuentoPct / 100) * (1 - prontoPagoPct / 100);
    precioBultoTransf = round2(costoBulto * (1 + markupBultoPct / 100));
    precioBultoEfec = round2(precioBultoTransf * (1 - descEfectivoBultoPct / 100));
  }

  return {
    precioUnitTransf: precioUnidadTransf,
    precioUnitEfec: precioUnidadEfec,
    precioBultoUnitTransf: precioBultoTransf,
    precioBultoUnitEfec: precioBultoEfec,
    cajaMaster,
  };
}
