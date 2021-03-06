#!/bin/bash

sed -i "s^__PORT__^$PORT^g" /app/config.json
sed -i "s^__DB_STORAGE__^$DB_STORAGE^g" /app/config.json
sed -i "s^__DB_PERSIST__^$DB_PERSIST^g" /app/config.json
sed -i "s^__MAIL_APIKEY__^$MAIL_APIKEY^g" /app/config.json
sed -i "s^__MAIL_DOMAIN__^$MAIL_DOMAIN^g" /app/config.json
sed -i "s^__MAIL_FROM__^$MAIL_FROM^g" /app/config.json
sed -i "s^__MAIL_ORIGIN__^$MAIL_ORIGIN^g" /app/config.json

cd /app
npm start
