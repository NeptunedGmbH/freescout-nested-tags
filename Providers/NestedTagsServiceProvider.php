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
            $mailboxId = 0;
            if (strpos($routeName, 'mailboxes.') === 0) {
                $mailboxId = (int) (request()->route('mailbox_id') ?: request()->route('id') ?: 0);
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
}
