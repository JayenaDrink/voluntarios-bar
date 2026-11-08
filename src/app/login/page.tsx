'use client';
import { LoginForm } from '@/lib/client';

export default function Login() {
  return <LoginForm titulo="Voluntarios del bar · Jueves" etiqueta="Contraseña" endpoint="/api/login" destino="/" />;
}
