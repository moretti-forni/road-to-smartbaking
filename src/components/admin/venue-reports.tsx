'use client';
import { useQuery } from '@tanstack/react-query';
import { staffApi, apiError } from '../../services/studio';
type Report = { id: string; name: string; reason: string; details: string; createdAt: string };
export function VenueReports({ token }: { token: string }) {
  const reports = useQuery({
    queryKey: ['venue-reports', token],
    queryFn: ({ signal }) => staffApi(token).list<Report>('reports', signal),
  });
  return (
    <section className="staff-reports">
      <h2>Venue reports</h2>
      {reports.isPending ? (
        <p>Loading reports…</p>
      ) : reports.isError ? (
        <>
          <p role="alert">{apiError(reports.error)}</p>
          <button onClick={() => void reports.refetch()}>Retry reports</button>
        </>
      ) : reports.data.length ? (
        reports.data.map((report) => (
          <article key={report.id}>
            <strong>{report.name}</strong>
            <p>
              {report.reason} · {new Date(report.createdAt).toLocaleDateString()}
            </p>
            <p>{report.details}</p>
          </article>
        ))
      ) : (
        <p>No venue reports.</p>
      )}
    </section>
  );
}
