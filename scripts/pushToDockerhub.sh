#!/bin/bash

docker build . --platform linux/amd64 -t=superj80820/auth-service
docker push superj80820/auth-service