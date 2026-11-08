# Voluntarios del bar

Control de qué pareja atiende el bar del club belga como voluntarios cada jueves.

- `/` — lista de todos los jueves del año (por meses), con dos voluntarios y una nota por jueves. Botones ‹ › para cambiar de año.
- `/reporte` — próximos turnos (van a trabajar), turnos realizados (trabajaron), jueves libres y resumen por voluntario. Botón «Imprimir / PDF».
- `/admin` — con su propia contraseña (`ADMIN_PASSWORD`): borrar nombres de la lista de voluntarios y desbloquear / volver a cerrar jueves ya pasados.
- Los jueves que ya pasaron quedan cerrados (no se pueden editar) salvo que el admin los desbloquee. Lo comprueba también el servidor.
- Toda la app pide una contraseña (`APP_PASSWORD`), que dura 90 días en el dispositivo.
- Estética igual que los emails del club: cabecera granate con el logo, fuentes Archivo / Work Sans / JetBrains Mono.

Datos: tablas `bar_voluntarios` y `bar_voluntarios_nombres` en el proyecto Supabase ClubBelga (RLS activado, solo accede el servidor). Esquema en `supabase/schema.sql`.

## Variables de entorno (Vercel → Settings → Environment Variables)

| Variable | Valor |
|---|---|
| `SUPABASE_URL` | la misma que en pedidos-bar |
| `SUPABASE_SERVICE_ROLE_KEY` | la misma que en pedidos-bar (marcar Sensitive) |
| `APP_PASSWORD` | contraseña para los voluntarios |
| `ADMIN_PASSWORD` | contraseña de la página /admin (Sensitive) |

## Local

```
npm install
copy .env.example .env.local   (y rellenar)
npm run dev
```
