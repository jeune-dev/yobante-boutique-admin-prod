import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { etatRetour } from '@/shared/hooks/useRetour';
import Icon from '@/shared/components/dashboard/Icon';
import MenuActions from '@/shared/components/MenuActions';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { showSuccess, showError, showConfirm } from '@/shared/utils/alert';
import Pagination from '@/shared/components/tables/Pagination';
import { PhoneInput } from '@/shared/components/PhoneInput';
import { useFiabiliteVendeurs } from '@/domains/shop/hooks/useIndicateurs';
import { useOuvrirLigne } from '@/shared/hooks/useOuvrirLigne';
import { lirePage, useParametresUrl } from '@/shared/hooks/useParametresUrl';
import { useListeFiltree } from '@/shared/hooks/useListeFiltree';
import {
  BarreFiltres,
  BoutonExportExcel,
  FiltrePeriode,
  FiltreSelect,
} from '@/shared/components/filtres/BarreFiltres';
import { dansPeriode, libellePeriode } from '@/shared/utils/filtres';
import { enDate, enNombre, type ColonneExport } from '@/shared/utils/exportExcel';
import {
  adresseBoutique,
  estBloque,
  nomBoutique,
  telephoneVendeur,
  vendeursApi,
  type Vendeur,
} from '@/domains/shop/api/vendeurs.api';
import ModaleModifierVendeur from './ModaleModifierVendeur';
import { useActionsVendeur } from './useActionsVendeur';
import { EntetePage } from '@/shared/components/dashboard/Blocs';

/** Cadenas affiché à côté du nom d'un vendeur bloqué. */
function IconeBlocage() {
  return (
    <span
      title="Vendeur bloqué"
      aria-label="Vendeur bloqué"
      className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-600"
    >
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
    </span>
  );
}

const OPTIONS_STATUT = [
  { valeur: 'actif', libelle: 'Actifs' },
  { valeur: 'bloque', libelle: 'Bloqués' },
] as const;

/** Tranches du score de fiabilité (mêmes seuils que les pastilles). */
const OPTIONS_FIABILITE = [
  { valeur: 'bonne', libelle: 'Bonne (≥ 95 %)' },
  { valeur: 'moyenne', libelle: 'À surveiller (80 à 95 %)' },
  { valeur: 'faible', libelle: 'Faible (< 80 %)' },
  { valeur: 'aucune', libelle: 'Aucune vente' },
] as const;

const trancheFiabilite = (f?: any) => {
  if (!f || !f.commandesTotal) return 'aucune';
  if (f.scoreFiabilite >= 95) return 'bonne';
  if (f.scoreFiabilite >= 80) return 'moyenne';
  return 'faible';
};

const OPTIONS_ACCES = [
  { valeur: 'temporaire', libelle: 'Mot de passe temporaire (jamais connecté)' },
  { valeur: 'definitif', libelle: 'Mot de passe personnel' },
] as const;

const CHAMPS_VIDES = { nom: '', prenom: '', email: '', telephone: '', phoneCountryCode: '', phoneNationalNumber: '', nomBoutique: '', adresseBoutique: '', password: '' };

/** Mêmes règles que le backend : 8 caractères, une majuscule, un chiffre. */
const erreurMotDePasseVendeur = (mdp: string) => {
  if (mdp.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères.';
  if (mdp.length > 72) return 'Le mot de passe ne doit pas dépasser 72 caractères.';
  if (!/[A-Z]/.test(mdp) || !/\d/.test(mdp)) {
    return 'Le mot de passe doit contenir au moins une majuscule et un chiffre.';
  }
  return null;
};

/**
 * Masquage du mot de passe sans `type="password"` : un champ mot de passe
 * pousse le navigateur (Chrome, gestionnaires de mots de passe) à proposer ou
 * remplir tout seul un mot de passe — ici, c'est à l'admin de le choisir.
 * Repli sur `password` pour les navigateurs sans `-webkit-text-security`.
 */
const MASQUAGE_CSS =
  typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('-webkit-text-security', 'disc');

/** Attributs qui écartent l'autoremplissage des navigateurs et gestionnaires. */
const SANS_AUTOREMPLISSAGE = {
  autoComplete: 'off',
  'data-lpignore': 'true',
  'data-1p-ignore': 'true',
  'data-bwignore': 'true',
  'data-form-type': 'other',
} as const;

/** Mot de passe lisible (sans 0/O, 1/l/I), à recopier facilement depuis l'email. */
const genererMotDePasse = () => {
  const maj = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const min = 'abcdefghjkmnpqrstuvwxyz';
  const chi = '23456789';
  const tirer = (a: string) => a[crypto.getRandomValues(new Uint32Array(1))[0] % a.length];
  const car = [tirer(maj), tirer(chi), tirer(min)];
  while (car.length < 10) car.push(tirer(maj + min + chi));
  for (let i = car.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [car[i], car[j]] = [car[j], car[i]];
  }
  return car.join('');
};

export default function VendeursPage() {
  const location = useLocation();
  const qc = useQueryClient();
  const ouvrir = useOuvrirLigne();
  // Recherche, statut et page vivent dans l'URL (comme Clients et
  // Commandes). Statut et recherche sont filtrés par le serveur ; date de
  // création, fiabilité et accès le sont dans le navigateur.
  const [filtres, setFiltres] = useParametresUrl({
    q: '',
    page: '1',
    statut: '',
    creeDu: '',
    creeAu: '',
    fiabilite: '',
    acces: '',
  });
  const search = filtres.q;
  const page = lirePage(filtres.page);
  const statut = OPTIONS_STATUT.some((o) => o.valeur === filtres.statut)
    ? (filtres.statut as 'actif' | 'bloque')
    : undefined;
  const [showModal, setShowModal] = useState(false);
  const [editingVendeur, setEditingVendeur] = useState<Vendeur | null>(null);
  const [form, setForm] = useState(CHAMPS_VIDES);
  const [voirMotDePasse, setVoirMotDePasse] = useState(false);

  // Blocage, renvoi des identifiants, édition et suppression : mêmes
  // confirmations et mêmes invalidations de cache que sur la fiche vendeur.
  const actions = useActionsVendeur();

  // Un seul appel pour toute la page : la fiabilité est indexée par vendeur
  // plutôt que demandée ligne par ligne.
  const { data: fiabiliteData } = useFiabiliteVendeurs({ limit: 200 });
  const fiabiliteParVendeur = new Map<string, any>(
    ((fiabiliteData as any)?.vendeurs ?? []).map((f: any) => [f.id, f])
  );

  const filtresLocaux = [filtres.creeDu, filtres.creeAu, filtres.fiabilite, filtres.acces];
  const nbActifs = [statut, ...filtresLocaux].filter(Boolean).length;

  const liste = useListeFiltree<Vendeur>({
    cle: ['vendeurs', { search, statut }],
    chargerPage: async (p, limit) => {
      const r = await vendeursApi.lister({ search, statut, page: p, limit });
      return {
        lignes: r?.vendeurs ?? [],
        totalPages: r?.pagination?.totalPages ?? 1,
        total: (r?.pagination as any)?.total,
      };
    },
    page,
    parPage: 20,
    filtresLocauxActifs: filtresLocaux.some(Boolean),
    filtreLocal: (v) =>
      dansPeriode(v.createdAt, filtres.creeDu, filtres.creeAu) &&
      (!filtres.fiabilite || trancheFiabilite(fiabiliteParVendeur.get(v.id)) === filtres.fiabilite) &&
      (!filtres.acces || !!v.mustChangePassword === (filtres.acces === 'temporaire')),
  });
  const { isLoading, isError, error } = liste;

  /** Colonnes du fichier Excel des vendeurs (la fiabilité vient de l'indicateur). */
  const colonnesExport: ColonneExport<Vendeur>[] = [
    { titre: 'Prénom', valeur: (v) => v.prenom, largeur: 16 },
    { titre: 'Nom', valeur: (v) => v.nom, largeur: 16 },
    { titre: 'Boutique', valeur: (v) => nomBoutique(v), largeur: 24 },
    { titre: 'Adresse de la boutique', valeur: (v) => adresseBoutique(v), largeur: 30 },
    { titre: 'Email', valeur: (v) => v.email, largeur: 30 },
    { titre: 'Téléphone', valeur: (v) => telephoneVendeur(v), largeur: 17 },
    { titre: 'Statut', valeur: (v) => (estBloque(v) ? 'Bloqué' : 'Actif'), largeur: 10 },
    { titre: 'Mot de passe temporaire', valeur: (v) => !!v.mustChangePassword, largeur: 14 },
    {
      titre: 'Fiabilité (%)',
      valeur: (v) => {
        const f = fiabiliteParVendeur.get(v.id);
        return f?.commandesTotal ? enNombre(f.scoreFiabilite) : null;
      },
      largeur: 11,
    },
    { titre: 'Commandes', valeur: (v) => enNombre(fiabiliteParVendeur.get(v.id)?.commandesTotal) ?? 0, largeur: 11 },
    { titre: 'Incidents', valeur: (v) => enNombre(fiabiliteParVendeur.get(v.id)?.incidents) ?? 0, largeur: 10 },
    { titre: 'Annulations imputables', valeur: (v) => enNombre(fiabiliteParVendeur.get(v.id)?.annulationsImputables) ?? 0, largeur: 13 },
    { titre: 'Retours imputables', valeur: (v) => enNombre(fiabiliteParVendeur.get(v.id)?.retoursImputables) ?? 0, largeur: 13 },
    { titre: 'Créé le', valeur: (v) => enDate(v.createdAt), largeur: 17 },
  ];

  const rafraichir = () => qc.invalidateQueries({ queryKey: ['vendeurs'] });

  const creerMutation = useMutation({
    mutationFn: (payload: any) => vendeursApi.creer(payload),
    onSuccess: (reponse) => {
      // La liste est rechargée avant l'alerte : l'interface reflète le nouvel
      // état au moment même où l'administrateur lit le message de succès.
      rafraichir();
      setShowModal(false);
      setForm(CHAMPS_VIDES);
      setVoirMotDePasse(false);
      showSuccess(reponse);
    },
    onError: (e: any) => showError(e),
  });

  const vendeurs: Vendeur[] = liste.lignes;

  const handleCreer = async (e: React.FormEvent) => {
    e.preventDefault();
    const erreur = erreurMotDePasseVendeur(form.password);
    if (erreur) {
      showError(erreur);
      return;
    }
    const confirme = await showConfirm({
      titre: 'Créer le vendeur',
      message: `Créer le compte vendeur de ${form.prenom} ${form.nom} ?\nSon identifiant (${form.email.trim()}) et son mot de passe lui seront envoyés par email. Il se connectera depuis l'application mobile.`,
      confirmText: 'Créer',
    });
    if (!confirme) return;

    // Les champs facultatifs vides ne sont pas envoyés : le backend valide des
    // chaînes non vides quand la clé est présente.
    const payload: Record<string, any> = {
      nom: form.nom.trim(),
      prenom: form.prenom.trim(),
      email: form.email.trim(),
      password: form.password,
      nomBoutique: form.nomBoutique.trim(),
    };
    if (form.phoneCountryCode && form.phoneNationalNumber) {
      payload.phoneCountryCode = form.phoneCountryCode;
      payload.phoneNationalNumber = form.phoneNationalNumber;
      payload.telephone = form.telephone;
    } else if (form.telephone.trim()) {
      payload.telephone = form.telephone.trim();
    }
    if (form.adresseBoutique.trim()) payload.adresseBoutique = form.adresseBoutique.trim();

    creerMutation.mutate(payload);
  };

  return (
    <div>
      <EntetePage
        className="mb-6"
        titre="Vendeurs"
        soustitre="Comptes vendeurs, accès et fiabilité."
      >
        <button type="button" onClick={() => setShowModal(true)} className="btn-primaire w-full sm:w-auto">
          <Icon name="plus" size={16} />
          Nouveau vendeur
        </button>
      </EntetePage>

      <div className="carte">
        <BarreFiltres
          nbActifs={nbActifs}
          onReinitialiser={() =>
            setFiltres({ statut: '', creeDu: '', creeAu: '', fiabilite: '', acces: '', page: '1' })
          }
          recherche={
            <input
              value={search}
              onChange={(e) => setFiltres({ q: e.target.value, page: '1' })}
              placeholder="Rechercher un vendeur…"
              aria-label="Rechercher un vendeur"
              className="champ w-full sm:w-64"
            />
          }
          actions={
            <BoutonExportExcel
              charger={liste.chargerPourExport}
              nomFichier="vendeurs"
              colonnes={colonnesExport}
              filtres={{
                Recherche: search,
                Statut: OPTIONS_STATUT.find((o) => o.valeur === statut)?.libelle,
                'Date de création': libellePeriode(filtres.creeDu, filtres.creeAu),
                Fiabilité: OPTIONS_FIABILITE.find((o) => o.valeur === filtres.fiabilite)?.libelle,
                Accès: OPTIONS_ACCES.find((o) => o.valeur === filtres.acces)?.libelle,
              }}
            />
          }
        >
          <FiltreSelect
            libelle="Statut"
            valeur={statut ?? ''}
            onChange={(v) => setFiltres({ statut: v, page: '1' })}
            options={OPTIONS_STATUT}
          />
          <FiltreSelect
            libelle="Fiabilité"
            valeur={filtres.fiabilite}
            onChange={(v) => setFiltres({ fiabilite: v, page: '1' })}
            tous="Toutes"
            options={OPTIONS_FIABILITE}
          />
          <FiltreSelect
            libelle="Accès au compte"
            valeur={filtres.acces}
            onChange={(v) => setFiltres({ acces: v, page: '1' })}
            options={OPTIONS_ACCES}
          />
          <FiltrePeriode
            libelle="Date de création"
            du={filtres.creeDu}
            au={filtres.creeAu}
            onChange={(creeDu, creeAu) => setFiltres({ creeDu, creeAu, page: '1' })}
          />
        </BarreFiltres>

        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Chargement…</div>
        ) : isError ? (
          <div className="p-8 text-center text-red-500 text-sm">
            {(error as any)?.message || 'Impossible de charger les vendeurs.'}
          </div>
        ) : (
          <div className="tbl-wrap">
            <table className="w-full text-sm tbl-cards">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="p-4 font-medium text-gray-500">Vendeur</th>
                  <th className="p-4 font-medium text-gray-500">Boutique</th>
                  <th className="p-4 font-medium text-gray-500">Contact</th>
                  <th className="p-4 font-medium text-gray-500 hidden lg:table-cell">Fiabilité</th>
                  <th className="p-4 font-medium text-gray-500">Statut</th>
                  <th className="p-4 font-medium text-gray-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendeurs.map((v) => {
                  const bloque = estBloque(v);
                  return (
                    // Toute la ligne ouvre la fiche du vendeur ; les boutons
                    // d'action de la colonne « Actions » gardent la leur.
                    <tr
                      key={v.id}
                      {...ouvrir(`/boutique/vendeurs/${v.id}`)}
                      className="border-b border-gray-50"
                    >
                      <td className="p-4 font-medium tbl-primary">
                        <span className="inline-flex items-center gap-2">
                          {v.prenom} {v.nom}
                          {bloque && <IconeBlocage />}
                        </span>
                      </td>
                      <td className="p-4 text-gray-600" data-label="Boutique">
                        <div>
                          <div>{nomBoutique(v)}</div>
                          {adresseBoutique(v) && (
                            <div className="text-xs text-gray-400">{adresseBoutique(v)}</div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-gray-500 text-xs" data-label="Contact">
                        <div>
                          <div>{v.email || '—'}</div>
                          <div>{v.telephone || v.telephoneBoutique || '—'}</div>
                        </div>
                      </td>
                      {/* Fiabilité : part des commandes du vendeur qui a mal
                          tourné de son fait (annulations et retours marqués
                          « responsabilité vendeur »). */}
                      <td className="p-4 hidden lg:table-cell" data-label="Fiabilité">
                        <CelluleFiabilite fiabilite={fiabiliteParVendeur.get(v.id)} />
                      </td>
                      <td className="p-4" data-label="Statut">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            bloque ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {bloque ? 'Bloqué' : 'Actif'}
                        </span>
                      </td>
                      <td className="p-4 tbl-actions" data-label="Actions">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/boutique/vendeurs/${v.id}`}
                            state={etatRetour(location)}
                            title="Voir la fiche"
                            aria-label="Voir la fiche du vendeur"
                            className="btn-icon text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                          >
                            <Icon name="eye" size={17} />
                          </Link>
                          <button
                            onClick={() => setEditingVendeur(v)}
                            title="Modifier"
                            aria-label="Modifier le vendeur"
                            className="btn-icon text-gray-500 hover:bg-yellow-50 hover:text-yellow-600"
                          >
                            <Icon name="pencil" size={17} />
                          </button>
                          {/* Actions moins fréquentes : dans le menu, plutôt que
                              quatre boutons de couleur par ligne. */}
                          <MenuActions
                            actions={[
                              {
                                libelle: 'Renvoyer les identifiants',
                                icone: 'mail',
                                onClick: () => {
                                  if (!actions.renvoyer.isPending) actions.demanderRenvoi(v);
                                },
                              },
                              {
                                libelle: bloque ? 'Débloquer le vendeur' : 'Bloquer le vendeur',
                                icone: bloque ? 'check-circle' : 'ban',
                                onClick: () => {
                                  if (!actions.statut.isPending) actions.demanderStatut(v);
                                },
                              },
                              {
                                libelle: 'Supprimer le vendeur',
                                icone: 'trash',
                                danger: true,
                                onClick: () => {
                                  if (!actions.supprimer.isPending) actions.demanderSuppression(v);
                                },
                              },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {vendeurs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400 tbl-empty">
                      Aucun vendeur trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} totalPages={liste.totalPages} onChange={(p) => setFiltres({ page: String(p) })} />
      </div>

      {/* Modal Créer vendeur — l'administrateur choisit le mot de passe ; le
          vendeur le reçoit par email avec son identifiant et se connecte
          depuis l'application mobile (pas d'accès au dashboard web). */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Nouveau vendeur"
        >
          <div
            className="modal-box max-w-md p-5 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-1 text-gray-900">Nouveau vendeur</h2>
            <p className="text-xs text-gray-500 mb-4">
              Le compte sera <strong>actif immédiatement</strong>. Le vendeur reçoit par email son
              identifiant et le mot de passe ci-dessous, et se connecte depuis{' '}
              <strong>l'application mobile</strong> (le dashboard est réservé aux administrateurs).
            </p>
            <form onSubmit={handleCreer} className="space-y-4" autoComplete="off">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Prénom *</label>
                  <input
                    required
                    value={form.prenom}
                    onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))}
                    className="champ mt-1 w-full"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Nom *</label>
                  <input
                    required
                    value={form.nom}
                    onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                    className="champ mt-1 w-full"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Email *</label>
                <input
                  required
                  type="email"
                  {...SANS_AUTOREMPLISSAGE}
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="champ mt-1 w-full"
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="vendeur-mdp" className="text-sm font-medium text-gray-700">
                    Mot de passe *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForm((f) => ({ ...f, password: genererMotDePasse() }));
                      setVoirMotDePasse(true);
                    }}
                    className="text-xs font-medium text-yellow-700 hover:text-yellow-800"
                  >
                    Générer
                  </button>
                </div>
                <div className="relative mt-1">
                  <input
                    id="vendeur-mdp"
                    name="vendeur-acces"
                    required
                    type={voirMotDePasse || MASQUAGE_CSS ? 'text' : 'password'}
                    {...SANS_AUTOREMPLISSAGE}
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    style={
                      MASQUAGE_CSS && !voirMotDePasse
                        ? ({ WebkitTextSecurity: 'disc' } as React.CSSProperties)
                        : undefined
                    }
                    minLength={8}
                    maxLength={72}
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    className="champ w-full pr-20 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setVoirMotDePasse((v) => !v)}
                    aria-pressed={voirMotDePasse}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-800 px-2 py-1"
                  >
                    {voirMotDePasse ? 'Masquer' : 'Afficher'}
                  </button>
                </div>
                <p className={`text-xs mt-1 ${form.password && erreurMotDePasseVendeur(form.password) ? 'text-red-600' : 'text-gray-400'}`}>
                  {form.password && erreurMotDePasseVendeur(form.password)
                    ? erreurMotDePasseVendeur(form.password)
                    : 'Au moins 8 caractères, dont une majuscule et un chiffre.'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Téléphone</label>
                <PhoneInput
                  value={form.telephone}
                  onChange={(phone, meta) => {
                    setForm((f) => ({
                      ...f,
                      telephone: phone,
                      phoneCountryCode: meta.country.iso2.toUpperCase(),
                      phoneNationalNumber: meta.inputValue
                    }));
                  }}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Nom de la boutique *</label>
                <input
                  required
                  value={form.nomBoutique}
                  onChange={(e) => setForm((f) => ({ ...f, nomBoutique: e.target.value }))}
                  className="champ mt-1 w-full"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Adresse de la boutique</label>
                <input
                  value={form.adresseBoutique}
                  onChange={(e) => setForm((f) => ({ ...f, adresseBoutique: e.target.value }))}
                  className="champ mt-1 w-full"
                />
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 sm:py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creerMutation.isPending}
                  className="btn-primaire sm:py-2"
                >
                  {creerMutation.isPending ? 'Création…' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Modifier vendeur — partagée avec la fiche du vendeur. */}
      {editingVendeur && (
        <ModaleModifierVendeur
          vendeur={editingVendeur}
          enCours={actions.modifier.isPending}
          onFermer={() => setEditingVendeur(null)}
          onEnregistrer={(payload) =>
            actions.modifier.mutate(
              { id: editingVendeur.id, payload },
              { onSuccess: () => setEditingVendeur(null) }
            )
          }
        />
      )}
    </div>
  );
}

/**
 * Score de fiabilité d'un vendeur.
 *
 * Le nombre de commandes est affiché à côté du score : 0 % d'incident sur une
 * seule vente ne dit rien, et un score seul induirait en erreur.
 */
function CelluleFiabilite({ fiabilite }: { fiabilite?: any }) {
  if (!fiabilite || !fiabilite.commandesTotal) {
    return <span className="text-xs text-gray-400">Aucune vente</span>;
  }

  const { scoreFiabilite, incidents, commandesTotal, annulationsImputables, retoursImputables } =
    fiabilite;
  const teinte =
    scoreFiabilite >= 95
      ? 'bg-green-100 text-green-700'
      : scoreFiabilite >= 80
        ? 'bg-orange-100 text-orange-700'
        : 'bg-red-100 text-red-700';

  return (
    <div
      title={`${annulationsImputables} annulation(s) et ${retoursImputables} retour(s) imputables sur ${commandesTotal} commande(s)`}
    >
      <span className={`badge ${teinte}`}>
        {scoreFiabilite}%
      </span>
      <span className="block text-xs text-gray-400 mt-0.5">
        {incidents === 0
          ? `${commandesTotal} commande(s), aucun incident`
          : `${incidents} incident(s) / ${commandesTotal}`}
      </span>
    </div>
  );
}
