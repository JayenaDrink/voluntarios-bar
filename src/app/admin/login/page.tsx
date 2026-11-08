'use client';
import { LoginForm } from '@/lib/client';

export default function AdminLogin() {
  return <LoginForm titulo="Voluntarios del bar · Admin" etiqueta="Contraseña de administrador" endpoint="/api/admin/login" destino="/admin" />;
}
