import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Workstation has been merged into the Visual Engine (/visual)
export default function Workstation() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/visual', { replace: true }); }, [navigate]);
  return null;
}