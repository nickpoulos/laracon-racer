<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('races', function (Blueprint $table) {
            $table->id();
            $table->string('player_name');
            $table->string('github_username');
            $table->integer('base_score');
            $table->integer('time_penalty');
            $table->integer('life_bonus');
            $table->integer('final_score');
            $table->integer('race_time'); // Time in milliseconds
            $table->string('vehicle'); // Vehicle name (LAMBO, TRUCK, BIKE)
            $table->string('driver'); // Driver name (TAYLOR)
            $table->integer('lives_remaining');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('races');
    }
};
