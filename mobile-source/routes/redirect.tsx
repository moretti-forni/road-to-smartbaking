import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
export default function Redirect() {
  const navigate = useNavigate();
  useEffect(() => {
    void navigate('/it', { replace: true });
  }, [navigate]);
  return (
    <main className="error-page">
      <Link className="button primary" to="/it">
        #RoadToSmartBaking →
      </Link>
    </main>
  );
}
