/**
 * BoletApps - Lógica principal
 */
(function () {
  'use strict';

  // ====== ESTADO ======
  const SESSION_KEY = 'boletapps_session';
  let seccionActual = 'dashboard';

  // ====== UTILIDADES ======
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  function toast(msg, tipo) {
    const t = $('#toast');
    t.textContent = msg;
    t.className = 'ba-toast show' + (tipo ? ' ' + tipo : '');
    setTimeout(() => { t.className = 'ba-toast'; }, 2800);
  }

  function hoyISO() {
    const d = new Date();
    const tz = d.getTimezoneOffset() * 60000;
    return new Date(d - tz).toISOString().slice(0, 10);
  }

  function fechaLarga(iso) {
    if (!iso) return '';
    try {
      const d = new Date(iso + 'T00:00:00');
      return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) { return iso; }
  }

  function escapeHtml(str) {
    if (str == null) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  // ====== LOGIN ======
  function initLogin() {
    // Si ya hay sesión, ir directo a la app
    if (sessionStorage.getItem(SESSION_KEY) === '1') {
      mostrarApp();
      return;
    }

    const form = $('#login-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const code = $('#login-code').value.trim();
      const errEl = $('#login-error');
      errEl.textContent = '';

      const realCode = BoletappsDB.getAccessCode();
      if (code === realCode) {
        sessionStorage.setItem(SESSION_KEY, '1');
        mostrarApp();
      } else {
        errEl.textContent = 'Código incorrecto. Intente nuevamente.';
        $('#login-code').value = '';
        $('#login-code').focus();
        // Vibración si está disponible
        if (navigator.vibrate) navigator.vibrate(200);
      }
    });
  }

  function mostrarApp() {
    $('#login-screen').hidden = true;
    $('#app-screen').hidden = false;
    inicializarApp();
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
  }

  // ====== NAVEGACIÓN ======
  function navegar(seccion) {
    const seccionAnterior = seccionActual;
    seccionActual = seccion;
    $all('.ba-section').forEach(s => {
      s.hidden = s.dataset.section !== seccion;
    });
    $all('.ba-nav-item').forEach(n => {
      n.classList.toggle('active', n.dataset.target === seccion);
    });
    const nombres = {
      dashboard: 'Dashboard',
      registro: 'Registro',
      partes: 'Partes Diarios',
      reportes: 'Reportes',
      config: 'Configuración',
      admin: 'Administración'
    };
    $('#header-section-name').textContent = nombres[seccion] || '';

    // Destruir gráficos al salir del dashboard
    if (seccionAnterior === 'dashboard' && seccion !== 'dashboard') {
      destruirCharts();
    }

    // Cargar contenido según sección
    if (seccion === 'dashboard') renderDashboard();
    if (seccion === 'registro') renderBoletas();
    if (seccion === 'partes') renderPartes();
    if (seccion === 'config') renderConfig();
    if (seccion === 'admin') renderAdmin();
    if (seccion === 'reportes') {
      cargarSelectsReportes();
    }

    window.scrollTo(0, 0);
  }

  // ====== INICIALIZACIÓN APP ======
  function inicializarApp() {
    // Logout
    $('#logout-btn').addEventListener('click', logout);

    // Tema (modo oscuro)
    inicializarTema();

    // Offline indicator
    inicializarOffline();

    // Nav
    $all('.ba-nav-item').forEach(btn => {
      btn.addEventListener('click', () => navegar(btn.dataset.target));
    });

    // Dashboard
    $('#dash-fecha').value = hoyISO();
    $('#dash-refresh').addEventListener('click', renderDashboard);
    $('#dash-fecha').addEventListener('change', renderDashboard);
    $('#dash-servicentro').addEventListener('change', renderDashboard);

    // Registro
    $('#btn-nueva-boleta').addEventListener('click', () => abrirModalBoleta());
    $('#search-boleta').addEventListener('input', renderBoletas);

    // Partes
    $('#btn-nuevo-parte').addEventListener('click', () => abrirModalParte());
    $('#search-parte').addEventListener('input', renderPartes);

    // Config
    $('#btn-add-servicentro').addEventListener('click', agregarServicentro);
    $('#btn-add-combustible').addEventListener('click', agregarCombustible);
    $('#input-new-servicentro').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') agregarServicentro();
    });
    $('#input-new-combustible').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') agregarCombustible();
    });

    // Admin
    $('#btn-change-code').addEventListener('click', cambiarCodigo);
    $('#btn-create-backup').addEventListener('click', crearBackup);
    $('#btn-export-all').addEventListener('click', exportarTodo);
    $('#input-import-json').addEventListener('change', importarJSON);

    // Reportes
    $('#btn-generar-reporte').addEventListener('click', generarReporte);

    // Cargar dashboard inicial
    cargarSelectsDashboard();
    navegar('dashboard');
  }

  // ====== MODO OSCURO ======
  function inicializarTema() {
    const btn = $('#theme-toggle');
    actualizarIconoTema();
    btn.addEventListener('click', () => {
      const actual = document.documentElement.getAttribute('data-theme') || 'light';
      const nuevo = actual === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', nuevo);
      localStorage.setItem('boletapps_theme', nuevo);
      actualizarIconoTema();
      // Re-renderizar dashboard para refrescar gráficos con nuevos colores
      if (seccionActual === 'dashboard') renderDashboard();
    });
  }

  function actualizarIconoTema() {
    const actual = document.documentElement.getAttribute('data-theme') || 'light';
    const btn = $('#theme-toggle');
    if (btn) btn.textContent = actual === 'dark' ? '☀️' : '🌙';
  }

  // ====== OFFLINE INDICATOR ======
  function inicializarOffline() {
    const banner = $('#offline-banner');
    function actualizar() {
      if (!navigator.onLine) banner.classList.add('show');
      else banner.classList.remove('show');
    }
    window.addEventListener('online', () => {
      actualizar();
      toast('Conexión restablecida', 'success');
    });
    window.addEventListener('offline', () => {
      actualizar();
      toast('Modo offline activo', 'error');
    });
    actualizar();
  }

  // ====== SELECTS ======
  function cargarSelectsDashboard() {
    const sel = $('#dash-servicentro');
    const servicentros = BoletappsDB.getServicentros();
    sel.innerHTML = '<option value="todos">Todos</option>' +
      servicentros.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
  }

  function cargarSelectsReportes() {
    const selServ = $('#rep-servicentro');
    const selComb = $('#rep-combustible');
    const servicentros = BoletappsDB.getServicentros();
    const combustibles = BoletappsDB.getTiposCombustible();
    selServ.innerHTML = '<option value="todos">Todos</option>' +
      servicentros.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
    selComb.innerHTML = '<option value="todos">Todos</option>' +
      combustibles.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  }

  // ====== DASHBOARD ======
  function renderDashboard() {
    const fecha = $('#dash-fecha').value || hoyISO();
    const servicentro = $('#dash-servicentro').value || 'todos';

    // Filtrar boletas del día
    let boletasDia = BoletappsDB.getBoletas().filter(b => b.fecha === fecha);
    if (servicentro !== 'todos') {
      boletasDia = boletasDia.filter(b => b.servicentro === servicentro);
    }

    // Sumar combustible por tipo
    const porTipo = {};
    let totalDia = 0;
    boletasDia.forEach(b => {
      const cant = parseFloat(b.cantidad) || 0;
      porTipo[b.tipoCombustible] = (porTipo[b.tipoCombustible] || 0) + cant;
      totalDia += cant;
    });

    // Obtener parte diario
    let parteDiario = null;
    let parteServicentros = [];
    if (servicentro === 'todos') {
      parteServicentros = BoletappsDB.getPartesDiarios().filter(p => p.fecha === fecha);
    } else {
      parteDiario = BoletappsDB.getParteByFechaServicentro(fecha, servicentro);
      if (parteDiario) parteServicentros = [parteDiario];
    }

    // Total combustible al amanecer
    let totalAmanecer = 0;
    const amanecerPorTipo = {};
    parteServicentros.forEach(p => {
      Object.entries(p.combustibles || {}).forEach(([tipo, cant]) => {
        const n = parseFloat(cant) || 0;
        amanecerPorTipo[tipo] = (amanecerPorTipo[tipo] || 0) + n;
        totalAmanecer += n;
      });
    });

    const restante = totalAmanecer - totalDia;

    // Cards
    const cardsHtml = `
      <div class="ba-stat-card">
        <div class="ba-stat-icon">⛽</div>
        <div class="ba-stat-label">Combustible Inicio</div>
        <div class="ba-stat-value">${totalAmanecer.toFixed(2)}</div>
        <div class="ba-stat-unit">gal/lts disponibles</div>
      </div>
      <div class="ba-stat-card warning">
        <div class="ba-stat-icon">📊</div>
        <div class="ba-stat-label">Distribuido</div>
        <div class="ba-stat-value">${totalDia.toFixed(2)}</div>
        <div class="ba-stat-unit">${boletasDia.length} boletas</div>
      </div>
      <div class="ba-stat-card ${restante < 0 ? 'danger' : 'success'}">
        <div class="ba-stat-icon">${restante < 0 ? '⚠️' : '✓'}</div>
        <div class="ba-stat-label">Restante</div>
        <div class="ba-stat-value">${restante.toFixed(2)}</div>
        <div class="ba-stat-unit">por distribuir</div>
      </div>
      <div class="ba-stat-card">
        <div class="ba-stat-icon">🛢️</div>
        <div class="ba-stat-label">Tipos Movidos</div>
        <div class="ba-stat-value">${Object.keys(porTipo).length}</div>
        <div class="ba-stat-unit">tipos de combustible</div>
      </div>
    `;
    $('#dashboard-cards').innerHTML = cardsHtml;

    // Parte diario
    let parteHtml = '<h3>📋 Parte de Inicio del Día</h3>';
    if (parteServicentros.length === 0) {
      parteHtml += '<p class="ba-empty"><span class="ba-empty-icon">📭</span><br>No hay parte diario registrado para esta fecha.</p>';
    } else {
      parteServicentros.forEach(p => {
        parteHtml += `<div style="margin-bottom:8px;padding:8px;background:var(--ba-gray-light);border-radius:6px;">
          <strong>${escapeHtml(p.servicentro)}</strong></div>`;
        Object.entries(p.combustibles || {}).forEach(([tipo, cant]) => {
          parteHtml += `<div class="ba-parte-row"><span class="label">${escapeHtml(tipo)}</span><span class="value">${cant}</span></div>`;
        });
      });
    }
    $('#dashboard-parte').innerHTML = parteHtml;

    // Distribución
    let distribucionHtml = '<h3>📊 Distribución del Día por Tipo</h3>';
    if (Object.keys(porTipo).length === 0) {
      distribucionHtml += '<p class="ba-empty"><span class="ba-empty-icon">📊</span><br>Sin asignaciones registradas hoy.</p>';
    } else {
      Object.entries(porTipo).forEach(([tipo, cant]) => {
        const inicio = amanecerPorTipo[tipo] || 0;
        const pct = inicio > 0 ? Math.min(100, (cant / inicio) * 100) : 100;
        const rest = (inicio - cant).toFixed(2);
        const cls = pct >= 90 ? 'danger' : (pct >= 70 ? 'warning' : '');
        distribucionHtml += `
          <div class="ba-parte-row">
            <span class="label">${escapeHtml(tipo)}</span>
            <span class="value">${cant.toFixed(2)} / ${inicio.toFixed(2)} (restan ${rest})</span>
          </div>
          <div class="ba-progress-bar">
            <div class="ba-progress-fill ${cls}" style="width:${pct}%"></div>
          </div>
        `;
      });
    }
    $('#dashboard-distribucion').innerHTML = distribucionHtml;

    // Renderizar gráficos
    renderChartDistribucion(porTipo, amanecerPorTipo);
    renderChartComparativo(totalAmanecer, totalDia, restante);
    renderChartTipoPago(boletasDia);
  }

  // ====== GRÁFICOS (Chart.js) ======
  let chartDistribucion = null;
  let chartComparativo = null;
  let chartTipoPago = null;

  function getChartColors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      text: isDark ? '#cbd5e1' : '#64748b',
      grid: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)',
      palette: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6']
    };
  }

  function destruirCharts() {
    if (chartDistribucion) { chartDistribucion.destroy(); chartDistribucion = null; }
    if (chartComparativo) { chartComparativo.destroy(); chartComparativo = null; }
    if (chartTipoPago) { chartTipoPago.destroy(); chartTipoPago = null; }
  }

  function renderChartDistribucion(porTipo, amanecerPorTipo) {
    const canvas = $('#chart-distribucion');
    if (!canvas || typeof Chart === 'undefined') return;
    const tipos = Object.keys(porTipo).length > 0 ? Object.keys(porTipo) : Object.keys(amanecerPorTipo);
    if (tipos.length === 0) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = getChartColors().text;
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Sin datos para mostrar', canvas.width / 2, canvas.height / 2);
      return;
    }
    const colors = getChartColors();
    const distribuido = tipos.map(t => porTipo[t] || 0);
    const restante = tipos.map(t => (amanecerPorTipo[t] || 0) - (porTipo[t] || 0));

    chartDistribucion = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: tipos,
        datasets: [
          { label: 'Distribuido', data: distribuido, backgroundColor: colors.palette[0] },
          { label: 'Restante', data: restante, backgroundColor: colors.palette[1] }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: colors.text } }
        },
        scales: {
          x: { ticks: { color: colors.text }, grid: { color: colors.grid } },
          y: { ticks: { color: colors.text }, grid: { color: colors.grid }, beginAtZero: true }
        }
      }
    });
  }

  function renderChartComparativo(inicio, distribuido, restante) {
    const canvas = $('#chart-comparativo');
    if (!canvas || typeof Chart === 'undefined') return;
    const colors = getChartColors();
    chartComparativo = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['Combustible'],
        datasets: [
          { label: 'Inicio', data: [inicio], backgroundColor: colors.palette[1] },
          { label: 'Distribuido', data: [distribuido], backgroundColor: colors.palette[2] },
          { label: 'Restante', data: [restante], backgroundColor: restante < 0 ? colors.palette[3] : colors.palette[7] }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: colors.text } } },
        scales: {
          x: { ticks: { color: colors.text }, grid: { color: colors.grid } },
          y: { ticks: { color: colors.text }, grid: { color: colors.grid }, beginAtZero: true }
        }
      }
    });
  }

  function renderChartTipoPago(boletasDia) {
    const canvas = $('#chart-tipo-pago');
    if (!canvas || typeof Chart === 'undefined') return;
    const colors = getChartColors();
    let privado = 0, estatal = 0;
    boletasDia.forEach(b => {
      const c = parseFloat(b.cantidad) || 0;
      if (b.tipoPago === 'PRIVADO') privado += c;
      else estatal += c;
    });
    if (privado === 0 && estatal === 0) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = colors.text;
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Sin datos para mostrar', canvas.width / 2, canvas.height / 2);
      return;
    }
    chartTipoPago = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Privado', 'Estatal'],
        datasets: [{
          data: [privado, estatal],
          backgroundColor: [colors.palette[2], colors.palette[1]],
          borderWidth: 2,
          borderColor: colors.grid
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: colors.text } } }
      }
    });
  }

  // ====== REGISTRO (BOLETAS) ======
  function renderBoletas() {
    const search = ($('#search-boleta').value || '').toLowerCase().trim();
    let boletas = BoletappsDB.getBoletas().slice().reverse();

    if (search) {
      boletas = boletas.filter(b =>
        b.id.toLowerCase().includes(search) ||
        (b.chapa || '').toLowerCase().includes(search) ||
        (b.asignacionA || '').toLowerCase().includes(search) ||
        (b.servicentro || '').toLowerCase().includes(search)
      );
    }

    const cont = $('#lista-boletas');
    if (boletas.length === 0) {
      cont.innerHTML = `<div class="ba-empty"><div class="ba-empty-icon">🧾</div><p>No hay boletas registradas.<br>Presiona <strong>+ Nueva Boleta</strong> para comenzar.</p></div>`;
      return;
    }

    cont.innerHTML = boletas.map(b => `
      <div class="ba-card">
        <div class="ba-card-header">
          <div>
            <span class="ba-card-id">${escapeHtml(b.id)}</span>
            <div class="ba-card-title">${escapeHtml(b.servicentro)}</div>
          </div>
          <span class="ba-badge ${b.tipoPago === 'PRIVADO' ? 'ba-badge-privado' : 'ba-badge-estatal'}">${escapeHtml(b.tipoPago)}</span>
        </div>
        <div class="ba-card-body">
          <div><strong>Fecha:</strong> ${fechaLarga(b.fecha)}</div>
          <div><strong>Combustible:</strong> ${escapeHtml(b.tipoCombustible)}</div>
          <div><strong>Cantidad:</strong> ${escapeHtml(b.cantidad)}</div>
          <div><strong>CHAPA:</strong> ${escapeHtml(b.chapa)}</div>
          <div style="grid-column:1/-1"><strong>Asignación:</strong> ${escapeHtml(b.asignacionA)}</div>
        </div>
        <div class="ba-card-actions">
          <button class="ba-btn ba-btn-whatsapp ba-btn-sm" data-action="share" data-id="${escapeHtml(b.id)}">📤 Compartir</button>
          <button class="ba-btn ba-btn-secondary ba-btn-sm" data-action="edit" data-id="${escapeHtml(b.id)}">✏️ Editar</button>
          <button class="ba-btn ba-btn-danger ba-btn-sm" data-action="delete" data-id="${escapeHtml(b.id)}">🗑️ Eliminar</button>
        </div>
      </div>
    `).join('');

    $all('#lista-boletas [data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        if (action === 'share') compartirBoleta(id);
        if (action === 'edit') abrirModalBoleta(id);
        if (action === 'delete') eliminarBoleta(id);
      });
    });
  }

  function abrirModalBoleta(id) {
    const boleta = id ? BoletappsDB.getBoletaById(id) : null;
    const nuevoId = id || BoletappsDB.generarIdBoleta();
    const servicentros = BoletappsDB.getServicentros();
    const combustibles = BoletappsDB.getTiposCombustible();

    const html = `
      <div class="ba-modal-overlay">
        <div class="ba-modal">
          <div class="ba-modal-header">
            <div class="ba-modal-title">${boleta ? 'Editar Boleta' : 'Nueva Boleta'}</div>
            <button class="ba-modal-close" data-action="close">×</button>
          </div>
          <div class="ba-modal-body">
            <div class="ba-form-row">
              <label>ID Boleta
                <input type="text" id="m-id" value="${escapeHtml(nuevoId)}" readonly style="font-weight:700;color:var(--ba-primary);background:var(--ba-primary-light);" />
              </label>
            </div>
            <div class="ba-form-row">
              <label>Fecha
                <input type="date" id="m-fecha" value="${boleta ? boleta.fecha : hoyISO()}" required />
              </label>
            </div>
            <div class="ba-form-row">
              <label>Servicentro
                <select id="m-servicentro" required>
                  ${servicentros.map(s => `<option value="${escapeHtml(s)}" ${boleta && boleta.servicentro === s ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('')}
                </select>
              </label>
            </div>
            <div class="ba-form-row">
              <label>Asignación a
                <input type="text" id="m-asignacion" value="${boleta ? escapeHtml(boleta.asignacionA) : ''}" placeholder="Nombre del conductor/vehículo" required />
              </label>
            </div>
            <div class="ba-form-row">
              <label>Tipo de Combustible
                <select id="m-combustible" required>
                  ${combustibles.map(c => `<option value="${escapeHtml(c)}" ${boleta && boleta.tipoCombustible === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
                </select>
              </label>
              <label>Cantidad
                <input type="number" step="0.01" id="m-cantidad" value="${boleta ? boleta.cantidad : ''}" placeholder="0.00" required />
              </label>
            </div>
            <div class="ba-form-row">
              <label>CHAPA
                <input type="text" id="m-chapa" value="${boleta ? escapeHtml(boleta.chapa) : ''}" placeholder="Placa/Chapa del vehículo" required />
              </label>
              <label>Tipo de Pago
                <select id="m-tipopago" required>
                  <option value="PRIVADO" ${boleta && boleta.tipoPago === 'PRIVADO' ? 'selected' : ''}>PRIVADO</option>
                  <option value="ESTATAL" ${boleta && boleta.tipoPago === 'ESTATAL' ? 'selected' : ''}>ESTATAL</option>
                </select>
              </label>
            </div>
          </div>
          <div class="ba-modal-footer">
            <button class="ba-btn ba-btn-secondary" data-action="close">Cancelar</button>
            <button class="ba-btn ba-btn-primary" data-action="save">💾 Guardar</button>
            ${boleta ? '<button class="ba-btn ba-btn-whatsapp" data-action="share">📤 Compartir</button>' : ''}
          </div>
        </div>
      </div>
    `;

    const cont = $('#modal-container');
    cont.innerHTML = html;

    cont.querySelector('.ba-modal-overlay').addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (action === 'close') { cont.innerHTML = ''; }
      if (action === 'save') guardarBoleta(id);
      if (action === 'share') compartirBoleta(id);
      if (e.target === cont.querySelector('.ba-modal-overlay')) cont.innerHTML = '';
    });
  }

  function guardarBoleta(idOriginal) {
    const id = $('#m-id').value.trim();
    const fecha = $('#m-fecha').value;
    const servicentro = $('#m-servicentro').value;
    const asignacionA = $('#m-asignacion').value.trim();
    const tipoCombustible = $('#m-combustible').value;
    const cantidad = $('#m-cantidad').value;
    const chapa = $('#m-chapa').value.trim();
    const tipoPago = $('#m-tipopago').value;

    if (!fecha || !servicentro || !asignacionA || !tipoCombustible || !cantidad || !chapa) {
      toast('Complete todos los campos', 'error');
      return;
    }

    const data = { id, fecha, servicentro, asignacionA, tipoCombustible, cantidad, chapa, tipoPago };

    if (idOriginal) {
      BoletappsDB.updateBoleta(idOriginal, data);
      toast('Boleta actualizada', 'success');
    } else {
      BoletappsDB.addBoleta(data);
      toast('Boleta registrada', 'success');
    }

    $('#modal-container').innerHTML = '';
    renderBoletas();

    // Preguntar si compartir
    setTimeout(() => {
      if (confirm('¿Desea compartir esta boleta por WhatsApp o Telegram?')) {
        compartirBoleta(id);
      }
    }, 200);
  }

  function eliminarBoleta(id) {
    if (!confirm('¿Eliminar esta boleta? Esta acción no se puede deshacer.')) return;
    BoletappsDB.deleteBoleta(id);
    toast('Boleta eliminada', 'success');
    renderBoletas();
  }

  function compartirBoleta(id) {
    const boleta = BoletappsDB.getBoletaById(id);
    if (!boleta) return;
    const texto = BoletappsShare.formatearBoletaTexto(boleta);
    BoletappsShare.mostrarOpcionesCompartir(texto, 'Compartir Boleta');
  }

  // ====== PARTES DIARIOS ======
  function renderPartes() {
    const search = ($('#search-parte').value || '').toLowerCase().trim();
    let partes = BoletappsDB.getPartesDiarios().slice().reverse();

    if (search) {
      partes = partes.filter(p =>
        (p.servicentro || '').toLowerCase().includes(search) ||
        (p.fecha || '').includes(search)
      );
    }

    const cont = $('#lista-partes');
    if (partes.length === 0) {
      cont.innerHTML = `<div class="ba-empty"><div class="ba-empty-icon">📋</div><p>No hay partes diarios registrados.</p></div>`;
      return;
    }

    cont.innerHTML = partes.map(p => {
      const detalles = Object.entries(p.combustibles || {})
        .map(([k, v]) => `<div class="ba-parte-row"><span class="label">${escapeHtml(k)}</span><span class="value">${escapeHtml(String(v))}</span></div>`)
        .join('');
      return `
        <div class="ba-card">
          <div class="ba-card-header">
            <div>
              <span class="ba-card-id">${fechaLarga(p.fecha)}</span>
              <div class="ba-card-title">${escapeHtml(p.servicentro)}</div>
            </div>
          </div>
          ${detalles}
          <div class="ba-card-actions">
            <button class="ba-btn ba-btn-whatsapp ba-btn-sm" data-action="share" data-id="${escapeHtml(p.id)}">📤 Compartir</button>
            <button class="ba-btn ba-btn-secondary ba-btn-sm" data-action="edit" data-id="${escapeHtml(p.id)}">✏️ Editar</button>
            <button class="ba-btn ba-btn-danger ba-btn-sm" data-action="delete" data-id="${escapeHtml(p.id)}">🗑️ Eliminar</button>
          </div>
        </div>
      `;
    }).join('');

    $all('#lista-partes [data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        if (action === 'share') compartirParte(id);
        if (action === 'edit') abrirModalParte(id);
        if (action === 'delete') eliminarParte(id);
      });
    });
  }

  function abrirModalParte(id) {
    const partes = BoletappsDB.getPartesDiarios();
    const parte = id ? partes.find(p => p.id === id) : null;
    const servicentros = BoletappsDB.getServicentros();
    const combustibles = BoletappsDB.getTiposCombustible();

    const html = `
      <div class="ba-modal-overlay">
        <div class="ba-modal">
          <div class="ba-modal-header">
            <div class="ba-modal-title">${parte ? 'Editar Parte Diario' : 'Nuevo Parte Diario'}</div>
            <button class="ba-modal-close" data-action="close">×</button>
          </div>
          <div class="ba-modal-body">
            <div class="ba-form-row">
              <label>Fecha
                <input type="date" id="m-p-fecha" value="${parte ? parte.fecha : hoyISO()}" required />
              </label>
              <label>Servicentro
                <select id="m-p-servicentro" required>
                  ${servicentros.map(s => `<option value="${escapeHtml(s)}" ${parte && parte.servicentro === s ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('')}
                </select>
              </label>
            </div>
            <h4 style="margin:12px 0 6px;font-size:14px;color:var(--ba-text-muted);">Combustible al amanecer:</h4>
            <div id="m-p-combustibles">
              ${combustibles.map(c => `
                <div class="ba-form-row">
                  <label>${escapeHtml(c)}
                    <input type="number" step="0.01" data-tipo="${escapeHtml(c)}"
                      value="${parte && parte.combustibles && parte.combustibles[c] ? parte.combustibles[c] : ''}"
                      placeholder="0.00" />
                  </label>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="ba-modal-footer">
            <button class="ba-btn ba-btn-secondary" data-action="close">Cancelar</button>
            <button class="ba-btn ba-btn-primary" data-action="save">💾 Guardar</button>
          </div>
        </div>
      </div>
    `;

    const cont = $('#modal-container');
    cont.innerHTML = html;

    cont.querySelector('.ba-modal-overlay').addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (action === 'close') { cont.innerHTML = ''; }
      if (action === 'save') guardarParte(id);
      if (e.target === cont.querySelector('.ba-modal-overlay')) cont.innerHTML = '';
    });
  }

  function guardarParte(idOriginal) {
    const fecha = $('#m-p-fecha').value;
    const servicentro = $('#m-p-servicentro').value;
    if (!fecha || !servicentro) {
      toast('Complete fecha y servicentro', 'error');
      return;
    }

    const combustibles = {};
    $all('#m-p-combustibles input').forEach(inp => {
      const tipo = inp.dataset.tipo;
      const val = inp.value.trim();
      if (val !== '') combustibles[tipo] = val;
    });

    if (Object.keys(combustibles).length === 0) {
      toast('Ingrese al menos un combustible', 'error');
      return;
    }

    const partes = BoletappsDB.getPartesDiarios();
    const existe = partes.find(p => p.fecha === fecha && p.servicentro === servicentro);

    const data = {
      id: idOriginal || (existe ? existe.id : 'pd-' + Date.now()),
      fecha, servicentro, combustibles
    };
    BoletappsDB.addParteDiario(data);
    toast('Parte diario guardado', 'success');
    $('#modal-container').innerHTML = '';
    renderPartes();
  }

  function eliminarParte(id) {
    if (!confirm('¿Eliminar este parte diario?')) return;
    BoletappsDB.deleteParteDiario(id);
    toast('Parte eliminado', 'success');
    renderPartes();
  }

  function compartirParte(id) {
    const parte = BoletappsDB.getPartesDiarios().find(p => p.id === id);
    if (!parte) return;
    const texto = BoletappsShare.formatearParteTexto(parte);
    BoletappsShare.mostrarOpcionesCompartir(texto, 'Compartir Parte Diario');
  }

  // ====== REPORTES ======
  function generarReporte() {
    const filtros = {
      fechaInicio: $('#rep-fecha-inicio').value,
      fechaFin: $('#rep-fecha-fin').value,
      servicentro: $('#rep-servicentro').value,
      tipoCombustible: $('#rep-combustible').value,
      tipoPago: $('#rep-tipo-pago').value
    };

    if (!filtros.fechaInicio && !filtros.fechaFin) {
      toast('Seleccione al menos una fecha', 'error');
      return;
    }

    const boletas = BoletappsDB.filtrarBoletas(filtros);

    // Resumen
    const total = boletas.reduce((sum, b) => sum + (parseFloat(b.cantidad) || 0), 0);
    const totalPrivado = boletas.filter(b => b.tipoPago === 'PRIVADO').reduce((s, b) => s + (parseFloat(b.cantidad) || 0), 0);
    const totalEstatal = boletas.filter(b => b.tipoPago === 'ESTATAL').reduce((s, b) => s + (parseFloat(b.cantidad) || 0), 0);

    const summaryHtml = `
      <div class="ba-report-summary">
        <div class="ba-report-summary-item">
          <div class="num">${boletas.length}</div>
          <div class="lbl">Boletas</div>
        </div>
        <div class="ba-report-summary-item">
          <div class="num">${total.toFixed(2)}</div>
          <div class="lbl">Total Combustible</div>
        </div>
        <div class="ba-report-summary-item">
          <div class="num">${totalPrivado.toFixed(2)}</div>
          <div class="lbl">Privado</div>
        </div>
        <div class="ba-report-summary-item">
          <div class="num">${totalEstatal.toFixed(2)}</div>
          <div class="lbl">Estatal</div>
        </div>
      </div>
    `;

    // Agrupar por fecha
    const porFecha = {};
    boletas.forEach(b => {
      if (!porFecha[b.fecha]) porFecha[b.fecha] = [];
      porFecha[b.fecha].push(b);
    });

    const fechas = Object.keys(porFecha).sort();
    let detalleHtml = fechas.map(fecha => {
      const items = porFecha[fecha];
      const subtotal = items.reduce((s, b) => s + (parseFloat(b.cantidad) || 0), 0);
      return `
        <div class="ba-report-group">
          <div class="ba-report-group-title">
            <span>📅 ${fechaLarga(fecha)}</span>
            <span>${items.length} boletas | ${subtotal.toFixed(2)} total</span>
          </div>
          ${items.map(b => `
            <div class="ba-parte-row">
              <span class="label">${escapeHtml(b.id)} · ${escapeHtml(b.chapa)} · ${escapeHtml(b.tipoCombustible)} · ${escapeHtml(b.tipoPago)}</span>
              <span class="value">${escapeHtml(b.cantidad)}</span>
            </div>
          `).join('')}
        </div>
      `;
    }).join('');

    if (fechas.length === 0) {
      detalleHtml = '<div class="ba-empty"><div class="ba-empty-icon">📊</div><p>No hay boletas en el rango seleccionado.</p></div>';
    }

    const accionesHtml = boletas.length > 0 ? `
      <div class="ba-export-actions">
        <button class="ba-btn ba-btn-whatsapp" id="btn-share-reporte-wa">📤 Compartir</button>
        <button class="ba-btn ba-btn-danger" id="btn-export-pdf">📄 PDF</button>
        <button class="ba-btn ba-btn-success" id="btn-export-excel">📊 Excel</button>
        <button class="ba-btn ba-btn-secondary" id="btn-export-csv">💾 CSV</button>
      </div>
    ` : '';

    // Guardar datos del último reporte para exportación
    ultimoReporte = { boletas, filtros, total, totalPrivado, totalEstatal };

    $('#reporte-resultado').innerHTML = summaryHtml + detalleHtml + accionesHtml;

    const btnShare = $('#btn-share-reporte-wa');
    if (btnShare) {
      btnShare.addEventListener('click', () => {
        const titulo = `Reporte: ${filtros.fechaInicio || 'Inicio'} a ${filtros.fechaFin || 'Fin'}`;
        const texto = BoletappsShare.formatearReporteTexto(titulo, boletas, total.toFixed(2));
        BoletappsShare.mostrarOpcionesCompartir(texto, 'Compartir Reporte');
      });
    }
    const btnPdf = $('#btn-export-pdf');
    if (btnPdf) btnPdf.addEventListener('click', exportarReportePDF);
    const btnExcel = $('#btn-export-excel');
    if (btnExcel) btnExcel.addEventListener('click', exportarReporteExcel);
    const btnCsv = $('#btn-export-csv');
    if (btnCsv) btnCsv.addEventListener('click', exportarReporteCSV);
  }

  // ====== EXPORTACIONES ======
  let ultimoReporte = null;

  function exportarReportePDF() {
    if (!ultimoReporte) return;
    const { boletas, filtros, total, totalPrivado, totalEstatal } = ultimoReporte;
    if (typeof window.jspdf === 'undefined') {
      toast('Librería PDF no disponible', 'error');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210, M = 15;
    let y = 18;

    // Título
    doc.setFontSize(18);
    doc.setTextColor(13, 110, 253);
    doc.text('BoletApps - Reporte de Combustible', M, y);
    y += 7;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Periodo: ${filtros.fechaInicio || 'Inicio'} a ${filtros.fechaFin || 'Fin'}`, M, y);
    y += 5;
    doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, M, y);
    y += 8;

    // Resumen
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Resumen', M, y);
    y += 5;
    doc.setFontSize(10);
    doc.setTextColor(60);
    doc.text(`Total boletas: ${boletas.length}`, M, y); y += 4.5;
    doc.text(`Total combustible: ${total.toFixed(2)}`, M, y); y += 4.5;
    doc.text(`Privado: ${totalPrivado.toFixed(2)}  |  Estatal: ${totalEstatal.toFixed(2)}`, M, y); y += 4.5;
    if (filtros.servicentro !== 'todos') { doc.text(`Servicentro: ${filtros.servicentro}`, M, y); y += 4.5; }
    if (filtros.tipoCombustible !== 'todos') { doc.text(`Combustible: ${filtros.tipoCombustible}`, M, y); y += 4.5; }
    if (filtros.tipoPago !== 'todos') { doc.text(`Tipo pago: ${filtros.tipoPago}`, M, y); y += 4.5; }
    y += 4;

    // Tabla
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text('Detalle de Boletas', M, y);
    y += 5;

    // Cabecera tabla
    const cols = ['#', 'ID', 'Fecha', 'Servicentro', 'Combustible', 'Cant.', 'CHAPA', 'Pago', 'Asignación'];
    const widths = [8, 16, 22, 32, 28, 14, 18, 16, 30];
    doc.setFontSize(8);
    doc.setFillColor(13, 110, 253);
    doc.setTextColor(255);
    doc.rect(M, y - 4, W - 2 * M, 6, 'F');
    let x = M;
    cols.forEach((c, i) => {
      doc.text(c, x + 1, y);
      x += widths[i];
    });
    y += 6;

    // Filas
    doc.setTextColor(40);
    boletas.forEach((b, idx) => {
      if (y > 280) {
        doc.addPage();
        y = 18;
      }
      // Fila alterna
      if (idx % 2 === 0) {
        doc.setFillColor(245, 247, 251);
        doc.rect(M, y - 4, W - 2 * M, 5, 'F');
      }
      x = M;
      const cells = [
        String(idx + 1),
        b.id,
        b.fecha,
        (b.servicentro || '').substring(0, 18),
        (b.tipoCombustible || '').substring(0, 16),
        String(b.cantidad),
        (b.chapa || '').substring(0, 10),
        (b.tipoPago || '').substring(0, 8),
        (b.asignacionA || '').substring(0, 18)
      ];
      cells.forEach((cell, i) => {
        doc.text(String(cell), x + 1, y);
        x += widths[i];
      });
      y += 5;
    });

    // Total al final
    y += 2;
    doc.setDrawColor(13, 110, 253);
    doc.line(M, y - 2, W - M, y - 2);
    doc.setFontSize(10);
    doc.setTextColor(13, 110, 253);
    doc.text(`TOTAL: ${total.toFixed(2)}  (${boletas.length} boletas)`, M, y + 3);

    // Pie de página en todas las páginas
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text('BoletApps - Reporte generado automáticamente', M, 290);
      doc.text(`Página ${i} de ${pageCount}`, W - M - 20, 290);
    }

    const nombre = `reporte-boletapps-${filtros.fechaInicio || 'ini'}-a-${filtros.fechaFin || 'fin'}.pdf`;
    doc.save(nombre);
    toast('PDF generado', 'success');
  }

  function exportarReporteExcel() {
    if (!ultimoReporte) return;
    const { boletas, filtros, total, totalPrivado, totalEstatal } = ultimoReporte;
    if (typeof XLSX === 'undefined') {
      toast('Librería Excel no disponible', 'error');
      return;
    }
    const wb = XLSX.utils.book_new();

    // Hoja 1: Resumen
    const resumenData = [
      ['BoletApps - Reporte de Combustible'],
      ['Periodo', `${filtros.fechaInicio || 'Inicio'} a ${filtros.fechaFin || 'Fin'}`],
      ['Generado', new Date().toLocaleString('es-ES')],
      ['Servicentro', filtros.servicentro || 'Todos'],
      ['Combustible', filtros.tipoCombustible || 'Todos'],
      ['Tipo de Pago', filtros.tipoPago || 'Todos'],
      [],
      ['Métrica', 'Valor'],
      ['Total Boletas', boletas.length],
      ['Total Combustible', Number(total.toFixed(2))],
      ['Total Privado', Number(totalPrivado.toFixed(2))],
      ['Total Estatal', Number(totalEstatal.toFixed(2))]
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(resumenData);
    ws1['!cols'] = [{ wch: 25 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Resumen');

    // Hoja 2: Detalle
    const detalleData = [
      ['#', 'ID Boleta', 'Fecha', 'Servicentro', 'Asignación a', 'Tipo Combustible', 'Cantidad', 'CHAPA', 'Tipo Pago']
    ];
    boletas.forEach((b, idx) => {
      detalleData.push([
        idx + 1, b.id, b.fecha, b.servicentro, b.asignacionA,
        b.tipoCombustible, Number(b.cantidad), b.chapa, b.tipoPago
      ]);
    });
    // Fila de totales
    detalleData.push([]);
    detalleData.push(['', '', '', '', '', 'TOTAL', Number(total.toFixed(2)), '', '']);
    const ws2 = XLSX.utils.aoa_to_sheet(detalleData);
    ws2['!cols'] = [
      { wch: 5 }, { wch: 12 }, { wch: 12 }, { wch: 22 }, { wch: 22 },
      { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 12 }
    ];
    XLSX.utils.book_append_sheet(wb, ws2, 'Detalle');

    const nombre = `reporte-boletapps-${filtros.fechaInicio || 'ini'}-a-${filtros.fechaFin || 'fin'}.xlsx`;
    XLSX.writeFile(wb, nombre);
    toast('Excel generado', 'success');
  }

  function exportarReporteCSV() {
    if (!ultimoReporte) return;
    const { boletas, filtros, total } = ultimoReporte;
    const header = ['ID Boleta', 'Fecha', 'Servicentro', 'Asignacion', 'Tipo Combustible', 'Cantidad', 'CHAPA', 'Tipo Pago'];
    const rows = boletas.map(b => [
      b.id, b.fecha, b.servicentro, b.asignacionA, b.tipoCombustible,
      b.cantidad, b.chapa, b.tipoPago
    ]);
    rows.push(['', '', '', '', 'TOTAL', total.toFixed(2), '', '']);

    const csv = [header, ...rows]
      .map(r => r.map(c => {
        const s = String(c == null ? '' : c);
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? '"' + s.replace(/"/g, '""') + '"'
          : s;
      }).join(','))
      .join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const nombre = `reporte-boletapps-${filtros.fechaInicio || 'ini'}-a-${filtros.fechaFin || 'fin'}.csv`;
    if (typeof saveAs !== 'undefined') {
      saveAs(blob, nombre);
    } else {
      descargarArchivo(blob, nombre);
    }
    toast('CSV generado', 'success');
  }

  function descargarArchivo(blob, nombre) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ====== CONFIG ======
  function renderConfig() {
    // Servicentros
    const servicentros = BoletappsDB.getServicentros();
    $('#lista-servicentros').innerHTML = servicentros.length === 0
      ? '<li style="justify-content:center;color:var(--ba-text-muted);">Sin servicentros</li>'
      : servicentros.map(s => `
        <li>
          <span>⛽ ${escapeHtml(s)}</span>
          <button data-action="del-serv" data-name="${escapeHtml(s)}">×</button>
        </li>
      `).join('');

    // Combustibles
    const combustibles = BoletappsDB.getTiposCombustible();
    $('#lista-combustibles').innerHTML = combustibles.length === 0
      ? '<li style="justify-content:center;color:var(--ba-text-muted);">Sin tipos de combustible</li>'
      : combustibles.map(c => `
        <li>
          <span>🛢️ ${escapeHtml(c)}</span>
          <button data-action="del-comb" data-name="${escapeHtml(c)}">×</button>
        </li>
      `).join('');

    $all('#lista-servicentros [data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm(`¿Eliminar el servicentro "${btn.dataset.name}"?`)) {
          BoletappsDB.deleteServicentro(btn.dataset.name);
          renderConfig();
          cargarSelectsDashboard();
          toast('Servicentro eliminado', 'success');
        }
      });
    });

    $all('#lista-combustibles [data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm(`¿Eliminar el combustible "${btn.dataset.name}"?`)) {
          BoletappsDB.deleteTipoCombustible(btn.dataset.name);
          renderConfig();
          toast('Combustible eliminado', 'success');
        }
      });
    });
  }

  function agregarServicentro() {
    const inp = $('#input-new-servicentro');
    const val = inp.value.trim();
    if (!val) {
      toast('Ingrese un nombre', 'error');
      return;
    }
    BoletappsDB.addServicentro(val);
    inp.value = '';
    renderConfig();
    cargarSelectsDashboard();
    toast('Servicentro agregado', 'success');
  }

  function agregarCombustible() {
    const inp = $('#input-new-combustible');
    const val = inp.value.trim();
    if (!val) {
      toast('Ingrese un tipo', 'error');
      return;
    }
    BoletappsDB.addTipoCombustible(val);
    inp.value = '';
    renderConfig();
    toast('Combustible agregado', 'success');
  }

  // ====== ADMIN ======
  function renderAdmin() {
    const backups = BoletappsDB.getBackups().slice().reverse();
    const cont = $('#lista-backups');
    if (backups.length === 0) {
      cont.innerHTML = `<div class="ba-empty"><div class="ba-empty-icon">💾</div><p>No hay backups creados.</p></div>`;
      return;
    }
    cont.innerHTML = backups.map(b => `
      <div class="ba-card">
        <div class="ba-card-header">
          <div>
            <span class="ba-card-id">${new Date(b.fecha).toLocaleString('es-ES')}</span>
            <div class="ba-card-title">${escapeHtml(b.id)}</div>
          </div>
        </div>
        <div class="ba-card-body">
          <div><strong>Boletas:</strong> ${b.data.boletas.length}</div>
          <div><strong>Partes:</strong> ${b.data.partesDiarios.length}</div>
        </div>
        <div class="ba-card-actions">
          <button class="ba-btn ba-btn-whatsapp ba-btn-sm" data-action="share" data-id="${escapeHtml(b.id)}">📤 Compartir</button>
          <button class="ba-btn ba-btn-secondary ba-btn-sm" data-action="restore" data-id="${escapeHtml(b.id)}">♻️ Restaurar</button>
          <button class="ba-btn ba-btn-danger ba-btn-sm" data-action="delete" data-id="${escapeHtml(b.id)}">🗑️ Eliminar</button>
        </div>
      </div>
    `).join('');

    $all('#lista-backups [data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        if (action === 'share') compartirBackup(id);
        if (action === 'restore') restaurarBackup(id);
        if (action === 'delete') eliminarBackup(id);
      });
    });
  }

  function cambiarCodigo() {
    const inp = $('#input-new-code');
    const val = inp.value.trim();
    if (!/^\d{4,8}$/.test(val)) {
      toast('El código debe tener 4-8 dígitos numéricos', 'error');
      return;
    }
    if (!confirm(`¿Cambiar el código de acceso a "${val}"?`)) return;
    BoletappsDB.setAccessCode(val);
    inp.value = '';
    toast('Código actualizado correctamente', 'success');
  }

  function crearBackup() {
    const bk = BoletappsDB.createBackup();
    toast(`Backup creado: ${bk.id}`, 'success');
    renderAdmin();
  }

  function eliminarBackup(id) {
    if (!confirm('¿Eliminar este backup?')) return;
    BoletappsDB.deleteBackup(id);
    toast('Backup eliminado', 'success');
    renderAdmin();
  }

  function restaurarBackup(id) {
    if (!confirm('¿Restaurar este backup? Los datos actuales se reemplazarán.')) return;
    BoletappsDB.restoreBackup(id);
    toast('Backup restaurado', 'success');
    renderAdmin();
    cargarSelectsDashboard();
    navegar('dashboard');
  }

  function compartirBackup(id) {
    const bk = BoletappsDB.getBackups().find(b => b.id === id);
    if (!bk) return;
    const texto = BoletappsShare.formatearBackupTexto(bk);
    BoletappsShare.mostrarOpcionesCompartir(texto, 'Compartir Backup');

    // También ofrecer descarga del JSON
    setTimeout(() => {
      if (confirm('¿Descargar también el archivo JSON del backup?')) {
        descargarJSON(JSON.stringify(bk.data, null, 2), `backup-${bk.id}.json`);
      }
    }, 100);
  }

  function exportarTodo() {
    const data = BoletappsDB.exportData();
    descargarJSON(data, `boletapps-backup-${hoyISO()}.json`);
    toast('Exportación completa', 'success');
  }

  function importarJSON(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = BoletappsDB.importData(ev.target.result);
        toast(`Importado: ${data.boletas.length} boletas, ${data.partesDiarios.length} partes`, 'success');
        cargarSelectsDashboard();
        navegar('dashboard');
      } catch (err) {
        toast('Error: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function descargarJSON(contenido, nombreArchivo) {
    const blob = new Blob([contenido], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ====== INIT ======
  document.addEventListener('DOMContentLoaded', initLogin);

})();
