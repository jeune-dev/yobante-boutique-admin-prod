import { useState } from 'react';
import shopClient from '@/infrastructure/http/shop.client';
import Icon from '@/shared/components/dashboard/Icon';
import '@/assets/css/SuppressionCompte.css';
import { PICTO } from '@/assets/images/logos';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SuppressionComptePage() {
  const [email, setEmail] = useState('');
  const [objet, setObjet] = useState('');
  const [erreurs, setErreurs] = useState<{ email?: string; objet?: string }>({});
  const [envoi, setEnvoi] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [erreurGlobale, setErreurGlobale] = useState('');

  const valider = () => {
    const next: typeof erreurs = {};
    if (!email.trim()) next.email = 'Adresse e-mail requise.';
    else if (!EMAIL_REGEX.test(email.trim())) next.email = 'Adresse e-mail invalide.';
    if (!objet.trim()) next.objet = 'Merci de préciser votre demande.';
    else if (objet.trim().length < 5) next.objet = 'Merci de détailler un peu plus votre demande.';
    setErreurs(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreurGlobale('');
    if (!valider()) return;

    setEnvoi(true);
    try {
      await shopClient.post('/suppression-compte', { email: email.trim(), objet: objet.trim() });
      setEnvoye(true);
    } catch (err: any) {
      setErreurGlobale(
        err?.message || "Une erreur est survenue lors de l'envoi. Merci de réessayer."
      );
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="sc-page">
      <div className="sc-card">
        <div className="sc-logo-row">
          <img className="sc-logo-img" src={PICTO} alt="Yobante Boutique" />
          <div>
            <div className="sc-logo-brand">Yobante Boutique</div>
            <div className="sc-logo-sub">Suppression de compte</div>
          </div>
        </div>

        {envoye ? (
          <div className="sc-success">
            <div className="sc-success-icon">
              <Icon name="check-circle" size={30} />
            </div>
            <h2>Demande envoyée</h2>
            <p>
              Votre demande de suppression de compte a bien été enregistrée. Notre équipe la
              traitera dans les meilleurs délais et pourra vous recontacter à l'adresse indiquée
              si nécessaire.
            </p>
          </div>
        ) : (
          <>
            <h1 className="sc-title">Demander la suppression de mon compte</h1>
            <p className="sc-lead">
              Vous pouvez supprimer votre compte <strong>Yobante Boutique</strong> et les données
              associées directement depuis l'application, dans <strong>Profil</strong>, puis{' '}
              <strong>Supprimer mon compte</strong>. Si vous ne pouvez pas accéder à l'application,
              utilisez le formulaire ci-dessous : votre demande sera transmise à notre équipe qui
              procédera à la suppression de votre compte manuellement.
            </p>

            <form className="sc-form" onSubmit={handleSubmit} noValidate>
              <div className="sc-field">
                <label htmlFor="sc-email">Adresse e-mail associée à votre compte</label>
                <input
                  id="sc-email"
                  type="email"
                  autoComplete="email"
                  placeholder="vous@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={envoi}
                />
                {erreurs.email && <span className="sc-field-error">{erreurs.email}</span>}
              </div>

              <div className="sc-field">
                <label htmlFor="sc-objet">Objet de votre demande</label>
                <textarea
                  id="sc-objet"
                  placeholder="Ex. : Je souhaite la suppression définitive de mon compte et de mes données."
                  value={objet}
                  onChange={(e) => setObjet(e.target.value)}
                  disabled={envoi}
                />
                {erreurs.objet && <span className="sc-field-error">{erreurs.objet}</span>}
              </div>

              {erreurGlobale && <span className="sc-field-error">{erreurGlobale}</span>}

              <button className="sc-submit" type="submit" disabled={envoi}>
                <Icon name="mail" size={16} />
                {envoi ? 'Envoi en cours…' : 'Envoyer ma demande'}
              </button>
            </form>

            <div className="sc-section">
              <div className="sc-section-title">Données supprimées</div>
              <ul>
                <li>Informations de profil (nom, e-mail, téléphone, adresses, avatar)</li>
                <li>Favoris, avis laissés, conversations et notifications</li>
                <li>Boutique et catalogue produits, pour les comptes vendeurs</li>
              </ul>
            </div>

            <div className="sc-section">
              <div className="sc-section-title">Données conservées</div>
              <p>
                Les données liées aux commandes et paiements déjà effectués (factures, historique
                de transactions) sont conservées pendant la durée exigée par les obligations
                légales et comptables en vigueur, avant suppression ou anonymisation définitive.
                Aucune autre donnée n'est conservée au-delà de la suppression du compte.
              </p>
            </div>
          </>
        )}

        <div className="sc-footer">Yobante Boutique — admin.yobanterek.com</div>
      </div>
    </div>
  );
}
