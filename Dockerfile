FROM node:10.11.0-alpine

WORKDIR /auth-service

COPY . /auth-service

RUN rm .env
RUN rm ./cert/key.private.pem
RUN rm ./cert/key.public.pem

RUN npm install

ENTRYPOINT ["npm", "start"]