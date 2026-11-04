"use strict";
/**
 * NestedTags browser surface. Compiled to Public/js/module.js.
 */
var boot = null;
var nodes = [];
var paths = {};
var pendingParent = '';
var fromSublabel = false;
var dragX = 0;
var dragDropped = false;
var dragTrailer = [];
var dragTrailerDepth = [];
var dragOriginDepth = 0;
var nestMark = null;
var sidebarEdit = false;
var menuBound = false;
var folderDragBound = false;
var folderDragId = 0;
var folderPressBlocked = false;
var folderDragChip = null;
var folderDropKey = '';
var folderDropLine = null;
var folderLiveHit = null;
var pendingFolderHtml = '';
var pendingFolderIcons = null;
var pendingFolderIconsKnown = false;
var pendingFolderRevision = 0;
var lastFolderEventId = 0;
var conversationDrag = false;
var folderChannelOn = false;
var folderSyncToken = 0;
var folderEpoch = 0;
function nestedtagsStart(config) {
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
function mailboxId() {
    if (boot && boot.mailboxId) {
        return boot.mailboxId;
    }
    var raw = getGlobalAttr('mailbox_id');
    var parsed = parseInt(raw, 10);
    return isNaN(parsed) ? 0 : parsed;
}
function loadTree(id, done, accept) {
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
function fieldsOf(data) {
    var out = {};
    if (typeof data === 'string') {
        var params = new URLSearchParams(data);
        params.forEach(function (value, key) {
            out[key] = value;
        });
        return out;
    }
    if (data) {
        for (var key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                var value = data[key];
                if (typeof value === 'string' || typeof value === 'number') {
                    out[key] = String(value);
                }
            }
        }
    }
    return out;
}
function bindSave() {
    $.ajaxPrefilter(function (options) {
        if (!boot || !options.url || options.url.indexOf('custom-folders/ajax') === -1) {
            return;
        }
        var fields = fieldsOf(options.data);
        if (fields.action !== 'create' && fields.action !== 'update') {
            return;
        }
        if (!Object.prototype.hasOwnProperty.call(fields, 'parent_folder_id')) {
            return;
        }
        var previous = options.success;
        options.success = function (data) {
            var finish = function () {
                if (previous) {
                    previous(data);
                }
            };
            var id = data && data.id ? Number(data.id) : 0;
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
function bindDelete() {
    document.addEventListener('click', function (event) {
        var target = event.target;
        if (!target || !target.closest) {
            return;
        }
        var button = target.closest('.folder-delete-trigger');
        if (!button || !boot) {
            return;
        }
        if (button.getAttribute('data-nestedtags-pass') === '1') {
            button.removeAttribute('data-nestedtags-pass');
            return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        var id = button.getAttribute('data-folder_id') || '';
        fsAjax({
            action: 'child_names',
            folder_id: id,
            mailbox_id: mailboxId()
        }, boot.url, function (response) {
            var names = response && response.names ? response.names : [];
            if (!names.length) {
                if (document.getElementById('custom-folders-index')) {
                    button.setAttribute('data-nestedtags-pass', '1');
                    button.click();
                    return;
                }
                confirmDeleteFolder(id);
                return;
            }
            var lines = names.map(escapeHtml).join('<br>');
            var confirmText = (boot ? boot.confirm : '') + '<br>' + lines;
            var deleteLabel = boot ? boot.deleteLabel : 'Delete';
            showModalConfirm(confirmText, 'nestedtags-delete-ok', {
                on_show: function (modal) {
                    modal.children().find('.nestedtags-delete-ok:first').click(function () {
                        modal.modal('hide');
                        if (!boot) {
                            return;
                        }
                        var foldersUrl = typeof laroute !== 'undefined' ? laroute.route('mailboxes.custom_folders.ajax') : '';
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
function confirmDeleteFolder(id) {
    var text = boot ? boot.deleteFolder : 'Delete this folder?';
    var deleteLabel = boot ? boot.deleteLabel : 'Delete';
    showModalConfirm(text, 'nestedtags-delete-ok', {
        on_show: function (modal) {
            modal.children().find('.nestedtags-delete-ok:first').click(function () {
                modal.modal('hide');
                var foldersUrl = typeof laroute !== 'undefined' ? laroute.route('mailboxes.custom_folders.ajax') : '';
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
function finishFolderDelete(id, deleted) {
    showAjaxResult(deleted);
    if (!deleted || typeof deleted.msg_success === 'undefined') {
        return;
    }
    var row = document.getElementById('folder-' + id);
    if (row && row.parentNode) {
        row.parentNode.removeChild(row);
        return;
    }
    window.location.reload();
}
function bindSidebarReload() {
    $.ajaxPrefilter(function (options) {
        if (!sidebarEdit || !options.url || options.url.indexOf('custom-folders/ajax') === -1) {
            return;
        }
        var fields = fieldsOf(options.data);
        if (fields.action !== 'update') {
            return;
        }
        var previous = options.success;
        options.success = function (data) {
            if (data && data.status === 'success') {
                var savedId_1 = data.id ? Number(data.id) : Number(fields.folder_id || 0);
                var savedName_1 = data.name || '';
                var parentId_1 = fields.parent_folder_id || '';
                window.iconpickerReleaseFolderSave = function () {
                    showSidebarEdit(savedId_1, savedName_1, parentId_1);
                };
            }
            if (previous) {
                previous(data);
            }
        };
    });
}
function showSidebarEdit(id, name, parentId) {
    var nameChanged = !!(id && name && name !== folderName(id));
    var parentChanged = !!(id && parentId !== parentIdOf(id));
    if (nameChanged) {
        folderEpoch++;
        for (var i = 0; i < nodes.length; i++) {
            if (nodes[i].id === id) {
                nodes[i].name = name;
            }
        }
        var label = document.querySelector('#folders li[data-folder_id="' + String(id) + '"] .folder-name');
        if (label) {
            label.textContent = name;
        }
    }
    if (parentChanged) {
        applyFolderMove(id, parentId, '');
    }
    var mailbox = mailboxId();
    if (mailbox && (nameChanged || parentChanged)) {
        loadTree(mailbox, refreshFolderLabels);
    }
    var open = document.querySelector('.modal.in, .modal.show');
    if (open) {
        var modal = $(open);
        if (modal.modal) {
            modal.modal('hide');
            return;
        }
    }
    sidebarEdit = false;
}
function bindNewFolder() {
    var original = window.initNewFolder;
    window.initNewFolder = function (modal) {
        if (original) {
            original(modal);
        }
        var preset = pendingParent;
        pendingParent = '';
        var root = modal && modal.length ? modal.get(0) : document;
        injectParents(root || document, preset);
        simplifyCreate(root || document);
    };
    document.addEventListener('click', function (event) {
        var target = event.target;
        if (!target || !target.closest) {
            return;
        }
        var opener = target.closest('a[data-modal-on-show="initNewFolder"]');
        if (!opener) {
            return;
        }
        if (!fromSublabel) {
            pendingParent = '';
        }
        fromSublabel = false;
    }, true);
}
function simplifyCreate(root) {
    var forms = root.querySelectorAll('.new-folder-form');
    var _loop_1 = function (i) {
        var form = forms[i];
        if (form.getAttribute('data-nestedtags-simple') === '1') {
            return "continue";
        }
        var nameInput = form.querySelector('input[name="name"]');
        if (!(nameInput instanceof HTMLInputElement)) {
            return "continue";
        }
        form.setAttribute('data-nestedtags-simple', '1');
        form.classList.add('nestedtags-simple');
        var counter = form.querySelector('select[name="counter"]');
        if (counter instanceof HTMLSelectElement) {
            counter.value = '1';
        }
        var nameGroup = nameInput.closest('.form-group');
        var field = nameInput.parentElement;
        if (field && boot) {
            var hint = document.createElement('div');
            hint.className = 'nestedtags-name-hint';
            hint.textContent = boot.nameIsTag;
            field.appendChild(hint);
        }
        var expand = document.createElement('div');
        expand.className = 'form-group nestedtags-expand';
        var expandCol = document.createElement('div');
        expandCol.className = 'col-sm-10 col-sm-offset-2';
        var expandButton = document.createElement('button');
        expandButton.type = 'button';
        expandButton.className = 'btn btn-link';
        expandButton.textContent = boot ? boot.moreSettings : 'More settings';
        expandCol.appendChild(expandButton);
        expand.appendChild(expandCol);
        var saveButton = form.querySelector('.btn-primary');
        var saveGroup = saveButton ? saveButton.closest('.form-group') : null;
        if (saveGroup && saveGroup.parentNode) {
            saveGroup.parentNode.insertBefore(expand, saveGroup);
        }
        else if (nameGroup && nameGroup.parentNode) {
            nameGroup.parentNode.insertBefore(expand, nameGroup.nextSibling);
        }
        nameInput.addEventListener('input', function () {
            if (form.getAttribute('data-nestedtags-tag-lock') === '1') {
                return;
            }
            syncTag(form, nameInput.value);
        });
        var tagSelect = form.querySelector('select[name="tag_name"]');
        if (tagSelect) {
            tagSelect.addEventListener('change', function () {
                if (form.getAttribute('data-nestedtags-syncing') === '1') {
                    return;
                }
                if (tagSelect.value !== nameInput.value.trim()) {
                    form.setAttribute('data-nestedtags-tag-lock', '1');
                }
            });
        }
        expandButton.addEventListener('click', function () {
            form.classList.remove('nestedtags-simple');
            expand.parentNode && expand.parentNode.removeChild(expand);
            var hint = form.querySelector('.nestedtags-name-hint');
            if (hint && hint.parentNode) {
                hint.parentNode.removeChild(hint);
            }
            var dialog = form.closest('.modal-dialog');
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
    };
    for (var i = 0; i < forms.length; i++) {
        _loop_1(i);
    }
}
function syncTag(form, raw) {
    var select = form.querySelector('select[name="tag_name"]');
    if (!(select instanceof HTMLSelectElement)) {
        return;
    }
    var value = raw.trim();
    form.setAttribute('data-nestedtags-syncing', '1');
    if (!value) {
        select.value = '';
    }
    else {
        var found = false;
        for (var i = 0; i < select.options.length; i++) {
            if (select.options[i].value === value) {
                found = true;
                break;
            }
        }
        if (!found) {
            var option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            select.appendChild(option);
        }
        select.value = value;
    }
    var chosen = $(select);
    if (chosen.val) {
        var chained = chosen.val(value);
        if (chained && chained.trigger) {
            chained.trigger('change');
        }
    }
    form.removeAttribute('data-nestedtags-syncing');
}
function injectParents(root, preset) {
    if (!boot) {
        return;
    }
    var forms = root.querySelectorAll('.custom-folders-form, .new-folder-form');
    for (var i = 0; i < forms.length; i++) {
        var form = forms[i];
        if (form.querySelector('[name="parent_folder_id"]')) {
            continue;
        }
        var selfId = form.getAttribute('data-folder_id') || '';
        var wrap = document.createElement('div');
        wrap.className = 'form-group';
        var label = document.createElement('label');
        label.textContent = boot.nestUnder;
        var select = document.createElement('select');
        select.name = 'parent_folder_id';
        select.className = 'form-control';
        var empty = document.createElement('option');
        empty.value = '';
        empty.textContent = boot.topLevel;
        select.appendChild(empty);
        var blocked = blockedIds(selfId);
        for (var n = 0; n < nodes.length; n++) {
            var node = nodes[n];
            if (blocked[node.id]) {
                continue;
            }
            var option = document.createElement('option');
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
function blockedIds(selfId) {
    var blocked = {};
    var self = parseInt(selfId, 10);
    if (!self) {
        return blocked;
    }
    blocked[self] = true;
    var grew = true;
    while (grew) {
        grew = false;
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            if (node.parent && blocked[node.parent] && !blocked[node.id]) {
                blocked[node.id] = true;
                grew = true;
            }
        }
    }
    return blocked;
}
function depthOf(id) {
    var depth = 0;
    var cursor = id;
    var seen = {};
    while (cursor && !seen[cursor]) {
        seen[cursor] = true;
        var parent_1 = null;
        for (var i = 0; i < nodes.length; i++) {
            if (nodes[i].id === cursor) {
                parent_1 = nodes[i].parent;
                break;
            }
        }
        if (!parent_1) {
            break;
        }
        depth++;
        cursor = parent_1;
    }
    return depth;
}
function indent(depth) {
    var text = '';
    for (var i = 0; i < depth; i++) {
        text += '\u00a0\u00a0';
    }
    return text;
}
function addSublabelLinks() {
    if (!boot) {
        return;
    }
    var opener = document.querySelector('a[data-modal-on-show="initNewFolder"]');
    if (!opener) {
        return;
    }
    var triggers = document.querySelectorAll('.folder-delete-trigger');
    var _loop_2 = function (i) {
        var trigger = triggers[i];
        var parent_2 = trigger.parentElement;
        if (!parent_2 || parent_2.querySelector('.nestedtags-sublabel')) {
            return "continue";
        }
        var link = document.createElement('a');
        link.href = '#';
        link.className = 'btn btn-link nestedtags-sublabel';
        link.textContent = boot.sublabel;
        var folderId = trigger.getAttribute('data-folder_id') || '';
        link.addEventListener('click', function (event) {
            event.preventDefault();
            fromSublabel = true;
            pendingParent = folderId;
            opener.click();
        });
        parent_2.insertBefore(link, trigger);
    };
    for (var i = 0; i < triggers.length; i++) {
        _loop_2(i);
    }
}
function paint() {
    nestSidebar();
    paintManage();
    paintAdminOutline();
    paintTags();
    paintPicker();
    injectParents(document, '');
    prepareFolderDrag();
}
function refreshFolderLabels() {
    paintTags();
    paintPicker();
}
function isCustomFolder(id) {
    for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].id === id) {
            return true;
        }
    }
    return false;
}
function parentIdOf(id) {
    for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].id === id && nodes[i].parent) {
            return String(nodes[i].parent);
        }
    }
    return '';
}
function folderName(id) {
    for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].id === id) {
            return nodes[i].name;
        }
    }
    return '';
}
function paintManage() {
    if (!boot || !boot.canEdit || !boot.createUrl) {
        return;
    }
    var root = document.getElementById('folders');
    if (!root || root.classList.contains('chats')) {
        return;
    }
    placeAddButton(root);
    var items = root.querySelectorAll('li[data-folder_id]');
    var _loop_3 = function (i) {
        var item = items[i];
        var id = parseInt(item.getAttribute('data-folder_id') || '', 10);
        if (!isCustomFolder(id)) {
            return "continue";
        }
        item.classList.add('nestedtags-manageable');
        if (item.querySelector(':scope > .nestedtags-more')) {
            return "continue";
        }
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-trans nestedtags-more';
        button.setAttribute('aria-label', boot.folderActions);
        button.textContent = '\u2026';
        button.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            var rect = button.getBoundingClientRect();
            openFolderMenu(id, rect.left, rect.bottom + 4);
        });
        item.appendChild(button);
    };
    for (var i = 0; i < items.length; i++) {
        _loop_3(i);
    }
}
function placeAddButton(root) {
    if (document.querySelector('.nestedtags-add') || !boot) {
        return;
    }
    var wrap = document.createElement('div');
    wrap.className = 'sidebar-buttons btn-group-rounded nestedtags-add-wrap';
    var button = document.createElement('a');
    button.href = '#';
    button.className = 'btn btn-trans nestedtags-add';
    button.setAttribute('role', 'button');
    var plus = document.createElement('i');
    plus.className = 'glyphicon glyphicon-plus';
    plus.setAttribute('aria-hidden', 'true');
    var label = document.createElement('span');
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
function bindFolderMenu() {
    if (menuBound) {
        return;
    }
    menuBound = true;
    document.addEventListener('contextmenu', function (event) {
        if (!boot || !boot.canEdit) {
            return;
        }
        var target = event.target;
        var item = target && target.closest ? target.closest('#folders li[data-folder_id]') : null;
        if (!item) {
            return;
        }
        var id = parseInt(item.getAttribute('data-folder_id') || '', 10);
        if (!isCustomFolder(id)) {
            return;
        }
        event.preventDefault();
        openFolderMenu(id, event.clientX, event.clientY);
    });
    document.addEventListener('click', function (event) {
        var menu = folderMenu();
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
function folderMenu() {
    return document.querySelector('.nestedtags-menu');
}
function ensureFolderMenu() {
    var existing = folderMenu();
    if (existing) {
        return existing;
    }
    var menu = document.createElement('div');
    menu.className = 'nestedtags-menu';
    menu.style.display = 'none';
    var edit = document.createElement('button');
    edit.type = 'button';
    edit.textContent = boot ? boot.edit : 'Edit';
    var sub = document.createElement('button');
    sub.type = 'button';
    sub.textContent = boot ? boot.addSubfolder : 'Add subfolder';
    menu.appendChild(edit);
    menu.appendChild(sub);
    document.body.appendChild(menu);
    edit.addEventListener('click', function () {
        var id = parseInt(menu.getAttribute('data-folder-id') || '', 10);
        closeFolderMenu();
        if (id) {
            openEdit(id);
        }
    });
    sub.addEventListener('click', function () {
        var id = menu.getAttribute('data-folder-id') || '';
        closeFolderMenu();
        openCreate(id);
    });
    return menu;
}
function openFolderMenu(folderId, x, y) {
    var menu = ensureFolderMenu();
    menu.setAttribute('data-folder-id', String(folderId));
    menu.style.display = 'block';
    menu.style.left = '0px';
    menu.style.top = '0px';
    var rect = menu.getBoundingClientRect();
    var left = Math.max(8, Math.min(x, window.innerWidth - rect.width - 8));
    var top = Math.max(8, Math.min(y, window.innerHeight - rect.height - 8));
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    var items = document.querySelectorAll('#folders li.nestedtags-menu-open');
    for (var i = 0; i < items.length; i++) {
        items[i].classList.remove('nestedtags-menu-open');
    }
    var row = document.querySelector('#folders li[data-folder_id="' + folderId + '"]');
    if (row) {
        row.classList.add('nestedtags-menu-open');
    }
}
function closeFolderMenu() {
    var menu = folderMenu();
    if (menu) {
        menu.style.display = 'none';
    }
    var items = document.querySelectorAll('#folders li.nestedtags-menu-open');
    for (var i = 0; i < items.length; i++) {
        items[i].classList.remove('nestedtags-menu-open');
    }
}
function openCreate(parentId) {
    if (!boot || !boot.createUrl) {
        return;
    }
    pendingParent = parentId;
    var title = parentId ? boot.addSubfolder : boot.addFolder;
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
function openEdit(folderId) {
    if (!boot || !boot.formUrl) {
        return;
    }
    sidebarEdit = true;
    var title = folderName(folderId) || boot.edit;
    showModal({
        remote: boot.formUrl.replace(/\/0$/, '/' + String(folderId)),
        title: title,
        no_footer: true,
        size: 'lg',
        on_show: function (modal) {
            if (window.initCustomFoldersForm) {
                window.initCustomFoldersForm('.custom-folders-form', 'update');
            }
            var root = modal && modal.length ? modal.get(0) : document;
            injectParents(root || document, parentIdOf(folderId));
        }
    });
}
function bindAdminDrag() {
    var index = document.getElementById('custom-folders-index');
    if (!index || index.getAttribute('data-nestedtags-drag') === '1') {
        return;
    }
    index.setAttribute('data-nestedtags-drag', '1');
    if (boot && !document.querySelector('.nestedtags-drag-hint')) {
        var hint = document.createElement('p');
        hint.className = 'text-help nestedtags-drag-hint';
        hint.textContent = boot.dragHint;
        if (index.parentNode) {
            index.parentNode.insertBefore(hint, index);
        }
    }
    var handles = index.querySelectorAll('.handle');
    for (var i = 0; i < handles.length; i++) {
        handles[i].setAttribute('title', boot ? boot.dragHint : '');
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
        var item = sortItem(event);
        dragDropped = false;
        dragTrailer = [];
        dragTrailerDepth = [];
        dragOriginDepth = item ? panelDepth(item) : 0;
        if (!item) {
            return;
        }
        var next = item.nextElementSibling;
        while (next && next.classList.contains('panel') && panelDepth(next) > dragOriginDepth) {
            dragTrailer.push(next);
            dragTrailerDepth.push(panelDepth(next));
            next = next.nextElementSibling;
        }
        var holder = document.createDocumentFragment();
        for (var i = 0; i < dragTrailer.length; i++) {
            holder.appendChild(dragTrailer[i]);
        }
    });
    index.addEventListener('sortstop', function (event) {
        var item = sortItem(event);
        markNest(null);
        if (!item) {
            return;
        }
        var cursor = item;
        for (var i = 0; i < dragTrailer.length; i++) {
            cursor.insertAdjacentElement('afterend', dragTrailer[i]);
            cursor = dragTrailer[i];
        }
        if (!dragDropped) {
            return;
        }
        applyDragDepth(index, item);
    });
}
function sortItem(event) {
    var detail = event.detail;
    var item = detail ? detail.item : null;
    if (!item || !item.classList || !item.classList.contains('panel')) {
        return null;
    }
    return item;
}
function paintAdminOutline() {
    var index = document.getElementById('custom-folders-index');
    if (!index) {
        return;
    }
    var panels = directPanels(index);
    var position = {};
    for (var i = 0; i < panels.length; i++) {
        position[panelNumericId(panels[i])] = i;
    }
    var children = {};
    for (var n = 0; n < nodes.length; n++) {
        var key = nodes[n].parent ? String(nodes[n].parent) : '0';
        if (!children[key]) {
            children[key] = [];
        }
        children[key].push(nodes[n].id);
    }
    for (var key in children) {
        if (Object.prototype.hasOwnProperty.call(children, key)) {
            children[key].sort(function (a, b) {
                return (position[a] || 0) - (position[b] || 0);
            });
        }
    }
    var ordered = [];
    var visit = function (parent, depth) {
        var key = parent ? String(parent) : '0';
        var kids = children[key] || [];
        for (var i = 0; i < kids.length; i++) {
            ordered.push({ id: kids[i], depth: depth });
            visit(kids[i], depth + 1);
        }
    };
    visit(null, 0);
    for (var i = 0; i < ordered.length; i++) {
        var panel = document.getElementById('folder-' + ordered[i].id);
        if (!panel || panel.parentElement !== index) {
            continue;
        }
        index.appendChild(panel);
        setPanelDepth(panel, ordered[i].depth);
    }
}
function applyDragDepth(index, item) {
    var previous = previousPanel(item);
    var depth = depthFromPointer(index);
    if (!previous) {
        depth = 0;
    }
    var previousDepth = previous ? panelDepth(previous) : 0;
    if (depth > previousDepth + 1) {
        depth = previousDepth + 1;
    }
    var delta = depth - dragOriginDepth;
    setPanelDepth(item, depth);
    for (var i = 0; i < dragTrailer.length; i++) {
        var childDepth = dragTrailerDepth[i] + delta;
        if (childDepth < depth + 1) {
            childDepth = depth + 1;
        }
        setPanelDepth(dragTrailer[i], childDepth);
    }
    var parent = depth === 0 ? null : parentAtDepth(item, depth - 1);
    var id = panelNumericId(item);
    var select = item.querySelector('[name="parent_folder_id"]');
    if (select) {
        select.value = parent ? String(parent) : '';
    }
    var previousParent = null;
    var known = false;
    for (var i = 0; i < nodes.length; i++) {
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
function parentAtDepth(item, depth) {
    var previous = item.previousElementSibling;
    while (previous) {
        if (previous.classList.contains('panel') && panelDepth(previous) === depth) {
            return panelNumericId(previous) || null;
        }
        previous = previous.previousElementSibling;
    }
    return null;
}
function prospectiveParent(index) {
    var placeholder = index.querySelector('.sortable-placeholder');
    if (!placeholder) {
        return null;
    }
    var previous = previousPanel(placeholder);
    if (!previous) {
        return null;
    }
    var depth = depthFromPointer(index);
    if (depth < 1) {
        return null;
    }
    var previousDepth = panelDepth(previous);
    if (depth > previousDepth + 1) {
        depth = previousDepth + 1;
    }
    var cursor = previous;
    while (cursor) {
        if (cursor.classList.contains('panel') && panelDepth(cursor) === depth - 1) {
            return cursor;
        }
        cursor = cursor.previousElementSibling;
    }
    return null;
}
function depthFromPointer(index) {
    var left = index.getBoundingClientRect().left;
    var depth = Math.round((dragX - left - 56) / 28);
    return depth < 0 ? 0 : depth;
}
function previousPanel(start) {
    var previous = start.previousElementSibling;
    while (previous) {
        if (previous.classList.contains('panel') && !previous.classList.contains('sortable-dragging') && !previous.classList.contains('sortable-placeholder')) {
            return previous;
        }
        previous = previous.previousElementSibling;
    }
    return null;
}
function directPanels(index) {
    var panels = [];
    var children = index.children;
    for (var i = 0; i < children.length; i++) {
        var child = children[i];
        if (child.classList.contains('panel')) {
            panels.push(child);
        }
    }
    return panels;
}
function setPanelDepth(panel, depth) {
    panel.setAttribute('data-nestedtags-depth', String(depth));
    panel.style.marginLeft = depth > 0 ? String(depth * 28) + 'px' : '';
}
function panelDepth(panel) {
    var depth = parseInt(panel.getAttribute('data-nestedtags-depth') || '0', 10);
    return isNaN(depth) ? 0 : depth;
}
function panelNumericId(panel) {
    var id = parseInt(panel.getAttribute('data-folder-id') || '', 10);
    return isNaN(id) ? 0 : id;
}
function markNest(panel) {
    if (nestMark && nestMark !== panel) {
        nestMark.classList.remove('nestedtags-nest-target');
    }
    nestMark = panel;
    if (panel) {
        panel.classList.add('nestedtags-nest-target');
    }
}
function folderItems(parent) {
    var out = [];
    var kids = parent.children;
    for (var i = 0; i < kids.length; i++) {
        var child = kids[i];
        if (child instanceof HTMLElement && child.hasAttribute('data-folder_id')) {
            out.push(child);
        }
    }
    return out;
}
function placeAt(parent, item, index) {
    var others = [];
    var kids = parent.children;
    for (var i = 0; i < kids.length; i++) {
        var child = kids[i];
        if (child instanceof HTMLElement && child.hasAttribute('data-folder_id') && child !== item) {
            others.push(child);
        }
    }
    var anchor = index < others.length ? others[index] : null;
    if (item.parentNode === parent) {
        var next = item.nextElementSibling;
        var nextFolder = null;
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
    }
    else {
        parent.appendChild(item);
    }
    return true;
}
function nestSidebar() {
    var root = document.querySelector('#folders');
    if (!root) {
        return;
    }
    var byId = {};
    var items = root.querySelectorAll('li[data-folder_id]');
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var id = parseInt(item.getAttribute('data-folder_id') || '', 10);
        if (id) {
            byId[id] = item;
        }
    }
    var seen = {};
    for (var n = 0; n < nodes.length; n++) {
        var node = nodes[n];
        if (!node.parent) {
            continue;
        }
        var item = byId[node.id];
        var parentItem = byId[node.parent];
        if (!item || !parentItem) {
            continue;
        }
        var list = parentItem.querySelector(':scope > ul.nestedtags-children');
        if (!list) {
            list = document.createElement('ul');
            list.className = 'nestedtags-children';
            parentItem.appendChild(list);
        }
        var index = seen[node.parent] || 0;
        seen[node.parent] = index + 1;
        placeAt(list, item, index);
    }
    var tops = root.querySelectorAll(':scope > li[data-folder_id]');
    for (var i = 0; i < tops.length; i++) {
        markSidebarDepth(tops[i], 0);
    }
    applyCollapse(root);
}
function markSidebarDepth(item, depth) {
    item.setAttribute('data-nestedtags-depth', String(depth));
    if (depth > 0) {
        item.classList.add('nestedtags-child');
    }
    else {
        item.classList.remove('nestedtags-child');
    }
    var list = item.querySelector(':scope > ul.nestedtags-children');
    if (!list) {
        return;
    }
    var children = list.querySelectorAll(':scope > li[data-folder_id]');
    for (var i = 0; i < children.length; i++) {
        markSidebarDepth(children[i], depth + 1);
    }
}
function applyCollapse(root) {
    var key = 'nestedtags.collapse.' + mailboxId();
    var closed = [];
    try {
        var stored = localStorage.getItem(key);
        var parsed = stored ? JSON.parse(stored) : [];
        if (parsed && parsed.length !== undefined) {
            closed = parsed;
        }
    }
    catch (e) {
        closed = [];
    }
    var parents = root.querySelectorAll('li[data-folder_id]');
    var _loop_4 = function (i) {
        var item = parents[i];
        var list = item.querySelector(':scope > ul.nestedtags-children');
        if (!list) {
            return "continue";
        }
        var id = parseInt(item.getAttribute('data-folder_id') || '', 10);
        var isClosed = closed.indexOf(id) !== -1;
        if (isClosed) {
            item.classList.add('nestedtags-collapsed');
        }
        else {
            item.classList.remove('nestedtags-collapsed');
        }
        var link = item.querySelector(':scope > a');
        if (!link) {
            return "continue";
        }
        var toggle = link.querySelector('.nestedtags-toggle');
        if (!toggle) {
            var button_1 = document.createElement('button');
            button_1.type = 'button';
            button_1.className = 'nestedtags-toggle';
            button_1.addEventListener('click', function (event) {
                event.preventDefault();
                event.stopPropagation();
                item.classList.toggle('nestedtags-collapsed');
                var collapsed = item.classList.contains('nestedtags-collapsed');
                remember(key, id, collapsed);
                button_1.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
                button_1.textContent = collapsed ? '\u25b8' : '\u25be';
            });
            link.insertBefore(button_1, link.firstChild);
            toggle = button_1;
        }
        toggle.textContent = item.classList.contains('nestedtags-collapsed') ? '\u25b8' : '\u25be';
        toggle.setAttribute('aria-expanded', isClosed ? 'false' : 'true');
    };
    for (var i = 0; i < parents.length; i++) {
        _loop_4(i);
    }
}
function remember(key, id, collapsed) {
    var closed = [];
    try {
        var stored = localStorage.getItem(key);
        var parsed = stored ? JSON.parse(stored) : [];
        if (parsed && parsed.length !== undefined) {
            closed = parsed;
        }
    }
    catch (e) {
        closed = [];
    }
    var next = [];
    for (var i = 0; i < closed.length; i++) {
        if (closed[i] !== id) {
            next.push(closed[i]);
        }
    }
    if (collapsed) {
        next.push(id);
    }
    localStorage.setItem(key, JSON.stringify(next));
}
function paintTags() {
    var chips = document.querySelectorAll('.tag-name');
    for (var i = 0; i < chips.length; i++) {
        var chip = chips[i];
        var raw = chip.getAttribute('data-nestedtags-tag') || (chip.textContent || '').trim();
        chip.setAttribute('data-nestedtags-tag', raw);
        var path = paths[raw.toLowerCase()];
        if (path) {
            chip.textContent = path;
        }
    }
}
function paintPicker() {
    var selects = document.querySelectorAll('select[name="tag_name"], select.tag-input');
    for (var s = 0; s < selects.length; s++) {
        var select = selects[s];
        var options = select.querySelectorAll('option');
        for (var o = 0; o < options.length; o++) {
            var option = options[o];
            var value = option.value;
            if (!value || option.getAttribute('data-nestedtags-label')) {
                continue;
            }
            var match = folderForTag(value);
            if (!match) {
                continue;
            }
            option.setAttribute('data-nestedtags-label', '1');
            option.textContent = indent(depthOf(match.id)) + match.name;
        }
    }
}
function folderForTag(tag) {
    var found = null;
    var needle = tag.toLowerCase();
    for (var i = 0; i < nodes.length; i++) {
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
function pointerIsFine() {
    return window.matchMedia('(pointer: fine)').matches;
}
function folderRoot() {
    var root = document.getElementById('folders');
    if (!root || root.classList.contains('chats')) {
        return null;
    }
    return root;
}
function canDragFolders() {
    return !!(boot && boot.canEdit && pointerIsFine() && folderRoot());
}
function prepareFolderDrag() {
    var root = document.getElementById('folders');
    if (!root) {
        return;
    }
    var allow = canDragFolders();
    var items = root.querySelectorAll('li[data-folder_id]');
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var id = parseInt(item.getAttribute('data-folder_id') || '', 10);
        var links = item.querySelectorAll('a, button');
        for (var j = 0; j < links.length; j++) {
            links[j].setAttribute('draggable', 'false');
        }
        if (allow && isCustomFolder(id)) {
            item.setAttribute('draggable', 'true');
        }
        else {
            item.removeAttribute('draggable');
        }
    }
}
function bindFolderDrag() {
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
    var fine = window.matchMedia('(pointer: fine)');
    if (typeof fine.addEventListener === 'function') {
        fine.addEventListener('change', prepareFolderDrag);
    }
}
function bindLiveFolders() {
    tunePolling();
    $(function () {
        tunePolling();
        if (folderChannelOn) {
            return;
        }
        var root = document.getElementById('folders');
        if (!root || root.classList.contains('chats')) {
            return;
        }
        var id = mailboxId();
        if (!id || typeof poly === 'undefined' || !poly) {
            return;
        }
        folderChannelOn = true;
        document.addEventListener('dragstart', noteConversationDrag);
        document.addEventListener('dragend', releaseFolderList);
        var channel = poly.subscribe('nestedtags.folders.' + String(id));
        channel.on('Modules\\NestedTags\\Events\\FolderSidebarRefresh', function (data, envelope) {
            acceptFolderList(id, data, folderEventId(envelope));
        });
    });
}
function tunePolling() {
    if (typeof poly === 'undefined' || !poly || !poly.options) {
        return;
    }
    poly.options.polling = 1;
}
function noteConversationDrag(event) {
    if (event.defaultPrevented) {
        return;
    }
    var target = event.target;
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
function folderEventId(envelope) {
    if (!envelope || envelope.id === undefined || envelope.id === null) {
        return 0;
    }
    var id = Number(envelope.id);
    return id > 0 ? id : 0;
}
function acceptFolderList(id, data, eventId) {
    if (!data || Number(data.mailbox_id) !== id || typeof data.folders_html !== 'string' || data.folders_html === '') {
        return;
    }
    var root = document.getElementById('folders');
    if (!root || root.classList.contains('chats')) {
        return;
    }
    if (eventId > 0 && eventId < lastFolderEventId) {
        return;
    }
    var known = Object.prototype.hasOwnProperty.call(data, 'icons')
        && data.icons != null
        && typeof data.icons === 'object';
    var icons = known ? data.icons : {};
    var revision = Number(data.icon_revision || 0);
    if (folderDragId !== 0 || conversationDrag) {
        pendingFolderHtml = data.folders_html;
        pendingFolderIconsKnown = known;
        pendingFolderIcons = known ? icons : null;
        pendingFolderRevision = revision;
    }
    else {
        replaceFolderList(data.folders_html, known, icons, revision);
    }
    if (eventId > 0) {
        lastFolderEventId = eventId;
    }
}
function releaseFolderList() {
    conversationDrag = false;
    var html = pendingFolderHtml;
    var icons = pendingFolderIcons;
    if (!html) {
        return;
    }
    pendingFolderHtml = '';
    pendingFolderIcons = null;
    var known = pendingFolderIconsKnown;
    var revision = pendingFolderRevision;
    pendingFolderIconsKnown = false;
    pendingFolderRevision = 0;
    replaceFolderList(html, known, icons || {}, revision);
}
function parseFolderRows(html) {
    var holder = document.createElement('div');
    holder.innerHTML = html;
    var items = holder.querySelectorAll(':scope > li[data-folder_id]');
    var rows = [];
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        if (!(item instanceof HTMLElement)) {
            continue;
        }
        var id = parseInt(item.getAttribute('data-folder_id') || '', 10);
        if (id) {
            rows.push({ id: id, element: item });
        }
    }
    return rows;
}
function folderFact(item) {
    var link = item.querySelector(':scope > a');
    var nameNode = link ? link.querySelector(':scope > .folder-name') : null;
    var name = nameNode ? (nameNode.textContent || '').replace(/\s+/g, ' ').trim() : '';
    var countNode = link ? link.querySelector(':scope > .active-count') : null;
    var count = countNode ? (countNode.textContent || '').replace(/\s+/g, '') : '';
    var active = item.getAttribute('data-active-count') || '';
    var quiet = link && link.classList.contains('no-active') ? '1' : '0';
    return name + '\t' + count + '\t' + active + '\t' + quiet;
}
function sameContent(root, rows) {
    var live = root.querySelectorAll('li[data-folder_id]');
    if (live.length !== rows.length) {
        return false;
    }
    var byId = {};
    for (var i = 0; i < live.length; i++) {
        var id = parseInt(live[i].getAttribute('data-folder_id') || '', 10);
        if (id) {
            byId[id] = folderFact(live[i]);
        }
    }
    for (var i = 0; i < rows.length; i++) {
        if (byId[rows[i].id] !== folderFact(rows[i].element)) {
            return false;
        }
    }
    return true;
}
function parentOfNodes(nodeList) {
    var parentOf = {};
    for (var i = 0; i < nodeList.length; i++) {
        if (nodeList[i].parent) {
            parentOf[nodeList[i].id] = nodeList[i].parent;
        }
    }
    return parentOf;
}
function visibleIds(rows) {
    var ids = {};
    for (var i = 0; i < rows.length; i++) {
        ids[rows[i].id] = true;
    }
    return ids;
}
function desiredTopIds(rows, nodeList) {
    var parentOf = parentOfNodes(nodeList);
    var visible = visibleIds(rows);
    var ids = [];
    for (var i = 0; i < rows.length; i++) {
        var parent_3 = parentOf[rows[i].id];
        if (!parent_3 || !visible[parent_3]) {
            ids.push(rows[i].id);
        }
    }
    return ids;
}
function nodeChildLists(rows, nodeList) {
    var visible = visibleIds(rows);
    var lists = {};
    for (var i = 0; i < nodeList.length; i++) {
        var node = nodeList[i];
        if (!node.parent || !visible[node.id] || !visible[node.parent]) {
            continue;
        }
        var key = String(node.parent);
        if (!lists[key]) {
            lists[key] = [];
        }
        lists[key].push(node.id);
    }
    return lists;
}
function domChildLists(root) {
    var lists = folderLists(root);
    delete lists['0'];
    return lists;
}
function sameLists(left, right) {
    var keys = Object.keys(left);
    if (keys.length !== Object.keys(right).length) {
        return false;
    }
    for (var i = 0; i < keys.length; i++) {
        var a = left[keys[i]];
        var b = right[keys[i]];
        if (!b || a.length !== b.length) {
            return false;
        }
        for (var j = 0; j < a.length; j++) {
            if (a[j] !== b[j]) {
                return false;
            }
        }
    }
    return true;
}
function sidebarMatches(root, rows, nodeList) {
    if (!sameContent(root, rows)) {
        return false;
    }
    var top = folderItems(root);
    var wanted = desiredTopIds(rows, nodeList);
    if (top.length !== wanted.length) {
        return false;
    }
    for (var i = 0; i < wanted.length; i++) {
        var id = parseInt(top[i].getAttribute('data-folder_id') || '', 10);
        if (id !== wanted[i]) {
            return false;
        }
    }
    return sameLists(domChildLists(root), nodeChildLists(rows, nodeList));
}
function patchFolderContent(live, fresh) {
    var liveLink = live.querySelector(':scope > a');
    var freshLink = fresh.querySelector(':scope > a');
    if (!liveLink || !freshLink) {
        return;
    }
    var liveName = liveLink.querySelector(':scope > .folder-name');
    var freshName = freshLink.querySelector(':scope > .folder-name');
    if (liveName && freshName) {
        var next = (freshName.textContent || '').replace(/\s+/g, ' ').trim();
        var current = (liveName.textContent || '').replace(/\s+/g, ' ').trim();
        if (current !== next) {
            liveName.textContent = next;
        }
    }
    var nextActive = fresh.getAttribute('data-active-count') || '';
    if ((live.getAttribute('data-active-count') || '') !== nextActive) {
        live.setAttribute('data-active-count', nextActive);
    }
    var quiet = freshLink.classList.contains('no-active');
    if (liveLink.classList.contains('no-active') !== quiet) {
        if (quiet) {
            liveLink.classList.add('no-active');
        }
        else {
            liveLink.classList.remove('no-active');
        }
    }
    var liveCount = liveLink.querySelector(':scope > .active-count');
    var freshCount = freshLink.querySelector(':scope > .active-count');
    var liveText = liveCount ? (liveCount.textContent || '').replace(/\s+/g, '') : '';
    var freshText = freshCount ? (freshCount.textContent || '').replace(/\s+/g, '') : '';
    if (liveText !== freshText) {
        if (liveCount && liveCount.parentNode) {
            liveCount.parentNode.removeChild(liveCount);
        }
        if (freshCount) {
            liveLink.appendChild(freshCount);
        }
    }
}
function childListOf(parentLi) {
    var list = parentLi.querySelector(':scope > ul.nestedtags-children');
    if (!list) {
        list = document.createElement('ul');
        list.className = 'nestedtags-children';
        parentLi.appendChild(list);
    }
    return list;
}
function clearEmptyChildLists(root) {
    var removed = false;
    var lists = root.querySelectorAll('ul.nestedtags-children');
    for (var i = lists.length - 1; i >= 0; i--) {
        var list = lists[i];
        if (list.querySelector(':scope > li[data-folder_id]')) {
            continue;
        }
        var parent_4 = list.parentElement;
        if (parent_4) {
            var toggle = parent_4.querySelector(':scope > a .nestedtags-toggle');
            if (toggle && toggle.parentNode) {
                toggle.parentNode.removeChild(toggle);
            }
            parent_4.classList.remove('nestedtags-collapsed');
        }
        if (list.parentNode) {
            list.parentNode.removeChild(list);
            removed = true;
        }
    }
    return removed;
}
function syncSidebar(root, rows, nodeList) {
    var structure = false;
    var byId = {};
    var live = root.querySelectorAll('li[data-folder_id]');
    for (var i = 0; i < live.length; i++) {
        var item = live[i];
        var id = parseInt(item.getAttribute('data-folder_id') || '', 10);
        if (id) {
            byId[id] = item;
        }
    }
    var wanted = {};
    for (var i = 0; i < rows.length; i++) {
        wanted[rows[i].id] = true;
        var item = byId[rows[i].id];
        if (!item) {
            rows[i].element.classList.remove('active');
            byId[rows[i].id] = rows[i].element;
            structure = true;
            continue;
        }
        patchFolderContent(item, rows[i].element);
    }
    var ids = Object.keys(byId);
    for (var i = 0; i < ids.length; i++) {
        var id = Number(ids[i]);
        if (wanted[id]) {
            continue;
        }
        var item = byId[id];
        if (item.parentNode) {
            item.parentNode.removeChild(item);
        }
        delete byId[id];
        structure = true;
    }
    var top = desiredTopIds(rows, nodeList);
    for (var i = 0; i < top.length; i++) {
        var item = byId[top[i]];
        if (item && placeAt(root, item, i)) {
            structure = true;
        }
    }
    var children = nodeChildLists(rows, nodeList);
    var parents = Object.keys(children);
    for (var p = 0; p < parents.length; p++) {
        var parentLi = byId[Number(parents[p])];
        if (!parentLi) {
            continue;
        }
        var list = childListOf(parentLi);
        var kids = children[parents[p]];
        for (var i = 0; i < kids.length; i++) {
            var item = byId[kids[i]];
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
function finishSidebarStructure(root) {
    var tops = root.querySelectorAll(':scope > li[data-folder_id]');
    for (var i = 0; i < tops.length; i++) {
        markSidebarDepth(tops[i], 0);
    }
    applyCollapse(root);
    paintManage();
    prepareFolderDrag();
    paintTags();
    paintPicker();
    injectParents(document, '');
}
function replaceFolderList(html, iconsKnown, icons, revision) {
    var root = document.getElementById('folders');
    if (!root || root.classList.contains('chats')) {
        return;
    }
    if (iconsKnown) {
        document.dispatchEvent(new CustomEvent('nestedtags:folder-icons', {
            detail: { icons: icons, revision: revision }
        }));
    }
    var rows = parseFolderRows(html);
    var epoch = folderEpoch;
    var token = ++folderSyncToken;
    var currentReply = function () {
        return token === folderSyncToken && epoch === folderEpoch;
    };
    loadTree(mailboxId(), function () {
        if (!currentReply()) {
            return;
        }
        var current = document.getElementById('folders');
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
function folderPressOnControl(target) {
    return target instanceof Element
        && !!target.closest('.nestedtags-toggle, .nestedtags-more, .nestedtags-menu');
}
function rememberFolderPress(event) {
    folderPressBlocked = folderPressOnControl(event.target);
}
function onFolderDragStart(event) {
    var target = event.target;
    var pressedControl = folderPressBlocked;
    folderPressBlocked = false;
    if (!(target instanceof Element)) {
        return;
    }
    if (pressedControl || folderPressOnControl(target)) {
        event.preventDefault();
        return;
    }
    var item = target.closest('#folders li[data-folder_id]');
    if (!(item instanceof HTMLElement)) {
        return;
    }
    var id = parseInt(item.getAttribute('data-folder_id') || '', 10);
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
    var chip = document.createElement('div');
    chip.className = 'nestedtags-drag-chip';
    var label = folderName(id) || (boot && boot.folder) || 'Folder';
    if (label.length > 48) {
        label = label.slice(0, 47) + '\u2026';
    }
    chip.textContent = label;
    document.body.appendChild(chip);
    folderDragChip = chip;
    event.dataTransfer.setDragImage(chip, 14, chip.offsetHeight + 12);
}
function onFolderDragOver(event) {
    if (!folderDragId) {
        return;
    }
    var hit = folderHit(event);
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
    var key = hit.mode + ':' + hit.parentId + ':' + hit.beforeId + ':' + (hit.item.getAttribute('data-folder_id') || '');
    if (key === folderDropKey) {
        return;
    }
    folderDropKey = key;
    clearFolderMarks();
    if (hit.mode === 'nest') {
        hit.item.classList.add('nestedtags-drop-on');
        return;
    }
    var line = document.createElement('li');
    line.className = 'nestedtags-drop-line';
    line.setAttribute('aria-hidden', 'true');
    hit.item.insertAdjacentElement(hit.mode === 'before' ? 'beforebegin' : 'afterend', line);
    folderDropLine = line;
}
function onFolderDrop(event) {
    if (!folderDragId || !boot) {
        return;
    }
    var hit = folderLiveHit;
    var moved = folderDragId;
    var openParent = hit && hit.mode === 'nest' && hit.item.classList.contains('nestedtags-collapsed');
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
function folderHit(event) {
    var target = event.target;
    if (!(target instanceof Element) || !folderDragId) {
        return null;
    }
    var item = target.closest('#folders li[data-folder_id]');
    if (!(item instanceof HTMLElement)) {
        return null;
    }
    var id = parseInt(item.getAttribute('data-folder_id') || '', 10);
    if (!isCustomFolder(id) || id === folderDragId || isUnderFolder(id, folderDragId)) {
        return null;
    }
    var row = item.querySelector(':scope > a');
    if (!(row instanceof HTMLElement)) {
        return null;
    }
    var rect = row.getBoundingClientRect();
    if (event.clientY < rect.top || event.clientY > rect.bottom) {
        return null;
    }
    var height = rect.bottom - rect.top;
    var band = Math.max(6, Math.min(12, height * 0.28));
    if (event.clientY >= rect.top + band && event.clientY <= rect.bottom - band) {
        return { mode: 'nest', item: item, parentId: String(id), beforeId: '' };
    }
    var before = event.clientY < rect.top + band;
    var beforeId = '';
    if (before) {
        beforeId = String(id);
    }
    else {
        var next = nextCustomSibling(item);
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
function isUnderFolder(id, ancestor) {
    var seen = {};
    var cursor = id;
    while (cursor && !seen[cursor]) {
        seen[cursor] = true;
        var parent_5 = parentIdOf(cursor);
        if (!parent_5) {
            return false;
        }
        var parentId = parseInt(parent_5, 10);
        if (parentId === ancestor) {
            return true;
        }
        cursor = parentId;
    }
    return false;
}
function nextCustomSibling(item) {
    var next = item.nextElementSibling;
    while (next) {
        if (next instanceof HTMLElement && next.classList.contains('nestedtags-drop-line')) {
            next = next.nextElementSibling;
            continue;
        }
        if (next instanceof HTMLElement && next.hasAttribute('data-folder_id')) {
            var id = parseInt(next.getAttribute('data-folder_id') || '', 10);
            if (id && id !== folderDragId && isCustomFolder(id)) {
                return next;
            }
        }
        next = next.nextElementSibling;
    }
    return null;
}
function clearFolderMarks() {
    var marked = document.querySelectorAll('#folders li.nestedtags-drop-on');
    for (var i = 0; i < marked.length; i++) {
        marked[i].classList.remove('nestedtags-drop-on');
    }
    if (folderDropLine && folderDropLine.parentNode) {
        folderDropLine.parentNode.removeChild(folderDropLine);
    }
    folderDropLine = null;
    var lines = document.querySelectorAll('.nestedtags-drop-line');
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var parent_6 = line.parentNode;
        if (parent_6) {
            parent_6.removeChild(line);
        }
    }
}
function clearFolderDrag() {
    folderDragId = 0;
    folderDropKey = '';
    folderLiveHit = null;
    clearFolderMarks();
    if (folderDragChip && folderDragChip.parentNode) {
        folderDragChip.parentNode.removeChild(folderDragChip);
    }
    folderDragChip = null;
}
function applyFolderMove(movedId, parentRaw, beforeRaw) {
    folderEpoch++;
    var root = folderRoot();
    if (!root) {
        window.location.reload();
        return;
    }
    var lists = folderLists(root);
    var parentKey = parentRaw ? parentRaw : '0';
    var beforeId = beforeRaw ? parseInt(beforeRaw, 10) : 0;
    relocateFolder(lists, movedId, parentKey, beforeId);
    for (var i = 0; i < nodes.length; i++) {
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
function folderLists(root) {
    var lists = { '0': [] };
    var tops = root.querySelectorAll(':scope > li[data-folder_id]');
    for (var i = 0; i < tops.length; i++) {
        var item = tops[i];
        var id = parseInt(item.getAttribute('data-folder_id') || '', 10);
        if (!isCustomFolder(id)) {
            continue;
        }
        lists['0'].push(id);
        collectNestedFolders(item, lists);
    }
    return lists;
}
function collectNestedFolders(item, lists) {
    var id = parseInt(item.getAttribute('data-folder_id') || '', 10);
    var list = item.querySelector(':scope > ul.nestedtags-children');
    if (!list || !id) {
        return;
    }
    var key = String(id);
    lists[key] = [];
    var kids = list.querySelectorAll(':scope > li[data-folder_id]');
    for (var i = 0; i < kids.length; i++) {
        var child = kids[i];
        var childId = parseInt(child.getAttribute('data-folder_id') || '', 10);
        if (!childId) {
            continue;
        }
        lists[key].push(childId);
        collectNestedFolders(child, lists);
    }
}
function relocateFolder(lists, moved, parentKey, beforeId) {
    var keys = Object.keys(lists);
    for (var i = 0; i < keys.length; i++) {
        var kept = [];
        var kids = lists[keys[i]];
        for (var j = 0; j < kids.length; j++) {
            if (kids[j] !== moved) {
                kept.push(kids[j]);
            }
        }
        lists[keys[i]] = kept;
    }
    if (!lists[parentKey]) {
        lists[parentKey] = [];
    }
    var siblings = lists[parentKey];
    var index = siblings.length;
    if (beforeId) {
        for (var i = 0; i < siblings.length; i++) {
            if (siblings[i] === beforeId) {
                index = i;
                break;
            }
        }
    }
    siblings.splice(index, 0, moved);
}
function orderNodes(lists) {
    var rank = {};
    var next = 1;
    var visit = function (key) {
        var kids = lists[key] || [];
        for (var i = 0; i < kids.length; i++) {
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
function placeTopLevel(root, ids) {
    if (!ids.length) {
        return;
    }
    var kids = folderItems(root);
    var start = kids.length;
    for (var i = 0; i < kids.length; i++) {
        var id = parseInt(kids[i].getAttribute('data-folder_id') || '', 10);
        if (isCustomFolder(id)) {
            start = i;
            break;
        }
    }
    for (var i = 0; i < ids.length; i++) {
        var el = root.querySelector('li[data-folder_id="' + ids[i] + '"]');
        if (el instanceof HTMLElement) {
            placeAt(root, el, start + i);
        }
    }
}
function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
window.nestedtagsStart = nestedtagsStart;
