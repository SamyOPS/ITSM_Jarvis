import {
  type CSSProperties,
  type PointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Bell,
  ChevronDown,
  Pencil,
  ListFilter,
  Lock,
  RotateCcw,
  RotateCw,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Upload,
  User,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

import type { AdminUserSummary } from '../../domain/auth/admin-user-summary';
import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';
import type { ReferentialGroup } from '../../domain/referentials/referential-catalog';
import { translateUserRole } from '../../domain/i18n/ticketing-labels';
import {
  isSupportManagerRole,
  isSupportRole,
} from '../../domain/auth/user-role';
import {
  deleteProfilePhoto,
  deleteProfilePhotoBinary,
  fetchUserDirectory,
  PROFILE_PHOTO_BUCKET_ID,
  updateProfilePhoto,
  uploadProfilePhotoBinary,
} from '../../infrastructure/api/auth-api';
import { fetchReferentialCatalog } from '../../infrastructure/api/referentials-api';

type SettingsSectionKey =
  | 'account-info'
  | 'password-security'
  | 'profile-extra'
  | 'notifications'
  | 'misc';

interface SettingsPageProps {
  initialSection?: SettingsSectionKey;
  onSessionUpdated?: (session: AuthSessionSnapshot) => void;
  session: AuthSessionSnapshot;
}

type SettingsNavGroup = {
  items: readonly {
    key: SettingsSectionKey;
    label: string;
  }[];
  label: string;
};

type VisualNotification = {
  description: string;
  enabled: boolean;
  title: string;
};

type AssignmentGroupDisplay = Pick<
  ReferentialGroup,
  'description' | 'id' | 'name'
>;

type AccountCharacteristicDisplay = {
  label: string;
  tone: 'assets' | 'kb' | 'vip';
};

type ProfilePhotoDialogMode = 'choice' | 'editor' | null;
type ProfilePhotoOffset = {
  x: number;
  y: number;
};

const PROFILE_PHOTO_MAX_SIZE_BYTES = 10 * 1024 * 1024;
const PROFILE_PHOTO_CANVAS_SIZE = 512;
const PROFILE_PHOTO_EDITOR_CROP_SIZE = 224;
const PROFILE_PHOTO_EDITOR_BASE_SIZE = PROFILE_PHOTO_EDITOR_CROP_SIZE;
const PROFILE_PHOTO_EDITOR_CURRENT_BASE_SIZE = PROFILE_PHOTO_EDITOR_CROP_SIZE;
const PROFILE_PHOTO_MIN_ZOOM = 1;
const PROFILE_PHOTO_MAX_ZOOM = 3;
const SUPPORTED_PROFILE_PHOTO_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
]);

const settingsNavGroups: readonly SettingsNavGroup[] = [
  {
    label: 'Profil',
    items: [
      { key: 'account-info', label: 'Infos du compte' },
      { key: 'password-security', label: 'Mot de passe et securite' },
      { key: 'profile-extra', label: 'Infos complementaires' },
    ],
  },
  {
    label: 'Preferences',
    items: [
      { key: 'notifications', label: 'Notification' },
      { key: 'misc', label: 'Divers' },
    ],
  },
];

function getDisplayName(session: AuthSessionSnapshot): string {
  const parts = [session.user.firstName, session.user.lastName].filter(Boolean);

  return parts.length > 0 ? parts.join(' ') : session.user.email;
}

function getSettingsSectionGroup(sectionKey: SettingsSectionKey) {
  return (
    settingsNavGroups.find((group) =>
      group.items.some((item) => item.key === sectionKey),
    ) ?? settingsNavGroups[0]
  );
}

function getVisibleSectionOrder(sectionKey: SettingsSectionKey) {
  return getSettingsSectionGroup(sectionKey).items.map((item) => item.key);
}

function getSectionScrollOffset(sectionKey: SettingsSectionKey): number {
  return sectionKey === 'password-security' ? 170 : 56;
}

function getCharacteristics(
  user: AdminUserSummary | AuthSessionSnapshot['user'],
): AccountCharacteristicDisplay[] {
  const characteristics: AccountCharacteristicDisplay[] = [];
  const canShowTechnicalCharacteristics =
    user.role !== 'DEMANDEUR' &&
    user.role !== 'ADMIN' &&
    user.role !== 'SUPER_ADMIN';

  if (user.isVip) {
    characteristics.push({ label: 'VIP', tone: 'vip' });
  }

  if (canShowTechnicalCharacteristics && user.canManageAssets) {
    characteristics.push({ label: 'Parc', tone: 'assets' });
  }

  if (
    canShowTechnicalCharacteristics &&
    (user.canManageKnowledgeBase || user.canValidateKnowledgeBase)
  ) {
    characteristics.push({ label: 'Base co.', tone: 'kb' });
  }

  return characteristics;
}

function getUserGroupIds(
  user: AdminUserSummary | AuthSessionSnapshot['user'],
): string[] {
  const groupIds = user.groupIds ?? [];

  return [
    ...new Set([...(user.groupId ? [user.groupId] : []), ...groupIds]),
  ].filter(Boolean);
}

function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');

  if (!localPart || !domain) {
    return '********';
  }

  return `${'*'.repeat(Math.max(8, localPart.length))}@${domain}`;
}

function validateProfilePhotoFile(file: File): string | null {
  if (!SUPPORTED_PROFILE_PHOTO_TYPES.has(file.type)) {
    return 'Choisissez une image JPEG, PNG ou GIF.';
  }

  if (file.size > PROFILE_PHOTO_MAX_SIZE_BYTES) {
    return 'L image ne doit pas depasser 10 Mo.';
  }

  return null;
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Impossible de charger l image.'));
    image.src = source;
  });
}

async function createCroppedProfilePhotoBlob(
  imageSource: string,
  zoom: number,
  rotation: number,
  offset: ProfilePhotoOffset,
  editorBaseSize: number,
): Promise<Blob> {
  const image = await loadImage(imageSource);
  const size = PROFILE_PHOTO_CANVAS_SIZE;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  canvas.width = size;
  canvas.height = size;

  if (!context) {
    throw new Error('Le recadrage de l image est indisponible.');
  }

  context.clearRect(0, 0, size, size);
  context.save();
  context.beginPath();
  context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  context.clip();
  const previewToCanvasScale = size / PROFILE_PHOTO_EDITOR_CROP_SIZE;

  context.translate(
    size / 2 + offset.x * previewToCanvasScale,
    size / 2 + offset.y * previewToCanvasScale,
  );
  context.rotate((rotation * Math.PI) / 180);

  const previewBaseScale =
    (editorBaseSize / image.naturalWidth) * previewToCanvasScale * zoom;
  const coverScale = previewBaseScale;
  const drawWidth = image.naturalWidth * coverScale;
  const drawHeight = image.naturalHeight * coverScale;

  context.drawImage(
    image,
    -drawWidth / 2,
    -drawHeight / 2,
    drawWidth,
    drawHeight,
  );
  context.restore();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Impossible de preparer la photo de profil.'));
        return;
      }

      resolve(blob);
    }, 'image/png');
  });
}

function buildProfilePhotoStoragePath(userId: string): string {
  const randomId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `${userId}/${randomId}.png`;
}

function extractProfilePhotoStoragePath(url: string | null | undefined) {
  if (!url) {
    return null;
  }

  const marker = `/storage/v1/object/public/${PROFILE_PHOTO_BUCKET_ID}/`;
  const markerIndex = url.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  return decodeURIComponent(url.slice(markerIndex + marker.length));
}

function buildNotificationItems(
  session: AuthSessionSnapshot,
): VisualNotification[] {
  const items: VisualNotification[] = [
    {
      description: 'Alerte quand un ticket vous concernant est cree.',
      enabled: true,
      title: 'Nouveau ticket',
    },
    {
      description: 'Alerte quand le statut d un ticket suivi change.',
      enabled: true,
      title: 'Changement de statut',
    },
    {
      description: 'Alerte quand un commentaire est ajoute sur un ticket.',
      enabled: true,
      title: 'Commentaire ajoute',
    },
  ];

  if (isSupportRole(session.user.role)) {
    items.push(
      {
        description: 'Alerte quand un ticket vous est assigne.',
        enabled: true,
        title: 'Ticket assigne',
      },
      {
        description: 'Alerte quand un ticket arrive dans votre groupe support.',
        enabled: true,
        title: 'Ticket de groupe',
      },
      {
        description: 'Alerte quand un ticket approche ou depasse son SLA.',
        enabled: false,
        title: 'SLA et retard',
      },
    );
  }

  if (isSupportManagerRole(session.user.role)) {
    items.push({
      description: 'Alerte pour les changements importants d administration.',
      enabled: false,
      title: 'Administration',
    });
  }

  return items;
}

function VisualToggle({ enabled }: { enabled: boolean }) {
  return (
    <button
      aria-pressed={enabled}
      className={
        enabled ? 'settings-discord-toggle is-on' : 'settings-discord-toggle'
      }
      type="button"
    >
      <span />
    </button>
  );
}

function ReadonlyField({
  label,
  placeholder,
  type = 'text',
  value,
}: {
  label: string;
  placeholder?: string;
  type?: string;
  value: string;
}) {
  return (
    <label className="settings-discord-field">
      <span>{label}</span>
      <input placeholder={placeholder} readOnly type={type} value={value} />
    </label>
  );
}

export function SettingsPage({
  initialSection = 'account-info',
  onSessionUpdated,
  session,
}: SettingsPageProps) {
  const [activeSection, setActiveSection] =
    useState<SettingsSectionKey>(initialSection);
  const [assignmentGroups, setAssignmentGroups] = useState<
    AssignmentGroupDisplay[]
  >([]);
  const [isLoadingAssignmentGroups, setIsLoadingAssignmentGroups] =
    useState(true);
  const [isEmailVisible, setIsEmailVisible] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [showPasswordUpdate, setShowPasswordUpdate] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(
    () => session.user.profilePhotoUrl ?? null,
  );
  const [profilePhotoDialogMode, setProfilePhotoDialogMode] =
    useState<ProfilePhotoDialogMode>(null);
  const [profilePhotoDraftUrl, setProfilePhotoDraftUrl] = useState<
    string | null
  >(null);
  const [profilePhotoEditorBaseSize, setProfilePhotoEditorBaseSize] = useState(
    PROFILE_PHOTO_EDITOR_BASE_SIZE,
  );
  const [profilePhotoZoom, setProfilePhotoZoom] = useState(
    PROFILE_PHOTO_MIN_ZOOM,
  );
  const [profilePhotoRotation, setProfilePhotoRotation] = useState(0);
  const [profilePhotoOffset, setProfilePhotoOffset] =
    useState<ProfilePhotoOffset>({ x: 0, y: 0 });
  const [profilePhotoError, setProfilePhotoError] = useState<string | null>(
    null,
  );
  const [isSavingProfilePhoto, setIsSavingProfilePhoto] = useState(false);
  const contentRef = useRef<HTMLElement | null>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null);
  const profilePhotoDragRef = useRef<{
    originX: number;
    originY: number;
    pointerId: number;
    startX: number;
    startY: number;
  } | null>(null);
  const isProgrammaticScrollRef = useRef(false);
  const displayName = getDisplayName(session);
  const sessionUserCharacteristics = useMemo(
    () => getCharacteristics(session.user),
    [session.user],
  );
  const [characteristics, setCharacteristics] = useState(
    () => sessionUserCharacteristics,
  );
  const sessionUserGroupIds = useMemo(() => {
    const groupIds = session.user.groupIds ?? [];

    return [
      ...new Set([
        ...(session.user.groupId ? [session.user.groupId] : []),
        ...groupIds,
      ]),
    ].filter(Boolean);
  }, [session.user.groupId, session.user.groupIds]);
  const notificationItems = useMemo(
    () => buildNotificationItems(session),
    [session],
  );

  useEffect(() => {
    setProfilePhotoUrl(session.user.profilePhotoUrl ?? null);
  }, [session.user.profilePhotoUrl]);

  useEffect(() => {
    return () => {
      if (profilePhotoDraftUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(profilePhotoDraftUrl);
      }
    };
  }, [profilePhotoDraftUrl]);

  useEffect(() => {
    let isMounted = true;

    async function loadAssignmentGroups(): Promise<void> {
      setIsLoadingAssignmentGroups(true);

      try {
        const [catalog, users] = await Promise.all([
          fetchReferentialCatalog(session.accessToken),
          fetchUserDirectory(session.accessToken),
        ]);
        const directoryUser = users.find((user) => user.id === session.user.id);
        const groupsById = new Map(
          catalog.groups.map((group) => [group.id, group]),
        );
        const currentUserGroupIds = directoryUser
          ? getUserGroupIds(directoryUser)
          : sessionUserGroupIds;
        const nextGroups = currentUserGroupIds.map((groupId) => {
          const group = groupsById.get(groupId);

          return {
            description: group?.description ?? null,
            id: groupId,
            name: group?.name ?? groupId,
          };
        });

        if (isMounted) {
          setCharacteristics(
            directoryUser
              ? getCharacteristics(directoryUser)
              : sessionUserCharacteristics,
          );
          setAssignmentGroups(nextGroups);
        }
      } catch {
        if (isMounted) {
          setCharacteristics(sessionUserCharacteristics);
          setAssignmentGroups([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingAssignmentGroups(false);
        }
      }
    }

    void loadAssignmentGroups();

    return () => {
      isMounted = false;
    };
  }, [
    session.accessToken,
    session.user.id,
    sessionUserCharacteristics,
    sessionUserGroupIds,
  ]);

  useEffect(() => {
    if (showPasswordUpdate) {
      return;
    }

    const contentElement = contentRef.current;

    if (!contentElement) {
      return;
    }

    const handleScroll = () => {
      if (isProgrammaticScrollRef.current) {
        return;
      }

      const visibleSectionOrder = getVisibleSectionOrder(activeSection);
      const scrollBottom =
        contentElement.scrollTop + contentElement.clientHeight;
      const isAtScrollEnd =
        scrollBottom >= contentElement.scrollHeight - 8 &&
        visibleSectionOrder.length > 0;

      if (isAtScrollEnd) {
        setActiveSection(visibleSectionOrder[visibleSectionOrder.length - 1]);
        return;
      }

      const contentRect = contentElement.getBoundingClientRect();
      const visibleCenter =
        contentRect.top + contentElement.clientHeight * 0.42;
      let nextActiveSection = visibleSectionOrder[0] ?? 'account-info';
      let closestDistance = Number.POSITIVE_INFINITY;

      for (const sectionKey of visibleSectionOrder) {
        const sectionElement = contentElement.querySelector(
          `[data-settings-section="${sectionKey}"]`,
        );

        if (!(sectionElement instanceof HTMLElement)) {
          continue;
        }

        const sectionRect = sectionElement.getBoundingClientRect();
        const sectionCenter = sectionRect.top + sectionRect.height * 0.38;
        const distance = Math.abs(sectionCenter - visibleCenter);

        if (distance < closestDistance) {
          closestDistance = distance;
          nextActiveSection = sectionKey;
        }
      }

      setActiveSection(nextActiveSection);
    };

    handleScroll();
    contentElement.addEventListener('scroll', handleScroll, { passive: true });

    return () => contentElement.removeEventListener('scroll', handleScroll);
  }, [activeSection, showPasswordUpdate]);

  function scrollToSection(sectionKey: SettingsSectionKey): void {
    isProgrammaticScrollRef.current = true;
    setShowPasswordUpdate(false);
    setActiveSection(sectionKey);

    window.setTimeout(() => {
      const contentElement = contentRef.current;
      const sectionElement = contentElement?.querySelector(
        `[data-settings-section="${sectionKey}"]`,
      );

      if (!(contentElement instanceof HTMLElement)) {
        isProgrammaticScrollRef.current = false;
        return;
      }

      if (!(sectionElement instanceof HTMLElement)) {
        contentElement.scrollTo({ top: 0, behavior: 'smooth' });
        window.setTimeout(() => {
          isProgrammaticScrollRef.current = false;
        }, 360);
        return;
      }

      contentElement.scrollTo({
        top: sectionElement.offsetTop - getSectionScrollOffset(sectionKey),
        behavior: 'smooth',
      });
      window.setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 360);
    }, 0);
  }

  function renderContent() {
    return getSettingsSectionGroup(activeSection).label === 'Preferences'
      ? renderPreferenceSections()
      : renderProfileSections();
  }

  function updateSessionProfilePhoto(nextProfilePhotoUrl: string | null): void {
    onSessionUpdated?.({
      ...session,
      user: {
        ...session.user,
        profilePhotoUrl: nextProfilePhotoUrl,
      },
    });
  }

  function resetProfilePhotoEditor(
    nextDraftUrl: string | null,
    editorBaseSize = PROFILE_PHOTO_EDITOR_BASE_SIZE,
  ): void {
    setProfilePhotoDraftUrl((currentDraftUrl) => {
      if (
        currentDraftUrl?.startsWith('blob:') &&
        currentDraftUrl !== nextDraftUrl
      ) {
        URL.revokeObjectURL(currentDraftUrl);
      }

      return nextDraftUrl;
    });
    setProfilePhotoEditorBaseSize(editorBaseSize);
    setProfilePhotoZoom(PROFILE_PHOTO_MIN_ZOOM);
    setProfilePhotoRotation(0);
    setProfilePhotoOffset({ x: 0, y: 0 });
  }

  function openProfilePhotoPicker(): void {
    setProfilePhotoError(null);
    profilePhotoInputRef.current?.click();
  }

  function openProfilePhotoChoice(): void {
    if (profilePhotoUrl) {
      setProfilePhotoDialogMode('choice');
      return;
    }

    openProfilePhotoPicker();
  }

  function handleProfilePhotoFileSelection(fileList: FileList | null): void {
    const file = fileList?.[0];

    if (!file) {
      return;
    }

    const validationError = validateProfilePhotoFile(file);

    if (validationError) {
      setProfilePhotoError(validationError);
      return;
    }

    resetProfilePhotoEditor(
      URL.createObjectURL(file),
      PROFILE_PHOTO_EDITOR_BASE_SIZE,
    );
    setProfilePhotoError(null);
    setProfilePhotoDialogMode('editor');

    if (profilePhotoInputRef.current) {
      profilePhotoInputRef.current.value = '';
    }
  }

  function handleEditCurrentProfilePhoto(): void {
    if (!profilePhotoUrl) {
      openProfilePhotoPicker();
      return;
    }

    resetProfilePhotoEditor(
      profilePhotoUrl,
      PROFILE_PHOTO_EDITOR_CURRENT_BASE_SIZE,
    );
    setProfilePhotoError(null);
    setProfilePhotoDialogMode('editor');
  }

  async function handleSaveProfilePhoto(): Promise<void> {
    if (!profilePhotoDraftUrl) {
      return;
    }

    setIsSavingProfilePhoto(true);
    setProfilePhotoError(null);

    try {
      const blob = await createCroppedProfilePhotoBlob(
        profilePhotoDraftUrl,
        profilePhotoZoom,
        profilePhotoRotation,
        profilePhotoOffset,
        profilePhotoEditorBaseSize,
      );
      const storagePath = buildProfilePhotoStoragePath(session.user.id);
      const publicUrl = await uploadProfilePhotoBinary(
        session.accessToken,
        storagePath,
        blob,
      );
      const previousStoragePath =
        extractProfilePhotoStoragePath(profilePhotoUrl);
      const updatedUser = await updateProfilePhoto(session.accessToken, {
        bucketId: PROFILE_PHOTO_BUCKET_ID,
        mimeType: blob.type || 'image/png',
        publicUrl,
        sizeBytes: blob.size,
        storagePath,
      });
      const nextProfilePhotoUrl = updatedUser.profilePhotoUrl ?? publicUrl;

      if (previousStoragePath) {
        await deleteProfilePhotoBinary(session.accessToken, [
          previousStoragePath,
        ]);
      }

      setProfilePhotoUrl(nextProfilePhotoUrl);
      updateSessionProfilePhoto(nextProfilePhotoUrl);
      setProfilePhotoDialogMode(null);
      resetProfilePhotoEditor(null);
    } catch (error) {
      setProfilePhotoError(
        error instanceof Error
          ? error.message
          : 'Impossible de sauvegarder la photo de profil.',
      );
    } finally {
      setIsSavingProfilePhoto(false);
    }
  }

  async function handleDeleteProfilePhoto(): Promise<void> {
    setIsSavingProfilePhoto(true);
    setProfilePhotoError(null);

    try {
      const previousStoragePath =
        extractProfilePhotoStoragePath(profilePhotoUrl);
      const updatedUser = await deleteProfilePhoto(session.accessToken);

      if (previousStoragePath) {
        await deleteProfilePhotoBinary(session.accessToken, [
          previousStoragePath,
        ]);
      }

      const nextProfilePhotoUrl = updatedUser.profilePhotoUrl ?? null;

      setProfilePhotoUrl(nextProfilePhotoUrl);
      updateSessionProfilePhoto(nextProfilePhotoUrl);
      setProfilePhotoDialogMode(null);
      resetProfilePhotoEditor(null);
    } catch (error) {
      setProfilePhotoError(
        error instanceof Error
          ? error.message
          : 'Impossible de supprimer la photo de profil.',
      );
    } finally {
      setIsSavingProfilePhoto(false);
    }
  }

  function handleProfilePhotoPointerDown(
    event: PointerEvent<HTMLDivElement>,
  ): void {
    event.currentTarget.setPointerCapture(event.pointerId);
    profilePhotoDragRef.current = {
      originX: profilePhotoOffset.x,
      originY: profilePhotoOffset.y,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
  }

  function handleProfilePhotoPointerMove(
    event: PointerEvent<HTMLDivElement>,
  ): void {
    const dragState = profilePhotoDragRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    setProfilePhotoOffset({
      x: dragState.originX + event.clientX - dragState.startX,
      y: dragState.originY + event.clientY - dragState.startY,
    });
  }

  function handleProfilePhotoPointerUp(
    event: PointerEvent<HTMLDivElement>,
  ): void {
    const dragState = profilePhotoDragRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    profilePhotoDragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  const profilePhotoZoomProgress =
    ((profilePhotoZoom - PROFILE_PHOTO_MIN_ZOOM) /
      (PROFILE_PHOTO_MAX_ZOOM - PROFILE_PHOTO_MIN_ZOOM)) *
    100;
  const profilePhotoZoomStyle = {
    '--settings-profile-photo-zoom-progress': `${profilePhotoZoomProgress}%`,
  } as CSSProperties;

  function renderProfileSections() {
    return (
      <div className="settings-discord-sections">
        <section
          className="settings-discord-content-card"
          data-settings-section="account-info"
        >
          <header className="settings-discord-section-header">
            <h1>Infos du compte</h1>
            <p>Informations principales affichees dans le front.</p>
          </header>

          <div className="settings-profile-photo-section">
            <h2>Photo de profil</h2>
            <div className="settings-profile-photo-card">
              <span className="settings-profile-photo-preview">
                {profilePhotoUrl ? (
                  <img alt="" src={profilePhotoUrl} />
                ) : (
                  displayName.slice(0, 2).toUpperCase()
                )}
              </span>

              <div className="settings-profile-photo-actions">
                <div className="settings-profile-photo-button-row">
                  <button
                    className="settings-profile-photo-primary"
                    onClick={openProfilePhotoChoice}
                    type="button"
                  >
                    {profilePhotoUrl
                      ? 'Mettre a jour la photo de profil'
                      : 'Ajouter une image de profil'}
                  </button>
                  {profilePhotoUrl ? (
                    <button
                      aria-label="Supprimer la photo de profil"
                      className="settings-profile-photo-delete"
                      disabled={isSavingProfilePhoto}
                      onClick={() => void handleDeleteProfilePhoto()}
                      type="button"
                    >
                      <Trash2 size={18} strokeWidth={2} />
                    </button>
                  ) : null}
                </div>
                <p>
                  L'image doit etre au format JPEG, PNG ou GIF et ne doit pas
                  depasser 10 Mo.
                </p>
                {profilePhotoError ? (
                  <small className="settings-profile-photo-error">
                    {profilePhotoError}
                  </small>
                ) : null}
              </div>
            </div>
            <input
              accept="image/jpeg,image/png,image/gif"
              className="settings-profile-photo-file"
              onChange={(event) =>
                handleProfilePhotoFileSelection(event.target.files)
              }
              ref={profilePhotoInputRef}
              type="file"
            />
          </div>

          <div className="settings-discord-fields-grid">
            <ReadonlyField label="Nom" value={session.user.lastName ?? ''} />
            <ReadonlyField
              label="Prenom"
              value={session.user.firstName ?? ''}
            />
          </div>

          <div className="settings-discord-save-row">
            <button
              className="primary-button admin-user-save-button"
              type="button"
            >
              Enregistrer
            </button>
          </div>
        </section>

        <section
          className="settings-discord-content-card"
          data-settings-section="password-security"
        >
          <header className="settings-discord-section-header">
            <h1>Mot de passe et securite</h1>
            <p>Controle visuel des elements sensibles du compte.</p>
          </header>

          <div className="settings-discord-list">
            <div className="settings-discord-row settings-discord-email-row">
              <div>
                <strong>E-mail</strong>
              </div>
              <div className="settings-discord-email-actions">
                <span className="settings-discord-email-value">
                  {isEmailVisible
                    ? session.user.email
                    : maskEmail(session.user.email)}
                </span>
                <button
                  className="settings-discord-inline-action"
                  onClick={() =>
                    setIsEmailVisible((currentValue) => !currentValue)
                  }
                  type="button"
                >
                  {isEmailVisible ? 'Masquer' : 'Afficher'}
                </button>
                <button
                  className="settings-discord-button"
                  onClick={() => setShowEmailVerification(true)}
                  type="button"
                >
                  Modifier
                </button>
              </div>
            </div>

            <div className="settings-discord-row settings-discord-password-row">
              <div>
                <strong>Mot de passe</strong>
              </div>
              <button
                className="settings-discord-button"
                onClick={() => setShowPasswordUpdate(true)}
                type="button"
              >
                Modifier
              </button>
            </div>
          </div>
        </section>

        <section
          className="settings-discord-content-card"
          data-settings-section="profile-extra"
        >
          <header className="settings-discord-section-header">
            <h1>Infos complementaires</h1>
            <p>Informations de profil affichees en lecture seule.</p>
          </header>

          <div className="settings-discord-list">
            <div className="settings-discord-row">
              <div>
                <strong>Role actuel</strong>
              </div>
              <span className="settings-discord-row-value">
                <ShieldCheck size={18} strokeWidth={2} />
                {translateUserRole(session.user.role)}
              </span>
            </div>

            <div className="settings-discord-row settings-discord-row-before-panel">
              <div>
                <strong>Caracteristique</strong>
              </div>
              <div className="settings-discord-pill-group">
                {characteristics.length > 0 ? (
                  characteristics.map((characteristic) => (
                    <span
                      className={`admin-user-capability-badge admin-user-capability-badge--${characteristic.tone}`}
                      key={characteristic.label}
                    >
                      {characteristic.label}
                    </span>
                  ))
                ) : (
                  <small className="admin-user-capability-empty">Aucune</small>
                )}
              </div>
            </div>

            <section className="settings-discord-groups-panel">
              <header className="settings-discord-groups-header">
                <div>
                  <h2>Groupes de l'utilisateur</h2>
                </div>

                <div className="ticket-list-count" aria-live="polite">
                  <strong>{assignmentGroups.length}</strong>
                  <span>groupes</span>
                </div>
              </header>

              <div className="ticket-table-scroll settings-discord-groups-scroll">
                <table className="ticket-table settings-discord-groups-table">
                  <thead>
                    <tr>
                      <th>Identifiant</th>
                      <th>Nom</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingAssignmentGroups ? (
                      <tr>
                        <td colSpan={3}>Chargement des groupes...</td>
                      </tr>
                    ) : assignmentGroups.length === 0 ? (
                      <tr>
                        <td colSpan={3}>Aucun groupe pour cet utilisateur.</td>
                      </tr>
                    ) : (
                      assignmentGroups.map((group) => (
                        <tr key={group.id}>
                          <td>
                            <div className="admin-users-identifier">
                              {group.name}
                            </div>
                          </td>
                          <td>{group.name}</td>
                          <td>{group.description ?? '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </section>
      </div>
    );
  }

  function renderPreferenceSections() {
    return (
      <div className="settings-discord-sections">
        <section
          className="settings-discord-content-card"
          data-settings-section="notifications"
        >
          <header className="settings-discord-section-header">
            <h1>Notification</h1>
            <p>Preferences visuelles adaptees au role actuel.</p>
          </header>

          <div className="settings-discord-list">
            {notificationItems.map((item) => (
              <div className="settings-discord-row" key={item.title}>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.description}</span>
                </div>
                <VisualToggle enabled={item.enabled} />
              </div>
            ))}
          </div>
        </section>

        <section
          className="settings-discord-content-card"
          data-settings-section="misc"
        >
          <header className="settings-discord-section-header">
            <h1>Divers</h1>
            <p>Reglages d affichage et de tri par defaut.</p>
          </header>

          <div className="settings-discord-list">
            <label className="settings-discord-row settings-discord-select-row">
              <div>
                <strong>Tri par defaut des tickets</strong>
                <span>Ordre applique aux listes de tickets.</span>
              </div>
              <span className="settings-discord-select">
                <select defaultValue="operational" disabled>
                  <option value="operational">Priorite operationnelle</option>
                  <option value="recent">Plus recent d abord</option>
                  <option value="oldest">Plus ancien d abord</option>
                  <option value="ttr">SLA le plus proche</option>
                </select>
                <ChevronDown size={16} strokeWidth={2} />
              </span>
            </label>

            <label className="settings-discord-row settings-discord-select-row">
              <div>
                <strong>Tri par defaut de la base de connaissances</strong>
                <span>Ordre applique aux articles et procedures.</span>
              </div>
              <span className="settings-discord-select">
                <select defaultValue="recent" disabled>
                  <option value="recent">Plus recent d abord</option>
                  <option value="popular">Plus consulte</option>
                  <option value="alphabetical">Alphabetique</option>
                </select>
                <ChevronDown size={16} strokeWidth={2} />
              </span>
            </label>

            <div className="settings-discord-row">
              <div>
                <strong>Mode nuit</strong>
                <span>Theme sombre de l interface Vision.</span>
              </div>
              <VisualToggle enabled={false} />
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <section className="settings-discord-page">
      <aside className="settings-discord-sidebar">
        <div className="settings-discord-profile-summary">
          <span className="settings-discord-avatar">
            {profilePhotoUrl ? (
              <img alt="" src={profilePhotoUrl} />
            ) : (
              displayName.slice(0, 2).toUpperCase()
            )}
          </span>
          <div>
            <strong>{displayName}</strong>
            <span>{translateUserRole(session.user.role)}</span>
          </div>
        </div>

        <nav aria-label="Navigation des parametres">
          {settingsNavGroups.map((group) => (
            <div className="settings-discord-nav-group" key={group.label}>
              <span className="settings-discord-nav-title">{group.label}</span>
              {group.items.map((item) => (
                <button
                  className={
                    activeSection === item.key && !showPasswordUpdate
                      ? 'settings-discord-nav-item is-active'
                      : 'settings-discord-nav-item'
                  }
                  key={item.key}
                  onClick={() => scrollToSection(item.key)}
                  type="button"
                >
                  {item.key === 'account-info' ? (
                    <User size={16} strokeWidth={2} />
                  ) : item.key === 'password-security' ? (
                    <Lock size={16} strokeWidth={2} />
                  ) : item.key === 'profile-extra' ? (
                    <ShieldCheck size={16} strokeWidth={2} />
                  ) : item.key === 'notifications' ? (
                    <Bell size={16} strokeWidth={2} />
                  ) : item.key === 'misc' ? (
                    <SlidersHorizontal size={16} strokeWidth={2} />
                  ) : (
                    <ListFilter size={16} strokeWidth={2} />
                  )}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <main className="settings-discord-content" ref={contentRef}>
        {renderContent()}
      </main>

      {profilePhotoDialogMode === 'choice' ? (
        <div
          className="settings-profile-photo-overlay"
          onClick={() => setProfilePhotoDialogMode(null)}
        >
          <section
            aria-labelledby="settings-profile-photo-choice-title"
            aria-modal="true"
            className="settings-profile-photo-dialog settings-profile-photo-choice-dialog"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <header>
              <h2 id="settings-profile-photo-choice-title">
                Mettre a jour la photo de profil
              </h2>
              <button
                aria-label="Fermer"
                onClick={() => setProfilePhotoDialogMode(null)}
                type="button"
              >
                x
              </button>
            </header>

            <button
              className="settings-profile-photo-choice"
              onClick={openProfilePhotoPicker}
              type="button"
            >
              <Upload size={26} strokeWidth={2} />
              <span>Importer une photo</span>
            </button>
            <button
              className="settings-profile-photo-choice is-muted"
              onClick={handleEditCurrentProfilePhoto}
              type="button"
            >
              <Pencil size={26} strokeWidth={2} />
              <span>Modifier la miniature actuelle</span>
            </button>

            <div className="settings-profile-photo-dialog-actions">
              <button
                className="settings-discord-button is-muted"
                onClick={() => setProfilePhotoDialogMode(null)}
                type="button"
              >
                Annuler
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {profilePhotoDialogMode === 'editor' && profilePhotoDraftUrl ? (
        <div
          className="settings-profile-photo-overlay"
          onClick={() => setProfilePhotoDialogMode(null)}
        >
          <section
            aria-labelledby="settings-profile-photo-editor-title"
            aria-modal="true"
            className="settings-profile-photo-dialog settings-profile-photo-editor-dialog"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <header>
              <h2 id="settings-profile-photo-editor-title">
                Mettre a jour la photo de profil
              </h2>
              <button
                aria-label="Fermer"
                onClick={() => setProfilePhotoDialogMode(null)}
                type="button"
              >
                x
              </button>
            </header>

            <div
              className="settings-profile-photo-cropper"
              onPointerCancel={handleProfilePhotoPointerUp}
              onPointerDown={handleProfilePhotoPointerDown}
              onPointerMove={handleProfilePhotoPointerMove}
              onPointerUp={handleProfilePhotoPointerUp}
            >
              <img
                alt=""
                src={profilePhotoDraftUrl}
                style={{
                  width: `${profilePhotoEditorBaseSize}px`,
                  transform: `translate(-50%, -50%) translate(${profilePhotoOffset.x}px, ${profilePhotoOffset.y}px) scale(${profilePhotoZoom}) rotate(${profilePhotoRotation}deg)`,
                }}
              />
              <span className="settings-profile-photo-mask" />
            </div>

            <footer className="settings-profile-photo-editor-controls">
              <button
                aria-label="Reinitialiser la rotation"
                className="settings-profile-photo-icon-button"
                onClick={() => setProfilePhotoRotation(0)}
                type="button"
              >
                <RotateCcw size={20} strokeWidth={2} />
              </button>
              <ZoomOut size={18} strokeWidth={2} />
              <input
                aria-label="Zoom"
                className="settings-profile-photo-zoom-range"
                max={PROFILE_PHOTO_MAX_ZOOM}
                min={PROFILE_PHOTO_MIN_ZOOM}
                onChange={(event) =>
                  setProfilePhotoZoom(Number(event.target.value))
                }
                step="0.05"
                style={profilePhotoZoomStyle}
                type="range"
                value={profilePhotoZoom}
              />
              <ZoomIn size={18} strokeWidth={2} />
              <button
                aria-label="Pivoter"
                className="settings-profile-photo-icon-button"
                onClick={(event) => {
                  event.stopPropagation();
                  setProfilePhotoRotation(
                    (currentRotation) => (currentRotation + 90) % 360,
                  );
                }}
                type="button"
              >
                <RotateCw size={20} strokeWidth={2} />
              </button>
              <button
                className="settings-discord-button is-muted"
                onClick={() => setProfilePhotoDialogMode(null)}
                type="button"
              >
                Annuler
              </button>
              <button
                className="primary-button admin-user-save-button"
                disabled={isSavingProfilePhoto}
                onClick={() => void handleSaveProfilePhoto()}
                type="button"
              >
                {isSavingProfilePhoto ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </footer>
          </section>
        </div>
      ) : null}

      {showEmailVerification ? (
        <div className="settings-email-verification-overlay">
          <section
            aria-labelledby="settings-email-verification-title"
            aria-modal="true"
            className="settings-email-verification-dialog"
            role="dialog"
          >
            <header>
              <h2 id="settings-email-verification-title">
                Verifier l'adresse e-mail
              </h2>
              <p>
                Nous devons verifier votre adresse e-mail actuelle avant de la
                modifier.
              </p>
            </header>

            <div className="settings-email-verification-current">
              {isEmailVisible
                ? session.user.email
                : maskEmail(session.user.email)}
            </div>

            <div className="settings-email-verification-actions">
              <button
                className="settings-discord-button is-muted"
                onClick={() => setShowEmailVerification(false)}
                type="button"
              >
                Annuler
              </button>
              <button
                className="primary-button admin-user-save-button"
                type="button"
              >
                Envoyer le code de verification
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {showPasswordUpdate ? (
        <div className="settings-email-verification-overlay">
          <section
            aria-labelledby="settings-password-update-title"
            aria-modal="true"
            className="settings-email-verification-dialog settings-password-update-dialog"
            role="dialog"
          >
            <button
              aria-label="Fermer"
              className="settings-password-update-close"
              onClick={() => setShowPasswordUpdate(false)}
              type="button"
            >
              ×
            </button>

            <header>
              <h2 id="settings-password-update-title">
                Mets ton mot de passe a jour
              </h2>
              <p>Saisis ton mot de passe actuel puis le nouveau.</p>
            </header>

            <div className="settings-discord-password-form">
              <ReadonlyField
                label="Mot de passe actuel"
                placeholder="********"
                type="password"
                value=""
              />
              <ReadonlyField
                label="Nouveau mot de passe"
                placeholder="********"
                type="password"
                value=""
              />
              <ReadonlyField
                label="Confirmer le nouveau mot de passe"
                placeholder="********"
                type="password"
                value=""
              />
            </div>

            <div className="settings-email-verification-actions">
              <button
                className="settings-discord-button is-muted"
                onClick={() => setShowPasswordUpdate(false)}
                type="button"
              >
                Annuler
              </button>
              <button
                className="primary-button admin-user-save-button"
                type="button"
              >
                Termine
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
