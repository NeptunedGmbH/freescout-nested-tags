<?php

namespace Modules\NestedTags\Console;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;

/**
 * Read-only health check for UpdateGuard.
 *
 *   php artisan nestedtags:health
 *   php artisan nestedtags:health --json
 *
 * Exit 0 means healthy. Any other exit code means unhealthy.
 * The command does not write, migrate, or use the network.
 */
class HealthCommand extends Command
{
    protected $signature = 'nestedtags:health {--json : Print a JSON object}';

    protected $description = 'Read-only NestedTags health check (UpdateGuard)';

    public function handle()
    {
        $root = dirname(__DIR__);
        $checks = array(
            'files' => $this->files($root),
            'classes' => $this->classes(),
            'routes' => $this->routes(),
            'database' => $this->database(),
            'assets' => $this->assets(),
            'version' => $this->versionMatches($root),
            'interop' => $this->interop($root),
            'customfolders' => $this->customFolders(),
        );
        $version = $this->version($root);
        $failed = 0;
        foreach ($checks as $result) {
            if ($result !== 'ok') {
                $failed++;
            }
        }
        $status = $failed === 0 ? 'ok' : 'fail';
        $payload = array(
            'status' => $status,
            'module' => 'NestedTags',
            'version' => $version,
            'checks' => $checks,
        );
        if ($this->option('json')) {
            $encoded = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            if ($encoded === false) {
                $this->line('{"status":"fail","module":"NestedTags","version":"","checks":{"json":"encode failed"}}');

                return 1;
            }
            $this->line($encoded);

            return $failed === 0 ? 0 : 1;
        }
        foreach ($checks as $name => $result) {
            $this->line(str_pad($name, 12).$result);
        }
        $this->line('NestedTags '.$version.': '.$status);

        return $failed === 0 ? 0 : 1;
    }

    protected function files($root)
    {
        $relative = array(
            'module.json',
            'start.php',
            'version.txt',
            'interop.json',
            'Config/config.php',
            'Providers/NestedTagsServiceProvider.php',
            'Http/routes.php',
            'Http/Controllers/NestedTagsController.php',
            'Resources/views/form.blade.php',
            'Support/TreeRules.php',
            'Support/FolderTree.php',
            'Public/css/module.css',
            'Public/js/module.js',
            'Database/Migrations/2026_11_03_000000_create_folder_tree_table.php',
        );
        $missing = array();
        foreach ($relative as $path) {
            $full = $root.'/'.$path;
            if (!is_file($full) || !is_readable($full)) {
                $missing[] = $path;
            }
        }

        return $missing ? 'missing '.implode(', ', $missing) : 'ok';
    }

    protected function classes()
    {
        $classes = array(
            'Modules\\NestedTags\\Providers\\NestedTagsServiceProvider',
            'Modules\\NestedTags\\Http\\Controllers\\NestedTagsController',
            'Modules\\NestedTags\\Support\\TreeRules',
            'Modules\\NestedTags\\Support\\FolderTree',
        );
        $missing = array();
        foreach ($classes as $class) {
            if (!class_exists($class)) {
                $missing[] = $class;
            }
        }

        return $missing ? 'missing '.implode(', ', $missing) : 'ok';
    }

    protected function routes()
    {
        try {
            $exists = Route::has('nestedtags.ajax') && Route::has('nestedtags.form');
        } catch (\Throwable $e) {
            $exists = false;
        }

        return $exists ? 'ok' : 'missing nestedtags route';
    }

    protected function database()
    {
        try {
            if (!Schema::hasTable('folder_tree')) {
                return 'folder_tree missing';
            }
            if (!Schema::hasColumn('folder_tree', 'folder_id') || !Schema::hasColumn('folder_tree', 'parent_folder_id')) {
                return 'folder_tree columns missing';
            }
            \DB::table('folder_tree')->select(array('folder_id', 'parent_folder_id'))->limit(1)->get();
        } catch (\Throwable $e) {
            return 'folder_tree query failed';
        }

        return 'ok';
    }

    protected function assets()
    {
        $relative = array('css/module.css', 'js/module.js');
        $missing = array();
        foreach ($relative as $path) {
            try {
                $full = public_path('modules/nestedtags/'.$path);
                $readable = is_file($full) && is_readable($full);
            } catch (\Throwable $e) {
                $readable = false;
            }
            if (!$readable) {
                $missing[] = 'modules/nestedtags/'.$path;
            }
        }

        return $missing ? 'missing '.implode(', ', $missing) : 'ok';
    }

    protected function versionMatches($root)
    {
        $version = $this->version($root);
        $file = trim((string) @file_get_contents($root.'/version.txt'));
        if ($version === '' || $file === '' || $version !== $file) {
            return 'version.txt does not match module.json';
        }

        return 'ok';
    }

    protected function interop($root)
    {
        $doc = json_decode((string) @file_get_contents($root.'/interop.json'), true);
        if (!is_array($doc) || !isset($doc['project']['id']) || $doc['project']['id'] !== 'nested-tags') {
            return 'interop.json missing project id nested-tags';
        }
        if (empty($doc['compatibility']['freescout']) || empty($doc['compatibility']['projects'])) {
            return 'interop.json missing compatibility';
        }

        return 'ok';
    }

    protected function version($root)
    {
        $manifest = json_decode((string) @file_get_contents($root.'/module.json'), true);
        if (!is_array($manifest) || !isset($manifest['version'])) {
            return '';
        }

        return (string) $manifest['version'];
    }

    /**
     * Official Custom Folders must be active and its license marked activated.
     *
     * @return string
     */
    protected function customFolders()
    {
        try {
            if (!\App\Module::isActive('customfolders')) {
                return 'customfolders inactive';
            }
            $module = \App\Module::getByAlias('customfolders');
        } catch (\Exception $e) {
            return 'customfolders unavailable';
        }
        if (!$module || empty($module->activated)) {
            return 'customfolders license inactive';
        }

        return 'ok';
    }
}
