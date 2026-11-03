<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateFolderTreeTable extends Migration
{
    public function up()
    {
        if (Schema::hasTable('folder_tree')) {
            return;
        }
        Schema::create('folder_tree', function (Blueprint $table) {
            $table->unsignedInteger('folder_id')->primary();
            $table->unsignedInteger('parent_folder_id')->nullable()->index();
        });
    }

    public function down()
    {
        Schema::dropIfExists('folder_tree');
    }
}
