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
        ));
    }

    public function boot()
    {
        $this->loadMigrationsFrom(__DIR__.'/../Database/Migrations');
        $this->loadJsonTranslationsFrom(__DIR__.'/../Resources/lang');
        $this->hooks();
    }

    protected function hooks()
    {
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
            if ($mailboxId && ($mailbox = FolderTree::mailboxForUser($mailboxId))) {
                $loaded = FolderTree::tree($mailbox->id);
                $tree = array(
                    'nodes' => $loaded['nodes'],
                    'paths' => $loaded['paths'] ?: new \stdClass(),
                );
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
            );
            echo 'nestedtagsStart('.json_encode($boot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES).');';
        }, 20, 0);
    }
}
