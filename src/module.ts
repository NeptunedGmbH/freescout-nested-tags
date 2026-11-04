/**
 * NestedTags browser surface. Compiled to Public/js/module.js.
 */
let boot: NestedBoot | null = null;
let nodes: NestedNode[] = [];
let paths: Record<string, string> = {};
let pendingParent = '';
let fromSublabel = false;
let dragX = 0;
let dragDropped = false;
let dragTrailer: HTMLElement[] = [];
let dragTrailerDepth: number[] = [];
let dragOriginDepth = 0;
let nestMark: HTMLElement | null = null;
let sidebarEdit = false;
let menuBound = false;
let folderDragBound = false;
let folderDragId = 0;
let folderPressBlocked = false;
let folderDragChip: HTMLElement | null = null;
let folderDropKey = '';
let folderDropLine: HTMLElement | null = null;
let folderLiveHit: FolderHit | null = null;
let pendingFolderHtml = '';
let pendingFolderIcons: Record<string, FolderSidebarIcon> | null = null;
let pendingFolderIconsKnown = false;
let pendingFolderRevision = 0;
let lastFolderEventId = 0;
let conversationDrag = false;
let folderChannelOn = false;
let folderSyncToken = 0;
let folderEpoch = 0;

function nestedtagsStart(config: NestedBoot): void {
    boot = config;
    nodes = config.nodes || [];
    paths = config.paths || {};
    bindDelete();
    bindSave();
    bindSidebarReload();
    bindNewFolder();
    bindAdminDrag();
    bindFolderMenu();
    bindFolderDrag();
    bindLiveFolders();
    paint();
    if (!nodes.length) {
        loadTree(mailboxId(), paint);
    }
}

function mailboxId(): number {
    if (boot && boot.mailboxId) {
        return boot.mailboxId;
    }
    const raw = getGlobalAttr('mailbox_id');
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) ? 0 : parsed;
}

function loadTree(id: number, done: () => void, accept?: () => boolean): void {
    if (!boot || !id) {
        done();
        return;
    }
    fsAjax({ action: 'tree', mailbox_id: id }, boot.url, function (response) {
        if (accept && !accept()) {
            done();
            return;
        }
        if (response && response.nodes) {
            nodes = response.nodes;
        }
        if (response && response.paths) {
            paths = response.paths;
        }
        done();
    }, true, done);
}

function fieldsOf(data: string | Record<string, unknown> | undefined): Record<string, string> {
    const out: Record<string, string> = {};
    if (typeof data === 'string') {
        const params = new URLSearchParams(data);
        params.forEach(function (value, key) {
            out[key] = value;
        });
        return out;
    }
    if (data) {
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                const value = data[key];
                if (typeof value === 'string' || typeof value === 'number') {
                    out[key] = String(value);
                }
            }
        }
    }
    return out;
}

function bindSave(): void {
    $.ajaxPrefilter(function (options) {
        if (!boot || !options.url || options.url.indexOf('custom-folders/ajax') === -1) {
            return;
        }
        const fields = fieldsOf(options.data);
        if (fields.action !== 'create' && fields.action !== 'update') {
            return;
        }
        if (!Object.prototype.hasOwnProperty.call(fields, 'parent_folder_id')) {
            return;
        }
        const previous = options.success;
        options.success = function (data) {
            const finish = function () {
                if (previous) {
                    previous(data);
                }
            };
            const id = data && data.id ? Number(data.id) : 0;
            if (!id || !boot) {
                finish();
                return;
            }
            fsAjax({
                action: 'set_parent',
                mailbox_id: fields.mailbox_id || mailboxId(),
                folder_id: id,
                parent_folder_id: fields.parent_folder_id
            }, boot.url, finish, true, finish);
        };
    });
}

function bindDelete(): void {
    document.addEventListener('click', function (event) {
        const target = event.target as Element | null;
        if (!target || !target.closest) {
            return;
        }
        const button = target.closest('.folder-delete-trigger') as HTMLElement | null;
        if (!button || !boot) {
            return;
        }
        if (button.getAttribute('data-nestedtags-pass') === '1') {
            button.removeAttribute('data-nestedtags-pass');
            return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        const id = button.getAttribute('data-folder_id') || '';
        fsAjax({
            action: 'child_names',
            folder_id: id,
            mailbox_id: mailboxId()
        }, boot.url, function (response) {
            const names = response && response.names ? response.names : [];
            if (!names.length) {
                if (document.getElementById('custom-folders-index')) {
                    button.setAttribute('data-nestedtags-pass', '1');
                    button.click();
                    return;
                }
                confirmDeleteFolder(id);
                return;
            }
            const lines = names.map(escapeHtml).join('<br>');
            const confirmText = (boot ? boot.confirm : '') + '<br>' + lines;
            const deleteLabel = boot ? boot.deleteLabel : 'Delete';
            showModalConfirm(confirmText, 'nestedtags-delete-ok', {
                on_show: function (modal) {
                    modal.children().find('.nestedtags-delete-ok:first').click(function () {
                        modal.modal('hide');
                        if (!boot) {
                            return;
                        }
                        const foldersUrl = typeof laroute !== 'undefined' ? laroute.route('mailboxes.custom_folders.ajax') : '';
                        fsAjax({
                            action: 'delete_children',
                            folder_id: id,
                            mailbox_id: mailboxId()
                        }, boot.url, function (result) {
                            if (!result || typeof result.msg_success === 'undefined' || !foldersUrl) {
                                showAjaxResult(result);
                                return;
                            }
                            fsAjax({
                                action: 'delete',
                                folder_id: id
                            }, foldersUrl, function (deleted) {
                                finishFolderDelete(id, deleted);
                            }, true);
                        }, true);
                    });
                }
            }, deleteLabel);
        }, true);
    }, true);
}

function confirmDeleteFolder(id: string): void {
    const text = boot ? boot.deleteFolder : 'Delete this folder?';
    const deleteLabel = boot ? boot.deleteLabel : 'Delete';
    showModalConfirm(text, 'nestedtags-delete-ok', {
        on_show: function (modal) {
            modal.children().find('.nestedtags-delete-ok:first').click(function () {
                modal.modal('hide');
                const foldersUrl = typeof laroute !== 'undefined' ? laroute.route('mailboxes.custom_folders.ajax') : '';
                if (!foldersUrl) {
                    return;
                }
                fsAjax({
                    action: 'delete',
                    folder_id: id
                }, foldersUrl, function (deleted) {
                    finishFolderDelete(id, deleted);
                }, true);
            });
        }
    }, deleteLabel);
}

function finishFolderDelete(id: string, deleted: NestedResponse): void {
    showAjaxResult(deleted);
    if (!deleted || typeof deleted.msg_success === 'undefined') {
        return;
    }
    const row = document.getElementById('folder-' + id);
    if (row && row.parentNode) {
        row.parentNode.removeChild(row);
        return;
    }
    window.location.reload();
}

function bindSidebarReload(): void {
    $.ajaxPrefilter(function (options) {
        if (!sidebarEdit || !options.url || options.url.indexOf('custom-folders/ajax') === -1) {
            return;
        }
        const fields = fieldsOf(options.data);
        if (fields.action !== 'update') {
            return;
        }
        const previous = options.success;
        options.success = function (data) {
            if (data && data.status === 'success') {
                const savedId = data.id ? Number(data.id) : Number(fields.folder_id || 0);
                const savedName = data.name || '';
                const parentId = fields.parent_folder_id || '';
                window.iconpickerReleaseFolderSave = function () {
                    showSidebarEdit(savedId, savedName, parentId);
                };
            }
            if (previous) {
                previous(data);
            }
        };
    });
}

function showSidebarEdit(id: number, name: string, parentId: string): void {
    const nameChanged = !!(id && name && name !== folderName(id));
    const parentChanged = !!(id && parentId !== parentIdOf(id));
    if (nameChanged) {
        folderEpoch++;
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].id === id) {
                nodes[i].name = name;
            }
        }
        const label = document.querySelector('#folders li[data-folder_id="' + String(id) + '"] .folder-name');
        if (label) {
            label.textContent = name;
        }
    }
    if (parentChanged) {
        applyFolderMove(id, parentId, '');
    }
    const mailbox = mailboxId();
    if (mailbox && (nameChanged || parentChanged)) {
        loadTree(mailbox, refreshFolderLabels);
    }
    const open = document.querySelector('.modal.in, .modal.show');
    if (open) {
        const modal = $(open);
        if (modal.modal) {
            modal.modal('hide');
            return;
        }
    }
    sidebarEdit = false;
}

function bindNewFolder(): void {
    const original = window.initNewFolder;
    window.initNewFolder = function (modal) {
        if (original) {
            original(modal);
        }
        const preset = pendingParent;
        pendingParent = '';
        const root = modal && modal.length ? modal.get(0) : document;
        injectParents(root || document, preset);
        simplifyCreate(root || document);
    };
    document.addEventListener('click', function (event) {
        const target = event.target as Element | null;
        if (!target || !target.closest) {
            return;
        }
        const opener = target.closest('a[data-modal-on-show="initNewFolder"]');
        if (!opener) {
            return;
        }
        if (!fromSublabel) {
            pendingParent = '';
        }
        fromSublabel = false;
    }, true);
}

function simplifyCreate(root: Document | HTMLElement): void {
    const forms = root.querySelectorAll('.new-folder-form');
    for (let i = 0; i < forms.length; i++) {
        const form = forms[i] as HTMLFormElement;
        if (form.getAttribute('data-nestedtags-simple') === '1') {
            continue;
        }
        const nameInput = form.querySelector('input[name="name"]');
        if (!(nameInput instanceof HTMLInputElement)) {
            continue;
        }
        form.setAttribute('data-nestedtags-simple', '1');
        form.classList.add('nestedtags-simple');
        const counter = form.querySelector('select[name="counter"]');
        if (counter instanceof HTMLSelectElement) {
            counter.value = '1';
        }
        const nameGroup = nameInput.closest('.form-group');
        const field = nameInput.parentElement;
        if (field && boot) {
            const hint = document.createElement('div');
            hint.className = 'nestedtags-name-hint';
            hint.textContent = boot.nameIsTag;
            field.appendChild(hint);
        }
        const expand = document.createElement('div');
        expand.className = 'form-group nestedtags-expand';
        const expandCol = document.createElement('div');
        expandCol.className = 'col-sm-10 col-sm-offset-2';
        const expandButton = document.createElement('button');
        expandButton.type = 'button';
        expandButton.className = 'btn btn-link';
        expandButton.textContent = boot ? boot.moreSettings : 'More settings';
        expandCol.appendChild(expandButton);
        expand.appendChild(expandCol);
        const saveButton = form.querySelector('.btn-primary');
        const saveGroup = saveButton ? saveButton.closest('.form-group') : null;
        if (saveGroup && saveGroup.parentNode) {
            saveGroup.parentNode.insertBefore(expand, saveGroup);
        } else if (nameGroup && nameGroup.parentNode) {
            nameGroup.parentNode.insertBefore(expand, nameGroup.nextSibling);
        }
        nameInput.addEventListener('input', function () {
            if (form.getAttribute('data-nestedtags-tag-lock') === '1') {
                return;
            }
            syncTag(form, nameInput.value);
        });
        const tagSelect = form.querySelector('select[name="tag_name"]');
        if (tagSelect) {
            tagSelect.addEventListener('change', function () {
                if (form.getAttribute('data-nestedtags-syncing') === '1') {
                    return;
                }
                if ((tagSelect as HTMLSelectElement).value !== nameInput.value.trim()) {
                    form.setAttribute('data-nestedtags-tag-lock', '1');
                }
            });
        }
        expandButton.addEventListener('click', function () {
            form.classList.remove('nestedtags-simple');
            expand.parentNode && expand.parentNode.removeChild(expand);
            const hint = form.querySelector('.nestedtags-name-hint');
            if (hint && hint.parentNode) {
                hint.parentNode.removeChild(hint);
            }
            const dialog = form.closest('.modal-dialog');
            if (dialog) {
                dialog.classList.add('modal-lg');
            }
            syncTag(form, nameInput.value);
        });
        form.addEventListener('submit', function () {
            if (form.getAttribute('data-nestedtags-tag-lock') === '1') {
                return;
            }
            syncTag(form, nameInput.value);
        }, true);
        window.setTimeout(function () {
            nameInput.focus();
        }, 0);
    }
}

function syncTag(form: HTMLFormElement, raw: string): void {
    const select = form.querySelector('select[name="tag_name"]');
    if (!(select instanceof HTMLSelectElement)) {
        return;
    }
    const value = raw.trim();
    form.setAttribute('data-nestedtags-syncing', '1');
    if (!value) {
        select.value = '';
    } else {
        let found = false;
        for (let i = 0; i < select.options.length; i++) {
            if (select.options[i].value === value) {
                found = true;
                break;
            }
        }
        if (!found) {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            select.appendChild(option);
        }
        select.value = value;
    }
    const chosen = $(select) as JQueryCollection & {
        val?: (next: string) => { trigger?: (event: string) => void };
    };
    if (chosen.val) {
        const chained = chosen.val(value);
        if (chained && chained.trigger) {
            chained.trigger('change');
        }
    }
    form.removeAttribute('data-nestedtags-syncing');
}

function injectParents(root: Document | HTMLElement, preset: string): void {
    if (!boot) {
        return;
    }
    const forms = root.querySelectorAll('.custom-folders-form, .new-folder-form');
    for (let i = 0; i < forms.length; i++) {
        const form = forms[i] as HTMLElement;
        if (form.querySelector('[name="parent_folder_id"]')) {
            continue;
        }
        const selfId = form.getAttribute('data-folder_id') || '';
        const wrap = document.createElement('div');
        wrap.className = 'form-group';
        const label = document.createElement('label');
        label.textContent = boot.nestUnder;
        const select = document.createElement('select');
        select.name = 'parent_folder_id';
        select.className = 'form-control';
        const empty = document.createElement('option');
        empty.value = '';
        empty.textContent = boot.topLevel;
        select.appendChild(empty);
        const blocked = blockedIds(selfId);
        for (let n = 0; n < nodes.length; n++) {
            const node = nodes[n];
            if (blocked[node.id]) {
                continue;
            }
            const option = document.createElement('option');
            option.value = String(node.id);
            option.textContent = indent(depthOf(node.id)) + node.name;
            if (preset && String(node.id) === preset) {
                option.selected = true;
            }
            select.appendChild(option);
        }
        wrap.appendChild(label);
        wrap.appendChild(select);
        form.insertBefore(wrap, form.firstChild);
    }
    addSublabelLinks();
    paintPicker();
}

function blockedIds(selfId: string): Record<number, boolean> {
    const blocked: Record<number, boolean> = {};
    const self = parseInt(selfId, 10);
    if (!self) {
        return blocked;
    }
    blocked[self] = true;
    let grew = true;
    while (grew) {
        grew = false;
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (node.parent && blocked[node.parent] && !blocked[node.id]) {
                blocked[node.id] = true;
                grew = true;
            }
        }
    }
    return blocked;
}

function depthOf(id: number): number {
    let depth = 0;
    let cursor: number | null = id;
    const seen: Record<number, boolean> = {};
    while (cursor && !seen[cursor]) {
        seen[cursor] = true;
        let parent: number | null = null;
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].id === cursor) {
                parent = nodes[i].parent;
                break;
            }
        }
        if (!parent) {
            break;
        }
        depth++;
        cursor = parent;
    }
    return depth;
}

function indent(depth: number): string {
    let text = '';
    for (let i = 0; i < depth; i++) {
        text += '\u00a0\u00a0';
    }
    return text;
}

function addSublabelLinks(): void {
    if (!boot) {
        return;
    }
    const opener = document.querySelector('a[data-modal-on-show="initNewFolder"]');
    if (!opener) {
        return;
    }
    const triggers = document.querySelectorAll('.folder-delete-trigger');
    for (let i = 0; i < triggers.length; i++) {
        const trigger = triggers[i] as HTMLElement;
        const parent = trigger.parentElement;
        if (!parent || parent.querySelector('.nestedtags-sublabel')) {
            continue;
        }
        const link = document.createElement('a');
        link.href = '#';
        link.className = 'btn btn-link nestedtags-sublabel';
        link.textContent = boot.sublabel;
        const folderId = trigger.getAttribute('data-folder_id') || '';
        link.addEventListener('click', function (event) {
            event.preventDefault();
            fromSublabel = true;
            pendingParent = folderId;
            (opener as HTMLElement).click();
        });
        parent.insertBefore(link, trigger);
    }
}

function paint(): void {
    nestSidebar();
    paintManage();
    paintAdminOutline();
    paintTags();
    paintPicker();
    injectParents(document, '');
    prepareFolderDrag();
}

function refreshFolderLabels(): void {
    paintTags();
    paintPicker();
}

function isCustomFolder(id: number): boolean {
    for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].id === id) {
            return true;
        }
    }
    return false;
}

function parentIdOf(id: number): string {
    for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].id === id && nodes[i].parent) {
            return String(nodes[i].parent);
        }
    }
    return '';
}

function folderName(id: number): string {
    for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].id === id) {
            return nodes[i].name;
        }
    }
    return '';
}

function paintManage(): void {
    if (!boot || !boot.canEdit || !boot.createUrl) {
        return;
    }
    const root = document.getElementById('folders');
    if (!root || root.classList.contains('chats')) {
        return;
    }
    placeAddButton(root);
    const items = root.querySelectorAll('li[data-folder_id]');
    for (let i = 0; i < items.length; i++) {
        const item = items[i] as HTMLElement;
        const id = parseInt(item.getAttribute('data-folder_id') || '', 10);
        if (!isCustomFolder(id)) {
            continue;
        }
        item.classList.add('nestedtags-manageable');
        if (item.querySelector(':scope > .nestedtags-more')) {
            continue;
        }
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-trans nestedtags-more';
        button.setAttribute('aria-label', boot.folderActions);
        button.textContent = '\u2026';
        button.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            const rect = button.getBoundingClientRect();
            openFolderMenu(id, rect.left, rect.bottom + 4);
        });
        item.appendChild(button);
    }
}

function placeAddButton(root: HTMLElement): void {
    if (document.querySelector('.nestedtags-add') || !boot) {
        return;
    }
    const wrap = document.createElement('div');
    wrap.className = 'sidebar-buttons btn-group-rounded nestedtags-add-wrap';
    const button = document.createElement('a');
    button.href = '#';
    button.className = 'btn btn-trans nestedtags-add';
    button.setAttribute('role', 'button');
    const plus = document.createElement('i');
    plus.className = 'glyphicon glyphicon-plus';
    plus.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.textContent = boot.addFolder;
    button.appendChild(plus);
    button.appendChild(document.createTextNode(' '));
    button.appendChild(label);
    button.addEventListener('click', function (event) {
        event.preventDefault();
        openCreate('');
    });
    wrap.appendChild(button);
    root.insertAdjacentElement('afterend', wrap);
}

function bindFolderMenu(): void {
    if (menuBound) {
        return;
    }
    menuBound = true;
    document.addEventListener('contextmenu', function (event) {
        if (!boot || !boot.canEdit) {
            return;
        }
        const target = event.target as Element | null;
        const item = target && target.closest ? target.closest('#folders li[data-folder_id]') as HTMLElement | null : null;
        if (!item) {
            return;
        }
        const id = parseInt(item.getAttribute('data-folder_id') || '', 10);
        if (!isCustomFolder(id)) {
            return;
        }
        event.preventDefault();
        openFolderMenu(id, event.clientX, event.clientY);
    });
    document.addEventListener('click', function (event) {
        const menu = folderMenu();
        if (!menu || menu.style.display === 'none') {
            return;
        }
        if (event.target instanceof Node && menu.contains(event.target)) {
            return;
        }
        closeFolderMenu();
    });
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            closeFolderMenu();
        }
    });
    document.addEventListener('scroll', function () {
        closeFolderMenu();
    }, true);
    document.addEventListener('hidden.bs.modal', function () {
        sidebarEdit = false;
    });
}

function folderMenu(): HTMLElement | null {
    return document.querySelector('.nestedtags-menu');
}

function ensureFolderMenu(): HTMLElement {
    const existing = folderMenu();
    if (existing) {
        return existing;
    }
    const menu = document.createElement('div');
    menu.className = 'nestedtags-menu';
    menu.style.display = 'none';
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.textContent = boot ? boot.edit : 'Edit';
    const sub = document.createElement('button');
    sub.type = 'button';
    sub.textContent = boot ? boot.addSubfolder : 'Add subfolder';
    menu.appendChild(edit);
    menu.appendChild(sub);
    document.body.appendChild(menu);
    edit.addEventListener('click', function () {
        const id = parseInt(menu.getAttribute('data-folder-id') || '', 10);
        closeFolderMenu();
        if (id) {
            openEdit(id);
        }
    });
    sub.addEventListener('click', function () {
        const id = menu.getAttribute('data-folder-id') || '';
        closeFolderMenu();
        openCreate(id);
    });
    return menu;
}

function openFolderMenu(folderId: number, x: number, y: number): void {
    const menu = ensureFolderMenu();
    menu.setAttribute('data-folder-id', String(folderId));
    menu.style.display = 'block';
    menu.style.left = '0px';
    menu.style.top = '0px';
    const rect = menu.getBoundingClientRect();
    const left = Math.max(8, Math.min(x, window.innerWidth - rect.width - 8));
    const top = Math.max(8, Math.min(y, window.innerHeight - rect.height - 8));
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    const items = document.querySelectorAll('#folders li.nestedtags-menu-open');
    for (let i = 0; i < items.length; i++) {
        items[i].classList.remove('nestedtags-menu-open');
    }
    const row = document.querySelector('#folders li[data-folder_id="' + folderId + '"]');
    if (row) {
        row.classList.add('nestedtags-menu-open');
    }
}

function closeFolderMenu(): void {
    const menu = folderMenu();
    if (menu) {
        menu.style.display = 'none';
    }
    const items = document.querySelectorAll('#folders li.nestedtags-menu-open');
    for (let i = 0; i < items.length; i++) {
        items[i].classList.remove('nestedtags-menu-open');
    }
}

function openCreate(parentId: string): void {
    if (!boot || !boot.createUrl) {
        return;
    }
    pendingParent = parentId;
    const title = parentId ? boot.addSubfolder : boot.addFolder;
    showModal({
        remote: boot.createUrl,
        title: title,
        no_footer: true,
        on_show: function (modal) {
            if (window.initNewFolder) {
                window.initNewFolder(modal);
            }
        }
    });
}

function openEdit(folderId: number): void {
    if (!boot || !boot.formUrl) {
        return;
    }
    sidebarEdit = true;
    const title = folderName(folderId) || boot.edit;
    showModal({
        remote: boot.formUrl.replace(/\/0$/, '/' + String(folderId)),
        title: title,
        no_footer: true,
        size: 'lg',
        on_show: function (modal) {
            if (window.initCustomFoldersForm) {
                window.initCustomFoldersForm('.custom-folders-form', 'update');
            }
            const root = modal && modal.length ? modal.get(0) : document;
            injectParents(root || document, parentIdOf(folderId));
        }
    });
}

function bindAdminDrag(): void {
    const index = document.getElementById('custom-folders-index');
    if (!index || index.getAttribute('data-nestedtags-drag') === '1') {
        return;
    }
    index.setAttribute('data-nestedtags-drag', '1');
    if (boot && !document.querySelector('.nestedtags-drag-hint')) {
        const hint = document.createElement('p');
        hint.className = 'text-help nestedtags-drag-hint';
        hint.textContent = boot.dragHint;
        if (index.parentNode) {
            index.parentNode.insertBefore(hint, index);
        }
    }
    const handles = index.querySelectorAll('.handle');
    for (let i = 0; i < handles.length; i++) {
        (handles[i] as HTMLElement).setAttribute('title', boot ? boot.dragHint : '');
    }
    document.addEventListener('dragover', function (event) {
        dragX = event.clientX;
        if (!index.querySelector('.sortable-dragging')) {
            markNest(null);
            return;
        }
        markNest(prospectiveParent(index));
    }, true);
    index.addEventListener('drop', function () {
        dragDropped = true;
    }, true);
    index.addEventListener('sortstart', function (event) {
        const item = sortItem(event);
        dragDropped = false;
        dragTrailer = [];
        dragTrailerDepth = [];
        dragOriginDepth = item ? panelDepth(item) : 0;
        if (!item) {
            return;
        }
        let next = item.nextElementSibling;
        while (next && next.classList.contains('panel') && panelDepth(next as HTMLElement) > dragOriginDepth) {
            dragTrailer.push(next as HTMLElement);
            dragTrailerDepth.push(panelDepth(next as HTMLElement));
            next = next.nextElementSibling;
        }
        const holder = document.createDocumentFragment();
        for (let i = 0; i < dragTrailer.length; i++) {
            holder.appendChild(dragTrailer[i]);
        }
    });
    index.addEventListener('sortstop', function (event) {
        const item = sortItem(event);
        markNest(null);
        if (!item) {
            return;
        }
        let cursor: HTMLElement = item;
        for (let i = 0; i < dragTrailer.length; i++) {
            cursor.insertAdjacentElement('afterend', dragTrailer[i]);
            cursor = dragTrailer[i];
        }
        if (!dragDropped) {
            return;
        }
        applyDragDepth(index, item);
    });
}

function sortItem(event: Event): HTMLElement | null {
    const detail = (event as CustomEvent).detail as { item?: HTMLElement } | undefined;
    const item = detail ? detail.item : null;
    if (!item || !item.classList || !item.classList.contains('panel')) {
        return null;
    }
    return item;
}

function paintAdminOutline(): void {
    const index = document.getElementById('custom-folders-index');
    if (!index) {
        return;
    }
    const panels = directPanels(index);
    const position: Record<number, number> = {};
    for (let i = 0; i < panels.length; i++) {
        position[panelNumericId(panels[i])] = i;
    }
    const children: Record<string, number[]> = {};
    for (let n = 0; n < nodes.length; n++) {
        const key = nodes[n].parent ? String(nodes[n].parent) : '0';
        if (!children[key]) {
            children[key] = [];
        }
        children[key].push(nodes[n].id);
    }
    for (const key in children) {
        if (Object.prototype.hasOwnProperty.call(children, key)) {
            children[key].sort(function (a, b) {
                return (position[a] || 0) - (position[b] || 0);
            });
        }
    }
    const ordered: { id: number; depth: number }[] = [];
    const visit = function (parent: number | null, depth: number): void {
        const key = parent ? String(parent) : '0';
        const kids = children[key] || [];
        for (let i = 0; i < kids.length; i++) {
            ordered.push({ id: kids[i], depth: depth });
            visit(kids[i], depth + 1);
        }
    };
    visit(null, 0);
    for (let i = 0; i < ordered.length; i++) {
        const panel = document.getElementById('folder-' + ordered[i].id);
        if (!panel || panel.parentElement !== index) {
            continue;
        }
        index.appendChild(panel);
        setPanelDepth(panel, ordered[i].depth);
    }
}

function applyDragDepth(index: HTMLElement, item: HTMLElement): void {
    const previous = previousPanel(item);
    let depth = depthFromPointer(index);
    if (!previous) {
        depth = 0;
    }
    const previousDepth = previous ? panelDepth(previous) : 0;
    if (depth > previousDepth + 1) {
        depth = previousDepth + 1;
    }
    const delta = depth - dragOriginDepth;
    setPanelDepth(item, depth);
    for (let i = 0; i < dragTrailer.length; i++) {
        let childDepth = dragTrailerDepth[i] + delta;
        if (childDepth < depth + 1) {
            childDepth = depth + 1;
        }
        setPanelDepth(dragTrailer[i], childDepth);
    }
    const parent = depth === 0 ? null : parentAtDepth(item, depth - 1);
    const id = panelNumericId(item);
    const select = item.querySelector('[name="parent_folder_id"]') as HTMLSelectElement | null;
    if (select) {
        select.value = parent ? String(parent) : '';
    }
    let previousParent: number | null = null;
    let known = false;
    for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].id === id) {
            previousParent = nodes[i].parent;
            known = true;
            nodes[i].parent = parent;
        }
    }
    if (known && previousParent === parent) {
        return;
    }
    if (!boot || !id) {
        return;
    }
    fsAjax({
        action: 'set_parent',
        mailbox_id: mailboxId(),
        folder_id: id,
        parent_folder_id: parent ? String(parent) : ''
    }, boot.url, function (response) {
        if (!response || response.status === 'error') {
            showAjaxResult(response);
            window.location.reload();
        }
    }, true, function () {
        window.location.reload();
    });
}

function parentAtDepth(item: HTMLElement, depth: number): number | null {
    let previous = item.previousElementSibling;
    while (previous) {
        if (previous.classList.contains('panel') && panelDepth(previous as HTMLElement) === depth) {
            return panelNumericId(previous as HTMLElement) || null;
        }
        previous = previous.previousElementSibling;
    }
    return null;
}

function prospectiveParent(index: HTMLElement): HTMLElement | null {
    const placeholder = index.querySelector('.sortable-placeholder');
    if (!placeholder) {
        return null;
    }
    const previous = previousPanel(placeholder);
    if (!previous) {
        return null;
    }
    let depth = depthFromPointer(index);
    if (depth < 1) {
        return null;
    }
    const previousDepth = panelDepth(previous);
    if (depth > previousDepth + 1) {
        depth = previousDepth + 1;
    }
    let cursor: Element | null = previous;
    while (cursor) {
        if (cursor.classList.contains('panel') && panelDepth(cursor as HTMLElement) === depth - 1) {
            return cursor as HTMLElement;
        }
        cursor = cursor.previousElementSibling;
    }
    return null;
}

function depthFromPointer(index: HTMLElement): number {
    const left = index.getBoundingClientRect().left;
    const depth = Math.round((dragX - left - 56) / 28);
    return depth < 0 ? 0 : depth;
}

function previousPanel(start: Element): HTMLElement | null {
    let previous = start.previousElementSibling;
    while (previous) {
        if (previous.classList.contains('panel') && !previous.classList.contains('sortable-dragging') && !previous.classList.contains('sortable-placeholder')) {
            return previous as HTMLElement;
        }
        previous = previous.previousElementSibling;
    }
    return null;
}

function directPanels(index: HTMLElement): HTMLElement[] {
    const panels: HTMLElement[] = [];
    const children = index.children;
    for (let i = 0; i < children.length; i++) {
        const child = children[i] as HTMLElement;
        if (child.classList.contains('panel')) {
            panels.push(child);
        }
    }
    return panels;
}

function setPanelDepth(panel: HTMLElement, depth: number): void {
    panel.setAttribute('data-nestedtags-depth', String(depth));
    panel.style.marginLeft = depth > 0 ? String(depth * 28) + 'px' : '';
}

function panelDepth(panel: HTMLElement): number {
    const depth = parseInt(panel.getAttribute('data-nestedtags-depth') || '0', 10);
    return isNaN(depth) ? 0 : depth;
}

function panelNumericId(panel: HTMLElement): number {
    const id = parseInt(panel.getAttribute('data-folder-id') || '', 10);
    return isNaN(id) ? 0 : id;
}

function markNest(panel: HTMLElement | null): void {
    if (nestMark && nestMark !== panel) {
        nestMark.classList.remove('nestedtags-nest-target');
    }
    nestMark = panel;
    if (panel) {
        panel.classList.add('nestedtags-nest-target');
    }
}

function folderItems(parent: Element): HTMLElement[] {
    const out: HTMLElement[] = [];
    const kids = parent.children;
    for (let i = 0; i < kids.length; i++) {
        const child = kids[i];
        if (child instanceof HTMLElement && child.hasAttribute('data-folder_id')) {
            out.push(child);
        }
    }
    return out;
}

function placeAt(parent: Element, item: HTMLElement, index: number): boolean {
    const others: HTMLElement[] = [];
    const kids = parent.children;
    for (let i = 0; i < kids.length; i++) {
        const child = kids[i];
        if (child instanceof HTMLElement && child.hasAttribute('data-folder_id') && child !== item) {
            others.push(child);
        }
    }
    const anchor = index < others.length ? others[index] : null;
    if (item.parentNode === parent) {
        let next: Element | null = item.nextElementSibling;
        let nextFolder: HTMLElement | null = null;
        while (next) {
            if (next instanceof HTMLElement && next.hasAttribute('data-folder_id')) {
                nextFolder = next;
                break;
            }
            next = next.nextElementSibling;
        }
        if (nextFolder === anchor) {
            return false;
        }
    }
    if (anchor) {
        parent.insertBefore(item, anchor);
    } else {
        parent.appendChild(item);
    }
    return true;
}

function nestSidebar(): void {
    const root = document.querySelector('#folders');
    if (!root) {
        return;
    }
    const byId: Record<number, HTMLElement> = {};
    const items = root.querySelectorAll('li[data-folder_id]');
    for (let i = 0; i < items.length; i++) {
        const item = items[i] as HTMLElement;
        const id = parseInt(item.getAttribute('data-folder_id') || '', 10);
        if (id) {
            byId[id] = item;
        }
    }
    const seen: Record<number, number> = {};
    for (let n = 0; n < nodes.length; n++) {
        const node = nodes[n];
        if (!node.parent) {
            continue;
        }
        const item = byId[node.id];
        const parentItem = byId[node.parent];
        if (!item || !parentItem) {
            continue;
        }
        let list = parentItem.querySelector(':scope > ul.nestedtags-children') as HTMLElement | null;
        if (!list) {
            list = document.createElement('ul');
            list.className = 'nestedtags-children';
            parentItem.appendChild(list);
        }
        const index = seen[node.parent] || 0;
        seen[node.parent] = index + 1;
        placeAt(list, item, index);
    }
    const tops = root.querySelectorAll(':scope > li[data-folder_id]');
    for (let i = 0; i < tops.length; i++) {
        markSidebarDepth(tops[i] as HTMLElement, 0);
    }
    applyCollapse(root);
}

function markSidebarDepth(item: HTMLElement, depth: number): void {
    item.setAttribute('data-nestedtags-depth', String(depth));
    if (depth > 0) {
        item.classList.add('nestedtags-child');
    } else {
        item.classList.remove('nestedtags-child');
    }
    const list = item.querySelector(':scope > ul.nestedtags-children');
    if (!list) {
        return;
    }
    const children = list.querySelectorAll(':scope > li[data-folder_id]');
    for (let i = 0; i < children.length; i++) {
        markSidebarDepth(children[i] as HTMLElement, depth + 1);
    }
}

function applyCollapse(root: Element): void {
    const key = 'nestedtags.collapse.' + mailboxId();
    let closed: number[] = [];
    try {
        const stored = localStorage.getItem(key);
        const parsed = stored ? JSON.parse(stored) : [];
        if (parsed && parsed.length !== undefined) {
            closed = parsed;
        }
    } catch (e) {
        closed = [];
    }
    const parents = root.querySelectorAll('li[data-folder_id]');
    for (let i = 0; i < parents.length; i++) {
        const item = parents[i] as HTMLElement;
        const list = item.querySelector(':scope > ul.nestedtags-children');
        if (!list) {
            continue;
        }
        const id = parseInt(item.getAttribute('data-folder_id') || '', 10);
        const isClosed = closed.indexOf(id) !== -1;
        if (isClosed) {
            item.classList.add('nestedtags-collapsed');
        } else {
            item.classList.remove('nestedtags-collapsed');
        }
        const link = item.querySelector(':scope > a');
        if (!link) {
            continue;
        }
        let toggle = link.querySelector('.nestedtags-toggle') as HTMLButtonElement | null;
        if (!toggle) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'nestedtags-toggle';
            button.addEventListener('click', function (event) {
                event.preventDefault();
                event.stopPropagation();
                item.classList.toggle('nestedtags-collapsed');
                const collapsed = item.classList.contains('nestedtags-collapsed');
                remember(key, id, collapsed);
                button.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
                button.textContent = collapsed ? '\u25b8' : '\u25be';
            });
            link.insertBefore(button, link.firstChild);
            toggle = button;
        }
        toggle.textContent = item.classList.contains('nestedtags-collapsed') ? '\u25b8' : '\u25be';
        toggle.setAttribute('aria-expanded', isClosed ? 'false' : 'true');
    }
}

function remember(key: string, id: number, collapsed: boolean): void {
    let closed: number[] = [];
    try {
        const stored = localStorage.getItem(key);
        const parsed = stored ? JSON.parse(stored) : [];
        if (parsed && parsed.length !== undefined) {
            closed = parsed;
        }
    } catch (e) {
        closed = [];
    }
    const next: number[] = [];
    for (let i = 0; i < closed.length; i++) {
        if (closed[i] !== id) {
            next.push(closed[i]);
        }
    }
    if (collapsed) {
        next.push(id);
    }
    localStorage.setItem(key, JSON.stringify(next));
}

function paintTags(): void {
    const chips = document.querySelectorAll('.tag-name');
    for (let i = 0; i < chips.length; i++) {
        const chip = chips[i] as HTMLElement;
        const raw = chip.getAttribute('data-nestedtags-tag') || (chip.textContent || '').trim();
        chip.setAttribute('data-nestedtags-tag', raw);
        const path = paths[raw.toLowerCase()];
        if (path) {
            chip.textContent = path;
        }
    }
}

function paintPicker(): void {
    const selects = document.querySelectorAll('select[name="tag_name"], select.tag-input');
    for (let s = 0; s < selects.length; s++) {
        const select = selects[s] as HTMLSelectElement;
        const options = select.querySelectorAll('option');
        for (let o = 0; o < options.length; o++) {
            const option = options[o];
            const value = option.value;
            if (!value || option.getAttribute('data-nestedtags-label')) {
                continue;
            }
            const match = folderForTag(value);
            if (!match) {
                continue;
            }
            option.setAttribute('data-nestedtags-label', '1');
            option.textContent = indent(depthOf(match.id)) + match.name;
        }
    }
}

function folderForTag(tag: string): NestedNode | null {
    let found: NestedNode | null = null;
    const needle = tag.toLowerCase();
    for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].tag.toLowerCase() !== needle) {
            continue;
        }
        if (found) {
            return null;
        }
        found = nodes[i];
    }
    return found;
}

function pointerIsFine(): boolean {
    return window.matchMedia('(pointer: fine)').matches;
}

function folderRoot(): HTMLElement | null {
    const root = document.getElementById('folders');
    if (!root || root.classList.contains('chats')) {
        return null;
    }
    return root;
}

function canDragFolders(): boolean {
    return !!(boot && boot.canEdit && pointerIsFine() && folderRoot());
}

function prepareFolderDrag(): void {
    const root = document.getElementById('folders');
    if (!root) {
        return;
    }
    const allow = canDragFolders();
    const items = root.querySelectorAll('li[data-folder_id]');
    for (let i = 0; i < items.length; i++) {
        const item = items[i] as HTMLElement;
        const id = parseInt(item.getAttribute('data-folder_id') || '', 10);
        const links = item.querySelectorAll('a, button');
        for (let j = 0; j < links.length; j++) {
            (links[j] as HTMLElement).setAttribute('draggable', 'false');
        }
        if (allow && isCustomFolder(id)) {
            item.setAttribute('draggable', 'true');
        } else {
            item.removeAttribute('draggable');
        }
    }
}

function bindFolderDrag(): void {
    if (folderDragBound) {
        return;
    }
    folderDragBound = true;
    document.addEventListener('pointerdown', rememberFolderPress, true);
    document.addEventListener('mousedown', rememberFolderPress, true);
    document.addEventListener('dragstart', onFolderDragStart, true);
    document.addEventListener('dragover', onFolderDragOver);
    document.addEventListener('drop', onFolderDrop);
    document.addEventListener('dragend', clearFolderDrag);
    const fine = window.matchMedia('(pointer: fine)');
    if (typeof fine.addEventListener === 'function') {
        fine.addEventListener('change', prepareFolderDrag);
    }
}

function bindLiveFolders(): void {
    tunePolling();
    $(function () {
        tunePolling();
        if (folderChannelOn) {
            return;
        }
        const root = document.getElementById('folders');
        if (!root || root.classList.contains('chats')) {
            return;
        }
        const id = mailboxId();
        if (!id || typeof poly === 'undefined' || !poly) {
            return;
        }
        folderChannelOn = true;
        document.addEventListener('dragstart', noteConversationDrag);
        document.addEventListener('dragend', releaseFolderList);
        const channel = poly.subscribe('nestedtags.folders.' + String(id));
        channel.on('Modules\\NestedTags\\Events\\FolderSidebarRefresh', function (data, envelope) {
            acceptFolderList(id, data, folderEventId(envelope));
        });
    });
}

function tunePolling(): void {
    if (typeof poly === 'undefined' || !poly || !poly.options) {
        return;
    }
    poly.options.polling = 1;
}

function noteConversationDrag(event: DragEvent): void {
    if (event.defaultPrevented) {
        return;
    }
    const target = event.target;
    if (!(target instanceof Element)) {
        return;
    }
    if (target.closest('#folders li[data-folder_id]')) {
        return;
    }
    if (target.closest('tr.conv-row, li.chat-item')) {
        conversationDrag = true;
    }
}

function folderEventId(envelope: PolycastEnvelope | undefined): number {
    if (!envelope || envelope.id === undefined || envelope.id === null) {
        return 0;
    }
    const id = Number(envelope.id);
    return id > 0 ? id : 0;
}

function acceptFolderList(id: number, data: FolderSidebarPayload, eventId: number): void {
    if (!data || Number(data.mailbox_id) !== id || typeof data.folders_html !== 'string' || data.folders_html === '') {
        return;
    }
    const root = document.getElementById('folders');
    if (!root || root.classList.contains('chats')) {
        return;
    }
    if (eventId > 0 && eventId < lastFolderEventId) {
        return;
    }
    const known = Object.prototype.hasOwnProperty.call(data, 'icons')
        && data.icons != null
        && typeof data.icons === 'object';
    const icons = known ? data.icons as Record<string, FolderSidebarIcon> : {};
    const revision = Number(data.icon_revision || 0);
    if (folderDragId !== 0 || conversationDrag) {
        pendingFolderHtml = data.folders_html;
        pendingFolderIconsKnown = known;
        pendingFolderIcons = known ? icons : null;
        pendingFolderRevision = revision;
    } else {
        replaceFolderList(data.folders_html, known, icons, revision);
    }
    if (eventId > 0) {
        lastFolderEventId = eventId;
    }
}

function releaseFolderList(): void {
    conversationDrag = false;
    const html = pendingFolderHtml;
    const icons = pendingFolderIcons;
    if (!html) {
        return;
    }
    pendingFolderHtml = '';
    pendingFolderIcons = null;
    const known = pendingFolderIconsKnown;
    const revision = pendingFolderRevision;
    pendingFolderIconsKnown = false;
    pendingFolderRevision = 0;
    replaceFolderList(html, known, icons || {}, revision);
}

interface FolderRow {
    id: number;
    element: HTMLElement;
}

function parseFolderRows(html: string): FolderRow[] {
    const holder = document.createElement('div');
    holder.innerHTML = html;
    const items = holder.querySelectorAll(':scope > li[data-folder_id]');
    const rows: FolderRow[] = [];
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!(item instanceof HTMLElement)) {
            continue;
        }
        const id = parseInt(item.getAttribute('data-folder_id') || '', 10);
        if (id) {
            rows.push({ id: id, element: item });
        }
    }
    return rows;
}

function folderFact(item: Element): string {
    const link = item.querySelector(':scope > a');
    const nameNode = link ? link.querySelector(':scope > .folder-name') : null;
    const name = nameNode ? (nameNode.textContent || '').replace(/\s+/g, ' ').trim() : '';
    const countNode = link ? link.querySelector(':scope > .active-count') : null;
    const count = countNode ? (countNode.textContent || '').replace(/\s+/g, '') : '';
    const active = item.getAttribute('data-active-count') || '';
    const quiet = link && link.classList.contains('no-active') ? '1' : '0';
    return name + '\t' + count + '\t' + active + '\t' + quiet;
}

function sameContent(root: HTMLElement, rows: FolderRow[]): boolean {
    const live = root.querySelectorAll('li[data-folder_id]');
    if (live.length !== rows.length) {
        return false;
    }
    const byId: Record<number, string> = {};
    for (let i = 0; i < live.length; i++) {
        const id = parseInt(live[i].getAttribute('data-folder_id') || '', 10);
        if (id) {
            byId[id] = folderFact(live[i]);
        }
    }
    for (let i = 0; i < rows.length; i++) {
        if (byId[rows[i].id] !== folderFact(rows[i].element)) {
            return false;
        }
    }
    return true;
}

function parentOfNodes(nodeList: NestedNode[]): Record<number, number> {
    const parentOf: Record<number, number> = {};
    for (let i = 0; i < nodeList.length; i++) {
        if (nodeList[i].parent) {
            parentOf[nodeList[i].id] = nodeList[i].parent as number;
        }
    }
    return parentOf;
}

function visibleIds(rows: FolderRow[]): Record<number, boolean> {
    const ids: Record<number, boolean> = {};
    for (let i = 0; i < rows.length; i++) {
        ids[rows[i].id] = true;
    }
    return ids;
}

function desiredTopIds(rows: FolderRow[], nodeList: NestedNode[]): number[] {
    const parentOf = parentOfNodes(nodeList);
    const visible = visibleIds(rows);
    const ids: number[] = [];
    for (let i = 0; i < rows.length; i++) {
        const parent = parentOf[rows[i].id];
        if (!parent || !visible[parent]) {
            ids.push(rows[i].id);
        }
    }
    return ids;
}

function nodeChildLists(rows: FolderRow[], nodeList: NestedNode[]): Record<string, number[]> {
    const visible = visibleIds(rows);
    const lists: Record<string, number[]> = {};
    for (let i = 0; i < nodeList.length; i++) {
        const node = nodeList[i];
        if (!node.parent || !visible[node.id] || !visible[node.parent]) {
            continue;
        }
        const key = String(node.parent);
        if (!lists[key]) {
            lists[key] = [];
        }
        lists[key].push(node.id);
    }
    return lists;
}

function domChildLists(root: HTMLElement): Record<string, number[]> {
    const lists = folderLists(root);
    delete lists['0'];
    return lists;
}

function sameLists(left: Record<string, number[]>, right: Record<string, number[]>): boolean {
    const keys = Object.keys(left);
    if (keys.length !== Object.keys(right).length) {
        return false;
    }
    for (let i = 0; i < keys.length; i++) {
        const a = left[keys[i]];
        const b = right[keys[i]];
        if (!b || a.length !== b.length) {
            return false;
        }
        for (let j = 0; j < a.length; j++) {
            if (a[j] !== b[j]) {
                return false;
            }
        }
    }
    return true;
}

function sidebarMatches(root: HTMLElement, rows: FolderRow[], nodeList: NestedNode[]): boolean {
    if (!sameContent(root, rows)) {
        return false;
    }
    const top = folderItems(root);
    const wanted = desiredTopIds(rows, nodeList);
    if (top.length !== wanted.length) {
        return false;
    }
    for (let i = 0; i < wanted.length; i++) {
        const id = parseInt(top[i].getAttribute('data-folder_id') || '', 10);
        if (id !== wanted[i]) {
            return false;
        }
    }
    return sameLists(domChildLists(root), nodeChildLists(rows, nodeList));
}

function patchFolderContent(live: HTMLElement, fresh: HTMLElement): void {
    const liveLink = live.querySelector(':scope > a');
    const freshLink = fresh.querySelector(':scope > a');
    if (!liveLink || !freshLink) {
        return;
    }
    const liveName = liveLink.querySelector(':scope > .folder-name');
    const freshName = freshLink.querySelector(':scope > .folder-name');
    if (liveName && freshName) {
        const next = (freshName.textContent || '').replace(/\s+/g, ' ').trim();
        const current = (liveName.textContent || '').replace(/\s+/g, ' ').trim();
        if (current !== next) {
            liveName.textContent = next;
        }
    }
    const nextActive = fresh.getAttribute('data-active-count') || '';
    if ((live.getAttribute('data-active-count') || '') !== nextActive) {
        live.setAttribute('data-active-count', nextActive);
    }
    const quiet = freshLink.classList.contains('no-active');
    if (liveLink.classList.contains('no-active') !== quiet) {
        if (quiet) {
            liveLink.classList.add('no-active');
        } else {
            liveLink.classList.remove('no-active');
        }
    }
    const liveCount = liveLink.querySelector(':scope > .active-count');
    const freshCount = freshLink.querySelector(':scope > .active-count');
    const liveText = liveCount ? (liveCount.textContent || '').replace(/\s+/g, '') : '';
    const freshText = freshCount ? (freshCount.textContent || '').replace(/\s+/g, '') : '';
    if (liveText !== freshText) {
        if (liveCount && liveCount.parentNode) {
            liveCount.parentNode.removeChild(liveCount);
        }
        if (freshCount) {
            liveLink.appendChild(freshCount);
        }
    }
}

function childListOf(parentLi: HTMLElement): HTMLElement {
    let list = parentLi.querySelector(':scope > ul.nestedtags-children') as HTMLElement | null;
    if (!list) {
        list = document.createElement('ul');
        list.className = 'nestedtags-children';
        parentLi.appendChild(list);
    }
    return list;
}

function clearEmptyChildLists(root: HTMLElement): boolean {
    let removed = false;
    const lists = root.querySelectorAll('ul.nestedtags-children');
    for (let i = lists.length - 1; i >= 0; i--) {
        const list = lists[i];
        if (list.querySelector(':scope > li[data-folder_id]')) {
            continue;
        }
        const parent = list.parentElement;
        if (parent) {
            const toggle = parent.querySelector(':scope > a .nestedtags-toggle');
            if (toggle && toggle.parentNode) {
                toggle.parentNode.removeChild(toggle);
            }
            parent.classList.remove('nestedtags-collapsed');
        }
        if (list.parentNode) {
            list.parentNode.removeChild(list);
            removed = true;
        }
    }
    return removed;
}

function syncSidebar(root: HTMLElement, rows: FolderRow[], nodeList: NestedNode[]): boolean {
    let structure = false;
    const byId: Record<number, HTMLElement> = {};
    const live = root.querySelectorAll('li[data-folder_id]');
    for (let i = 0; i < live.length; i++) {
        const item = live[i] as HTMLElement;
        const id = parseInt(item.getAttribute('data-folder_id') || '', 10);
        if (id) {
            byId[id] = item;
        }
    }
    const wanted: Record<number, boolean> = {};
    for (let i = 0; i < rows.length; i++) {
        wanted[rows[i].id] = true;
        const item = byId[rows[i].id];
        if (!item) {
            rows[i].element.classList.remove('active');
            byId[rows[i].id] = rows[i].element;
            structure = true;
            continue;
        }
        patchFolderContent(item, rows[i].element);
    }
    const ids = Object.keys(byId);
    for (let i = 0; i < ids.length; i++) {
        const id = Number(ids[i]);
        if (wanted[id]) {
            continue;
        }
        const item = byId[id];
        if (item.parentNode) {
            item.parentNode.removeChild(item);
        }
        delete byId[id];
        structure = true;
    }
    const top = desiredTopIds(rows, nodeList);
    for (let i = 0; i < top.length; i++) {
        const item = byId[top[i]];
        if (item && placeAt(root, item, i)) {
            structure = true;
        }
    }
    const children = nodeChildLists(rows, nodeList);
    const parents = Object.keys(children);
    for (let p = 0; p < parents.length; p++) {
        const parentLi = byId[Number(parents[p])];
        if (!parentLi) {
            continue;
        }
        const list = childListOf(parentLi);
        const kids = children[parents[p]];
        for (let i = 0; i < kids.length; i++) {
            const item = byId[kids[i]];
            if (item && placeAt(list, item, i)) {
                structure = true;
            }
        }
    }
    if (clearEmptyChildLists(root)) {
        structure = true;
    }
    return structure;
}

function finishSidebarStructure(root: HTMLElement): void {
    const tops = root.querySelectorAll(':scope > li[data-folder_id]');
    for (let i = 0; i < tops.length; i++) {
        markSidebarDepth(tops[i] as HTMLElement, 0);
    }
    applyCollapse(root);
    paintManage();
    prepareFolderDrag();
    paintTags();
    paintPicker();
    injectParents(document, '');
}

function replaceFolderList(html: string, iconsKnown: boolean, icons: Record<string, FolderSidebarIcon>, revision: number): void {
    const root = document.getElementById('folders');
    if (!root || root.classList.contains('chats')) {
        return;
    }
    if (iconsKnown) {
        document.dispatchEvent(new CustomEvent('nestedtags:folder-icons', {
            detail: { icons: icons, revision: revision }
        }));
    }
    const rows = parseFolderRows(html);
    const epoch = folderEpoch;
    const token = ++folderSyncToken;
    const currentReply = function (): boolean {
        return token === folderSyncToken && epoch === folderEpoch;
    };
    loadTree(mailboxId(), function () {
        if (!currentReply()) {
            return;
        }
        const current = document.getElementById('folders');
        if (!current || current.classList.contains('chats')) {
            return;
        }
        if (sidebarMatches(current, rows, nodes)) {
            return;
        }
        if (syncSidebar(current, rows, nodes)) {
            finishSidebarStructure(current);
            return;
        }
        refreshFolderLabels();
    }, currentReply);
}

function folderPressOnControl(target: EventTarget | null): boolean {
    return target instanceof Element
        && !!target.closest('.nestedtags-toggle, .nestedtags-more, .nestedtags-menu');
}

function rememberFolderPress(event: Event): void {
    folderPressBlocked = folderPressOnControl(event.target);
}

function onFolderDragStart(event: DragEvent): void {
    const target = event.target;
    const pressedControl = folderPressBlocked;
    folderPressBlocked = false;
    if (!(target instanceof Element)) {
        return;
    }
    if (pressedControl || folderPressOnControl(target)) {
        event.preventDefault();
        return;
    }
    const item = target.closest('#folders li[data-folder_id]');
    if (!(item instanceof HTMLElement)) {
        return;
    }
    const id = parseInt(item.getAttribute('data-folder_id') || '', 10);
    if (!canDragFolders() || !isCustomFolder(id) || item.getAttribute('draggable') !== 'true') {
        event.preventDefault();
        return;
    }
    if (folderDragId) {
        event.preventDefault();
        return;
    }
    folderDragId = id;
    if (!event.dataTransfer) {
        return;
    }
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/x-nestedtags-folder', String(id));
    event.dataTransfer.setData('text/plain', 'folder:' + String(id));
    const chip = document.createElement('div');
    chip.className = 'nestedtags-drag-chip';
    let label = folderName(id) || (boot && boot.folder) || 'Folder';
    if (label.length > 48) {
        label = label.slice(0, 47) + '\u2026';
    }
    chip.textContent = label;
    document.body.appendChild(chip);
    folderDragChip = chip;
    event.dataTransfer.setDragImage(chip, 14, chip.offsetHeight + 12);
}

interface FolderHit {
    mode: string;
    item: HTMLElement;
    parentId: string;
    beforeId: string;
}

function onFolderDragOver(event: DragEvent): void {
    if (!folderDragId) {
        return;
    }
    const hit = folderHit(event);
    folderLiveHit = hit;
    if (!hit) {
        clearFolderMarks();
        folderDropKey = '';
        return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
    }
    const key = hit.mode + ':' + hit.parentId + ':' + hit.beforeId + ':' + (hit.item.getAttribute('data-folder_id') || '');
    if (key === folderDropKey) {
        return;
    }
    folderDropKey = key;
    clearFolderMarks();
    if (hit.mode === 'nest') {
        hit.item.classList.add('nestedtags-drop-on');
        return;
    }
    const line = document.createElement('li');
    line.className = 'nestedtags-drop-line';
    line.setAttribute('aria-hidden', 'true');
    hit.item.insertAdjacentElement(hit.mode === 'before' ? 'beforebegin' : 'afterend', line);
    folderDropLine = line;
}

function onFolderDrop(event: DragEvent): void {
    if (!folderDragId || !boot) {
        return;
    }
    const hit = folderLiveHit;
    const moved = folderDragId;
    const openParent = hit && hit.mode === 'nest' && hit.item.classList.contains('nestedtags-collapsed');
    clearFolderDrag();
    if (!hit) {
        return;
    }
    event.preventDefault();
    fsAjax({
        action: 'set_parent',
        mailbox_id: mailboxId(),
        folder_id: moved,
        parent_folder_id: hit.parentId,
        before_folder_id: hit.beforeId
    }, boot.url, function (response) {
        if (!response || response.status === 'error') {
            showAjaxResult(response);
            window.location.reload();
            return;
        }
        if (openParent) {
            remember('nestedtags.collapse.' + mailboxId(), parseInt(hit.parentId, 10), false);
        }
        applyFolderMove(moved, hit.parentId, hit.beforeId);
    }, true, function () {
        window.location.reload();
    });
}

function folderHit(event: DragEvent): FolderHit | null {
    const target = event.target;
    if (!(target instanceof Element) || !folderDragId) {
        return null;
    }
    const item = target.closest('#folders li[data-folder_id]');
    if (!(item instanceof HTMLElement)) {
        return null;
    }
    const id = parseInt(item.getAttribute('data-folder_id') || '', 10);
    if (!isCustomFolder(id) || id === folderDragId || isUnderFolder(id, folderDragId)) {
        return null;
    }
    const row = item.querySelector(':scope > a');
    if (!(row instanceof HTMLElement)) {
        return null;
    }
    const rect = row.getBoundingClientRect();
    if (event.clientY < rect.top || event.clientY > rect.bottom) {
        return null;
    }
    const height = rect.bottom - rect.top;
    const band = Math.max(6, Math.min(12, height * 0.28));
    if (event.clientY >= rect.top + band && event.clientY <= rect.bottom - band) {
        return { mode: 'nest', item: item, parentId: String(id), beforeId: '' };
    }
    const before = event.clientY < rect.top + band;
    let beforeId = '';
    if (before) {
        beforeId = String(id);
    } else {
        const next = nextCustomSibling(item);
        beforeId = next ? (next.getAttribute('data-folder_id') || '') : '';
    }
    if (beforeId === String(folderDragId)) {
        beforeId = '';
    }
    return {
        mode: before ? 'before' : 'after',
        item: item,
        parentId: parentIdOf(id),
        beforeId: beforeId
    };
}

function isUnderFolder(id: number, ancestor: number): boolean {
    const seen: Record<number, boolean> = {};
    let cursor = id;
    while (cursor && !seen[cursor]) {
        seen[cursor] = true;
        const parent = parentIdOf(cursor);
        if (!parent) {
            return false;
        }
        const parentId = parseInt(parent, 10);
        if (parentId === ancestor) {
            return true;
        }
        cursor = parentId;
    }
    return false;
}

function nextCustomSibling(item: HTMLElement): HTMLElement | null {
    let next = item.nextElementSibling;
    while (next) {
        if (next instanceof HTMLElement && next.classList.contains('nestedtags-drop-line')) {
            next = next.nextElementSibling;
            continue;
        }
        if (next instanceof HTMLElement && next.hasAttribute('data-folder_id')) {
            const id = parseInt(next.getAttribute('data-folder_id') || '', 10);
            if (id && id !== folderDragId && isCustomFolder(id)) {
                return next;
            }
        }
        next = next.nextElementSibling;
    }
    return null;
}

function clearFolderMarks(): void {
    const marked = document.querySelectorAll('#folders li.nestedtags-drop-on');
    for (let i = 0; i < marked.length; i++) {
        marked[i].classList.remove('nestedtags-drop-on');
    }
    if (folderDropLine && folderDropLine.parentNode) {
        folderDropLine.parentNode.removeChild(folderDropLine);
    }
    folderDropLine = null;
    const lines = document.querySelectorAll('.nestedtags-drop-line');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const parent = line.parentNode;
        if (parent) {
            parent.removeChild(line);
        }
    }
}

function clearFolderDrag(): void {
    folderDragId = 0;
    folderDropKey = '';
    folderLiveHit = null;
    clearFolderMarks();
    if (folderDragChip && folderDragChip.parentNode) {
        folderDragChip.parentNode.removeChild(folderDragChip);
    }
    folderDragChip = null;
}

function applyFolderMove(movedId: number, parentRaw: string, beforeRaw: string): void {
    folderEpoch++;
    const root = folderRoot();
    if (!root) {
        window.location.reload();
        return;
    }
    const lists = folderLists(root);
    const parentKey = parentRaw ? parentRaw : '0';
    const beforeId = beforeRaw ? parseInt(beforeRaw, 10) : 0;
    relocateFolder(lists, movedId, parentKey, beforeId);
    for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].id === movedId) {
            nodes[i].parent = parentKey === '0' ? null : parseInt(parentKey, 10);
        }
    }
    orderNodes(lists);
    placeTopLevel(root, lists['0'] || []);
    nestSidebar();
    paintManage();
    prepareFolderDrag();
}

function folderLists(root: HTMLElement): Record<string, number[]> {
    const lists: Record<string, number[]> = { '0': [] };
    const tops = root.querySelectorAll(':scope > li[data-folder_id]');
    for (let i = 0; i < tops.length; i++) {
        const item = tops[i] as HTMLElement;
        const id = parseInt(item.getAttribute('data-folder_id') || '', 10);
        if (!isCustomFolder(id)) {
            continue;
        }
        lists['0'].push(id);
        collectNestedFolders(item, lists);
    }
    return lists;
}

function collectNestedFolders(item: HTMLElement, lists: Record<string, number[]>): void {
    const id = parseInt(item.getAttribute('data-folder_id') || '', 10);
    const list = item.querySelector(':scope > ul.nestedtags-children');
    if (!list || !id) {
        return;
    }
    const key = String(id);
    lists[key] = [];
    const kids = list.querySelectorAll(':scope > li[data-folder_id]');
    for (let i = 0; i < kids.length; i++) {
        const child = kids[i] as HTMLElement;
        const childId = parseInt(child.getAttribute('data-folder_id') || '', 10);
        if (!childId) {
            continue;
        }
        lists[key].push(childId);
        collectNestedFolders(child, lists);
    }
}

function relocateFolder(lists: Record<string, number[]>, moved: number, parentKey: string, beforeId: number): void {
    const keys = Object.keys(lists);
    for (let i = 0; i < keys.length; i++) {
        const kept: number[] = [];
        const kids = lists[keys[i]];
        for (let j = 0; j < kids.length; j++) {
            if (kids[j] !== moved) {
                kept.push(kids[j]);
            }
        }
        lists[keys[i]] = kept;
    }
    if (!lists[parentKey]) {
        lists[parentKey] = [];
    }
    const siblings = lists[parentKey];
    let index = siblings.length;
    if (beforeId) {
        for (let i = 0; i < siblings.length; i++) {
            if (siblings[i] === beforeId) {
                index = i;
                break;
            }
        }
    }
    siblings.splice(index, 0, moved);
}

function orderNodes(lists: Record<string, number[]>): void {
    const rank: Record<number, number> = {};
    let next = 1;
    const visit = function (key: string): void {
        const kids = lists[key] || [];
        for (let i = 0; i < kids.length; i++) {
            rank[kids[i]] = next;
            next++;
            visit(String(kids[i]));
        }
    };
    visit('0');
    nodes.sort(function (a, b) {
        return (rank[a.id] || 0) - (rank[b.id] || 0);
    });
}

function placeTopLevel(root: HTMLElement, ids: number[]): void {
    if (!ids.length) {
        return;
    }
    const kids = folderItems(root);
    let start = kids.length;
    for (let i = 0; i < kids.length; i++) {
        const id = parseInt(kids[i].getAttribute('data-folder_id') || '', 10);
        if (isCustomFolder(id)) {
            start = i;
            break;
        }
    }
    for (let i = 0; i < ids.length; i++) {
        const el = root.querySelector('li[data-folder_id="' + ids[i] + '"]');
        if (el instanceof HTMLElement) {
            placeAt(root, el, start + i);
        }
    }
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

window.nestedtagsStart = nestedtagsStart;
