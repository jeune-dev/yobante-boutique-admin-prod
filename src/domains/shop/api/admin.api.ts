// domains/shop/api/admin.api.ts
// Appels API Boutique / Espace Admin — wired sur /api/v1/admin/*
// shopClient déballe déjà l'enveloppe { success, message, data } : chaque appel
// résout directement sur la charge utile.
import shopClient from '@/infrastructure/http/shop.client';

// Conservé pour homogénéiser le typage des appels de ce module.
const unwrap = async <T = any>(p: Promise<unknown>): Promise<T> => (await p) as T;

// Pour un envoi multipart : on retire le Content-Type json par défaut du client
// afin qu'axios pose lui-même le boundary multipart/form-data.
const multipart = { headers: { 'Content-Type': undefined as unknown as string } };

// ─── Dashboard ────────────────────────────────────────────────
export interface DashboardStats {
  totalClients: number;
  totalProduits: number;
  totalCommandes: number;
  chiffreAffaires: number;
}
export const getDashboardStats = () =>
  unwrap<DashboardStats>(shopClient.get('/admin/dashboard/stats'));

export const getCommandesParStatut = () =>
  unwrap<{ stats: any[] }>(shopClient.get('/admin/dashboard/commandes-statut'));

export const getTopProduits = () =>
  unwrap(shopClient.get('/admin/dashboard/top-produits'));

export const getStockAlertes = () =>
  unwrap(shopClient.get('/admin/dashboard/stock-alertes'));

// ─── Produits ─────────────────────────────────────────────────
export const listerProduits = (params?: Record<string, any>) =>
  unwrap<{ produits: any[]; pagination: any }>(
    shopClient.get('/admin/produits', { params })
  );

export const getProduit = (id: string) =>
  unwrap(shopClient.get(`/admin/produits/${id}`));

// Création / édition produit — multipart (champ fichiers "images", max 5)
export const creerProduit = (data: FormData) =>
  unwrap(shopClient.post('/admin/produits', data, multipart));

export const modifierProduit = (id: string, data: FormData) =>
  unwrap(shopClient.put(`/admin/produits/${id}`, data, multipart));

export const supprimerProduit = (id: string) =>
  unwrap(shopClient.delete(`/admin/produits/${id}`));

export const toggleProduitVisibilite = (id: string) =>
  unwrap(shopClient.patch(`/admin/produits/${id}/visibilite`));

export const toggleProduitFeatured = (id: string) =>
  unwrap(shopClient.patch(`/admin/produits/${id}/featured`));

// Validation produits (demandes de publication)
export const listerProduitsAValider = () =>
  unwrap<{ produits: any[]; total: number }>(
    shopClient.get('/admin/produits/validation/liste')
  );

export const validerProduitStep1 = (id: string) =>
  unwrap(shopClient.patch(`/admin/produits/${id}/valider-step1`));

export const validerProduitStep2 = (id: string) =>
  unwrap(shopClient.patch(`/admin/produits/${id}/valider-step2`));

export const rejeterProduit = (id: string, motif?: string) =>
  unwrap(shopClient.patch(`/admin/produits/${id}/rejeter`, { motif }));

// ─── Commandes ────────────────────────────────────────────────
export const listerCommandes = (params?: Record<string, any>) =>
  unwrap<{ commandes: any[]; pagination: any }>(
    shopClient.get('/admin/commandes', { params })
  );

export const getCommande = (id: string) =>
  unwrap(shopClient.get(`/admin/commandes/${id}`));

export const validerCommande = (id: string) =>
  unwrap(shopClient.patch(`/admin/commandes/${id}/valider`));

export const rejeterCommande = (id: string, motif?: string) =>
  unwrap(shopClient.patch(`/admin/commandes/${id}/rejeter`, { motif }));

// ─── Clients ──────────────────────────────────────────────────
export const listerClients = (params?: Record<string, any>) =>
  unwrap<{ clients: any[]; pagination: any }>(
    shopClient.get('/admin/users/clients', { params })
  );

export const activerClient = (id: string) =>
  unwrap(shopClient.patch(`/admin/users/clients/${id}/activer`));

export const desactiverClient = (id: string) =>
  unwrap(shopClient.patch(`/admin/users/clients/${id}/desactiver`));

// ─── Admins ───────────────────────────────────────────────────
export const listerAdmins = (params?: Record<string, any>) =>
  unwrap<{ admins: any[]; pagination: any }>(
    shopClient.get('/admin/users/admins', { params })
  );

export const creerAdmin = (data: Record<string, any>) =>
  unwrap(shopClient.post('/admin/users/admins', data));

export const modifierAdmin = (id: string, data: Record<string, any>) =>
  unwrap(shopClient.put(`/admin/users/admins/${id}`, data));

export const supprimerAdmin = (id: string) =>
  unwrap(shopClient.delete(`/admin/users/admins/${id}`));

export const toggleAdmin = (id: string) =>
  unwrap(shopClient.patch(`/admin/users/admins/${id}/toggle`));

// ─── Vendeurs ─────────────────────────────────────────────────
export const listerVendeurs = (params?: Record<string, any>) =>
  unwrap<{ vendeurs: any[]; pagination: any }>(
    shopClient.get('/admin/vendeurs', { params })
  );

export const getVendeur = (id: string) =>
  unwrap(shopClient.get(`/admin/vendeurs/${id}`));

// Création d'un compte vendeur (user rôle VENDEUR + profil boutique).
// Champs requis : nom, prenom, email, nomBoutique ;
// optionnels : telephone, adresseBoutique, description, infoLegale.
// Le mot de passe temporaire est généré par le backend et envoyé par email.
export const creerVendeur = (data: Record<string, any>) =>
  unwrap(shopClient.post('/admin/vendeurs', data));

// Statut du vendeur : 'actif' | 'bloque'. Le circuit de validation en deux
// étapes a été supprimé — un vendeur est actif dès sa création.
export const getStatutVendeur = (id: string) =>
  unwrap<{ statut: 'actif' | 'bloque'; isBlocked: boolean }>(
    shopClient.get(`/admin/vendeurs/${id}/statut`)
  );

export const bloquerVendeur = (id: string) =>
  unwrap(shopClient.patch(`/admin/vendeurs/${id}/bloquer`));

export const debloquerVendeur = (id: string) =>
  unwrap(shopClient.patch(`/admin/vendeurs/${id}/debloquer`));

// ─── Bannières ────────────────────────────────────────────────
export const listerBannieres = () =>
  unwrap<{ bannieres: any[] }>(shopClient.get('/admin/bannieres'));

export const creerBanniere = (data: FormData) =>
  unwrap(shopClient.post('/admin/bannieres', data, multipart));

export const modifierBanniere = (id: string, data: FormData) =>
  unwrap(shopClient.put(`/admin/bannieres/${id}`, data, multipart));

export const supprimerBanniere = (id: string) =>
  unwrap(shopClient.delete(`/admin/bannieres/${id}`));

export const toggleBanniere = (id: string) =>
  unwrap(shopClient.patch(`/admin/bannieres/${id}/toggle`));

// ─── Promotions ───────────────────────────────────────────────
export const listerPromotions = (params?: Record<string, any>) =>
  unwrap<{ promotions: any[]; pagination: any }>(
    shopClient.get('/admin/promotions', { params })
  );

export const getPromotionsParSection = () =>
  unwrap(shopClient.get('/admin/promotions/sections'));

export const creerPromotion = (data: Record<string, any>) =>
  unwrap(shopClient.post('/admin/promotions', data));

export const modifierPromotion = (id: string, data: Record<string, any>) =>
  unwrap(shopClient.put(`/admin/promotions/${id}`, data));

export const supprimerPromotion = (id: string) =>
  unwrap(shopClient.delete(`/admin/promotions/${id}`));

export const togglePromotion = (id: string) =>
  unwrap(shopClient.patch(`/admin/promotions/${id}/toggle`));

// ─── Blocs promo (image + titre par section, affichés sur le mobile) ──
export const listerBlocsPromo = () =>
  unwrap<{ blocs: any[] }>(shopClient.get('/admin/blocs-promo'));

// section = nos_promos_du_moment | a_ne_pas_rater | nos_promos_a_venir
// data multipart : image (fichier), titre, sousTitre, isActive
export const updateBlocPromo = (section: string, data: FormData) =>
  unwrap(shopClient.put(`/admin/blocs-promo/${section}`, data, multipart));

// ─── Catégories ───────────────────────────────────────────────
export const listerCategories = () =>
  unwrap<{ categories: any[] }>(shopClient.get('/admin/categories'));

// Création catégorie — multipart (champ fichier "image", optionnel)
export const creerCategorie = (data: FormData) =>
  unwrap(shopClient.post('/admin/categories', data, multipart));
