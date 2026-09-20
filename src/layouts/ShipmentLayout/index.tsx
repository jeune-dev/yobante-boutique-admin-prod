import { Outlet } from 'react-router-dom';

/**
 * Espace « Yobante Colis ».
 *
 * Le tableau de bord Colis (pages/shipment/dashboard) embarque sa propre
 * coque : barre latérale fixe, barre du haut et contenu (classes `db-*`).
 * Ce layout n'ajoute donc rien : la barre latérale et l'entête qu'il
 * rendait auparavant se superposaient à celles du tableau de bord (deux
 * menus empilés à gauche, contenu décalé de 540 px et rogné à droite).
 */
export default function ShipmentLayout() {
  return <Outlet />;
}
