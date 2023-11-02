#!/bin/sh
podman run -v $PWD:/src -w /src -p 8000:8000 --env-file spotify.env -it node:20.1.0 bash
