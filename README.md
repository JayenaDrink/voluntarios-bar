# Voluntarios del bar

Control de qué pareja atiende el bar del club belga como voluntarios cada jueves.

- `/` — lista de todos los jueves del año (por meses), con dos voluntarios y una nota por jueves. Botones ‹ › para cambiar de año.
- `/reporte` — próximos turnos (van a trabajar), turnos realizados (trabajaron), jueves libres y resumen por voluntario. Botón «Imprimir / PDF».
- Toda la app pide una contraseña (`APP_PASSWORD`), que dura 90 días en el dispositivo.

Datos: tabla `bar_voluntarios` en el proyecto Supabase ClubBelga (RLS activado, solo accede el servidor). Esquema en `supabase/schema.sql`.

## Variables de entorno (Vercel → Settings → Environment Variables)

| Variable | Valor |
|---|---|
| `SUPABASE_URL` | la misma que en pedidos-bar |
| `SUPABASE_SERVICE_ROLE_KEY` | la misma que en pedidos-bar (marcar Sensitive) |
| `APP_PASSWORD` | contraseña para los voluntarios |

## Local

```
npm install
copy .env.example .env.local   (y rellenar)
npm run dev
```
