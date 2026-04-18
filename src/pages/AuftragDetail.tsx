import { useParams, Link } from "react-router-dom";

export default function AuftragDetail() {
  const { id } = useParams();
  return (
    <div className="p-6">
      <Link to="/" className="text-sm text-primary underline">← Zurück</Link>
      <h1 className="text-2xl font-bold mt-2">Auftrag</h1>
      <p className="text-muted-foreground">ID: {id}</p>
      <p className="mt-4 text-sm">Detailansicht (Phase 5) folgt in der nächsten Iteration.</p>
    </div>
  );
}
