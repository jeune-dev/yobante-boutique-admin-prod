import { useState } from 'react';
import { useReviews, useToggleApprove, useDeleteReview } from '@/domains/shop/hooks/useReviews';
import { Review } from '@/domains/shop/api/reviews.api';
import { showSuccess, showConfirm } from '@/shared/utils/alert';
import Pagination from '@/shared/components/tables/Pagination';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function Stars({ note }: { note: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} viewBox="0 0 24 24" fill={i <= note ? '#eab308' : 'none'} stroke={i <= note ? '#eab308' : '#ccc'} strokeWidth={2} style={{ width: 14, height: 14 }}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const [page, setPage] = useState(1);
  const [approvedFilter, setApprovedFilter] = useState<boolean | undefined>();

  const { data, isLoading, isError } = useReviews({ page, limit: 15, isApproved: approvedFilter });
  const approveMut = useToggleApprove();
  const deleteMut = useDeleteReview();

  // Le backend renvoie { avis, pagination: { total, totalPages, page, limit } }.
  const reviews = (data as any)?.avis ?? [];
  const totalPages = (data as any)?.pagination?.totalPages ?? 1;
  const count = (data as any)?.pagination?.total ?? reviews.length;

  const handleToggle = (r: Review) => {
    approveMut.mutate(r.id, {
      onSuccess: (data) => showSuccess(data),
    });
  };

  const confirmerSuppression = (r: Review) => {
    showConfirm({
      titre: 'Confirmer la suppression',
      message: `Supprimer l'avis de ${r.user?.nom ?? ''} ${r.user?.prenom ?? ''} sur ${r.produit?.nom ?? 'ce produit'} ?`,
      confirmText: 'Supprimer',
      danger: true,
    }).then((confirme) => {
      if (!confirme) return;
      deleteMut.mutate(r.id, {
        onSuccess: (data) => showSuccess(data),
      });
    });
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.6rem' }}>
        <div>
          <div style={{ fontSize: '1.08rem', fontWeight: 700, color: 'var(--black)' }}>Avis clients</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text3)', marginTop: 2 }}>
            {count} avis au total
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {[{ label: 'Tous', val: undefined }, { label: 'Approuvés', val: true }, { label: 'En attente', val: false }].map(f => (
          <button key={String(f.val)} className={`db-chip${approvedFilter === f.val ? ' active' : ''}`}
            onClick={() => { setApprovedFilter(f.val as any); setPage(1); }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Tableau */}
      <div className="db-card">
        {isLoading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text3)' }}>Chargement…</div>
        ) : isError ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--red)' }}>Erreur lors du chargement.</div>
        ) : reviews.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text3)' }}>Aucun avis trouvé.</div>
        ) : (
          <div className="db-table-wrap tbl-wrap">
            <table className="tbl-cards">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Produit</th>
                  <th>Note</th>
                  <th>Commentaire</th>
                  <th>Date</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r: Review) => (
                  <tr key={r.id}>
                    <td className="tbl-primary">
                      <div style={{ fontWeight: 600, fontSize: '0.87rem' }}>
                        {r.user?.nom} {r.user?.prenom}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.84rem', color: 'var(--text2)' }} data-label="Produit">
                      {r.produit?.nom ?? '—'}
                    </td>
                    <td data-label="Note"><Stars note={r.note} /></td>
                    <td style={{ maxWidth: 260 }} data-label="Commentaire">
                      {r.commentaire ? (
                        // Deux lignes max en tableau (voir .tbl-commentaire) ;
                        // en carte (mobile) le texte complet est affiché.
                        <div className="tbl-commentaire" title={r.commentaire} style={{ fontSize: '0.83rem', color: 'var(--text2)' }}>
                          {r.commentaire}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text3)', fontSize: '0.8rem' }}>—</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text3)', whiteSpace: 'nowrap' }} data-label="Date">
                      {fmtDate(r.createdAt)}
                    </td>
                    <td data-label="Statut">
                      <button onClick={() => handleToggle(r)} disabled={approveMut.isPending}
                        aria-label={r.isApproved ? 'Désapprouver' : 'Approuver'}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        <span className={`badge ${r.isApproved ? 'bg' : 'bgo'}`}>
                          {r.isApproved ? 'Approuvé' : 'En attente'}
                        </span>
                      </button>
                    </td>
                    <td className="tbl-actions" data-label="Actions">
                      <div className="db-actions">
                        <button className={r.isApproved ? 'db-btn-ghost' : 'db-btn-ghost'}
                          onClick={() => handleToggle(r)} disabled={approveMut.isPending}>
                          {r.isApproved ? 'Désapprouver' : 'Approuver'}
                        </button>
                        <button className="db-btn-danger" onClick={() => confirmerSuppression(r)}>
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </div>
  );
}
