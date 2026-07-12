/**
 * BoletApps - Capa de Base de Datos JSON
 * Gestiona la persistencia en localStorage simulando una base de datos JSON.
 * Estructura:
 * {
 *   "config": {
 *     "accessCode": "1234",
 *     "servicentros": ["Servicentro Central", "Servicentro Norte"],
 *     "tiposCombustible": ["Gasolina 90", "Gasolina 95", "Diésel", "GNV"]
 *   },
 *   "boletas": [],
 *   "partesDiarios": [],
 *   "backups": []
 * }
 */
(function (global) {
  'use strict';

  const DB_KEY = 'boletapps_db_v1';

  const defaultData = {
    config: {
      accessCode: '1234',
      servicentros: ['Servicentro Central', 'Servicentro Norte', 'Servicentro Sur'],
      tiposCombustible: ['Gasolina 90', 'Gasolina 95', 'Diésel', 'GNV']
    },
    boletas: [],
    partesDiarios: [],
    backups: []
  };

  function load() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (!raw) {
        const initial = structuredClone(defaultData);
        localStorage.setItem(DB_KEY, JSON.stringify(initial));
        return initial;
      }
      const parsed = JSON.parse(raw);
      // Merge con defaults para nuevas claves
      return {
        config: Object.assign({}, defaultData.config, parsed.config || {}),
        boletas: parsed.boletas || [],
        partesDiarios: parsed.partesDiarios || [],
        backups: parsed.backups || []
      };
    } catch (err) {
      console.error('Error cargando DB:', err);
      const initial = structuredClone(defaultData);
      localStorage.setItem(DB_KEY, JSON.stringify(initial));
      return initial;
    }
  }

  function save(data) {
    localStorage.setItem(DB_KEY, JSON.stringify(data));
  }

  function reset() {
    const initial = structuredClone(defaultData);
    localStorage.setItem(DB_KEY, JSON.stringify(initial));
    return initial;
  }

  // ---------- Configuración ----------
  function getConfig() {
    return load().config;
  }

  function updateConfig(partial) {
    const data = load();
    data.config = Object.assign({}, data.config, partial);
    save(data);
    return data.config;
  }

  function getServicentros() {
    return load().config.servicentros;
  }

  function addServicentro(nombre) {
    const data = load();
    if (!data.config.servicentros.includes(nombre)) {
      data.config.servicentros.push(nombre);
      save(data);
    }
    return data.config.servicentros;
  }

  function deleteServicentro(nombre) {
    const data = load();
    data.config.servicentros = data.config.servicentros.filter(s => s !== nombre);
    save(data);
    return data.config.servicentros;
  }

  function getTiposCombustible() {
    return load().config.tiposCombustible;
  }

  function addTipoCombustible(nombre) {
    const data = load();
    if (!data.config.tiposCombustible.includes(nombre)) {
      data.config.tiposCombustible.push(nombre);
      save(data);
    }
    return data.config.tiposCombustible;
  }

  function deleteTipoCombustible(nombre) {
    const data = load();
    data.config.tiposCombustible = data.config.tiposCombustible.filter(t => t !== nombre);
    save(data);
    return data.config.tiposCombustible;
  }

  function setAccessCode(newCode) {
    const data = load();
    data.config.accessCode = String(newCode);
    save(data);
    return data.config.accessCode;
  }

  function getAccessCode() {
    return load().config.accessCode;
  }

  // ---------- Boletas ----------
  function getBoletas() {
    return load().boletas;
  }

  function getBoletaById(id) {
    return load().boletas.find(b => b.id === id);
  }

  function addBoleta(boleta) {
    const data = load();
    data.boletas.push(boleta);
    save(data);
    return boleta;
  }

  function updateBoleta(id, patch) {
    const data = load();
    const idx = data.boletas.findIndex(b => b.id === id);
    if (idx === -1) return null;
    data.boletas[idx] = Object.assign({}, data.boletas[idx], patch);
    save(data);
    return data.boletas[idx];
  }

  function deleteBoleta(id) {
    const data = load();
    data.boletas = data.boletas.filter(b => b.id !== id);
    save(data);
  }

  /**
   * Genera el ID de boleta: combinación de número secuencial + mes en curso.
   * Formato: {numero}-{mes} ej: 1-07, 2-07 ... reinicia cada mes.
   */
  function generarIdBoleta() {
    const data = load();
    const ahora = new Date();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const year = ahora.getFullYear();
    const prefijoMes = `${mes}`;
    // Contar boletas del mes actual
    const boletasMes = data.boletas.filter(b => {
      const parts = b.id.split('-');
      return parts.length >= 2 && parts[1] === prefijoMes && b.id.endsWith(`-${year}`.slice(-2)) === false ? false : parts[1] === prefijoMes;
    });
    // Simplificamos: contar cuántas boletas tienen el mes actual en su ID
    const mismoMes = data.boletas.filter(b => {
      const parts = b.id.split('-');
      return parts.length >= 2 && parts[1] === prefijoMes;
    });
    const siguiente = mismoMes.length + 1;
    return `${siguiente}-${prefijoMes}`;
  }

  // ---------- Partes Diarios ----------
  function getPartesDiarios() {
    return load().partesDiarios;
  }

  function getParteByFechaServicentro(fecha, servicentro) {
    return load().partesDiarios.find(p => p.fecha === fecha && p.servicentro === servicentro);
  }

  function addParteDiario(parte) {
    const data = load();
    // Si ya existe para misma fecha+servicentro, se actualiza
    const idx = data.partesDiarios.findIndex(p => p.fecha === parte.fecha && p.servicentro === parte.servicentro);
    if (idx === -1) {
      data.partesDiarios.push(parte);
    } else {
      data.partesDiarios[idx] = parte;
    }
    save(data);
    return parte;
  }

  function deleteParteDiario(id) {
    const data = load();
    data.partesDiarios = data.partesDiarios.filter(p => p.id !== id);
    save(data);
  }

  // ---------- Backups ----------
  function getBackups() {
    return load().backups;
  }

  function createBackup() {
    const data = load();
    // Crear snapshot SIN la lista de backups para evitar estructura circular
    const snapshot = {
      config: structuredClone(data.config),
      boletas: structuredClone(data.boletas),
      partesDiarios: structuredClone(data.partesDiarios),
      backups: []
    };
    const backup = {
      id: 'bk-' + Date.now(),
      fecha: new Date().toISOString(),
      data: snapshot
    };
    data.backups.push(backup);
    // Mantener solo los últimos 20 backups
    if (data.backups.length > 20) {
      data.backups = data.backups.slice(-20);
    }
    save(data);
    return backup;
  }

  function deleteBackup(id) {
    const data = load();
    data.backups = data.backups.filter(b => b.id !== id);
    save(data);
  }

  function restoreBackup(id) {
    const data = load();
    const backup = data.backups.find(b => b.id === id);
    if (!backup) return null;
    const restored = structuredClone(backup.data);
    // Restaurar config, boletas y partes. Conservar lista actual de backups.
    if (!restored.config) restored.config = data.config;
    if (!Array.isArray(restored.boletas)) restored.boletas = [];
    if (!Array.isArray(restored.partesDiarios)) restored.partesDiarios = [];
    restored.backups = data.backups;
    save(restored);
    return restored;
  }

  function exportData() {
    return JSON.stringify(load(), null, 2);
  }

  function importData(jsonString) {
    const parsed = JSON.parse(jsonString);
    if (!parsed.config || !Array.isArray(parsed.boletas)) {
      throw new Error('Formato de archivo inválido');
    }
    const data = load();
    // Crear backup automático antes de importar (snapshot sin backups para evitar circular)
    const snapshot = {
      config: structuredClone(data.config),
      boletas: structuredClone(data.boletas),
      partesDiarios: structuredClone(data.partesDiarios),
      backups: []
    };
    data.backups.push({
      id: 'bk-pre-import-' + Date.now(),
      fecha: new Date().toISOString(),
      data: snapshot,
      label: 'Auto antes de importar'
    });
    // Aplicar importación, conservando lista de backups actuales
    parsed.backups = data.backups;
    if (!parsed.partesDiarios) parsed.partesDiarios = [];
    save(parsed);
    return parsed;
  }

  // ---------- Utilidades ----------
  function filtrarBoletas(filtros) {
    let boletas = getBoletas();
    if (filtros.fechaInicio) {
      boletas = boletas.filter(b => b.fecha >= filtros.fechaInicio);
    }
    if (filtros.fechaFin) {
      boletas = boletas.filter(b => b.fecha <= filtros.fechaFin);
    }
    if (filtros.servicentro && filtros.servicentro !== 'todos') {
      boletas = boletas.filter(b => b.servicentro === filtros.servicentro);
    }
    if (filtros.tipoCombustible && filtros.tipoCombustible !== 'todos') {
      boletas = boletas.filter(b => b.tipoCombustible === filtros.tipoCombustible);
    }
    if (filtros.tipoPago && filtros.tipoPago !== 'todos') {
      boletas = boletas.filter(b => b.tipoPago === filtros.tipoPago);
    }
    return boletas;
  }

  function partesPorServicentroFecha(servicentro, fecha) {
    const partes = getPartesDiarios();
    return partes.find(p => p.servicentro === servicentro && p.fecha === fecha);
  }

  global.BoletappsDB = {
    load, save, reset,
    getConfig, updateConfig,
    getServicentros, addServicentro, deleteServicentro,
    getTiposCombustible, addTipoCombustible, deleteTipoCombustible,
    getAccessCode, setAccessCode,
    getBoletas, getBoletaById, addBoleta, updateBoleta, deleteBoleta, generarIdBoleta,
    getPartesDiarios, getParteByFechaServicentro, addParteDiario, deleteParteDiario,
    getBackups, createBackup, deleteBackup, restoreBackup,
    exportData, importData,
    filtrarBoletas, partesPorServicentroFecha
  };

})(window);
