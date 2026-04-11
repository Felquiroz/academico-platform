import { useState, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (method, url, data = null, options = {}) => {
    setLoading(true);
    setError(null);
    try {
      const config = { method, url, ...options };
      if (data) config.data = data;

      const res = await api(config);
      
      if (options.successMessage) {
        toast.success(options.successMessage);
      }
      
      return res.data;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Error de conexión';
      setError(message);
      if (!options.silent) {
        toast.error(message);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const get = useCallback((url, opts) => request('GET', url, null, opts), [request]);
  const post = useCallback((url, data, opts) => request('POST', url, data, opts), [request]);
  const put = useCallback((url, data, opts) => request('PUT', url, data, opts), [request]);
  const del = useCallback((url, opts) => request('DELETE', url, null, opts), [request]);

  return { loading, error, get, post, put, del, request };
}
