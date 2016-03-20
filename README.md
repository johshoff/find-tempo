First time
----------

Make sure RethinkDB is running. Then run

    npm run seed_db

First time setup with docker
----------------------------

You can either install RethinkDB locally or run it in docker. This section
describes the latter and borrows heavily from the documentation of the
[rethinkdb docker image](https://hub.docker.com/_/rethinkdb/).

If you're on linux, make sure you're in the docker group:

    sudo usermod -aG docker $USER

Install rethinkdb:

    docker pull rethinkdb

Run the image:

    docker run --name find-tempo-rethinkdb -v "$PWD/find-tempo-db:/data" -d rethinkdb

Run the application:

    RETHINKDB_HOST=$(docker inspect --format '{{ .NetworkSettings.IPAddress }}' find-tempo-rethinkdb) npm start
