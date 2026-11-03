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

function loadTree(id: number, done: () => void): void {
    if (!boot || !id) {
        done();
        return;
    }
    fsAjax({ action: 'tree', mailbox_id: id }, boot.url, function (response) {
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
            if (previous) {
                previous(data);
            }
            if (data && data.status === 'success') {
                window.location.reload();
            }
        };
    });
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
        button.className = 'nestedtags-more';
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
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'nestedtags-add';
    const plus = document.createElement('i');
    plus.className = 'glyphicon glyphicon-plus';
    plus.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.textContent = boot.addFolder;
    button.appendChild(plus);
    button.appendChild(label);
    button.addEventListener('click', function () {
        openCreate('');
    });
    root.insertAdjacentElement('afterend', button);
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
    for (let n = 0; n < nodes.length; n++) {
        const node = nodes[n];
        const item = byId[node.id];
        const parentItem = node.parent ? byId[node.parent] : null;
        if (!item || !parentItem) {
            continue;
        }
        let list = parentItem.querySelector(':scope > ul.nestedtags-children') as HTMLElement | null;
        if (!list) {
            list = document.createElement('ul');
            list.className = 'nestedtags-children';
            parentItem.appendChild(list);
        }
        if (item.parentElement !== list) {
            list.appendChild(item);
        }
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

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

window.nestedtagsStart = nestedtagsStart;
