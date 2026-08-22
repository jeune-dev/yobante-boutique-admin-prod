import '@/assets/css/SuppressionCompte.css';
import { PICTO } from '@/assets/images/logos';

const DERNIERE_MAJ = '22 août 2026';

export default function PolitiqueConfidentialitePage() {
  return (
    <div className="sc-page">
      <div className="sc-card">
        <div className="sc-logo-row">
          <img className="sc-logo-img" src={PICTO} alt="Yobante Boutique" />
          <div>
            <div className="sc-logo-brand">Yobante Boutique</div>
            <div className="sc-logo-sub">Politique de confidentialité</div>
          </div>
        </div>

        <h1 className="sc-title">Politique de confidentialité</h1>
        <p className="sc-lead">
          Cette politique décrit les données personnelles que <strong>Yobante Boutique</strong>{' '}
          collecte, la façon dont elles sont utilisées et partagées, et les droits dont vous
          disposez sur ces données lorsque vous utilisez l'application mobile ou ses services
          associés. Dernière mise à jour : {DERNIERE_MAJ}.
        </p>

        <div className="sc-section">
          <div className="sc-section-title">Données que nous collectons</div>
          <p>Selon les fonctionnalités que vous utilisez, nous collectons :</p>
          <ul>
            <li>
              <strong>Informations de compte :</strong> nom, prénom, adresse e-mail, numéro de
              téléphone, mot de passe (chiffré), identifiant utilisateur.
            </li>
            <li>
              <strong>Adresses de livraison :</strong> nom du destinataire, téléphone, rue, ville.
            </li>
            <li>
              <strong>Position :</strong> position précise de votre appareil, uniquement lorsque
              vous activez volontairement la recherche de boutiques à proximité.
            </li>
            <li>
              <strong>Commandes et paiements :</strong> historique d'achats, montants, statut des
              transactions.
            </li>
            <li>
              <strong>Messages :</strong> contenu des conversations entre acheteurs et vendeurs au
              sein de l'application.
            </li>
            <li>
              <strong>Photos :</strong> photo de profil et photos de produits (comptes vendeurs).
            </li>
            <li>
              <strong>Données techniques :</strong> journaux de plantage, diagnostics de
              l'appareil et identifiant de l'appareil, utilisés pour la stabilité de l'application
              et l'envoi de notifications.
            </li>
          </ul>
        </div>

        <div className="sc-section">
          <div className="sc-section-title">Comment nous utilisons ces données</div>
          <ul>
            <li>Créer et gérer votre compte, vous authentifier</li>
            <li>Traiter vos commandes, livraisons et paiements</li>
            <li>Vous permettre d'échanger avec les vendeurs ou les acheteurs</li>
            <li>Afficher les boutiques proches de vous, lorsque vous l'activez</li>
            <li>Vous envoyer des notifications liées à votre compte et vos commandes</li>
            <li>Diagnostiquer et corriger les problèmes techniques de l'application</li>
          </ul>
          <p>
            Nous ne vendons jamais vos données personnelles et ne les utilisons pas à des fins
            publicitaires ou marketing tiers.
          </p>
        </div>

        <div className="sc-section">
          <div className="sc-section-title">Partage avec des tiers</div>
          <p>Certaines données sont transmises aux prestataires suivants, strictement nécessaires au fonctionnement de l'application :</p>
          <ul>
            <li>
              <strong>Wave et Orange Money :</strong> nom, e-mail, téléphone et montant, pour le
              traitement de vos paiements mobile money.
            </li>
            <li>
              <strong>Firebase (Google) :</strong> notifications push, rapports de plantage et
              diagnostics techniques.
            </li>
            <li>
              <strong>Cloudflare R2 :</strong> hébergement des photos de profil et de produits.
            </li>
            <li>
              <strong>Resend :</strong> envoi des e-mails transactionnels (vérification de compte,
              confirmations de commande).
            </li>
          </ul>
          <p>
            Ces prestataires n'utilisent vos données que pour nous fournir leur service et non
            pour leur propre compte.
          </p>
        </div>

        <div className="sc-section">
          <div className="sc-section-title">Conservation des données</div>
          <p>
            Vos données de profil sont conservées tant que votre compte est actif. Les données
            liées aux commandes et paiements sont conservées pendant la durée exigée par les
            obligations légales et comptables en vigueur, avant suppression ou anonymisation
            définitive.
          </p>
        </div>

        <div className="sc-section">
          <div className="sc-section-title">Vos droits</div>
          <p>
            Vous pouvez demander la suppression de votre compte et des données associées à tout
            moment, directement depuis l'application (Profil → Supprimer mon compte) ou via notre{' '}
            <a href="/suppression-compte">formulaire de suppression de compte</a>.
          </p>
        </div>

        <div className="sc-section">
          <div className="sc-section-title">Sécurité</div>
          <p>
            Les mots de passe sont chiffrés, les échanges avec nos serveurs sont sécurisés (HTTPS),
            et l'accès aux données est limité aux équipes qui en ont besoin pour faire fonctionner
            le service.
          </p>
        </div>

        <div className="sc-section">
          <div className="sc-section-title">Contact</div>
          <p>
            Pour toute question concernant cette politique ou vos données personnelles, contactez-nous
            à l'adresse : <strong>ballabeye.dev04@gmail.com</strong>.
          </p>
        </div>

        <div className="sc-footer">Yobante Boutique — admin.yobanterek.com</div>
      </div>
    </div>
  );
}
