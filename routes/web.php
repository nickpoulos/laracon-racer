<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Response;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/images/{filename}', function ($filename) {
    $path = resource_path('img/' . $filename);
    
    if (!file_exists($path)) {
        abort(404);
    }
    
    $file = file_get_contents($path);
    $mimeType = mime_content_type($path);
    
    return response($file)->header('Content-Type', $mimeType);
});
