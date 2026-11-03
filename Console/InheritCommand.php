<?php

namespace Modules\NestedTags\Console;

use Illuminate\Console\Command;
use Modules\NestedTags\Support\FolderTree;

/**
 * Gives existing subfolder conversations the tags of the folders above them.
 */
class InheritCommand extends Command
{
    protected $signature = 'nestedtags:inherit';

    protected $description = 'Add parent folder tags to conversations that already carry a nested folder tag';

    public function handle()
    {
        FolderTree::inheritAll();
        $this->line('nested tags inherited');

        return 0;
    }
}
