<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <title>Laracon Racer</title>

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">

        <!-- Styles / Scripts -->
        @vite(['resources/css/app.css', 'resources/js/app.js'])

        <style>
            body {
                margin: 0;
                padding: 20px;
                background: #000;
                font-family: 'Press Start 2P', monospace;
                font-size: 10px;
                text-align: center;
                min-height: 100vh;
            }

            .main-container {
                max-width: 1200px;
                margin: 0 auto;
            }

            #controls {
                font-size: 12px;
                text-align: center;
                color: #fff;
                position: relative;
                margin-bottom: 20px;
                padding: 15px;
                background: rgba(51, 51, 51, 0.3);
                border-radius: 10px;
            }

            #game-container {
                border: 3px solid #333;
                box-shadow: 0 0 20px rgba(255, 102, 0, 0.5);
                width: 100%;
                max-width: 1000px;
                height: 650px;
                margin: 0 auto 20px auto;
            }

            #leaderboard {
                background: rgba(17, 17, 17, 0.9);
                border: 2px solid #ff6600;
                border-radius: 10px;
                padding: 20px;
                color: #fff;
                margin-top: 20px;
            }

            #leaderboard h2 {
                color: #ff6600;
                margin-bottom: 20px;
                font-size: 16px;
                text-transform: uppercase;
            }

            .leaderboard-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 10px;
            }

            .leaderboard-table th,
            .leaderboard-table td {
                padding: 8px 12px;
                text-align: left;
                border-bottom: 1px solid #333;
            }

            .leaderboard-table th {
                color: #ff6600;
                background: rgba(255, 102, 0, 0.1);
                text-transform: uppercase;
                font-size: 9px;
            }

            .leaderboard-table td {
                color: #fff;
            }

            .leaderboard-table tr:nth-child(even) {
                background: rgba(51, 51, 51, 0.3);
            }

            .leaderboard-table tr:hover {
                background: rgba(255, 102, 0, 0.1);
            }

            .rank {
                color: #4cff00;
                font-weight: bold;
            }

            .rank-1 { color: #FFD700; }
            .rank-2 { color: #C0C0C0; }
            .rank-3 { color: #CD7F32; }

            .vehicle-badge {
                display: inline-block;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 8px;
                font-weight: bold;
            }

            .vehicle-laravel-lambo { background: #ff6600; color: #fff; }
            .vehicle-typescript-truck { background: #4cff00; color: #000; }
            .vehicle-css-cycle { background: #0082df; color: #fff; }

            .loading {
                color: #ff6600;
                text-align: center;
                padding: 20px;
            }

            .error {
                color: #ff0000;
                text-align: center;
                padding: 20px;
            }
        </style>

    </head>
    <body>
        <div class="main-container">
            <!-- Controls Panel -->
            <div id="controls">
                <div style="position: relative; top: -5px;">
                    <span style="color: #ff6600; font-size: 28px; letter-spacing: -10px; margin-right: 10px; position: relative; top: 2px;">← →</span> Navigate/Steer • <span style="color: #ff6600;">↑ ↓</span> Accelerate/Brake • <span style="color: #ff6600;">SPACE</span> Select/Start • <span style="color: #ff6600;">ESC</span> Back • <span style="color: #ff6600;">M</span> Mute
                </div>
            </div>

            <div id="game-container"></div>

            <div id="leaderboard" style="margin-top: 50px;">
                <h2>🏆 Leaderboard</h2>
                <div id="leaderboard-content">
                    <div class="loading">Loading leaderboard...</div>
                </div>
            </div>
        </div>

        <script>
            // Leaderboard functionality
            class Leaderboard {
                constructor() {
                    this.loadLeaderboard();
                }

                async loadLeaderboard() {
                    const content = document.getElementById('leaderboard-content');
                    try {
                        console.log('Loading leaderboard from:', '/api/races/leaderboard');
                        const response = await fetch('/api/races/leaderboard');
                        console.log('Response status:', response.status);

                        if (!response.ok) {
                            const errorText = await response.text();
                            console.error('HTTP Error:', response.status, errorText);
                            content.innerHTML = `<div class="error">Error loading leaderboard (${response.status})</div>`;
                            return;
                        }

                        const data = await response.json();
                        console.log('Leaderboard data:', data);

                        if (data.success && data.data && data.data.length > 0) {
                            this.renderLeaderboard(data.data);
                        } else {
                            content.innerHTML = '<div style="color: #ff6600; text-align: center; padding: 20px;">No races completed yet. Be the first!</div>';
                        }
                    } catch (error) {
                        console.error('Error loading leaderboard:', error);
                        content.innerHTML = '<div class="error">Error loading leaderboard: ' + error.message + '</div>';
                    }
                }

                renderLeaderboard(races) {
                    const content = document.getElementById('leaderboard-content');

                    let html = `
                        <table class="leaderboard-table">
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Player</th>
                                    <th>Score</th>
                                    <th>Time</th>
                                    <th>Vehicle</th>
                                    <th>Driver</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;

                    races.forEach((race, index) => {
                        const rank = index + 1;
                        const rankClass = rank <= 3 ? `rank-${rank}` : 'rank';
                        const vehicleClass = `vehicle-${race.vehicle.toLowerCase().replace(/\s+/g, '-')}`;
                        const timeFormatted = this.formatTime(race.race_time);

                        html += `
                            <tr>
                                <td><span class="${rankClass}">#${rank}</span></td>
                                <td>
                                    <div style="font-size: 11px; font-weight: bold;">${this.escapeHtml(race.player_name)}</div>
                                    <div style="font-size: 8px; color: #4cff00;">${this.escapeHtml(race.github_username)}</div>
                                </td>
                                <td style="color: #4cff00; font-weight: bold;">${race.final_score.toLocaleString()}</td>
                                <td>${timeFormatted}</td>
                                <td><span class="vehicle-badge ${vehicleClass}">${race.vehicle}</span></td>
                                <td>${this.escapeHtml(race.driver)}</td>
                            </tr>
                        `;
                    });

                    html += '</tbody></table>';
                    content.innerHTML = html;
                }

                formatTime(milliseconds) {
                    const totalSeconds = Math.floor(milliseconds / 1000);
                    const ms = milliseconds % 1000;
                    const minutes = Math.floor(totalSeconds / 60);
                    const seconds = totalSeconds % 60;

                    return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
                }

                escapeHtml(text) {
                    const div = document.createElement('div');
                    div.textContent = text;
                    return div.innerHTML;
                }

                async submitRace(raceData) {
                    try {
                        const response = await fetch('/api/races', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json'
                            },
                            body: JSON.stringify(raceData)
                        });

                        if (!response.ok) {
                            const errorText = await response.text();
                            console.error('HTTP Error:', response.status, errorText);
                            return false;
                        }

                        const result = await response.json();

                        if (result.success) {
                            console.log('Race submitted successfully:', result);
                            // Reload leaderboard after successful submission
                            this.loadLeaderboard();
                            return true;
                        } else {
                            console.error('Error submitting race:', result);
                            return false;
                        }
                    } catch (error) {
                        console.error('Error submitting race:', error);
                        return false;
                    }
                }
            }

            // Initialize leaderboard
            window.leaderboard = new Leaderboard();
        </script>
    </body>
</html>
