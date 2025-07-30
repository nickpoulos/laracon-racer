<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

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
                padding: 0;
                background: #000;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                font-family: 'Press Start 2P', monospace;
                font-size: 10px;
                text-align: center;
            }

            #game-container {
                border: 3px solid #333;
                box-shadow: 0 0 20px rgba(255, 102, 0, 0.5);
                width: 90vw;
                max-width: 1000px;
                height: 80vh;
                max-height: 800px;
            }

            #controls {
                position: absolute;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 30px;
                color: #fff;
                font-size: 8px;
                text-transform: uppercase;
                text-align: center;
            }

            #controls span {
                display: flex;
                align-items: center;
                gap: 5px;
            }

            #controls span span {
                background: #333;
                padding: 2px 6px;
                border-radius: 3px;
                font-weight: bold;
                color: #ff6600;
            }
        </style>

    </head>
    <body>
        <div id="game-container"></div>

        <div id="controls">
            <span><span>SPACE</span>start/restart</span>
            <span><span>1/2/3</span>select</span>
            <span><span style="font-size: 25px;">←→</span>steer</span>
            <span><span>↑↓</span>accelerate/brake</span>
        </div>
    </body>
</html>
