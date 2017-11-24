#!/bin/bash

sed -i "s^__PORT__^$PORT^g" /app/config.json
sed -i "s^__DB_STORAGE__^$DB_STORAGE^g" /app/config.json
sed -i "s^__MAIL_APIKEY__^$DB_STORAGE^g" /app/config.json
sed -i "s^__MAIL_DOMAIN__^$DB_STORAGE^g" /app/config.json


cd /app
npm start
