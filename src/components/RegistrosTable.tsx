.registros-table {
  background: white;
  border-radius: var(--radio-lg);
  padding: var(--sp-5);
  box-shadow: var(--sombra-2);
  border: 1px solid var(--borde);
}

.registros-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: var(--sp-5);
  gap: var(--sp-4);
  flex-wrap: wrap;
}

.registros-toolbar h2 {
  margin: 0;
  color: var(--texto);
  font-size: var(--fs-lg);
  font-weight: 700;
  letter-spacing: -0.01em;
}

.registros-count {
  font-size: var(--fs-sm);
  color: var(--texto-suave);
}

.registros-toolbar-acciones {
  display: flex;
  gap: var(--sp-2);
  flex-wrap: wrap;
}

.registros-filtros {
  display: flex;
  gap: var(--sp-2);
  margin-bottom: var(--sp-5);
  flex-wrap: wrap;
}

.registros-filtros input {
  flex: 1;
  min-width: 220px;
  padding: var(--sp-2) var(--sp-3);
  border: 1px solid var(--borde);
  border-radius: var(--radio-md);
  font-size: var(--fs-sm);
  background: var(--gris-100);
  transition: border-color var(--dur-1), background var(--dur-1);
}

.registros-filtros select {
  padding: var(--sp-2) var(--sp-3);
  border: 1px solid var(--borde);
  border-radius: var(--radio-md);
  font-size: var(--fs-sm);
  background: var(--gris-100);
  color: var(--texto);
}

.registros-filtros input:focus,
.registros-filtros select:focus {
  outline: none;
  border-color: var(--d1-rojo);
  background: white;
  box-shadow: 0 0 0 3px rgba(216, 19, 36, 0.12);
}

.registros-msg {
  color: var(--texto-suave);
  padding: var(--sp-4) 0;
}

.registros-msg.error {
  color: var(--d1-rojo-oscuro);
}

.table-scroll {
  overflow-x: auto;
  border-radius: var(--radio-md);
  border: 1px solid var(--borde);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--fs-sm);
}

thead th {
  text-align: left;
  padding: var(--sp-3);
  background: var(--d1-rojo-claro);
  color: var(--d1-rojo-oscuro);
  border-bottom: 1px solid #f3c9cc;
  white-space: nowrap;
  font-weight: 700;
  font-size: var(--fs-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  position: sticky;
  top: 0;
  z-index: 1;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.65rem;
  border-radius: var(--radio-full);
  font-size: var(--fs-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  white-space: nowrap;
}

.badge-pendiente {
  background: var(--d1-amarillo-claro);
  color: var(--d1-amarillo-oscuro);
}

.badge-resuelto {
  background: #e6f4ea;
  color: #0a7a3d;
}

.badge-critico {
  background: var(--d1-rojo-claro);
  color: var(--d1-rojo-oscuro);
}

tbody td {
  padding: var(--sp-3);
  border-bottom: 1px solid var(--gris-100);
  vertical-align: middle;
  color: var(--texto);
}

tbody tr:nth-child(even) {
  background: var(--gris-100);
}

tbody tr {
  transition: background var(--dur-1);
}

tbody tr:hover {
  background: var(--d1-rojo-claro);
}

.registros-empty {
  text-align: center;
  color: var(--texto-suave);
  padding: var(--sp-7) 0 !important;
}

.evidencia-thumb {
  width: 42px;
  height: 42px;
  object-fit: cover;
  border-radius: var(--radio-sm);
  border: 1px solid var(--borde);
  transition: transform var(--dur-1);
}

.evidencia-thumb:hover {
  transform: scale(1.6);
  box-shadow: var(--sombra-3);
}

.registros-acciones {
  white-space: nowrap;
}

.link-btn {
  background: none;
  border: none;
  color: var(--d1-rojo);
  cursor: pointer;
  font-size: var(--fs-sm);
  padding: var(--sp-1) var(--sp-2);
  font-weight: 600;
  border-radius: var(--radio-sm);
  transition: background var(--dur-1);
}

.link-btn:hover {
  background: rgba(216, 19, 36, 0.1);
}

.link-btn.danger {
  color: #8a1116;
}

.link-btn.danger:hover {
  background: rgba(138, 17, 22, 0.1);
}
