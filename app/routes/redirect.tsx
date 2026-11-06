import { useEffect } from 'react';
import { useNavigate } from 'react-router';
export default function Redirect() {
  const navigate = useNavigate();
  useEffect(() => {
    void navigate('/it', { replace: true });
  }, [navigate]);
  return (
    <main className="error-page">
      <a className="button primary" href="/it">
        #RoadToSmartBaking →
      </a>
    </main>
  );
}
