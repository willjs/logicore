# PENDIENTES — ErpBod (Next.js 16 + MySQL)

Estado al 16/08/2026. FASE 1-7 completadas y verificadas (empresas, usuarios, roles, catálogo, inventario, camiones, ventas, reintegros, reportes). Además: **foto del cliente y cédula/documentos** (multipart + storage/), **módulo "Venta en camión"** (búsqueda de cliente por documento con cartera/saldo pendiente, creación en línea con foto/documentos, venta desde stock del camión con permiso `sales.view`, pago por transferencia con captura obligatoria o efectivo con monto/cambio + firma en canvas, adjuntos EVIDENCIA/FIRMA por pago). Base de datos limpia (solo seed: 3 usuarios, 1 empresa, 3 roles).

## Funcionalidad definida en permisos pero SIN UI/rutas

1. **Financiero / Cartera** (`finance.view`) — no hay página de cuentas por cobrar detalladas; los reportes solo dan el agregado de cartera.
2. **Auditoría** (`audit.view`) — los `audit_logs` se registran (vía `src/lib/audit.ts`) pero no hay página para consultarlos.
3. **Movimientos** (`movements.view`) — no hay historial global de movimientos; solo kardex por producto dentro de Inventario.
4. **Importar/Exportar Excel** (`import.run` / `export.run`) — no existe nada; `export.run` está asignado a SUPERVISOR pero no lo usa ninguna función.
5. **`reports.generate`** — definido pero sin uso (los reportes son solo lectura).

## Extras que faltan para un ERP completo

6. Dashboard orientado a negocio — el actual (`src/app/(dashboard)/dashboard/page.tsx`) solo muestra usuarios/roles/empresas; le faltan KPIs de ventas, stock bajo y cartera.
7. Impresión/comprobante de venta (PDF/ticket) — no existe.
8. Alerta de stock bajo (por producto/bodega).

## Notas técnicas para retomar

- Arranque de MariaDB SOLO vía WMI (datadir `C:\xampp\mysql\data-erpbod`). Servidor: `npm run start` (producción) o `npm run dev`. Reiniciar matando el proceso del puerto 3000.
- En curl, los métodos distintos a GET/POST requieren `-X PATCH`/`-X DELETE` explícito (con `-d` solo se envía POST).
- Cookies `Secure` en producción no viajan por HTTP plano → en `next start` reenviar `erpbod_token=...; erpbod_company=1` extraídas de `set-cookie`. Ojo: en PowerShell el header `Set-Cookie` viene en UN solo string con las dos cookies separadas por `,` (extraer con regex `erpbod_token=([^;]+)` y `erpbod_company=([^;]+)`). Con `Invoke-WebRequest -Headers @{Cookie=...}` el header no se envía (usar `curl.exe -H "Cookie: ..."`). Para bodies JSON en POST usar `-d "@archivo.json"` (el JSON inline con `-d` no llega en PS).
- En PowerShell, `$pid` es reservado (no usar como variable).
- Prisma: en `$queryRaw` usar `Prisma.join(ids)` (un `IN (${ids})` se envía como un solo parámetro). `warehouse_inventory` no tiene columna `companyId`. `role.permissions` es un join model (usar `{ include: { permission: true } }`).
- Storage: `attachment.path` en BD incluye el prefijo de carpeta (`customers/…`, `documents/…`, `sales/…`); leer siempre con `readStored(attachment.path)` directo (no volver a prefijar). La foto usa kind `FOTO`, documentos `DOCUMENTO`; pagos `EVIDENCIA` (comprobante) y `FIRMA` (firma).
- Permisos de subida de foto/documento de cliente: `customers.create` O `customers.edit` (para que el vendedor adjunte al crear). Borrar foto/documento sigue siendo `customers.edit`.
- El módulo de ventas usa `/api/sales/trucks` (permiso `sales.view`) para listar camiones activos con su inventario (el vendedor NO tiene `trucks.view`).
