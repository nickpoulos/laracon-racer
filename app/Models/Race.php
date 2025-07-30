<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Race extends Model
{
    /** @use HasFactory<\Database\Factories\RaceFactory> */
    use HasFactory;

    protected $fillable = [
        'player_name',
        'github_username',
        'base_score',
        'time_penalty',
        'life_bonus',
        'final_score',
        'race_time',
        'vehicle',
        'driver',
        'lives_remaining',
    ];

    protected $casts = [
        'base_score' => 'integer',
        'time_penalty' => 'integer',
        'life_bonus' => 'integer',
        'final_score' => 'integer',
        'race_time' => 'integer',
        'lives_remaining' => 'integer',
    ];
}
