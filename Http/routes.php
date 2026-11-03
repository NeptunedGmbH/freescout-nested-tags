<?php

Route::group(['middleware' => 'web', 'prefix' => \Helper::getSubdirectory(), 'namespace' => 'Modules\NestedTags\Http\Controllers'], function () {
    Route::post('/nestedtags/ajax', [
        'uses' => 'NestedTagsController@ajax',
        'middleware' => ['auth', 'roles'],
        'roles' => ['admin', 'user'],
        'laroute' => true,
    ])->name('nestedtags.ajax');
    Route::get('/nestedtags/form/{mailbox_id}/{folder_id}', [
        'uses' => 'NestedTagsController@form',
        'middleware' => ['auth', 'roles'],
        'roles' => ['admin', 'user'],
    ])->name('nestedtags.form');
});
