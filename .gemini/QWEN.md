# Local Development Information

This project is a Laravel 12.x application, containerized using Docker and Laravel Sail.

The application URL is: http://localhost or http://localhost:80

Any commands you run should be run inside the container by appending "sail " to the start of your command.

Ex. `php artisan migrate` -> `./vendor/bin/sail php artisan migrate`
Ex. `composer require` -> `./vendor/bin/sail composer require`
Ex. `npm install` -> `./vendor/bin/sail npm install`

Any UI features will use TailwindCSS4 and the Vite bundler.

You can run unit tests using `./vendor/bin/sail php artisan test`

The development server is already up and running, you NEVER NEED to run `./vendor/bin/sail up` or `./vendor/bin/sail php artisan:serve`


# Project Description

This is a pseudo-3D racing game.  
