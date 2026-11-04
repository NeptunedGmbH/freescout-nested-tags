<?php

namespace Modules\NestedTags\Providers;

use Illuminate\Support\ServiceProvider;
use Modules\NestedTags\Support\FolderTree;

class NestedTagsServiceProvider extends ServiceProvider
{
    public function register()
    {
        $this->mergeConfigFrom(__DIR__.'/../Config/config.php', 'nestedtags');
        $this->commands(array(
            \Modules\NestedTags\Console\HealthCommand::class,
            \Modules\NestedTags\Console\InheritCommand::class,
            \Modules\NestedTags\Console\FoldersFromMailboxCommand::class,
        ));
    }

    public function boot()
    {
        $this->loadMigrationsFrom(__DIR__.'/../Database/Migrations');
        $this->loadJsonTranslationsFrom(__DIR__.'/../Resources/lang');
        $this->loadViewsFrom(__DIR__.'/../Resources/views', 'nestedtags');
        $this->hooks();
    }

    protected function hooks()
    {
        if (!self::customFoldersReady()) {
            return;
        }

        $this->broadcastCustomFolderSaves();

        \Eventy::addFilter('stylesheets', function ($styles) {
            $styles[] = \Module::getPublicPath('nestedtags').'/css/module.css';

            return $styles;
        }, 20, 1);

        \Eventy::addFilter('javascripts', function ($javascripts) {
            $javascripts[] = \Module::getPublicPath('nestedtags').'/js/module.js';

            return $javascripts;
        }, 20, 1);

        \Eventy::addAction('javascript', function () {
            if (!\Auth::check()) {
                return;
            }
            try {
                $url = route('nestedtags.ajax');
            } catch (\Throwable $e) {
                return;
            }
            $routeName = '';
            try {
                $route = request()->route();
                $routeName = $route ? (string) $route->getName() : '';
            } catch (\Throwable $e) {
                $routeName = '';
            }
            $mailboxId = (int) (request()->route('mailbox_id') ?: 0);
            if ($mailboxId === 0 && strpos($routeName, 'mailboxes.') === 0) {
                $mailboxId = (int) (request()->route('id') ?: 0);
            }
            if ($mailboxId === 0 && $routeName === 'conversations.view') {
                try {
                    $conversation = \App\Conversation::find((int) request()->route('id'));
                    if ($conversation) {
                        $mailboxId = (int) $conversation->mailbox_id;
                    }
                } catch (\Throwable $e) {
                    $mailboxId = 0;
                }
            }
            $tree = array('nodes' => array(), 'paths' => new \stdClass());
            $mailbox = null;
            if ($mailboxId) {
                $mailbox = FolderTree::mailboxForUser($mailboxId);
            }
            if ($mailbox) {
                $loaded = FolderTree::tree($mailbox->id);
                $tree = array(
                    'nodes' => $loaded['nodes'],
                    'paths' => $loaded['paths'] ?: new \stdClass(),
                );
            }
            $canEdit = $mailbox && FolderTree::canUpdate($mailbox);
            $createUrl = '';
            $formUrl = '';
            if ($canEdit) {
                try {
                    $createUrl = route('mailboxes.custom_folders.ajax_html', array(
                        'mailbox_id' => $mailboxId,
                        'action' => 'create',
                    ));
                    $formUrl = route('nestedtags.form', array(
                        'mailbox_id' => $mailboxId,
                        'folder_id' => 0,
                    ));
                } catch (\Throwable $e) {
                    $canEdit = false;
                }
            }
            $boot = array(
                'url' => $url,
                'mailboxId' => $mailboxId,
                'nodes' => $tree['nodes'],
                'paths' => $tree['paths'],
                'nestUnder' => __('Nest under'),
                'topLevel' => __('Top level'),
                'sublabel' => __('Add sublabel'),
                'confirm' => __('These folders will also be deleted. Conversations stay:'),
                'deleteLabel' => __('Delete'),
                'dragHint' => __('Drag right to nest under the folder above. Drag left to move it out.'),
                'canEdit' => (bool) $canEdit,
                'createUrl' => $createUrl,
                'formUrl' => $formUrl,
                'edit' => __('Edit folder'),
                'addFolder' => __('Add folder'),
                'addSubfolder' => __('Add subfolder'),
                'moreSettings' => __('More settings'),
                'nameIsTag' => __('The name is also the tag.'),
                'deleteFolder' => __('Delete this folder?'),
                'folderActions' => __('Folder actions'),
                'folder' => __('Folder'),
            );
            echo 'nestedtagsStart('.json_encode($boot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES).');';
        }, 20, 0);
    }

    /**
     * Official Custom Folders must be on, with its license marked activated.
     * The license key is never read.
     *
     * @return bool
     */
    public static function customFoldersReady()
    {
        try {
            if (!\App\Module::isActive('customfolders')) {
                return false;
            }
            $module = \App\Module::getByAlias('customfolders');
        } catch (\Exception $e) {
            return false;
        }

        return $module && !empty($module->activated);
    }

    /**
     * Create, update, and delete already go through Custom Folders.
     * A successful response is the only point that publishes the folder list.
     */
    protected function broadcastCustomFolderSaves()
    {
        \Event::listen(\Illuminate\Routing\Events\RouteMatched::class, function ($event) {
            $route = $event->route;
            $name = $route ? (string) $route->getName() : '';
            if ($name !== 'mailboxes.custom_folders.ajax') {
                return;
            }
            $request = $event->request;
            $action = (string) $request->input('action');
            if (!in_array($action, array('create', 'update', 'delete', 'update_sort_order'), true)) {
                return;
            }
            $mailboxId = (int) $request->input('mailbox_id');
            if ($mailboxId < 1) {
                $mailboxId = $this->mailboxIdFromFolderRequest($request);
            }
            if ($mailboxId > 0) {
                $request->attributes->set('nestedtags_folders_mailbox', $mailboxId);
            }
        });

        \Event::listen(\Illuminate\Foundation\Http\Events\RequestHandled::class, function ($event) {
            $request = $event->request;
            if (!$request->attributes->has('nestedtags_folders_mailbox')) {
                return;
            }
            $mailboxId = (int) $request->attributes->get('nestedtags_folders_mailbox');
            if ($mailboxId < 1 || !$this->customFolderAjaxSucceeded($event->response)) {
                return;
            }
            \Modules\NestedTags\Events\FolderSidebarRefresh::send($mailboxId);
        });
    }

    /**
     * Delete and sort requests name folders, not the mailbox.
     *
     * @param \Illuminate\Http\Request $request
     * @return int
     */
    protected function mailboxIdFromFolderRequest($request)
    {
        $folderId = (int) $request->input('folder_id');
        if ($folderId > 0) {
            $folder = \App\Folder::find($folderId);
            if ($folder) {
                return (int) $folder->mailbox_id;
            }
        }
        $ids = $request->input('folders');
        if (!is_array($ids)) {
            return 0;
        }
        foreach ($ids as $id) {
            $folder = \App\Folder::find((int) $id);
            if ($folder) {
                return (int) $folder->mailbox_id;
            }
        }

        return 0;
    }

    /**
     * @param mixed $response
     * @return bool
     */
    protected function customFolderAjaxSucceeded($response)
    {
        if (!is_object($response) || !method_exists($response, 'getData')) {
            return false;
        }
        try {
            $data = $response->getData(true);
        } catch (\Throwable $e) {
            return false;
        }

        return is_array($data) && isset($data['status']) && $data['status'] === 'success';
    }
}
