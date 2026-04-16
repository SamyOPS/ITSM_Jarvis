const TIKAI_THEME_KEY = 'tikAI_theme';
const TIKAI_AUTH_KEY = 'tikAI_auth';
const DASHBOARD_PAGE = 'route:dashboard';
const INCIDENT_PAGE = 'route:incident';
const REQUEST_PAGE = 'route:request';
const EMPTY_PAGE = 'route:empty';
const PARK_PAGE = 'route:park';

const FRAME_VIEWS = {
  dashboard: {
    id: 'dashboard',
    title: 'Dashboard',
    body: `
  <main class="content">
    <div class="tabs">
      <button class="tab active"><i class="bi bi-grid-1x2 tab-icon icon"></i>Tableau de bord</button>
      <button class="tab"><i class="bi bi-person tab-icon icon"></i>Vue personnelle</button>
      <button class="tab"><i class="bi bi-people tab-icon icon"></i>Vue groupe</button>
      <button class="tab"><i class="bi bi-globe tab-icon icon"></i>Vue globale</button>
      <button class="tab"><i class="bi bi-list-ul tab-icon icon"></i>Tous</button>
    </div>
  </main>`
  },
  empty: {
    id: 'empty',
    title: 'Interface',
    body: `
  <main class="content">
    <div class="title-row">
      <div>
        <h2 class="page-title" id="title">Interface</h2>
        <p class="page-subtitle" id="subtitle"></p>
      </div>
    </div>
  </main>`
  },
  park: {
    id: 'park',
    title: 'Gestion des parcs',
    body: `
  <main class="content park-page" id="parkPage">
    <div class="title-row">
      <div>
        <h2 class="page-title">Gestion des parcs</h2>
        <p class="page-subtitle" id="parkSubtitle">Vue d'ensemble du schéma parkai : équipements, matériels et groupes.</p>
      </div>
    </div>

    <section class="park-kpis" id="parkKpis">
      <article class="park-kpi">
        <div class="kpi-label">Équipements</div>
        <div class="kpi-value" id="kpiDevices">0</div>
        <div class="kpi-sub">Entrées inventaire</div>
      </article>
      <article class="park-kpi">
        <div class="kpi-label">Matériels</div>
        <div class="kpi-value" id="kpiGear">0</div>
        <div class="kpi-sub">Matériels associés</div>
      </article>
      <article class="park-kpi">
        <div class="kpi-label">Groupes</div>
        <div class="kpi-value" id="kpiGroups">0</div>
        <div class="kpi-sub">Groupes disponibles</div>
      </article>
    </section>

    <section class="park-grid" id="parkGrid">
      <article class="park-panel span-2" id="devicesPanel">
        <div class="panel-head">
          <h3>Équipements</h3>
          <div class="panel-tools">
            <form class="panel-search-form" id="deviceSearchForm">
              <input id="deviceSearch" class="panel-search" type="text" placeholder="Rechercher un équipement..." />
            </form>
            <button class="panel-add-btn" id="addDeviceBtn" type="button"><i class="bi bi-plus-lg"></i>Ajouter</button>
          </div>
        </div>
        <div class="table-wrap">
          <table class="park-table" id="devicesTable">
            <colgroup>
              <col style="width:13%">
              <col style="width:13%">
              <col style="width:13%">
              <col style="width:13%">
              <col style="width:13%">
              <col style="width:13%">
              <col style="width:10%">
              <col style="width:12%">
            </colgroup>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Type</th>
                <th>Numéro de serie</th>
                <th>Systeme</th>
                <th>Groupe</th>
                <th>Utilisateur</th>
                <th>Mobile</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
        <div class="table-pagination" id="devicesPagination"></div>
      </article>

      <article class="park-panel" id="groupsPanel">
        <div class="panel-head">
          <h3>Groupes</h3>
          <div class="panel-tools">
            <form class="panel-search-form" id="groupSearchForm">
              <input id="groupSearch" class="panel-search" type="text" placeholder="Rechercher un groupe..." />
            </form>
            <button class="panel-add-btn" id="addGroupBtn" type="button"><i class="bi bi-plus-lg"></i>Ajouter</button>
          </div>
        </div>
        <div class="table-wrap">
          <table class="park-table compact" id="groupsTable">
            <colgroup>
              <col style="width:32%">
              <col style="width:44%">
              <col style="width:24%">
            </colgroup>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
        <div class="table-pagination" id="groupsPagination"></div>
      </article>

      <article class="park-panel" id="gearPanel">
        <div class="panel-head">
          <h3>Matériels</h3>
          <div class="panel-tools">
            <form class="panel-search-form" id="gearSearchForm">
              <input id="gearSearch" class="panel-search" type="text" placeholder="Rechercher un matériel..." />
            </form>
            <button class="panel-add-btn" id="addGearBtn" type="button"><i class="bi bi-plus-lg"></i>Ajouter</button>
          </div>
        </div>
        <div class="table-wrap">
          <table class="park-table compact" id="gearTable">
            <colgroup>
              <col style="width:30%">
              <col style="width:28%">
              <col style="width:22%">
              <col style="width:20%">
            </colgroup>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Groupe</th>
                <th>Utilisateur</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
        <div class="table-pagination" id="gearPagination"></div>
      </article>
    </section>

    <dialog class="park-dialog" id="deviceDialog">
      <form class="dialog-form" id="deviceForm" method="dialog">
        <h4 id="deviceDialogTitle">Ajouter un équipement</h4>
        <label>Nom<input id="deviceName" required /></label>
        <label>Type<input id="deviceType" required /></label>
        <label>Numéro de serie<input id="deviceSn" required /></label>
        <label>Système<input id="deviceSystem" required /></label>
        <label>Groupe
          <div class="suggest-field">
            <input id="deviceGroup" required autocomplete="off" />
            <div class="suggest-menu" id="deviceGroupSuggest" hidden></div>
          </div>
        </label>
        <label>Utilisateur
          <div class="suggest-field">
            <input id="deviceUser" placeholder="Non attribué" autocomplete="off" />
            <div class="suggest-menu" id="deviceUserSuggest" hidden></div>
          </div>
        </label>
        <label class="dialog-check"><input id="deviceMobile" type="checkbox" /> Mobile</label>
        <div class="dialog-actions">
          <button type="button" class="ghost-btn" data-close-dialog="deviceDialog">Annuler</button>
          <button type="submit" class="save-btn">Enregistrer</button>
        </div>
      </form>
    </dialog>

    <dialog class="park-dialog" id="gearDialog">
      <form class="dialog-form" id="gearForm" method="dialog">
        <h4 id="gearDialogTitle">Ajouter un matériel</h4>
        <label>Nom<input id="gearName" required /></label>
        <label>Groupe
          <div class="suggest-field">
            <input id="gearGroup" required autocomplete="off" />
            <div class="suggest-menu" id="gearGroupSuggest" hidden></div>
          </div>
        </label>
        <label>Utilisateur
          <div class="suggest-field">
            <input id="gearUser" placeholder="Non attribué" autocomplete="off" />
            <div class="suggest-menu" id="gearUserSuggest" hidden></div>
          </div>
        </label>
        <div class="dialog-actions">
          <button type="button" class="ghost-btn" data-close-dialog="gearDialog">Annuler</button>
          <button type="submit" class="save-btn">Enregistrer</button>
        </div>
      </form>
    </dialog>

    <dialog class="park-dialog" id="groupDialog">
      <form class="dialog-form" id="groupForm" method="dialog">
        <h4 id="groupDialogTitle">Ajouter un groupe</h4>
        <label>Nom<input id="groupName" required /></label>
        <label>Description<textarea id="groupDescription" rows="3"></textarea></label>
        <div class="dialog-actions">
          <button type="button" class="ghost-btn" data-close-dialog="groupDialog">Annuler</button>
          <button type="submit" class="save-btn">Enregistrer</button>
        </div>
      </form>
    </dialog>
  </main>`
  },
  incident: {
    id: 'incident',
    title: 'Ticket Incident',
    body: `
  <main class="content">
    <div class="ticket-create">
      <div class="title-row"><div><h2 class="page-title">Création de ticket d'incident</h2><p class="page-subtitle">Formulaire incident</p></div></div>
      <div class="ai-banner" id="aiBanner" aria-hidden="true"><div><strong>Utiliser l'intelligence artificielle</strong><span>Gagner du temps avec des suggestions de remplissage.</span></div><i class="bi bi-stars"></i></div>
      <form id="newTicketForm" class="ticket-form sn-form" novalidate>
        <div class="ticket-card sn-card">
          <div class="sn-grid">
            <div class="sn-col">
              <div class="sn-field"><label for="ticketNumber">Numéro</label><div class="sn-control"><input id="ticketNumber" type="text" value="INC0000001" class="input-readonly" readonly /></div></div>
              <div class="sn-field"><label for="ticketCaller">Demandeur</label><div class="sn-control"><div class="lookup"><input id="ticketCaller" type="text" placeholder="Nom du demandeur" /><button class="lookup-btn" type="button"><i class="bi bi-search"></i></button></div></div></div>
              <div class="sn-field"><label for="ticketCategory">Categorie</label><div class="sn-control"><div class="select-wrap"><select id="ticketCategory"><option value="">--Aucune--</option></select><i class="bi bi-chevron-down icon"></i></div></div></div>
              <div class="sn-field"><label for="ticketSubcategory">Sous-categorie</label><div class="sn-control"><div class="select-wrap"><select id="ticketSubcategory"><option value="">--Aucune--</option></select><i class="bi bi-chevron-down icon"></i></div></div></div>
              <div class="sn-field"><label for="ticketService">Service</label><div class="sn-control"><div class="lookup"><input id="ticketService" type="text" placeholder="Rechercher un service" /><button class="lookup-btn" type="button"><i class="bi bi-search"></i></button></div></div></div>
              <div class="sn-field"><label for="ticketServiceOffering">Offre de service</label><div class="sn-control"><div class="lookup"><input id="ticketServiceOffering" type="text" placeholder="Rechercher une offre" /><button class="lookup-btn" type="button"><i class="bi bi-search"></i></button></div></div></div>
              <div class="sn-field"><label for="ticketConfigItem">Élément de configuration</label><div class="sn-control"><div class="lookup"><input id="ticketConfigItem" type="text" placeholder="Rechercher un élément" /><button class="lookup-btn" type="button"><i class="bi bi-search"></i></button></div></div></div>
            </div>
            <div class="sn-col">
              <div class="sn-field"><label for="ticketChannel">Canal</label><div class="sn-control"><div class="select-wrap"><select id="ticketChannel"><option value="">--Aucun--</option></select><i class="bi bi-chevron-down icon"></i></div></div></div>
              <div class="sn-field"><label for="ticketState">Etat</label><div class="sn-control"><div class="select-wrap"><select id="ticketState"><option value="Nouveau">Nouveau</option></select><i class="bi bi-chevron-down icon"></i></div></div></div>
              <div class="sn-field"><label for="ticketImpact">Impact</label><div class="sn-control"><div class="select-wrap"><select id="ticketImpact"><option value="1">1 - Elevé</option><option value="2" selected>2 - Moyen</option><option value="3">3 - Faible</option></select><i class="bi bi-chevron-down icon"></i></div></div></div>
              <div class="sn-field"><label for="ticketUrgency">Urgence</label><div class="sn-control"><div class="select-wrap"><select id="ticketUrgency"><option value="1">1 - Elevée</option><option value="2" selected>2 - Moyenne</option><option value="3">3 - Faible</option></select><i class="bi bi-chevron-down icon"></i></div></div></div>
              <div class="sn-field"><label for="ticketPriority">Priorité</label><div class="sn-control"><input id="ticketPriority" type="text" class="input-readonly" readonly /></div></div>
              <div class="sn-field"><label for="ticketAssignmentGroup">Groupe d'affectation</label><div class="sn-control"><div class="lookup"><input id="ticketAssignmentGroup" type="text" placeholder="Rechercher un groupe" /><button class="lookup-btn" type="button"><i class="bi bi-search"></i></button></div></div></div>
              <div class="sn-field"><label for="ticketAssignedTo">Assigné a</label><div class="sn-control"><div class="lookup"><input id="ticketAssignedTo" type="text" placeholder="Rechercher un agent" /><button class="lookup-btn" type="button"><i class="bi bi-search"></i></button></div></div></div>
            </div>
          </div>
          <div class="sn-bottom">
            <div class="field"><label for="ticketShortDescription">Description courte</label><div class="hint-wrap"><input id="ticketShortDescription" type="text" placeholder="Ex: Accès VPN impossible pour l'agence Nord" /><button class="hint-btn" type="button" id="shortDescHintBtn"><i class="bi bi-lightbulb"></i></button><div class="hint-popover" id="shortDescPopover" role="menu" aria-hidden="true"><button type="button">Impossible de se connecter au VPN</button><button type="button">Mot de passe oublié</button><button type="button">Imprimante ne repond plus</button><button type="button">Problème réseau</button><button type="button">Problème PC</button></div></div><div class="field-error" id="shortDescriptionError">La description courte est requise.</div></div>
            <div class="field"><label for="ticketDescription">Description</label><textarea id="ticketDescription" placeholder="Décrivez le problème, les impacts, le contexte..."></textarea><div class="field-error" id="descriptionError">La description est requise.</div></div>
            <div class="field"><label>Pieces jointes</label><div class="upload-zone"><div class="upload-actions"><label class="upload-btn"><i class="bi bi-upload"></i>Choisir des fichiers<input id="ticketFiles" type="file" multiple /></label><span class="upload-note" id="fileLabel">Aucun fichier sélectionné</span></div><div class="file-list" id="fileList"></div><div class="upload-note">Formats acceptés: PDF, PNG, JPG, DOCX. 2 Mo max par fichier.</div></div></div>
          </div>
          <div class="ticket-actions sn-actions"><button class="btn primary" type="submit">Envoyer le ticket</button></div>
        </div>
      </form>
    </div>
  </main>`
  },
  request: {
    id: 'request',
    title: 'Ticket Demande',
    body: `
  <main class="content">
    <div class="ticket-create">
      <div class="title-row"><div><h2 class="page-title">Création de ticket de demande</h2><p class="page-subtitle">Formulaire demande</p></div></div>
      <div class="ai-banner" aria-hidden="true"><div><strong>Utiliser l'intelligence artificielle</strong><span>Gagner du temps avec des suggestions de remplissage.</span></div><i class="bi bi-stars"></i></div>
      <form id="newRequestForm" class="ticket-form sn-form" novalidate>
        <div class="ticket-card sn-card">
          <div class="sn-grid">
            <div class="sn-col">
              <div class="sn-field"><label for="requestNumber">Numéro</label><div class="sn-control"><input id="requestNumber" type="text" value="TASK0000001" class="input-readonly" readonly /></div></div>
              <div class="sn-field"><label for="requestAssignmentGroup">Groupe d'affectation</label><div class="sn-control"><div class="lookup"><input id="requestAssignmentGroup" type="text" placeholder="Rechercher un groupe" /><button class="lookup-btn" type="button"><i class="bi bi-search"></i></button></div></div></div>
              <div class="sn-field"><label for="requestAssignedTo">Assigné a</label><div class="sn-control"><div class="lookup"><input id="requestAssignedTo" type="text" placeholder="Rechercher un agent" /><button class="lookup-btn" type="button"><i class="bi bi-search"></i></button></div></div></div>
              <div class="sn-field"><label for="requestConfigItem">Élément de configuration</label><div class="sn-control"><div class="lookup"><input id="requestConfigItem" type="text" placeholder="Rechercher un élément" /><button class="lookup-btn" type="button"><i class="bi bi-search"></i></button></div></div></div>
              <div class="sn-field"><label for="requestApproval">Approbation</label><div class="sn-control"><div class="select-wrap"><select id="requestApproval"><option value="non-demande" selected>Non demandé</option><option value="demande">Demandé</option><option value="approuve">Approuvé</option><option value="refuse">Refusé</option></select><i class="bi bi-chevron-down icon"></i></div></div></div>
            </div>
            <div class="sn-col">
              <div class="sn-field"><label for="requestPriority">Priorité</label><div class="sn-control"><div class="select-wrap"><select id="requestPriority"><option value="1">1 - Critique</option><option value="2">2 - Haute</option><option value="3" selected>3 - Modérée</option><option value="4">4 - Basse</option><option value="5">5 - Planifiée</option></select><i class="bi bi-chevron-down icon"></i></div></div></div>
              <div class="sn-field"><label for="requestState">Statut</label><div class="sn-control"><div class="select-wrap"><select id="requestState"><option value="ouvert" selected>Ouvert</option><option value="en-cours">En cours</option><option value="en-attente">En attente</option><option value="resolu">Résolu</option><option value="clos">Clos</option></select><i class="bi bi-chevron-down icon"></i></div></div></div>
              <div class="sn-field"><label for="requestRelance">Relance</label><div class="sn-control"><input id="requestRelance" type="date" placeholder="JJ/MM/AAAA" /></div></div>
              <div class="sn-field"><label for="requestItem">Élément de demande</label><div class="sn-control"><div class="lookup"><input id="requestItem" type="text" placeholder="RITM0000001" /><button class="lookup-btn" type="button"><i class="bi bi-search"></i></button></div></div></div>
              <div class="sn-field"><label for="requestRequestedFor">Demandé pour</label><div class="sn-control"><div class="lookup"><input id="requestRequestedFor" type="text" placeholder="Rechercher un utilisateur" /><button class="lookup-btn" type="button"><i class="bi bi-search"></i></button></div></div></div>
            </div>
          </div>
          <div class="sn-bottom">
            <div class="field"><label for="requestShortDescription">Description courte</label><input id="requestShortDescription" type="text" placeholder="Ex: Demande de création d'accès applicatif" /></div>
            <div class="field"><label for="requestDescription">Description</label><textarea id="requestDescription" placeholder="Décrivez la demande, le contexte, les besoins..."></textarea></div>
            <div class="field"><label>Pieces jointes</label><div class="upload-zone"><div class="upload-actions"><label class="upload-btn"><i class="bi bi-upload"></i>Choisir des fichiers<input id="requestFiles" type="file" multiple /></label><span class="upload-note" id="requestFileLabel">Aucun fichier sélectionné</span></div><div class="file-list" id="requestFileList"></div><div class="upload-note">Formats acceptés: PDF, PNG, JPG, DOCX. 2 Mo max par fichier.</div></div></div>
          </div>
          <div class="ticket-actions sn-actions"><button class="btn primary" type="submit">Envoyer le ticket</button></div>
        </div>
      </form>
    </div>
  </main>`
  }
};

function escapeHtmlAttr(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function resolveFrameDefinition(page) {
  if (!page || page === DASHBOARD_PAGE) return { view: 'dashboard', title: FRAME_VIEWS.dashboard.title };
  if (page === INCIDENT_PAGE) return { view: 'incident', title: FRAME_VIEWS.incident.title };
  if (page === REQUEST_PAGE) return { view: 'request', title: FRAME_VIEWS.request.title };
  if (page.startsWith(`${PARK_PAGE}?`)) {
    const params = new URLSearchParams(page.split('?')[1] || '');
    return { view: 'park', title: FRAME_VIEWS.park.title, parkView: params.get('view') || 'dashboard' };
  }
  if (page.startsWith(`${EMPTY_PAGE}?`)) {
    const params = new URLSearchParams(page.split('?')[1] || '');
    return {
      view: 'empty',
      title: 'Interface',
      pageKey: params.get('key') || '',
      pageTitle: params.get('title') || 'Interface'
    };
  }
  return { view: 'dashboard', title: FRAME_VIEWS.dashboard.title };
}

function createFrameDocument(definition) {
  const view = FRAME_VIEWS[definition.view];
  const attrs = ['data-shell="frame"', `data-view="${escapeHtmlAttr(definition.view)}"`];
  if (definition.parkView) attrs.push(`data-park-view="${escapeHtmlAttr(definition.parkView)}"`);
  if (definition.pageKey) attrs.push(`data-page-key="${escapeHtmlAttr(definition.pageKey)}"`);
  if (definition.pageTitle) attrs.push(`data-page-title="${escapeHtmlAttr(definition.pageTitle)}"`);

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtmlAttr(definition.title || view.title)}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" />
  <link rel="stylesheet" href="style.css" />
</head>
<body ${attrs.join(' ')}>
${view.body}
  <script src="script.js" defer></script>
</body>
</html>`;
}

function applyDocumentTheme(theme) {
  document.body.classList.toggle('theme-dark', theme === 'dark');
}

function initFrameTheme() {
  applyDocumentTheme(localStorage.getItem(TIKAI_THEME_KEY) === 'dark' ? 'dark' : 'light');
  window.addEventListener('message', (event) => {
    if (!event?.data || event.data.type !== 'tikai-theme') return;
    applyDocumentTheme(event.data.theme);
  });
}

function initDashboardView() {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((item) => item.classList.remove('active'));
      tab.classList.add('active');
    });
  });
}

function initEmptyView() {
  const title = document.getElementById('title');
  const subtitle = document.getElementById('subtitle');
  if (title) title.textContent = document.body.dataset.pageTitle || 'Interface';
  if (subtitle) subtitle.textContent = document.body.dataset.pageKey || '';
}
function initTicketsForm() {
  const toast = (msg) => alert(msg);
  const impactSelect = document.getElementById('ticketImpact');
  const urgencySelect = document.getElementById('ticketUrgency');
  const priorityInput = document.getElementById('ticketPriority');
  const priorityMatrix = {
    '1-1': '1 - Critique',
    '1-2': '2 - Elevée',
    '1-3': '3 - Modérée',
    '2-1': '2 - Elevée',
    '2-2': '3 - Modérée',
    '2-3': '4 - Faible',
    '3-1': '3 - Modérée',
    '3-2': '4 - Faible',
    '3-3': '5 - Planifiée'
  };

  function updatePriority() {
    if (!priorityInput || !impactSelect || !urgencySelect) return;
    const key = `${impactSelect.value || '2'}-${urgencySelect.value || '2'}`;
    priorityInput.value = priorityMatrix[key] || '3 - Modérée';
  }

  impactSelect?.addEventListener('change', updatePriority);
  urgencySelect?.addEventListener('change', updatePriority);
  updatePriority();

  const shortDescInput = document.getElementById('ticketShortDescription');
  const shortDescHintBtn = document.getElementById('shortDescHintBtn');
  const shortDescPopover = document.getElementById('shortDescPopover');

  function closePopover() {
    if (!shortDescPopover) return;
    shortDescPopover.classList.remove('show');
    shortDescPopover.setAttribute('aria-hidden', 'true');
  }

  shortDescHintBtn?.addEventListener('click', (event) => {
    event.stopPropagation();
    if (!shortDescPopover) return;
    const isOpen = shortDescPopover.classList.toggle('show');
    shortDescPopover.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  });

  shortDescPopover?.addEventListener('click', (event) => {
    if (!(event.target instanceof HTMLButtonElement)) return;
    if (shortDescInput) shortDescInput.value = event.target.textContent.trim();
    closePopover();
  });

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof HTMLElement)) return;
    if (shortDescPopover?.classList.contains('show') && !shortDescPopover.contains(event.target) && !shortDescHintBtn?.contains(event.target)) closePopover();
  });

  function fileKey(file) {
    return `${file.name}-${file.size}-${file.lastModified}`;
  }

  function setupFilePicker(input, label, listEl) {
    if (!input || !label || !listEl) return;
    const files = [];

    function sync() {
      const dt = new DataTransfer();
      files.forEach((file) => dt.items.add(file));
      input.files = dt.files;
    }

    function render() {
      listEl.innerHTML = '';
      if (!files.length) {
        label.textContent = 'Aucun fichier sélectionné';
        return;
      }
      const suffix = files.length > 1 ? 's' : '';
      label.textContent = `${files.length} fichier${suffix} sélectionné${suffix}`;
      files.forEach((file, index) => {
        const chip = document.createElement('div');
        chip.className = 'file-chip';
        chip.innerHTML = `<span>${file.name}</span><button type="button" aria-label="Supprimer ${file.name}">&times;</button>`;
        chip.querySelector('button').addEventListener('click', () => {
          files.splice(index, 1);
          sync();
          render();
        });
        listEl.appendChild(chip);
      });
    }

    input.addEventListener('change', () => {
      const incoming = Array.from(input.files || []);
      const existing = new Set(files.map(fileKey));
      incoming.forEach((file) => {
        if (!existing.has(fileKey(file))) files.push(file);
      });
      sync();
      render();
    });
  }

  setupFilePicker(document.getElementById('ticketFiles'), document.getElementById('fileLabel'), document.getElementById('fileList'));
  setupFilePicker(document.getElementById('requestFiles'), document.getElementById('requestFileLabel'), document.getElementById('requestFileList'));

  function createAiChatModal(initialPrompt) {
    const overlay = document.createElement('div');
    overlay.className = 'ai-chat-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="ai-chat-modal" role="dialog" aria-modal="true" aria-label="Assistant IA TikAI">
        <div class="ai-chat-header">
          <div class="ai-chat-title">
            <strong>Assistant IA TikAI</strong>
            <span>Pré-remplissage intelligent du ticket</span>
          </div>
          <button class="ai-chat-close" type="button" aria-label="Fermer">×</button>
        </div>
        <div class="ai-chat-messages"></div>
        <div class="ai-chat-footer">
          <div class="ai-chat-picked"></div>
          <div class="ai-chat-composer">
            <button class="ai-chat-attach" type="button" aria-label="Ajouter une image"><i class="bi bi-paperclip"></i></button>
            <textarea class="ai-chat-input" placeholder="Décrivez votre besoin..." rows="1"></textarea>
            <button class="ai-chat-send" type="button">Envoyer</button>
          </div>
          <input class="ai-chat-file-input" type="file" accept="image/*" multiple hidden />
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const closeBtn = overlay.querySelector('.ai-chat-close');
    const messagesEl = overlay.querySelector('.ai-chat-messages');
    const attachBtn = overlay.querySelector('.ai-chat-attach');
    const sendBtn = overlay.querySelector('.ai-chat-send');
    const inputEl = overlay.querySelector('.ai-chat-input');
    const fileInput = overlay.querySelector('.ai-chat-file-input');
    const pickedEl = overlay.querySelector('.ai-chat-picked');
    let pickedFiles = [];

    function addMessage(text, kind, loading) {
      const bubble = document.createElement('div');
      bubble.className = `ai-chat-msg ${kind}${loading ? ' loading' : ''}`;
      bubble.textContent = text;
      messagesEl.appendChild(bubble);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function renderPicked() {
      pickedEl.innerHTML = '';
      pickedFiles.forEach((file) => {
        const chip = document.createElement('span');
        chip.className = 'ai-chat-picked-chip';
        chip.textContent = file.name;
        pickedEl.appendChild(chip);
      });
    }

    function open() {
      overlay.hidden = false;
      try { window.parent.postMessage({ type: 'tikai-ai-modal', open: true }, '*'); } catch (_e) {}
      messagesEl.innerHTML = '';
      pickedFiles = [];
      renderPicked();
      inputEl.value = '';
      addMessage(initialPrompt, 'ai');
      inputEl.focus();
    }

    function close() {
      overlay.hidden = true;
      try { window.parent.postMessage({ type: 'tikai-ai-modal', open: false }, '*'); } catch (_e) {}
    }

    function send() {
      const text = inputEl.value.trim();
      if (!text && !pickedFiles.length) return;
      const userBubble = document.createElement('div');
      userBubble.className = 'ai-chat-msg user';
      userBubble.textContent = text || '[Image jointe]';
      if (pickedFiles.length) {
        const filesEl = document.createElement('div');
        filesEl.className = 'ai-chat-files';
        pickedFiles.forEach((file) => {
          const fileTag = document.createElement('span');
          fileTag.className = 'ai-chat-file';
          fileTag.textContent = file.name;
          filesEl.appendChild(fileTag);
        });
        userBubble.appendChild(filesEl);
      }
      messagesEl.appendChild(userBubble);
      inputEl.value = '';
      pickedFiles = [];
      renderPicked();
      addMessage('Chargement...', 'ai', true);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    closeBtn.addEventListener('click', () => {
      if (window.confirm('Voulez-vous quitter l’assistant IA ?')) close();
    });
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) event.stopPropagation();
    });
    attachBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      const incoming = Array.from(fileInput.files || []);
      const known = new Set(pickedFiles.map((file) => fileKey(file)));
      incoming.forEach((file) => {
        if (!known.has(fileKey(file))) pickedFiles.push(file);
      });
      renderPicked();
      fileInput.value = '';
    });
    sendBtn.addEventListener('click', send);
    inputEl.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        send();
      }
    });

    return { open };
  }

  const aiBanner = document.querySelector('.ai-banner');
  if (aiBanner) {
    const prompt = document.getElementById('newTicketForm') ? 'Bonjour, quel est votre problème ?' : 'Bonjour, quel est votre demande ?';
    const aiChat = createAiChatModal(prompt);
    aiBanner.addEventListener('click', () => aiChat.open());
  }

  document.getElementById('newTicketForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    toast('Ticket envoye (mock)');
  });
  document.getElementById('newRequestForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    toast('Ticket (demande) envoye (mock).');
  });
}

function initParkManager() {
  const PARK_STORAGE_KEY = 'tikai_parc_data_v1';
  const PARK_STORAGE_RESET_ONCE_KEY = 'tikai_parc_data_reset_once_v1';
  const users = {};
  let groups = [];
  let devices = [];
  let gear = [];

  try {
    if (!localStorage.getItem(PARK_STORAGE_RESET_ONCE_KEY)) {
      localStorage.removeItem(PARK_STORAGE_KEY);
      localStorage.setItem(PARK_STORAGE_RESET_ONCE_KEY, '1');
    }
  } catch (_e) {}

  function loadStoredData() {
    try {
      const raw = localStorage.getItem(PARK_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.groups)) groups = parsed.groups;
      if (Array.isArray(parsed?.devices)) devices = parsed.devices;
      if (Array.isArray(parsed?.gear)) gear = parsed.gear;
    } catch (_e) {}
  }

  function saveStoredData() {
    try {
      localStorage.setItem(PARK_STORAGE_KEY, JSON.stringify({ groups, devices, gear }));
    } catch (_e) {}
  }

  const PAGE_SIZE = { devices: 20, gear: 15, groups: 15 };
  const page = { devices: 1, gear: 1, groups: 1 };
  let editingDeviceId = null;
  let editingGearId = null;
  let editingGroupId = null;

  const parkPage = document.getElementById('parkPage');
  const parkSubtitle = document.getElementById('parkSubtitle');
  const kpiDevices = document.getElementById('kpiDevices');
  const kpiGear = document.getElementById('kpiGear');
  const kpiGroups = document.getElementById('kpiGroups');
  const devicesTableBody = document.querySelector('#devicesTable tbody');
  const gearTableBody = document.querySelector('#gearTable tbody');
  const groupsTableBody = document.querySelector('#groupsTable tbody');
  const devicesPagination = document.getElementById('devicesPagination');
  const gearPagination = document.getElementById('gearPagination');
  const groupsPagination = document.getElementById('groupsPagination');
  const deviceSearch = document.getElementById('deviceSearch');
  const gearSearch = document.getElementById('gearSearch');
  const groupSearch = document.getElementById('groupSearch');
  const deviceSearchForm = document.getElementById('deviceSearchForm');
  const gearSearchForm = document.getElementById('gearSearchForm');
  const groupSearchForm = document.getElementById('groupSearchForm');
  const addDeviceBtn = document.getElementById('addDeviceBtn');
  const addGearBtn = document.getElementById('addGearBtn');
  const addGroupBtn = document.getElementById('addGroupBtn');
  const deviceDialog = document.getElementById('deviceDialog');
  const gearDialog = document.getElementById('gearDialog');
  const groupDialog = document.getElementById('groupDialog');
  const deviceForm = document.getElementById('deviceForm');
  const gearForm = document.getElementById('gearForm');
  const groupForm = document.getElementById('groupForm');
  const deviceDialogTitle = document.getElementById('deviceDialogTitle');
  const gearDialogTitle = document.getElementById('gearDialogTitle');
  const groupDialogTitle = document.getElementById('groupDialogTitle');
  const deviceName = document.getElementById('deviceName');
  const deviceType = document.getElementById('deviceType');
  const deviceSn = document.getElementById('deviceSn');
  const deviceSystem = document.getElementById('deviceSystem');
  const deviceGroup = document.getElementById('deviceGroup');
  const deviceUser = document.getElementById('deviceUser');
  const deviceMobile = document.getElementById('deviceMobile');
  const gearName = document.getElementById('gearName');
  const gearGroup = document.getElementById('gearGroup');
  const gearUser = document.getElementById('gearUser');
  const deviceGroupSuggest = document.getElementById('deviceGroupSuggest');
  const deviceUserSuggest = document.getElementById('deviceUserSuggest');
  const gearGroupSuggest = document.getElementById('gearGroupSuggest');
  const gearUserSuggest = document.getElementById('gearUserSuggest');
  const groupName = document.getElementById('groupName');
  const groupDescription = document.getElementById('groupDescription');
  function nextId(items) { return items.length ? Math.max(...items.map((item) => item.ID)) + 1 : 1; }
  function groupLabel(groupId) { return groups.find((item) => item.ID === groupId)?.Name || `Group #${groupId}`; }
  function userLabel(userId) { return !userId ? '<span class="empty-value">Non attribue</span>' : (users[userId] || `User #${userId}`); }
  function normalize(value) { return String(value || '').trim().toLowerCase(); }
  function groupIdFromInput(value) { const match = groups.find((group) => normalize(group.Name) === normalize(value)); return match ? match.ID : null; }
  function userIdFromInput(value) { if (!String(value || '').trim()) return null; const match = Object.entries(users).find(([, name]) => normalize(name) === normalize(value)); return match ? Number(match[0]) : null; }

  function setupSuggest(input, menu, itemsGetter) {
    if (!input || !menu) return null;
    const close = () => { menu.hidden = true; };
    const open = () => { menu.hidden = false; };
    const build = () => {
      const q = normalize(input.value);
      const items = itemsGetter().filter((name) => normalize(name).includes(q)).sort((a, b) => a.localeCompare(b, 'fr'));
      if (!items.length) {
        menu.innerHTML = '<div class="suggest-empty">Aucun résultat</div>';
        return;
      }
      menu.innerHTML = items.map((name) => `<button type="button" class="suggest-option" data-value="${name}">${name}</button>`).join('');
    };
    input.addEventListener('focus', () => { build(); open(); });
    input.addEventListener('input', () => { build(); open(); });
    input.addEventListener('blur', () => { setTimeout(close, 120); });
    menu.addEventListener('mousedown', (event) => event.preventDefault());
    menu.addEventListener('click', (event) => {
      const btn = event.target.closest('.suggest-option');
      if (!btn) return;
      input.value = btn.getAttribute('data-value') || '';
      close();
      input.focus();
    });
    return { refresh: build };
  }

  const deviceGroupSuggestCtl = setupSuggest(deviceGroup, deviceGroupSuggest, () => groups.map((group) => group.Name));
  const gearGroupSuggestCtl = setupSuggest(gearGroup, gearGroupSuggest, () => groups.map((group) => group.Name));
  const deviceUserSuggestCtl = setupSuggest(deviceUser, deviceUserSuggest, () => Object.values(users));
  const gearUserSuggestCtl = setupSuggest(gearUser, gearUserSuggest, () => Object.values(users));
  const refreshSuggests = () => { deviceGroupSuggestCtl?.refresh?.(); gearGroupSuggestCtl?.refresh?.(); deviceUserSuggestCtl?.refresh?.(); gearUserSuggestCtl?.refresh?.(); };
  const filteredDevices = () => { const q = (deviceSearch.value || '').trim().toLowerCase(); return !q ? devices : devices.filter((device) => `${device.Name} ${device.Type} ${device.SN} ${device.System} ${groupLabel(device.Group)} ${users[device.User] || ''}`.toLowerCase().includes(q)); };
  const filteredGear = () => { const q = (gearSearch.value || '').trim().toLowerCase(); return !q ? gear : gear.filter((item) => `${item.Name} ${groupLabel(item.Group)} ${users[item.User] || ''}`.toLowerCase().includes(q)); };
  const filteredGroups = () => { const q = (groupSearch.value || '').trim().toLowerCase(); return !q ? groups : groups.filter((group) => `${group.Name} ${group.Description}`.toLowerCase().includes(q)); };

  function sliceForPage(list, key) {
    const size = PAGE_SIZE[key];
    const totalPages = Math.max(1, Math.ceil(list.length / size));
    page[key] = Math.min(Math.max(1, page[key]), totalPages);
    const start = (page[key] - 1) * size;
    return { items: list.slice(start, start + size), totalPages };
  }

  function renderPagination(container, key, totalItems, totalPages) {
    if (totalItems <= PAGE_SIZE[key]) {
      container.hidden = true;
      container.innerHTML = '';
      return;
    }
    container.hidden = false;
    const current = page[key];
    const buttons = [];
    buttons.push(`<button class="page-btn" data-key="${key}" data-page="${current - 1}" ${current === 1 ? 'disabled' : ''}>Prec</button>`);
    for (let i = 1; i <= totalPages; i += 1) buttons.push(`<button class="page-btn ${i === current ? 'active' : ''}" data-key="${key}" data-page="${i}">${i}</button>`);
    buttons.push(`<button class="page-btn" data-key="${key}" data-page="${current + 1}" ${current === totalPages ? 'disabled' : ''}>Suiv</button>`);
    container.innerHTML = `<span class="page-meta">${totalItems} elements</span>${buttons.join('')}`;
  }

  function updateKpis() { kpiDevices.textContent = String(filteredDevices().length); kpiGear.textContent = String(filteredGear().length); kpiGroups.textContent = String(filteredGroups().length); }
  function renderDevices() {
    const filtered = filteredDevices();
    const { items, totalPages } = sliceForPage(filtered, 'devices');
    devicesTableBody.innerHTML = '';
    items.forEach((device) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${device.Name}</td><td>${device.Type}</td><td>${device.SN}</td><td>${device.System}</td><td>${groupLabel(device.Group)}</td><td>${userLabel(device.User)}</td><td><span class="chip-mobile ${device.IsMobile ? '' : 'no'}">${device.IsMobile ? 'Oui' : 'Non'}</span></td><td><div class="row-actions"><button type="button" class="row-btn" data-edit-device="${device.ID}" title="Modifier"><i class="bi bi-pencil"></i></button><button type="button" class="row-btn danger" data-delete-device="${device.ID}" title="Supprimer"><i class="bi bi-trash"></i></button></div></td>`;
      devicesTableBody.appendChild(tr);
    });
    renderPagination(devicesPagination, 'devices', filtered.length, totalPages);
  }
  function renderGear() {
    const filtered = filteredGear();
    const { items, totalPages } = sliceForPage(filtered, 'gear');
    gearTableBody.innerHTML = '';
    items.forEach((item) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${item.Name}</td><td>${groupLabel(item.Group)}</td><td>${userLabel(item.User)}</td><td><div class="row-actions"><button type="button" class="row-btn" data-edit-gear="${item.ID}" title="Modifier"><i class="bi bi-pencil"></i></button><button type="button" class="row-btn danger" data-delete-gear="${item.ID}" title="Supprimer"><i class="bi bi-trash"></i></button></div></td>`;
      gearTableBody.appendChild(tr);
    });
    renderPagination(gearPagination, 'gear', filtered.length, totalPages);
  }
  function renderGroups() {
    const filtered = filteredGroups();
    const { items, totalPages } = sliceForPage(filtered, 'groups');
    groupsTableBody.innerHTML = '';
    items.forEach((group) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${group.Name}</td><td>${group.Description || '-'}</td><td><div class="row-actions"><button type="button" class="row-btn" data-edit-group="${group.ID}" title="Modifier"><i class="bi bi-pencil"></i></button><button type="button" class="row-btn danger" data-delete-group="${group.ID}" title="Supprimer"><i class="bi bi-trash"></i></button></div></td>`;
      groupsTableBody.appendChild(tr);
    });
    renderPagination(groupsPagination, 'groups', filtered.length, totalPages);
  }
  function renderAll() { refreshSuggests(); renderDevices(); renderGear(); renderGroups(); updateKpis(); }
  function setView(view) {
    parkPage.classList.remove('view-dashboard', 'view-devices', 'view-gear', 'view-groups');
    if (view === 'devices') { parkPage.classList.add('view-devices'); parkSubtitle.textContent = 'Inventaire detaille des equipements (utilisateurs attribues).'; return; }
    if (view === 'gear') { parkPage.classList.add('view-gear'); parkSubtitle.textContent = 'Suivi des materiels et attribution utilisateur.'; return; }
    if (view === 'groups') { parkPage.classList.add('view-groups'); parkSubtitle.textContent = 'Gestion des groupes (nom, description).'; return; }
    parkPage.classList.add('view-dashboard');
    parkSubtitle.textContent = "Vue d'ensemble du schema parkai : equipements, materiels et groupes.";
  }
  function refreshSearch(key, renderFn) { page[key] = 1; renderFn(); updateKpis(); }
  function bindSearch(form, input, key, renderFn) { form.addEventListener('submit', (event) => { event.preventDefault(); refreshSearch(key, renderFn); }); input.addEventListener('input', () => refreshSearch(key, renderFn)); }
  function openDialog(dialog) { if (dialog?.showModal) dialog.showModal(); }

  document.querySelectorAll('[data-close-dialog]').forEach((btn) => { btn.addEventListener('click', () => document.getElementById(btn.getAttribute('data-close-dialog'))?.close()); });
  [devicesPagination, gearPagination, groupsPagination].forEach((container) => {
    container.addEventListener('click', (event) => {
      const btn = event.target.closest('.page-btn[data-key][data-page]');
      if (!btn || btn.disabled) return;
      const key = btn.getAttribute('data-key');
      page[key] = Number(btn.getAttribute('data-page')) || 1;
      if (key === 'devices') renderDevices();
      if (key === 'gear') renderGear();
      if (key === 'groups') renderGroups();
    });
  });
  addDeviceBtn.addEventListener('click', () => { editingDeviceId = null; deviceDialogTitle.textContent = 'Ajouter un equipement'; deviceForm.reset(); refreshSuggests(); deviceMobile.checked = false; openDialog(deviceDialog); });
  addGearBtn.addEventListener('click', () => { editingGearId = null; gearDialogTitle.textContent = 'Ajouter un materiel'; gearForm.reset(); refreshSuggests(); openDialog(gearDialog); });
  addGroupBtn.addEventListener('click', () => { editingGroupId = null; groupDialogTitle.textContent = 'Ajouter un groupe'; groupForm.reset(); openDialog(groupDialog); });
  deviceForm.addEventListener('submit', (event) => { event.preventDefault(); const deviceGroupId = groupIdFromInput(deviceGroup.value); if (!deviceGroupId) { alert('Veuillez choisir un groupe existant.'); deviceGroup.focus(); return; } const deviceUserId = userIdFromInput(deviceUser.value); if (deviceUser.value.trim() && !deviceUserId) { alert('Veuillez choisir un utilisateur existant.'); deviceUser.focus(); return; } const payload = { Name: deviceName.value.trim(), Type: deviceType.value.trim(), SN: deviceSn.value.trim(), System: deviceSystem.value.trim(), Group: deviceGroupId, User: deviceUserId, IsMobile: deviceMobile.checked ? 1 : 0 }; if (!payload.Name || !payload.Type || !payload.SN || !payload.System) return; if (editingDeviceId) devices = devices.map((item) => (item.ID === editingDeviceId ? { ...item, ...payload } : item)); else devices.unshift({ ID: nextId(devices), ...payload }); deviceDialog.close(); saveStoredData(); renderAll(); });
  gearForm.addEventListener('submit', (event) => { event.preventDefault(); const gearGroupId = groupIdFromInput(gearGroup.value); if (!gearGroupId) { alert('Veuillez choisir un groupe existant.'); gearGroup.focus(); return; } const gearUserId = userIdFromInput(gearUser.value); if (gearUser.value.trim() && !gearUserId) { alert('Veuillez choisir un utilisateur existant.'); gearUser.focus(); return; } const payload = { Name: gearName.value.trim(), Group: gearGroupId, User: gearUserId }; if (!payload.Name) return; if (editingGearId) gear = gear.map((item) => (item.ID === editingGearId ? { ...item, ...payload } : item)); else gear.unshift({ ID: nextId(gear), ...payload }); gearDialog.close(); saveStoredData(); renderAll(); });
  groupForm.addEventListener('submit', (event) => { event.preventDefault(); const payload = { Name: groupName.value.trim(), Description: groupDescription.value.trim() }; if (!payload.Name) return; if (editingGroupId) groups = groups.map((item) => (item.ID === editingGroupId ? { ...item, ...payload } : item)); else groups.unshift({ ID: nextId(groups), ...payload }); groupDialog.close(); saveStoredData(); renderAll(); });
  devicesTableBody.addEventListener('click', (event) => { const editBtn = event.target.closest('[data-edit-device]'); const delBtn = event.target.closest('[data-delete-device]'); if (editBtn) { const device = devices.find((item) => item.ID === Number(editBtn.getAttribute('data-edit-device'))); if (!device) return; editingDeviceId = device.ID; deviceDialogTitle.textContent = 'Modifier un equipement'; refreshSuggests(); deviceName.value = device.Name; deviceType.value = device.Type; deviceSn.value = device.SN; deviceSystem.value = device.System; deviceGroup.value = groupLabel(device.Group); deviceUser.value = device.User ? (users[device.User] || '') : ''; deviceMobile.checked = !!device.IsMobile; openDialog(deviceDialog); return; } if (delBtn) { const id = Number(delBtn.getAttribute('data-delete-device')); if (!window.confirm('Supprimer cet equipement ?')) return; devices = devices.filter((item) => item.ID !== id); saveStoredData(); renderAll(); } });
  gearTableBody.addEventListener('click', (event) => { const editBtn = event.target.closest('[data-edit-gear]'); const delBtn = event.target.closest('[data-delete-gear]'); if (editBtn) { const item = gear.find((entry) => entry.ID === Number(editBtn.getAttribute('data-edit-gear'))); if (!item) return; editingGearId = item.ID; gearDialogTitle.textContent = 'Modifier un materiel'; refreshSuggests(); gearName.value = item.Name; gearGroup.value = groupLabel(item.Group); gearUser.value = item.User ? (users[item.User] || '') : ''; openDialog(gearDialog); return; } if (delBtn) { const id = Number(delBtn.getAttribute('data-delete-gear')); if (!window.confirm('Supprimer ce materiel ?')) return; gear = gear.filter((item) => item.ID !== id); saveStoredData(); renderAll(); } });
  groupsTableBody.addEventListener('click', (event) => { const editBtn = event.target.closest('[data-edit-group]'); const delBtn = event.target.closest('[data-delete-group]'); if (editBtn) { const group = groups.find((item) => item.ID === Number(editBtn.getAttribute('data-edit-group'))); if (!group) return; editingGroupId = group.ID; groupDialogTitle.textContent = 'Modifier un groupe'; groupName.value = group.Name; groupDescription.value = group.Description || ''; openDialog(groupDialog); return; } if (delBtn) { const id = Number(delBtn.getAttribute('data-delete-group')); if (!window.confirm('Supprimer ce groupe ?')) return; groups = groups.filter((item) => item.ID !== id); saveStoredData(); renderAll(); } });
  bindSearch(deviceSearchForm, deviceSearch, 'devices', renderDevices);
  bindSearch(gearSearchForm, gearSearch, 'gear', renderGear);
  bindSearch(groupSearchForm, groupSearch, 'groups', renderGroups);
  loadStoredData();
  renderAll();
  setView(document.body.dataset.parkView || 'dashboard');
}

function initFrameApp() {
  initFrameTheme();
  const view = document.body.dataset.view;
  if (view === 'dashboard') initDashboardView();
  if (view === 'empty') initEmptyView();
  if (view === 'park') initParkManager();
  if (view === 'incident' || view === 'request') initTicketsForm();
}

function initRootApp() {
  const loginRootShell = document.getElementById('loginRootShell');
  const appRootShell = document.getElementById('appRootShell');
  const contentFrame = document.getElementById('contentFrame');
  const sidebar = document.getElementById('sidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const mobileQuery = window.matchMedia('(max-width: 920px)');
  const menuSearch = document.getElementById('menuSearch');
  const navLinks = Array.from(document.querySelectorAll('#nav a'));
  const navParents = Array.from(document.querySelectorAll('#nav .nav-parent'));
  const breadcrumb = document.getElementById('breadcrumb');
  const flyoutItems = Array.from(document.querySelectorAll('.nav-item.has-submenu'));
  const newTicketBtn = document.getElementById('newTicketBtn');
  const newTicketMenu = document.getElementById('newTicketMenu');
  const profileBtn = document.getElementById('profileBtn');
  const profileMenu = document.getElementById('profileMenu');
  const profileThemeToggle = document.getElementById('profileThemeToggle');
  const themeToggle = document.getElementById('themeToggle');
  const form = document.getElementById('loginForm');
  const email = document.getElementById('email');
  const password = document.getElementById('password');
  const showPassword = document.getElementById('showPassword');
  let activeFlyout = null;
  let activeFlyoutItem = null;
  let flyoutHideTimer = null;
  const flyoutDelay = 140;
  function applyTheme(theme) {
    const isDark = theme === 'dark';
    document.body.classList.toggle('theme-dark', isDark);
    themeToggle?.classList.toggle('on', isDark);
    localStorage.setItem(TIKAI_THEME_KEY, isDark ? 'dark' : 'light');
    try { contentFrame?.contentWindow?.postMessage({ type: 'tikai-theme', theme: isDark ? 'dark' : 'light' }, '*'); } catch (_e) {}
  }

  const isAuthenticated = () => localStorage.getItem(TIKAI_AUTH_KEY) === '1';
  function showLoginScreen() { document.body.dataset.screen = 'login'; document.body.classList.remove('theme-dark', 'ai-modal-open', 'sidebar-collapsed', 'sidebar-compact', 'sidebar-mobile-open', 'no-scroll'); loginRootShell.hidden = false; appRootShell.hidden = true; document.body.classList.add('app-ready'); }
  function showAppScreen() { document.body.dataset.screen = 'app'; loginRootShell.hidden = true; appRootShell.hidden = false; applyTheme(localStorage.getItem(TIKAI_THEME_KEY) === 'dark' ? 'dark' : 'light'); syncSidebarForViewport(); renderBreadcrumb(null); loadFramePage(DASHBOARD_PAGE); document.body.classList.add('app-ready'); }
  function canNavigateAwayFromAi() { return !document.body.classList.contains('ai-modal-open') || window.confirm('Voulez-vous quitter l’assistant IA ?'); }
  function getLabel(link) { return link.querySelector('.label')?.textContent?.trim() || link.querySelector('span')?.textContent?.trim() || link.textContent.trim(); }

  function renderBreadcrumb(link, forcedParent) {
    if (!breadcrumb) return;
    breadcrumb.innerHTML = '';
    const segments = [{ label: 'Accueil', icon: 'bi bi-house' }];
    if (link) {
      const parent = forcedParent || link.closest('.nav-item')?.querySelector('.nav-parent');
      if (parent && parent !== link) {
        const parentIcon = parent.querySelector('.icon');
        const parentBi = parentIcon ? Array.from(parentIcon.classList).find((item) => item.startsWith('bi-')) : null;
        segments.push({ label: getLabel(parent), icon: parentBi ? `bi ${parentBi}` : 'bi bi-dot' });
      }
      const iconEl = link.querySelector('.icon');
      const bi = iconEl ? Array.from(iconEl.classList).find((item) => item.startsWith('bi-')) : null;
      segments.push({ label: getLabel(link), icon: bi ? `bi ${bi}` : 'bi bi-dot' });
    }
    segments.forEach((segment, index) => {
      const el = document.createElement('a');
      el.href = '#';
      el.className = 'crumb-link' + (index === segments.length - 1 ? ' active' : '');
      el.innerHTML = `<i class="${segment.icon} icon" aria-hidden="true"></i><span>${segment.label}</span>`;
      if (index === 0) {
        el.addEventListener('click', (event) => { event.preventDefault(); if (!canNavigateAwayFromAi()) return; navLinks.forEach((item) => item.classList.remove('active')); closeMenu(newTicketMenu, newTicketBtn); closeMenu(profileMenu, profileBtn); loadFramePage(DASHBOARD_PAGE); renderBreadcrumb(null); });
      } else {
        el.addEventListener('click', (event) => event.preventDefault());
      }
      breadcrumb.appendChild(el);
      if (index < segments.length - 1) {
        const sep = document.createElement('span');
        sep.className = 'crumb-sep';
        sep.textContent = '/';
        breadcrumb.appendChild(sep);
      }
    });
  }

  function pageFromLink(link) {
    const direct = link.dataset.page;
    if (direct) return direct;
    const key = link.getAttribute('href')?.replace('#', '') || 'dashboard';
    const title = encodeURIComponent(getLabel(link));
    return `${EMPTY_PAGE}?key=${encodeURIComponent(key)}&title=${title}`;
  }

  function loadFramePage(page) { contentFrame.srcdoc = createFrameDocument(resolveFrameDefinition(page)); }
  function openTicketCreateSubmenu() { const toggle = document.getElementById('ticketCreateToggle'); const submenu = document.getElementById('ticketCreateSubmenu'); if (!toggle || !submenu) return; submenu.hidden = false; submenu.style.display = 'grid'; toggle.setAttribute('aria-expanded', 'true'); toggle.classList.add('open'); }
  function openPathForLink(link) { const navItem = link?.closest('.nav-item.has-submenu'); if (!navItem) return; navItem.classList.add('open'); if (link.closest('#ticketCreateSubmenu')) openTicketCreateSubmenu(); }
  function navigateByLink(link, forcedParent) { if (!link) return; const page = pageFromLink(link); loadFramePage(page); navLinks.forEach((item) => item.classList.remove('active')); if (navLinks.includes(link)) link.classList.add('active'); openPathForLink(link); renderBreadcrumb(link, forcedParent); if (mobileQuery.matches) closeSidebar(); }
  function resetSubmenus() { document.querySelectorAll('.nav-item.open').forEach((item) => item.classList.remove('open')); const ticketCreateSubmenu = document.getElementById('ticketCreateSubmenu'); const ticketCreateToggle = document.getElementById('ticketCreateToggle'); if (ticketCreateSubmenu && ticketCreateToggle) { ticketCreateSubmenu.hidden = true; ticketCreateSubmenu.style.display = 'none'; ticketCreateToggle.setAttribute('aria-expanded', 'false'); ticketCreateToggle.classList.remove('open'); } }
  function isSidebarCollapsed() { return document.body.classList.contains('sidebar-collapsed') || document.body.classList.contains('sidebar-compact'); }
  function clearFlyout() { if (activeFlyout) { activeFlyout.classList.remove('show'); activeFlyout.setAttribute('aria-hidden', 'true'); } if (activeFlyoutItem) activeFlyoutItem.classList.remove('flyout-open'); activeFlyout = null; activeFlyoutItem = null; }
  function setBackdrop(show) { if (sidebarBackdrop) sidebarBackdrop.hidden = !show; }
  const setBodyLock = (lock) => document.body.classList.toggle('no-scroll', lock);
  function openSidebar() { resetSubmenus(); clearFlyout(); if (mobileQuery.matches) { document.body.classList.add('sidebar-mobile-open'); document.body.classList.remove('sidebar-compact'); setBackdrop(true); setBodyLock(true); return; } document.body.classList.remove('sidebar-collapsed'); }
  function closeSidebar() { resetSubmenus(); clearFlyout(); if (mobileQuery.matches) { document.body.classList.remove('sidebar-mobile-open'); document.body.classList.add('sidebar-compact'); setBackdrop(false); setBodyLock(false); return; } document.body.classList.add('sidebar-collapsed'); }
  function syncSidebarForViewport() { if (mobileQuery.matches) { document.body.classList.add('sidebar-compact'); document.body.classList.remove('sidebar-collapsed', 'sidebar-mobile-open'); setBackdrop(false); setBodyLock(false); clearFlyout(); resetSubmenus(); } else { document.body.classList.remove('sidebar-compact', 'sidebar-mobile-open'); setBackdrop(false); setBodyLock(false); clearFlyout(); resetSubmenus(); } }
  function closeMenu(menu, btn) { if (!menu) return; menu.classList.remove('show'); menu.setAttribute('aria-hidden', 'true'); btn?.setAttribute('aria-expanded', 'false'); }
  function toggleMenu(menu, btn) { if (!menu || !btn) return; const isOpen = menu.classList.toggle('show'); menu.setAttribute('aria-hidden', isOpen ? 'false' : 'true'); btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false'); }
  function positionFlyout(item, flyout) { const rect = item.getBoundingClientRect(); const left = rect.right + 12; let top = rect.top - 10; flyout.style.left = `${left}px`; flyout.style.top = `${top}px`; const flyRect = flyout.getBoundingClientRect(); const maxTop = window.innerHeight - 12 - flyRect.height; if (maxTop < top) top = Math.max(8, maxTop); if (top < 8) top = 8; flyout.style.top = `${top}px`; }
  function scheduleFlyoutClose() { if (flyoutHideTimer) clearTimeout(flyoutHideTimer); flyoutHideTimer = setTimeout(() => clearFlyout(), flyoutDelay); }

  showPassword?.addEventListener('change', () => { if (password) password.type = showPassword.checked ? 'text' : 'password'; });
  form?.addEventListener('submit', (event) => { event.preventDefault(); const mailValue = (email?.value || '').trim(); const passValue = (password?.value || '').trim(); if (!mailValue || !passValue) { alert('Veuillez renseigner le login et le mot de passe.'); if (!mailValue) email?.focus(); else password?.focus(); return; } localStorage.setItem(TIKAI_AUTH_KEY, '1'); showAppScreen(); });
  sidebarToggle?.addEventListener('click', () => { if (mobileQuery.matches && document.body.classList.contains('sidebar-mobile-open')) closeSidebar(); else if (mobileQuery.matches) openSidebar(); else if (document.body.classList.contains('sidebar-collapsed')) openSidebar(); else closeSidebar(); });
  sidebarBackdrop?.addEventListener('click', closeSidebar);
  mobileQuery.addEventListener('change', syncSidebarForViewport);
  menuSearch?.addEventListener('input', (event) => { const q = String(event.target.value || '').toLowerCase().trim(); navLinks.forEach((link) => { const key = (link.getAttribute('data-key') || link.textContent).toLowerCase(); link.style.display = key.includes(q) ? '' : 'none'; }); });
  navParents.forEach((parent) => { parent.addEventListener('click', (event) => { event.preventDefault(); parent.closest('.nav-item')?.classList.toggle('open'); }); });
  document.getElementById('ticketCreateToggle')?.addEventListener('click', () => { const toggle = document.getElementById('ticketCreateToggle'); const submenu = document.getElementById('ticketCreateSubmenu'); const open = submenu?.hidden; if (!submenu) return; submenu.hidden = !open; submenu.style.display = open ? 'grid' : 'none'; toggle?.setAttribute('aria-expanded', open ? 'true' : 'false'); toggle?.classList.toggle('open', !!open); });
  navLinks.forEach((link) => { if (link.classList.contains('nav-parent')) return; link.addEventListener('click', (event) => { event.preventDefault(); if (!canNavigateAwayFromAi()) return; navigateByLink(link); }); });
  flyoutItems.forEach((item) => { const parent = item.querySelector('.nav-parent'); const submenu = item.querySelector('.nav-submenu'); if (!parent || !submenu) return; const flyout = document.createElement('div'); flyout.className = 'nav-flyout'; flyout.setAttribute('aria-hidden', 'true'); const title = document.createElement('div'); title.className = 'nav-flyout-title'; title.textContent = parent.getAttribute('data-label') || getLabel(parent); const list = document.createElement('div'); list.className = 'nav-flyout-list'; submenu.querySelectorAll('a').forEach((link) => list.appendChild(link.cloneNode(true))); flyout.appendChild(title); flyout.appendChild(list); document.body.appendChild(flyout); item.addEventListener('mouseenter', () => { if (!isSidebarCollapsed()) return; if (flyoutHideTimer) clearTimeout(flyoutHideTimer); if (activeFlyout && activeFlyout !== flyout) clearFlyout(); activeFlyout = flyout; activeFlyoutItem = item; item.classList.add('flyout-open'); flyout.classList.add('show'); flyout.setAttribute('aria-hidden', 'false'); positionFlyout(item, flyout); }); item.addEventListener('mouseleave', () => { if (!isSidebarCollapsed()) return; scheduleFlyoutClose(); }); flyout.addEventListener('mouseenter', () => { if (flyoutHideTimer) clearTimeout(flyoutHideTimer); }); flyout.addEventListener('mouseleave', scheduleFlyoutClose); flyout.addEventListener('click', (event) => { const link = event.target.closest('a'); if (!link) return; event.preventDefault(); if (!canNavigateAwayFromAi()) return; navigateByLink(link, parent); clearFlyout(); }); });
  window.addEventListener('resize', () => { if (activeFlyout && activeFlyoutItem) positionFlyout(activeFlyoutItem, activeFlyout); });
  sidebar?.addEventListener('scroll', () => { if (activeFlyout && activeFlyoutItem) positionFlyout(activeFlyoutItem, activeFlyout); });
  newTicketBtn?.addEventListener('click', (event) => { event.stopPropagation(); toggleMenu(newTicketMenu, newTicketBtn); });
  profileBtn?.addEventListener('click', (event) => { event.stopPropagation(); toggleMenu(profileMenu, profileBtn); });
  newTicketMenu?.addEventListener('click', (event) => { const btn = event.target.closest('.new-ticket-item'); if (!btn) return; if (!canNavigateAwayFromAi()) return; const targetLink = navLinks.find((link) => link.dataset.page === btn.dataset.page); resetSubmenus(); if (targetLink) navigateByLink(targetLink); else loadFramePage(btn.dataset.page); closeMenu(newTicketMenu, newTicketBtn); if (!targetLink) renderBreadcrumb(null); });
  profileMenu?.addEventListener('click', (event) => { const item = event.target.closest('.profile-item'); if (!item) return; if (item.classList.contains('danger')) { if (!window.confirm('Etes-vous sur de vouloir vous deconnecter ?')) return; localStorage.removeItem(TIKAI_AUTH_KEY); showLoginScreen(); return; } closeMenu(profileMenu, profileBtn); });
  profileThemeToggle?.addEventListener('click', (event) => { event.stopPropagation(); const isDark = document.body.classList.contains('theme-dark'); applyTheme(isDark ? 'light' : 'dark'); closeMenu(profileMenu, profileBtn); });
  document.addEventListener('click', () => { closeMenu(newTicketMenu, newTicketBtn); closeMenu(profileMenu, profileBtn); });
  window.addEventListener('keydown', (event) => { if (event.key !== 'Escape') return; closeMenu(newTicketMenu, newTicketBtn); closeMenu(profileMenu, profileBtn); if (!document.body.classList.contains('ai-modal-open')) closeSidebar(); });
  window.addEventListener('message', (event) => { const data = event?.data; if (!data || data.type !== 'tikai-ai-modal') return; document.body.classList.toggle('ai-modal-open', !!data.open); });
  contentFrame?.addEventListener('load', () => { const isDark = document.body.classList.contains('theme-dark'); try { contentFrame.contentWindow?.postMessage({ type: 'tikai-theme', theme: isDark ? 'dark' : 'light' }, '*'); } catch (_e) {} });
  if (isAuthenticated()) showAppScreen(); else showLoginScreen();
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.body.dataset.shell === 'frame') initFrameApp();
  else initRootApp();
});
