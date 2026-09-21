import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AdminBackButton from '@/shared/components/AdminBackButton';
import shopClient from '@/infrastructure/http/shop.client';

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: user, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: () =>
      shopClient.get(`/admin/users/${id}`).then((r: any) => r.user ?? r),
    enabled: !!id,
  });

  if (isLoading) return <div className="p-8 text-center text-gray-400">Chargement…</div>;
  if (!user) return <div className="p-8 text-center text-red-400">Utilisateur introuvable</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <AdminBackButton />
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 min-w-0">
          {user.prenom} {user.nom}
        </h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Email</p>
            <p className="text-gray-900">{user.email}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Téléphone</p>
            <p className="text-gray-900">{user.telephone || '—'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Statut</p>
            <span
              className={`px-2 py-1 rounded-full text-xs ${
                user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {user.isActive ? 'Actif' : 'Bloqué'}
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Vérifié</p>
            <span
              className={`px-2 py-1 rounded-full text-xs ${
                user.isVerified ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {user.isVerified ? 'Vérifié' : 'Non vérifié'}
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Inscrit le</p>
            <p className="text-gray-900">
              {new Date(user.createdAt).toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
