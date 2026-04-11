import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Ingresa email y contraseña');

    setLoading(true);
    try {
      await login(email, password);
      toast.success('¡Bienvenido!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role) => {
    const creds = {
      admin: { email: 'admin@academico.cl', password: 'admin123' },
      coordinator: { email: 'maria.gonzalez@academico.cl', password: 'coord123' },
      user: { email: 'ana.rodriguez@academico.cl', password: 'user123' }
    };
    setEmail(creds[role].email);
    setPassword(creds[role].password);
  };

  return (
    <div className="login-page">
      <div className="login-card slide-up">
        <div className="login-logo">
          <div className="login-logo-icon">🎓</div>
          <h1>Gestión Académica</h1>
          <p>Plataforma de diplomados y magíster</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Correo electrónico</label>
            <input
              id="login-email"
              className="form-input"
              type="email"
              placeholder="tu@email.cl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Contraseña</label>
            <input
              id="login-password"
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: '8px' }}>
            {loading ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></span> : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="login-demo">
          <p style={{ marginBottom: 8 }}><strong>Usuarios de prueba:</strong></p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => fillDemo('admin')} type="button">Admin</button>
            <button className="btn btn-secondary btn-sm" onClick={() => fillDemo('coordinator')} type="button">Coordinador</button>
            <button className="btn btn-secondary btn-sm" onClick={() => fillDemo('user')} type="button">Usuario</button>
          </div>
        </div>
      </div>
    </div>
  );
}
