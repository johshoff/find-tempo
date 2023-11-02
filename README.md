First time
----------

To seed a database

    BPMS_DB=test.db npm run seed_db

Running with docker/podman
--------------------------

Run it like follows:

    podman run -v $PWD:/src -w /src -p 8000:8000 -e BPMS_DB=test.db -it node:20.1.0 npm start
