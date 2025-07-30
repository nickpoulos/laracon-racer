<?php

namespace App\Http\Controllers;

use App\Models\Race;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class RaceController extends Controller
{
    /**
     * Store a new race result
     */
    public function store(Request $request): JsonResponse
    {
        $validatedData = $request->validate([
            'player_name' => 'required|string|max:255',
            'github_username' => 'required|string|max:39|regex:/^[a-zA-Z0-9]([a-zA-Z0-9\-])*[a-zA-Z0-9]$/',
            'base_score' => 'required|integer|min:0',
            'time_penalty' => 'required|integer|min:0',
            'life_bonus' => 'required|integer|min:0',
            'final_score' => 'required|integer|min:0',
            'race_time' => 'required|integer|min:0', // Now expects milliseconds
            'vehicle' => 'required|string|in:Laravel Lambo,TypeScript Truck,CSS Cycle',
            'driver' => 'required|string|max:255',
            'lives_remaining' => 'required|integer|min:0|max:10',
        ]);

        // Add @ prefix if not already present
        if (!str_starts_with($validatedData['github_username'], '@')) {
            $validatedData['github_username'] = '@' . $validatedData['github_username'];
        }

        $race = Race::create($validatedData);

        return response()->json([
            'success' => true,
            'message' => 'Race result saved successfully!',
            'data' => $race
        ], 201);
    }

    /**
     * Get leaderboard data
     */
    public function leaderboard(): JsonResponse
    {
        $races = Race::orderBy('final_score', 'desc')
            ->orderBy('race_time', 'asc') // Now orders by milliseconds for precise tiebreakers
            ->limit(10)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $races
        ]);
    }
}