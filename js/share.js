/**
 * BoletApps - Utilidades de compartir por WhatsApp y Telegram
 */
(function (global) {
  'use strict';

  function compartirWhatsApp(texto) {
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
  }

  function compartirTelegram(texto) {
    const url = `https://t.me/share/url?url=${encodeURIComponent('https://boletapps.app')}&text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
  }

  /**
   * Muestra un menú para elegir entre WhatsApp o Telegram.
   */
  function mostrarOpcionesCompartir(texto, titulo) {
    const modal = document.createElement('div');
    modal.className = 'ba-share-modal-overlay';
    modal.innerHTML = `
      <div class="ba-share-modal">
        <div class="ba-share-modal-title">${titulo || 'Compartir'}</div>
        <div class="ba-share-modal-preview">${escapeHtml(texto).replace(/\n/g, '<br>')}</div>
        <div class="ba-share-modal-actions">
          <button class="ba-btn ba-btn-whatsapp" data-action="wa">
            <span class="ba-icon">💬</span> WhatsApp
          </button>
          <button class="ba-btn ba-btn-telegram" data-action="tg">
            <span class="ba-icon">✈️</span> Telegram
          </button>
          <button class="ba-btn ba-btn-secondary" data-action="close">Cancelar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (action === 'wa') compartirWhatsApp(texto);
      if (action === 'tg') compartirTelegram(texto);
      if (action === 'wa' || action === 'tg' || action === 'close' || e.target === modal) {
        modal.remove();
      }
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatearBoletaTexto(boleta) {
    return [
      '🧾 BOLETA DE COMBUSTIBLE',
      '─────────────────────',
      `ID: ${boleta.id}`,
      `Fecha: ${boleta.fecha}`,
      `Servicentro: ${boleta.servicentro}`,
      `Asignación: ${boleta.asignacionA}`,
      `Combustible: ${boleta.tipoCombustible}`,
      `Cantidad: ${boleta.cantidad}`,
      `CHAPA: ${boleta.chapa}`,
      `Tipo Pago: ${boleta.tipoPago}`,
      '─────────────────────',
      'BoletApps'
    ].join('\n');
  }

  function formatearReporteTexto(titulo, boletas, total) {
    const lines = [
      `📊 ${titulo}`,
      '─────────────────────'
    ];
    boletas.forEach(b => {
      lines.push(`${b.id} | ${b.fecha} | ${b.servicentro} | ${b.tipoCombustible} | ${b.cantidad} | ${b.chapa} | ${b.tipoPago}`);
    });
    lines.push('─────────────────────');
    lines.push(`Total boletas: ${boletas.length}`);
    lines.push(`Total combustible: ${total}`);
    lines.push('BoletApps');
    return lines.join('\n');
  }

  function formatearParteTexto(parte) {
    const detalles = Object.entries(parte.combustibles || {})
      .map(([k, v]) => `  • ${k}: ${v}`)
      .join('\n');
    return [
      '📋 PARTE DIARIO SERVICENTRO',
      '─────────────────────',
      `Fecha: ${parte.fecha}`,
      `Servicentro: ${parte.servicentro}`,
      'Combustible al amanecer:',
      detalles,
      '─────────────────────',
      'BoletApps'
    ].join('\n');
  }

  function formatearBackupTexto(backup) {
    return [
      '💾 BACKUP BOLETAPPS',
      '─────────────────────',
      `ID: ${backup.id}`,
      `Fecha: ${new Date(backup.fecha).toLocaleString()}`,
      `Boletas: ${backup.data.boletas.length}`,
      `Partes: ${backup.data.partesDiarios.length}`,
      '─────────────────────',
      'BoletApps - Respaldo de datos'
    ].join('\n');
  }

  global.BoletappsShare = {
    compartirWhatsApp,
    compartirTelegram,
    mostrarOpcionesCompartir,
    formatearBoletaTexto,
    formatearReporteTexto,
    formatearParteTexto,
    formatearBackupTexto
  };

})(window);
