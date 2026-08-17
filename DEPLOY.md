# Pendientes - Deploy Coolify

## 1. Configurar base de datos en Coolify
- [ ] Crear servicio MariaDB/MySQL en Coolify
- [ ] Crear base de datos `erpbod`
- [ ] Crear usuario `erpbod` con permisos completos
- [ ] Anotar host, puerto y credenciales

## 2. Deploy de la app
- [ ] Conectar repositorio `willjs/logicore` en Coolify
- [ ] Seleccionar Dockerfile
- [ ] Configurar variables de entorno:
  - `DB_HOST=` (host de MariaDB en Coolify)
  - `DB_PORT=3306`
  - `DB_DATABASE=erpbod`
  - `DB_USER=erpbod`
  - `DB_PASSWORD=`
  - `JWT_SECRET=` (generar uno seguro)
- [ ] Puerto: `3000`
- [ ] Iniciar build y deploy

## 3. Post-deploy
- [ ] Ejecutar `prisma db push` para sincronizar tablas
- [ ] Ejecutar `npm run db:seed` para datos iniciales
- [ ] Verificar login con `admin@erpbod.com / Admin#2026`
- [ ] Verificar logo en sidebar y PDF
- [ ] Probar reportes PDF

## 4. Opcional
- [ ] Configurar dominio/SSL en Coolify
- [ ] Revisar logs del contenedor
