<?php

Route::group(['middleware' => 'web', 'prefix' => \Helper::getSubdirectory(), 'namespace' => 'Modules\NestedTags\Http\Controllers'], function () {
    Route::post('/nestedtags/ajax', [
        'uses' => 'NestedTagsController@ajax',
        'middleware' => ['auth', 'roles'],
        'roles' => ['admin', 'user'],
        'laroute' => true,
    ])->name('nestedtags.ajax');
});
