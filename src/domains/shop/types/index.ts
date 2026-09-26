// ── Types Shop Admin — synchronisés avec yobante-boutique-back ──────────────

export type StatutCommande = 'en_attente' | 'validee' | 'en_preparation' | 'expediee' | 'livree' | 'annulee' | 'rejetee';
export type StatutPaiement = 'en_attente' | 'succes' | 'echoue' | 'rembourse';
export type MethodePaiement = 'wave' | 'orange_money' | 'carte' | 'cash';
export type StatutValidationProduit = 'en_attente' | 'valide_step1' | 'valide' | 'rejete';

export interface Pagination {
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}

// ── Catégorie ────────────────────────────────────────────────────────────────
export interface Categorie {
  id: string;
  nom: string;
  slug: string;
  description?: string;
  image?: string;
  parentId?: string | null;
  isActive: boolean;
  sousCategories?: Categorie[];
  createdAt: string;
}

// ── Produit ──────────────────────────────────────────────────────────────────
export interface Produit {
  id: string;
  nom: string;
  slug: string;
  description?: string;
  prix: number;
  prixPromo?: number;
  venduAuPoids?: boolean;
  stock: number;
  images: string[];
  categorieId: string;
  vendeurId?: string;
  isActive: boolean;
  isFeatured: boolean;
  statutValidation: StatutValidationProduit;
  reference?: string;
  etat?: 'neuf' | 'reconditionne';
  noteMoyenne?: number;
  nombreAvis?: number;
  categorie?: Categorie;
  vendeur?: { id: string; nom: string; prenom: string; email: string };
  createdAt: string;
}

// ── Adresse ──────────────────────────────────────────────────────────────────
export interface Adresse {
  id: string;
  nom: string;
  telephone: string;
  adresse: string;
  ville: string;
  pays: string;
  isDefault: boolean;
}

// ── Commande ─────────────────────────────────────────────────────────────────
export interface CommandeItem {
  id: string;
  produitId: string;
  quantite: number;
  prixUnitaire: number;
  sousTotal: number;
  produit?: Produit;
}

export interface Commande {
  id: string;
  reference: string;
  userId: string;
  adresseId: string;
  statut: StatutCommande;
  montantTotal: number;
  fraisLivraison: number;
  note?: string;
  noteAdmin?: string;
  motifRejet?: string | null;
  items?: CommandeItem[];
  user?: ShopUser;
  adresse?: Adresse;
  paiement?: Paiement;
  createdAt: string;
  updatedAt: string;
}

// ── Paiement ─────────────────────────────────────────────────────────────────
export interface Paiement {
  id: string;
  commandeId: string;
  userId: string;
  montant: number;
  methode: MethodePaiement;
  statut: StatutPaiement;
  transactionId?: string;
  payeAt?: string;
  commande?: Commande;
  user?: ShopUser;
  createdAt: string;
}

// ── Avis ─────────────────────────────────────────────────────────────────────
export interface Avis {
  id: string;
  userId: string;
  produitId: string;
  note: number;
  commentaire?: string;
  isApproved: boolean;
  user?: ShopUser;
  produit?: Produit;
  createdAt: string;
}

// ── User / Client ─────────────────────────────────────────────────────────────
export interface ShopUser {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  role: 'ADMIN' | 'CLIENT' | 'VENDEUR';
  isActive: boolean;
  isVerified: boolean;
  avatar?: string;
  createdAt: string;
}

// ── Vendeur / ProfilVendeur ───────────────────────────────────────────────────
export interface ProfilVendeur {
  id: string;
  userId: string;
  nomBoutique: string;
  description?: string;
  adresseBoutique?: string;
  telephone?: string;
  logo?: string;
  isActive: boolean;
  isValidatedStep1: boolean;
  isValidatedStep2: boolean;
  motifRejet?: string;
  createdAt: string;
}

export interface Vendeur extends ShopUser {
  profilVendeur?: ProfilVendeur;
  produits?: Produit[];
}

// ── Bannière ─────────────────────────────────────────────────────────────────
export interface Banniere {
  id: string;
  titre: string;
  image: string;
  lien?: string;
  ordre: number;
  isActive: boolean;
  createdAt: string;
}

// ── Promotion ─────────────────────────────────────────────────────────────────
export type SectionPromotion = 'nos_promos_du_moment' | 'a_ne_pas_rater' | 'nos_promos_a_venir';

export interface Promotion {
  id: string;
  produitId: string;
  section: SectionPromotion;
  ordre: number;
  prixPromo?: number;
  pourcentageReduction?: number;
  dateDebut?: string;
  dateFin?: string;
  isActive: boolean;
  produit?: Produit;
  createdAt: string;
}

// ── Frais Livraison ───────────────────────────────────────────────────────────
export interface FraisLivraison {
  id: string;
  ville: string;
  montant: number;
  isActive: boolean;
  createdAt: string;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export interface ShopStats {
  totalClients: number;
  totalProduits: number;
  totalCommandes: number;
  chiffreAffaires: number;
}

export interface KpiStocks {
  totalProduits: number;
  produitsActifs: number;
  produitsEnRupture: number;
  produitsEnAttente: number;
  produitsRupture?: Produit[];
}

export interface TopProduit {
  id: string;
  nom: string;
  totalVendu: number;
  chiffreAffaires: number;
}

export interface ClientActif {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  totalCommandes: number;
  totalDepense: number;
}
